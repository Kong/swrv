import { reactive, watch, ref, toRefs, onMounted, onUnmounted } from '@vue/composition-api'
import isDocumentVisible from './lib/is-document-visible'
import isOnline from './lib/is-online'
import SWRCache from './lib/cache'
import { IConfig, IKey, IResponse, fetcherFn } from './types'

const DATA_CACHE = new SWRCache()
const PROMISES_CACHE = new SWRCache()

const defaultConfig : IConfig = {
  cache: DATA_CACHE,
  refreshInterval: 0,
  ttl: 0,
  dedupingInterval: 2000,
  revalidateOnFocus: true,
  onError: (_, __) => {}
}

/**
 * Main mutation function for receiving data from promises to change state and
 * set data cache
 */
const mutate = async (key: string, res: Promise<any>, cache = DATA_CACHE) => {
  let data, error, isValidating

  if (res && typeof res.then === 'function') {
    // `res` is a promise
    try {
      data = await res
    } catch (err) {
      error = err
    }
  } else {
    data = res
  }

  isValidating = false

  const newData = { data, error, isValidating }
  if (typeof data !== 'undefined') {
    cache.set(key, newData)
  }

  return newData
}

/**
 * Stale-While-Revalidate hook to handle fetching, caching, validation, and more...
 */
export default function useSWRV<Data = any, Error = any> (key: IKey, fn: fetcherFn<any>, config?: IConfig): IResponse {
  config = {
    ...defaultConfig,
    ...config
  }

  let keyRef = typeof key === 'function' ? (key as any) : ref(key)

  const stateRef = reactive({
    data: undefined,
    error: null,
    isValidating: true
  }) as { data: Data, error: Error, isValidating: boolean, revalidate: Function }

  /**
   * Revalidate the cache, mutate data
   */
  const revalidate = async (keyVal = keyRef.value) => {
    if (!isDocumentVisible()) { return }
    const cacheItem = config.cache.get(keyVal, config.ttl)
    let newData = cacheItem && cacheItem.data

    stateRef.isValidating = true
    if (newData) {
      stateRef.data = newData.data
      stateRef.error = newData.error
    }

    /**
     * Currently getter's of SWRCache will evict
     */
    const promiseFromCache = PROMISES_CACHE.get(keyVal, config.dedupingInterval)
    if (!promiseFromCache) {
      const newPromise = fn(keyVal)
      PROMISES_CACHE.set(keyVal, newPromise)
      newData = await mutate(keyVal, newPromise, config.cache)
      if (typeof newData.data !== 'undefined') {
        stateRef.data = newData.data
      }
      if (newData.error) {
        stateRef.error = newData.error
        config.onError(newData.error, keyVal)
      }
      stateRef.isValidating = newData.isValidating
    } else {
      newData = await mutate(keyVal, promiseFromCache.data, config.cache)
      if (typeof newData.data !== 'undefined') {
        stateRef.data = newData.data
      }
      if (newData.error) {
        stateRef.error = newData.error
        config.onError(newData.error, keyVal)
      }
      stateRef.isValidating = newData.isValidating
    }

    PROMISES_CACHE.delete(keyVal)
  }

  try {
    watch(keyRef, (val) => {
      revalidate(val)
    })
  } catch {
    // do nothing
  }

  /**
   * Setup polling
   */
  let timer = null
  onMounted(() => {
    const tick = async () => {
      if (!stateRef.error && isDocumentVisible() && isOnline()) {
        // only revalidate when the page is visible
        // if API request errored, we stop polling in this round
        // and let the error retry function handle it
        await revalidate()
      } else {
        if (timer) { clearTimeout(timer) }
      }
      if (config.refreshInterval) {
        timer = setTimeout(tick, config.refreshInterval)
      }
    }

    if (config.refreshInterval) {
      timer = setTimeout(tick, config.refreshInterval)
    }
    if (config.revalidateOnFocus) {
      document.addEventListener('visibilitychange', revalidate, false)
      window.addEventListener('focus', revalidate, false)
    }
  })

  /**
   * Teardown
   */
  onUnmounted(() => {
    if (timer) { clearTimeout(timer) }
    if (config.revalidateOnFocus) {
      document.removeEventListener('visibilitychange', revalidate, false)
      window.removeEventListener('focus', revalidate, false)
    }
  })

  return {
    ...toRefs(stateRef),
    revalidate
  }
}

export { mutate }
