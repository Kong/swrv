<p align="center">  
  <img src="logo.png" width="100px" />
</p>
<h1 align="center">swrv</h1>

![build](https://github.com/Kong/swrv/workflows/build/badge.svg)
[![](https://img.shields.io/npm/v/swrv.svg)](https://www.npmjs.com/package/swrv)

`swrv` (pronounced "swerve") is a library using the
[@vue/composition-api](https://github.com/vuejs/composition-api) for remote data
fetching. It is largely a port of [swr](https://github.com/zeit/swr).

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
- [x] SSR support

With `swrv`, components will get a stream of data updates constantly and
automatically. Thus, the UI will be always fast and reactive.

## Table of Contents

- [Installation](#installation)
- [Getting Started](#getting-started)
- [Api](#api)
  - [Parameters](#parameters)
  - [Return Values](#return-values)
  - [Config Options](#config-options)
- [Prefetching](#prefetching)
- [Stale-if-error](#stale-if-error)
- [State Management](#state-management)
- [Cache](#cache)
  - [localStorage](#localstorage)
- [Error Handling](#error-handling)
- [FAQ](#faq)
- [Contributors](#contributors)

## Installation

```sh
$ yarn add swrv
```

## Getting Started

```vue
<template>
  <div>
    <div v-if="error">failed to load</div>
    <div v-if="!data">loading...</div>
    <div v-else>hello {{ data.name }}</div>
  </div>
</template>

<script>
import useSWRV from 'swrv'

export default {
  name: 'Profile',

  setup() {
    const { data, error } = useSWRV('/api/user', fetcher)

    return {
      data,
      error,
    }
  },
}
</script>
```

In this example, `useSWRV` accepts a `key` and a `fetcher` function. `key` is a
unique identifier of the request, normally the URL of the API. And the fetcher
accepts key as its parameter and returns the data asynchronously.

`useSWRV` also returns 2 values: `data` and `error`. When the request (fetcher)
is not yet finished, data will be `undefined`. And when we get a response, it
sets `data` and `error` based on the result of fetcher and rerenders the
component. This is because `data` and `error` are Vue
[Refs](https://vue-composition-api-rfc.netlify.com/#detailed-design), and their
values will be set by the fetcher response.

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
  [src/lib/cache](src/lib/cache.ts), and [Cache](#cache) below.

## Prefetching

Prefetching can be useful for when you anticipate user actions, like hovering
over a link. SWRV exposes the `mutate` function so that results can be stored in
the SWRV cache at a predetermined time.

```ts
import { mutate } from 'swrv'

function prefetch() {
  mutate(
    '/api/data',
    fetch('/api/data').then((res) => res.json())
  )
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
      error,
    }
  },
}
</script>
```

## State Management

Sometimes you might want to know the exact state where swrv is during
stale-while-revalidate lifecyle. This is helpful when representing the UI as a
function of state. Here is one way to detect state using a user-land composable
`useSwrvState` function:

```js
import { ref, watchEffect } from '@vue/composition-api'

const STATES = {
  VALIDATING: 'VALIDATING',
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
  STALE_IF_ERROR: 'STALE_IF_ERROR',
}

export default function(data, error, isValidating) {
  const state = ref('idle')
  watchEffect(() => {
    if (data.value && isValidating.value) {
      state.value = STATES.VALIDATING
      return
    }
    if (data.value && error.value) {
      state.value = STATES.STALE_IF_ERROR
      return
    }
    if (data.value === undefined && !error.value) {
      state.value = STATES.PENDING
      return
    }
    if (data.value && !error.value) {
      state.value = STATES.SUCCESS
      return
    }
    if (data.value === undefined && error) {
      state.value = STATES.ERROR
      return
    }
  })

  return {
    state,
    STATES,
  }
}
```

And then in your template you can use it like so:

```vue
<template>
  <div>
    <div v-if="[STATES.ERROR, STATES.STALE_IF_ERROR].includes(state)">
      {{ error }}
    </div>
    <div v-if="[STATES.PENDING].includes(state)">Loading...</div>
    <div v-if="[STATES.VALIDATING].includes(state)">
      <!-- serve stale content without "loading" -->
    </div>
    <div
      v-if="
        [STATES.SUCCESS, STATES.VALIDATING, STATES.STALE_IF_ERROR].includes(
          state
        )
      "
    >
      {{ data }}
    </div>
  </div>
</template>

<script>
import { computed } from '@vue/composition-api'
import useSwrvState from '@/composables/useSwrvState'
import useSWRV from 'swrv'

export default {
  name: 'Repo',
  setup(props, { root }) {
    const page = computed(() => root.$route.params.id)
    const { data, error, isValidating } = useSWRV(
      () => `/api/${root.$route.params.id}`,
      fetcher
    )
    const { state, STATES } = useSwrvState(data, error, isValidating)

    return {
      state,
      STATES,
      data,
      error,
      page,
      isValidating,
    }
  },
}
</script>
```

## Cache

By default, a custom cache implementation is used to store both fetcher response
data cache, and in-flight promise cache. Response data cache can be customized
via the `config.cache` property.

```ts
import { SWRVCache } from 'swrv'

class NoCache extends SWRVCache {
  get(k: string, ttl: number): any {}
  set(k: string, v: any) {}
  delete(k: string) {}
}

const { data, error } = useSWRV(key, fetch, { cache: new NoCache() })
```

### localStorage

A common usage case to have a better _offline_ experience is to read from
`localStorage`. Checkout the [PWA example](/examples/pwa/) for more inspiration.

```js
class LocalStorageCache extends SWRVCache {
  STORAGE_KEY = 'swrv'

  private encode (storage) { return btoa(JSON.stringify(storage)) }
  private decode (storage) { return JSON.parse(atob(storage)) }

  get (k, ttl) {
    const item = localStorage.getItem(this.STORAGE_KEY)
    if (item) {
      return JSON.parse(atob(item))[k]
    }
  }

  set (k, v) {
    let payload = {}
    const storage = localStorage.getItem(this.STORAGE_KEY)
    if (storage) {
      payload = this.decode(storage)
      payload[k] = { data: v, ttl: Date.now() }
    } else {
      payload = { [k]: { data: v, ttl: Date.now() } }
    }

    localStorage.setItem(this.STORAGE_KEY, this.encode(payload))
  }
}

const myCache = new LocalStorageCache()

export default {
  setup () {
    return useSWRV(key, fetch, { cache: myCache })
  }
}
```

## Error Handling

Since `error` is returned as a Vue Ref, you can use watchers to handle any
onError callback functionality. Check out
[the test](https://github.com/Kong/swrv/blob/a063c4aa142a5a13dbd39496cefab7aef54e610c/tests/use-swrv.spec.tsx#L481).

```ts
export default {
  setup() {
    const { data, error } = useSWRV(key, fetch)

    function handleError(error) {
      console.error(error && error.message)
    }

    watch(error, handleError)

    return {
      data,
      error,
    }
  },
}
```

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

### How do I integrate with vuex?

Most of the features of swrv handle the complex logic / ceremony that you'd have
to implement yourself inside a vuex store. All swrv instances use the same
global cache, so if you are using swrv alongside vuex, it is preferred to use
global watchers if you want to do any global vuex-like functionality on resolved
data from the fetchers. It is also encouraged to wrap useSWRV in a custom
composable function so that you can do application level side effects if desired
(e.g. dispatch a vuex action when data changes or even customize the types to
match your fetching libraries responses). See the
[axios-typescript](/examples/axios-typescript-nuxt/pages/index.vue) (e.g.
`useRequest` function) example for inspiration.

## Contributors ✨

Thanks goes to these wonderful people
([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://guuu.io/"><img src="https://avatars2.githubusercontent.com/u/5770711?v=4" width="100px;" alt=""/><br /><sub><b>Darren Jennings</b></sub></a><br /><a href="https://github.com/Kong/swrv/commits?author=darrenjennings" title="Code">💻</a> <a href="https://github.com/Kong/swrv/commits?author=darrenjennings" title="Documentation">📖</a></td>
    <td align="center"><a href="https://atinux.com"><img src="https://avatars2.githubusercontent.com/u/904724?v=4" width="100px;" alt=""/><br /><sub><b>Sébastien Chopin</b></sub></a><br /><a href="https://github.com/Kong/swrv/commits?author=Atinux" title="Code">💻</a> <a href="#ideas-Atinux" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://github.com/chuca"><img src="https://avatars0.githubusercontent.com/u/864496?v=4" width="100px;" alt=""/><br /><sub><b>Fernando Machuca</b></sub></a><br /><a href="#design-chuca" title="Design">🎨</a></td>
    <td align="center"><a href="https://zeit.co"><img src="https://avatars0.githubusercontent.com/u/14985020?v=4" width="100px;" alt=""/><br /><sub><b>ZEIT</b></sub></a><br /><a href="#ideas-zeit" title="Ideas, Planning, & Feedback">🤔</a></td>
  </tr>
</table>

<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the
[all-contributors](https://github.com/all-contributors/all-contributors)
specification. Contributions of any kind welcome!
