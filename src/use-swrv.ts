/**              ____
 *--------------/    \.------------------/
 *            /  swrv  \.               /    //
 *          /         / /\.            /    //
 *        /     _____/ /   \.         /
 *      /      /  ____/   .  \.      /
 *    /        \ \_____        \.   /
 *  /     .     \_____ \         \ /    //
 *  \          _____/ /        ./ /    //
 *    \       / _____/       ./  /
 *      \    / /      .    ./   /
 *        \ / /          ./    /
 *    .     \/         ./     /    //
 *            \      ./      /    //
 *              \.. /       /
 *         .     |||       /
 *               |||      /
 *     .         |||     /    //
 *               |||    /    //
 *               |||   /
 */
import {
  reactive,
  watch,
  ref,
  toRefs,
  // isRef,
  getCurrentScope,
  getCurrentInstance,
  inject,
  onScopeDispose,
  isReadonly
} from 'vue'
import * as VueRuntime from 'vue'
import type { App, InjectionKey } from 'vue'
import webPreset from './lib/web-preset'
import SWRVCache from './cache'
import { IConfig, IKey, IResponse, fetcherFn, revalidateOptions, SwrvCacheBundle } from './types'

type StateRef<Data, Error> = {
  data: Data, error: Error, isValidating: boolean, isLoading: boolean, revalidate: Function, key: any
};

/**
 * hasInjectionContext() is Vue 3.3+; this package supports >=3.2.26, so fall back to the
 * getCurrentInstance() internal where it is not exported.
 */
const hasInjectionContextCompat: (() => boolean) | undefined =
  (VueRuntime as Record<string, unknown>).hasInjectionContext as (() => boolean) | undefined

function canInject (): boolean {
  return hasInjectionContextCompat ? hasInjectionContextCompat() : Boolean(getCurrentInstance())
}

const DATA_CACHE = new SWRVCache<Omit<IResponse, 'mutate'>>()
const REF_CACHE = new SWRVCache<StateRef<any, any>[]>()
const PROMISES_CACHE = new SWRVCache<Omit<IResponse, 'mutate'>>()

/**
 * Symbol.for, so that two copies of this package in one dependency graph compute the same key
 * and resolve each other's provide. Mismatched keys fail silently, as stale data. The suffix
 * versions SwrvCacheBundle, not the package: bump it only when that shape changes
 * incompatibly, or two releases that could safely share a bundle stop seeing each other.
 */
export const swrvCacheInjectionKey: InjectionKey<SwrvCacheBundle> = Symbol.for('swrv.cache.v1') as InjectionKey<SwrvCacheBundle>

const providedBundles = new WeakMap<App, SwrvCacheBundle>()

/** The bundle `provideSwrvCache` gave this app, if any. */
export function getSwrvCache (app: App): SwrvCacheBundle | undefined {
  return providedBundles.get(app)
}

/**
 * Gives `app` its own caches. Any cache omitted from `overrides` gets a fresh instance.
 *
 * Idempotent per app, so a host app and a test harness can both call it. `overrides` replaces a
 * cache implementation and only applies to the first call; to seed entries into a bundle that is
 * already provided, write to `getSwrvCache(app)`.
 *
 * @throws if `overrides` is non-empty and a bundle is already provided on this app.
 */
export function provideSwrvCache (app: App, overrides: Partial<SwrvCacheBundle> = {}): SwrvCacheBundle {
  const existing = providedBundles.get(app)

  if (existing) {
    if (Object.keys(overrides).length > 0) {
      throw new Error('swrv: this app already has a provided cache bundle, so the supplied overrides cannot be applied. Pass overrides on the first provideSwrvCache call for this app.')
    }

    return existing
  }

  const bundle: SwrvCacheBundle = {
    data: overrides.data ?? new SWRVCache(),
    promises: overrides.promises ?? new SWRVCache(),
    refs: overrides.refs ?? new SWRVCache()
  }

  providedBundles.set(app, bundle)
  app.provide(swrvCacheInjectionKey, bundle)

  return bundle
}

const defaultConfig: IConfig = {
  cache: DATA_CACHE,
  refreshInterval: 0,
  ttl: 0,
  serverTTL: 1000,
  dedupingInterval: 2000,
  revalidateOnFocus: true,
  revalidateDebounce: 0,
  shouldRetryOnError: true,
  errorRetryInterval: 5000,
  errorRetryCount: 5,
  fetcher: webPreset.fetcher,
  isOnline: webPreset.isOnline,
  isDocumentVisible: webPreset.isDocumentVisible
}

