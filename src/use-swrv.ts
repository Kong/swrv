import { Ref, reactive, toRefs, onMounted, onUnmounted } from '@vue/composition-api'
import isDocumentVisible from './lib/is-document-visible'
import isOnline from './lib/is-online'
import SWRCache from './lib/cache'
import { IConfig, IKey, fetcherFn } from './types'

const DATA_CACHE = new SWRCache()
const PROMISES_CACHE = new SWRCache()

const mutate = async (key, res, cache = DATA_CACHE) => {
  let { data, error } = res

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

  const newData = { data, error }

  cache.set(key, newData)

  return newData
}

/**
 * Stale-While-Revalidate hook to handle fetching, caching, validation, and more...
 */
export default function useSWRV<Data = any, Error = any> (key: IKey, fn: fetcherFn<any>, {
  refreshInterval = 0,
  cache = DATA_CACHE,
  ttl = 0,
  dedupingInterval = 2000
}: IConfig = {
  refreshInterval: 0,
  cache: DATA_CACHE,
  ttl: 0,
  dedupingInterval: 2000 }): {
  data: Ref<any>
  error: Ref<any>
} {
  const theKey = typeof key === 'function' ? key() : key
  const stateRef = reactive({
    data: undefined,
    error: null
  }) as { data: Data, error: Error }

  const revalidate = async () => {
    if (!isDocumentVisible()) { return }

    let newData = cache.get(theKey, ttl)
    if (newData) {
      stateRef.data = newData.data
      stateRef.error = newData.error
    }

    const promiseFromCache = PROMISES_CACHE.get(theKey, dedupingInterval)
    if (!promiseFromCache) {
      const newPromise = fn(theKey)
      PROMISES_CACHE.set(theKey, newPromise)
      newData = await mutate(key, newPromise, cache)
      stateRef.data = newData.data
      stateRef.error = newData.error
    } else {
      newData = await mutate(key, promiseFromCache, cache)
      stateRef.data = newData.data
      stateRef.error = newData.error
    }

    PROMISES_CACHE.delete(theKey)
  }

  // set up polling
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
      if (refreshInterval) {
        timer = setTimeout(tick, refreshInterval)
      }
    }

    if (refreshInterval) {
      timer = setTimeout(tick, refreshInterval)
    }

    document.addEventListener('visibilitychange', revalidate, false)
    window.addEventListener('focus', revalidate, false)
  })

  onUnmounted(() => {
    if (timer) { clearTimeout(timer) }

    document.removeEventListener('visibilitychange', revalidate, false)
    window.removeEventListener('focus', revalidate, false)
  })

  revalidate()

  // Turn reactive props into refs
  return toRefs(stateRef)
}

export { mutate }
