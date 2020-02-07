# swrv

![build](https://github.com/Kong/swrv/workflows/build/badge.svg)
[![](https://img.shields.io/npm/v/swrv.svg)](https://www.npmjs.com/package/swrv)

`swrv` (pronounced "swerve") is a library using
[@vue/composition-api](https://github.com/vuejs/composition-api) hooks for
remote data fetching. It is largely a port of
[swr](https://github.com/zeit/swr).

The name “SWR” is derived from stale-while-revalidate, a cache invalidation
strategy popularized by HTTP [RFC 5861](https://tools.ietf.org/html/rfc5861).
SWR first returns the data from cache (stale), then sends the fetch request
(revalidate), and finally comes with the up-to-date data again.

Features:

- [x] Transport and protocol agnostic data fetching
- [x] Fast page navigation
- [x] Revalidation on focus
- [x] Interval polling
- [x] Request deduplication
- [x] TypeScript ready
- [x] Minimal API
- [x] stale-if-error
- [x] Customizable cache implementation

With `swrv`, components will get a stream of data updates constantly and
automatically. Thus, the UI will be always fast and reactive.

## Installation

```sh
$ yarn add swrv
```

## Getting Started

```vue
<template>
  <div v-if="error">failed to load</div>
  <div v-if="!data">loading...</div>
  <div v-else>hello {{ data.name }}</div>
</template>

<script>
import useSWRV from 'swrv'

export default {
  name: 'Profile',

  setup() {
    const { data, error } = useSWRV('/api/user', fetcher)

    return {
      data,
      error
    }
  }
}
</script>
```

In this example, the Vue Hook `useSWRV` accepts a `key` and a `fetcher`
function. `key` is a unique identifier of the request, normally the URL of the
API. And the fetcher accepts key as its parameter and returns the data
asynchronously.

`useSWRV` also returns 2 values: `data` and `error`. When the request (fetcher)
is not yet finished, data will be `undefined`. And when we get a response, it
sets `data` and `error` based on the result of fetcher and rerenders the
component. This is because `data` and `error` are Vue
[Refs](https://vue-composition-api-rfc.netlify.com/#detailed-design), and have
dependencies on the fetcher response.

Note that fetcher can be any asynchronous function, so you can use your favorite
data-fetching library to handle that part.

## Api

```ts
const { data, error, isValidating, revalidate } = useSWRV(key, fetcher, options)
```

### Parameters

| Param     | Required | Description                                                                         |
| --------- | -------- | ----------------------------------------------------------------------------------- |
| `key`     | yes      | a unique key string for the request (or a function / array / null) (advanced usage) |
| `fetcher` | yes      | a Promise returning function to fetch your data (details)                           |
| `options` |          | an object of configuration options                                                  |

### Return Values

- `data`: data for the given key resolved by fetcher (or undefined if not
  loaded)
- `error`: error thrown by fetcher (or undefined)
- `isValidating`: if there's a request or revalidation loading
- `revalidate`: function to trigger the validation manually

### Config options

- `refreshInterval = 0` - polling interval in milliseconds
- `dedupingInterval = 2000` - dedupe requests with the same key in this time
  span
- `ttl = 0` - time to live of response data in cache
- `revalidateOnFocus = true` - auto revalidate when window gets focused
- `revalidateDebounce = 0` - debounce in milliseconds for revalidation. Useful
  for when a component is serving from the cache immediately, but then un-mounts
  soon thereafter (e.g. a user clicking "next" in pagination quickly) to avoid
  unnecessary fetches.
- `cache` - caching instance to store response data in. See
  [src/lib/cache](src/lib/cache.ts)
- `onError` - callback function when a request returns an error

## Prefetching

Prefetching can be useful for when you anticipate user actions, like hovering
over a link. SWRV exposes the `mutate` function so that results can be stored in
the SWRV cache at a predetermined time.

```ts
import { mutate } from 'swrv'

function prefetch() {
  mutate( '/api/data', fetch('/api/data').then(res => res.json()) )
  // the second parameter is a Promise
  // SWRV will use the result when it resolves
}
```

## Stale-if-error

One of the benefits of a stale content caching strategy is that the cache can be
served when requests fail.`swrv` uses a
[stale-if-error](https://tools.ietf.org/html/rfc5861#section-4) strategy and
will maintain `data` in the cache even if a `useSWRV` fetch returns an `error`.

```vue
<template>
  <div v-if="error">failed to load</div>
  <div v-if="data === undefined && !error">loading...</div>
  <p v-if="data">
    hello {{ data.name }} of {{ data.birthplace }}. This content will continue
    to appear even if future requests to {{ endpoint }} fail!
  </p>
</template>

<script>
import { ref } from '@vue/composition-api'
import useSWRV from 'swrv'

export default {
  name: 'Profile',

  setup() {
    const endpoint = ref('/api/user/Geralt')
    const { data, error } = useSWRV(endpoint.value, fetch)

    return {
      endpoint,
      data,
      error
    }
  }
}
</script>
```

## Cache

By default, a custom cache implementation is used to store both fetcher response
data cache, and in-flight promise cache. Response data cache can be customized
via the `config.cache` property.

```ts
import { SWRCache } from 'swrv'

class NoCache extends SWRCache {
  get(k: string, ttl: number): any {}
  set(k: string, v: any) {}
  delete(k: string) {}
}

const { data, error } = useSWRV(key, fn, { cache: new NoCache() })
```

Leaving it up to the reader to implement their own cache if desired. For
instance, a common usage case to have a better _offline_ experience is to read
from `localStorage`.

## FAQ

### How is swrv different from the [swr](https://github.com/zeit/swr) react library?

#### Vue and Reactivity

The `swrv` library is meant to be used with the @vue/composition-api (and
eventually Vue 3) library so it utilizes Vue's reactivity system to track
dependencies and returns vue `Ref`'s as it's return values. This allows you to
watch `data` or build your own computed props. For example, the key function is
implemented as Vue `watch`er, so any changes to the dependencies in this
function will trigger a revalidation in `swrv`.

#### Features

Features were built as needed for `swrv`, and while the initial development of
`swrv` was mostly a port of swr, the feature sets are not 1-1, and are subject
to diverge as they already have.

## Authors

- Darren Jennings [@darrenjennings](https://twitter.com/darrenjennings)

Thanks to [Zeit](https://zeit.co/) for creating
[swr](https://github.com/zeit/swr), which this library heavily borrows from, and
would not exist without it as inspiration!
