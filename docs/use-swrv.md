---
title: useSWRV
---

# {{ $frontmatter.title }} {#useSWRV}

```ts
const {
  data, error, isValidating, isLoading, mutate
} = useSWRV(key, fetcher, options)
```

## Parameters

### `key`

- **Type**: `IKey`
- **Required**: true

```ts
type IKey =
  | string
  | any[]
  | null
  | undefined
  | WatchSource<string | any[] | null | undefined>
```

A unique identifier for the request. This can be:

- A string
- An array (e.g., `[query, page]`), which gets hashed internally to produce a unique key
- `null` or `undefined`, which disables fetching
- A reactive reference or getter function returning one of the above types (string, array, `null`, or `undefined`)

### `fetcher`

- **Type**: `(...args: any) => Data | Promise<Data>`

A `Promise` returning function to fetch your data. If `null`, swrv will fetch from cache only and not revalidate. If omitted (i.e. `undefined`) then the fetch api will be used.

If the resolved `key` value is an array, the fetcher function will be called with each element of the array as an argument. Otherwise, the fetcher function will be called with the resolved `key` value as the first argument.

### `options`

- **Type**: `IConfig`

An object of configuration options. See [Config options](#config-options).

## Return Values

### `data`

- **Type**: `Ref<any>`

Data for the given key resolved by fetcher (or `undefined` if not loaded).

### `error`

- **Type**: `Ref<Error | undefined>`

Error thrown by fetcher (or `undefined`).

### `isValidating`

- **Type**: `Ref<boolean>`

Becomes `true` whenever there is an ongoing request **whether the data is loaded or not**.

### `isLoading`

- **Type**: `Ref<boolean>`

Becomes `true` when there is an ongoing request and **data is not loaded yet**.

### `mutate`

- **Type**: `(data?: Data, options?: RevalidateOptions) => void`

Function to trigger the validation manually. If `data` is provided, it will update the cache with the provided data.

```ts
type Data =
  | (() => Promise<any> | any)
  | Promise<any>
  | any

interface RevalidateOptions {
  shouldRetryOnError?: boolean,
  errorRetryCount?: number
}
```

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

- **Type**: `boolean | (err: Error) => boolean`
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
