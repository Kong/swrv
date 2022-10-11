import useSWRV from 'swrv'
import LocalStorageCache from '../../../esm/cache/adapters/localStorage'

export default function useTodos (path) {
  const { data, error } = useSWRV(path, path => fetch(`https://jsonplaceholder.typicode.com${path}`).then(res => res.json()), {
    cache: new LocalStorageCache('swrv'),
    shouldRetryOnError: false
  })

  return {
    data,
    error
  }
}

