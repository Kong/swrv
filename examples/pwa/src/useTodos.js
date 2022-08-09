import useSWRV from '../../../esm'
import LocalStorageCache from '../../../esm/cache/adapters/localStorage'
import { getCurrentInstance } from 'vue'

export default function useTodos (path) {
  const instance = getCurrentInstance()
  const { data, error } = useSWRV(path, path => instance?.proxy?.$root.$api(`${path}`), {
    cache: new LocalStorageCache('swrv'),
    shouldRetryOnError: false
  })

  return {
    data,
    error
  }
}