/**
 * Cache the refs for later revalidation
 */
function setRefCache (key: string, theRef: StateRef<any, any>, ttl: number, refsCache: SWRVCache<any> = REF_CACHE) {
  const refCacheItem = refsCache.get(key)
  if (refCacheItem) {
    refCacheItem.data.push(theRef)
  } else {
    // #51 ensures ref cache does not evict too soon
    const gracePeriod = 5000
    refsCache.set(key, [theRef], ttl > 0 ? ttl + gracePeriod : ttl)
  }
}

function onErrorRetry (revalidate: (any, opts: revalidateOptions) => void, errorRetryCount: number, config: IConfig): void {
  if (!config.isDocumentVisible()) {
    return
  }

  if (config.errorRetryCount !== undefined && errorRetryCount > config.errorRetryCount) {
    return
  }

  const count = Math.min(errorRetryCount || 0, config.errorRetryCount)
  const timeout = count * config.errorRetryInterval
  setTimeout(() => {
    revalidate(null, { errorRetryCount: count + 1, shouldRetryOnError: true })
  }, timeout)
}

/**
 * Evaluate shouldRetryOnError option
 */
function resolveRetryFlag ({
  shouldRetry = undefined,
  error
}: {
   shouldRetry?: boolean | ((err: Error) => boolean),
   error: unknown,
 }): boolean {
  if (typeof shouldRetry === 'function') {
    return shouldRetry(error as Error)
  }

  if (typeof shouldRetry === 'boolean') {
    return shouldRetry
  }

  return defaultConfig.shouldRetryOnError as boolean
}

/**
 * Main mutation function for receiving data from promises to change state and
 * set data cache. To write into an app's provided bundle, pass its caches: inject the bundle in
 * setup(), where injection is legal, and use it from the handler or callback that mutates.
 */
const mutate = async <Data>(key: string, res: Promise<Data> | Data, cache: SWRVCache<any> = DATA_CACHE, ttl = defaultConfig.ttl, refsCache: SWRVCache<any> = REF_CACHE) => {
  let data, error, isValidating

  if (isPromise(res)) {
    try {
      data = await res
    } catch (err) {
      error = err
    }
  } else {
    data = res
  }

  // eslint-disable-next-line prefer-const
  isValidating = false

  const newData = { data, error, isValidating }
  if (typeof data !== 'undefined') {
    try {
      cache.set(key, newData, ttl)
    } catch (err) {
      console.error('swrv(mutate): failed to set cache', err)
    }
  }

  /**
   * Revalidate all swrv instances with new data
   */
  const stateRef = refsCache.get(key)
  if (stateRef && stateRef.data.length) {
    // This filter fixes #24 race conditions to only update ref data of current
    // key, while data cache will continue to be updated if revalidation is
    // fired
    let refs = stateRef.data.filter(r => r.key === key)

    refs.forEach((r, idx) => {
      if (typeof newData.data !== 'undefined') {
        r.data = newData.data
      }
      r.error = newData.error
      r.isValidating = newData.isValidating
      r.isLoading = newData.isValidating

      const isLast = idx === refs.length - 1
      if (!isLast) {
        // Clean up refs that belonged to old keys
        delete refs[idx]
      }
    })

    refs = refs.filter(Boolean)
  }

  return newData
}

