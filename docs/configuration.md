---
title: Configuration
---

# {{ $frontmatter.title }}

```ts
const { data, error, isValidating, mutate } = useSWRV(key, fetcher, options)
```

## Parameters

| Param     | Required | Description                                                                                                                                                                                                                                  |
| --------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `key`     | yes      | a unique key string for the request (or a reactive reference / watcher function / null) (advanced usage)                                                                                                                                     |
| `fetcher` |          | a Promise returning function to fetch your data. If `null`, swrv will fetch from cache only and not revalidate. If omitted (i.e. `undefined`) then the [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) api will be used. |
| `options` |          | an object of configuration options                                                                                                                                                                                                           |

## Return Values

- `data`: data for the given key resolved by fetcher (or undefined if not
  loaded)
- `error`: error thrown by fetcher (or undefined)
- `isValidating`: if there's a request or revalidation loading
- `mutate`: function to trigger the validation manually

## Config options

See [Config Defaults](https://github.com/Kong/swrv/blob/1587416e59dad12f9261e289b8cf63da81aa2dd4/src/use-swrv.ts#L43)

### `refreshInterval`

- **Type**: `number`
- **Default**: `0`

Polling interval in milliseconds. `0` means this is disabled.

### `dedupingInterval`

- **Type**: `number`
- **Default**: `2000`

Dedupe requests with the same key in this time span.

### `ttl`

- **Type**: `number`
- **Default**: `0`

Time to live of response data in cache. `0` means it stays around forever.

### `shouldRetryOnError`

- **Type**: `boolean`
- **Default**: `true`

Retry when fetcher has an error.

### `errorRetryInterval`

- **Type**: `number`
- **Default**: `5000`

Error retry interval.

### `errorRetryCount`

- **Type**: `number`
- **Default**: `5`

Max error retry count.

### `revalidateOnFocus`

- **Type**: `boolean`
- **Default**: `true`

Auto-revalidate when window gets focused.

### `revalidateDebounce`

- **Type**: `number`
- **Default**: `0`

Debounce in milliseconds for revalidation.

Useful for when a component is serving from the cache immediately, but then un-mounts soon thereafter (e.g. a user clicking "next" in pagination quickly) to avoid unnecessary fetches.

### `cache`

Caching instance to store response data in. See [src/lib/cache](src/lib/cache.ts), and the [Cache](/features#cache) section.
