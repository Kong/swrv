import { Ref, reactive, toRefs, onMounted, onUnmounted } from '@vue/composition-api'
import isDocumentVisible from './lib/is-document-visible'
import isOnline from './lib/is-online'
import { IConfig, fetcherFn } from './types'

const mutate = async (_, res) => {
  let { data, error } = res

  if (res && typeof res.then === 'function') {
    // `_data` is a promise
    try {
      data = await res
    } catch (err) {
      error = err
    }
  } else {
    data = res
  }

  return { data, error }
}

/**
 * Stale-While-Revalidate hook to handle fetching, caching, validation, and more...
 */
export default function useSWRV<Data = any, Error = any> (key: string, fn: fetcherFn<any>, config:IConfig = {
  refreshInterval: 0
}): {
  data: Ref<any>
  error: Ref<any>
} {
  let stateRef = reactive({
    data: undefined,
    error: null
  }) as { data: Data, error: Error }

  const revalidate = async () => {
    if (!isDocumentVisible()) { return }

    const newData = await mutate(key, fn(key))
    stateRef.data = newData.data
    stateRef.error = newData.error
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
      if (config.refreshInterval) {
        timer = setTimeout(tick, config.refreshInterval)
      }
    }

    if (config.refreshInterval) {
      timer = setTimeout(tick, config.refreshInterval)
    }

    document.addEventListener('visibilitychange', revalidate, false)
    window.addEventListener('focus', revalidate, false)
  })

  onUnmounted(() => {
    if (timer) { clearTimeout(timer) }

    document.removeEventListener('visibilitychange', revalidate, false)
    window.removeEventListener('focus', revalidate, false)
  })

  const stateRefs = toRefs(stateRef)
  revalidate()

  return stateRefs
}

export { mutate }
