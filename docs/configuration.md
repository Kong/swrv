# Configuration

```ts
const { data, error, isValidating, mutate } = useSWRV(key, fetcher, options)
```

### Parameters

| Param     | Required | Description                                                                         |
| --------- | -------- | ----------------------------------------------------------------------------------- |
| `key`     | yes      | a unique key string for the request (or a watcher function / null) (advanced usage) |
| `fetcher` |          | a Promise returning function to fetch your data                                     |
| `options` |          | an object of configuration options                                                  |

### Return Values

- `data`: data for the given key resolved by fetcher (or undefined if not
  loaded)
- `error`: error thrown by fetcher (or undefined)
- `isValidating`: if there's a request or revalidation loading
- `mutate`: function to trigger the validation manually

### Config options

See [Config Defaults](https://github.com/Kong/swrv/blob/1587416e59dad12f9261e289b8cf63da81aa2dd4/src/use-swrv.ts#L43)

- `refreshInterval = 0` - polling interval in milliseconds. 0 means this is
  disabled.
- `dedupingInterval = 2000` - dedupe requests with the same key in this time
  span
- `ttl = 0` - time to live of response data in cache. 0 mean it stays around
  forever.
- `shouldRetryOnError = true` - retry when fetcher has an error
- `errorRetryInterval = 5000` - error retry interval
- `errorRetryCount: 5` - max error retry count
- `revalidateOnFocus = true` - auto revalidate when window gets focused
- `revalidateDebounce = 0` - debounce in milliseconds for revalidation. Useful
  for when a component is serving from the cache immediately, but then un-mounts
  soon thereafter (e.g. a user clicking "next" in pagination quickly) to avoid
  unnecessary fetches.
- `cache` - caching instance to store response data in. See
  [src/lib/cache](src/lib/cache.ts), and the [Cache](/features#cache) section.