/* Stale-While-Revalidate hook to handle fetching, caching, validation, and more... */
function useSWRV<Data = any, Error = any>(
  key: IKey
): IResponse<Data, Error>
function useSWRV<Data = any, Error = any>(
  key: IKey,
  fn: fetcherFn<Data> | undefined | null,
  config?: IConfig
): IResponse<Data, Error>
function useSWRV<Data = any, E = any> (...args): IResponse<Data, E> {
  let key: IKey
  let fn: fetcherFn<Data> | undefined | null
  let config: IConfig = { ...defaultConfig }
  let unmounted = false
  let isHydrated = false

  if (!getCurrentScope()) {
    console.error('useSWRV must be called inside setup() or an active effectScope().')
    return null
  }

  // Data cache precedence: per-call config.cache (applied below) > injected > DATA_CACHE.
  // The dedup and ref caches have no per-call override, so injected > module singleton.
  let promisesCache = PROMISES_CACHE
  let refsCache = REF_CACHE

  if (canInject()) {
    const injectedCache = inject(swrvCacheInjectionKey, undefined)
    if (injectedCache) {
      config.cache = injectedCache.data
      promisesCache = injectedCache.promises
      refsCache = injectedCache.refs
    }
  }

  const IS_SERVER = typeof window === 'undefined' || typeof document === 'undefined'

  // #region ssr
  /**
  const isSsrHydration = Boolean(
    \!IS_SERVER &&
    vm.$vnode &&
    vm.$vnode.elm &&
    vm.$vnode.elm.dataset &&
    vm.$vnode.elm.dataset.swrvKey)
  */
  // #endregion

  if (args.length >= 1) {
    key = args[0]
  }
  if (args.length >= 2) {
    fn = args[1]
  }
  if (args.length > 2) {
    config = {
      ...config,
      ...args[2]
    }
  }

  const ttl = IS_SERVER ? config.serverTTL : config.ttl
  const keyRef = typeof key === 'function' ? (key as any) : ref(key)

  if (typeof fn === 'undefined') {
    // use the global fetcher
    fn = config.fetcher
  }

  let stateRef = null as StateRef<Data, E>

  // #region ssr
  // if (isSsrHydration) {
  //   // component was ssrHydrated, so make the ssr reactive as the initial data
  //   const swrvState = (window as any).__SWRV_STATE__ ||
  //     ((window as any).__NUXT__ && (window as any).__NUXT__.swrv) || []
  //   const swrvKey = +(vm as any).$vnode.elm.dataset.swrvKey

  //   if (swrvKey !== undefined && swrvKey !== null) {
  //     const nodeState = swrvState[swrvKey] || []
  //     const instanceState = nodeState[isRef(keyRef) ? keyRef.value : keyRef()]

  //     if (instanceState) {
  //       stateRef = reactive(instanceState)
  //       isHydrated = true
  //     }
  //   }
  // }
  // #endregion

  if (!stateRef) {
    stateRef = reactive({
      data: undefined,
      error: undefined,
      isValidating: true,
      isLoading: true,
      key: null
    }) as StateRef<Data, E>
  }

  /**
   * Revalidate the cache, mutate data
   */
  const revalidate = async (data?: fetcherFn<Data>, opts?: revalidateOptions) => {
    const isFirstFetch = stateRef.data === undefined
    const keyVal = keyRef.value
    if (!keyVal) { return }

    const cacheItem = config.cache.get(keyVal)
    const newData = cacheItem && cacheItem.data

    stateRef.isValidating = true
    stateRef.isLoading = !newData
    if (newData) {
      stateRef.data = newData.data
      stateRef.error = newData.error
    }

    const fetcher = data || fn
    if (
      !fetcher ||
      (!config.isDocumentVisible() && !isFirstFetch) ||
      (opts?.forceRevalidate !== undefined && !opts?.forceRevalidate)
    ) {
      stateRef.isValidating = false
      stateRef.isLoading = false
      return
    }

    // Dedupe items that were created in the last interval #76
    if (cacheItem) {
      const shouldRevalidate = Boolean(
        ((Date.now() - cacheItem.createdAt) >= config.dedupingInterval) || opts?.forceRevalidate
      )

      if (!shouldRevalidate) {
        stateRef.isValidating = false
        stateRef.isLoading = false
        return
      }
    }

    const trigger = async () => {
      const promiseFromCache = promisesCache.get(keyVal)
      if (!promiseFromCache) {
        const fetcherArgs = Array.isArray(keyVal) ? keyVal : [keyVal]
        const newPromise = fetcher(...fetcherArgs)
        promisesCache.set(keyVal, newPromise, config.dedupingInterval)
        await mutate(keyVal, newPromise, config.cache, ttl, refsCache)
      } else {
        await mutate(keyVal, promiseFromCache.data, config.cache, ttl, refsCache)
      }
      stateRef.isValidating = false
      stateRef.isLoading = false
      promisesCache.delete(keyVal)
      if (stateRef.error !== undefined) {
        const configAllows = resolveRetryFlag({ shouldRetry: config.shouldRetryOnError, error: stateRef.error })
        const optsAllows = resolveRetryFlag({
          shouldRetry: opts ? opts.shouldRetryOnError : true,
          error: stateRef.error
        })

        const shouldRetryOnError: boolean = !unmounted && configAllows && optsAllows
        if (shouldRetryOnError) {
          onErrorRetry(revalidate, opts ? opts.errorRetryCount : 1, config)
        }
      }
    }

    if (newData && config.revalidateDebounce) {
      setTimeout(async () => {
        if (!unmounted) {
          await trigger()
        }
      }, config.revalidateDebounce)
    } else {
      await trigger()
    }
  }

  const revalidateCall = async () => revalidate(null, { shouldRetryOnError: false })
  let timer = null
  if (!IS_SERVER) {
    const tick = async () => {
      // component might un-mount during revalidate, so do not set a new timeout
      // if this is the case, but continue to revalidate since promises can't
      // be cancelled and new hook instances might rely on promise/data cache or
      // from pre-fetch
      if (!stateRef.error && config.isOnline()) {
        // if API request errored, we stop polling in this round
        // and let the error retry function handle it
        await revalidate()
      } else {
        if (timer) {
          clearTimeout(timer)
          timer = null
        }
      }

      if (config.refreshInterval && !unmounted) {
        timer = setTimeout(tick, config.refreshInterval)
      }
    }

    if (config.refreshInterval) {
      timer = setTimeout(tick, config.refreshInterval)
    }

    if (config.revalidateOnFocus) {
      document.addEventListener('visibilitychange', revalidateCall, false)
      window.addEventListener('focus', revalidateCall, false)
    }
  }

  onScopeDispose(() => {
    unmounted = true

    if (timer) {
      clearTimeout(timer)
      timer = null
    }

    if (!IS_SERVER && config.revalidateOnFocus) {
      document.removeEventListener('visibilitychange', revalidateCall, false)
      window.removeEventListener('focus', revalidateCall, false)
    }

    const refCacheItem = refsCache.get(keyRef.value)
    if (refCacheItem) {
      refCacheItem.data = refCacheItem.data.filter((ref) => ref !== stateRef)
    }
  })

  // #region ssr
  // if (IS_SERVER) {
  //   // make sure srwv exists in ssrContext
  //   let swrvRes = []
  //   if (vm.$ssrContext) {
  //     swrvRes = vm.$ssrContext.swrv = vm.$ssrContext.swrv || swrvRes
  //   }

  //   const ssrKey = swrvRes.length
  //   if (!vm.$vnode || (vm.$node && !vm.$node.data)) {
  //     vm.$vnode = {
  //       data: { attrs: { 'data-swrv-key': ssrKey } }
  //     }
  //   }

  //   const attrs = (vm.$vnode.data.attrs = vm.$vnode.data.attrs || {})
  //   attrs['data-swrv-key'] = ssrKey

  //   // Nuxt compatibility
  //   if (vm.$ssrContext && vm.$ssrContext.nuxt) {
  //     vm.$ssrContext.nuxt.swrv = swrvRes
  //   }

  //   onServerPrefetch(async () => {
  //     await revalidate()

  //     if (!swrvRes[ssrKey]) swrvRes[ssrKey] = {}

  //     swrvRes[ssrKey][keyRef.value] = {
  //       data: stateRef.data,
  //       error: stateRef.error,
  //       isValidating: stateRef.isValidating
  //     }
  //   })
  // }
  // #endregion

  /**
   * Revalidate when key dependencies change
   */
  try {
    watch(keyRef, (val) => {
      if (!isReadonly(keyRef)) {
        keyRef.value = val
      }
      stateRef.key = val
      stateRef.isValidating = Boolean(val)
      setRefCache(keyRef.value, stateRef, ttl, refsCache)

      if (!IS_SERVER && !isHydrated && keyRef.value) {
        revalidate()
      }
      isHydrated = false
    }, {
      immediate: true
    })
  } catch {
    // do nothing
  }

  const res: IResponse = {
    ...toRefs(stateRef),
    mutate: (data, opts: revalidateOptions) => revalidate(data, {
      ...opts,
      forceRevalidate: true
    })
  }

  return res
}

function isPromise<T> (p: any): p is Promise<T> {
  return p !== null && typeof p === 'object' && typeof p.then === 'function'
}

export { mutate }
export default useSWRV
