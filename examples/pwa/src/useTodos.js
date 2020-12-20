import useSWRV from '../../../esm'
import LocalStorageCache from '../../../esm/cache/adapters/localStorage'
export default function useTodos (root, path) {
  const { data, error } = useSWRV(path, path => root.$api(`${path}`), {
    cache: new LocalStorageCache('swrv'),
    shouldRetryOnError: false
  })

  return {
    data,
    error
  }
}

