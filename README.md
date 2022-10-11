<p align="center">
  <img src="logo.png" width="100px" />
</p>
<h1 align="center">swrv</h1>

[![](https://img.shields.io/npm/v/swrv.svg)](https://www.npmjs.com/package/swrv) [![npm](https://img.shields.io/npm/dm/swrv)](https://www.npmjs.com/package/swrv) ![build](https://github.com/Kong/swrv/workflows/build/badge.svg)

`swrv` (pronounced "swerve") is a library using the [Vue Composition API](https://vuejs.org/guide/extras/composition-api-faq.html) for remote data fetching. It is largely a port of [swr](https://github.com/zeit/swr).

- [Documentation](https://docs-swrv.netlify.app/)

The name “SWR” is derived from stale-while-revalidate, a cache invalidation strategy popularized by HTTP [RFC 5861](https://tools.ietf.org/html/rfc5861). SWR first returns the data from cache (stale), then sends the fetch request (revalidate), and finally comes with the up-to-date data again.

Features:

- Transport and protocol agnostic data fetching
- Fast page navigation
- Interval polling
- ~~SSR support~~ (removed as of version `0.10.0` - [read more](https://github.com/Kong/swrv/pull/304))
- Vue 3 Support
- Revalidation on focus
- Request deduplication
- TypeScript ready
- Minimal API
- Stale-if-error
- Customizable cache implementation
- Error Retry

With `swrv`, components will get a stream of data updates constantly and automatically. Thus, the UI will be always fast and reactive.

## Table of Contents<!-- omit in toc -->

- [Installation](#installation)
  - [Vue 3](#vue-3)
  - [Vue 2.7](#vue-27)
  - [Vue 2.6 and below](#vue-26-and-below)
- [Getting Started](#getting-started)
- [Api](#api)
  - [Parameters](#parameters)
  - [Return Values](#return-values)
  - [Config options](#config-options)
- [Prefetching](#prefetching)
- [Dependent Fetching](#dependent-fetching)
- [Stale-if-error](#stale-if-error)
- [State Management](#state-management)
  - [useSwrvState](#useswrvstate)
  - [Vuex](#vuex)
- [Cache](#cache)
  - [localStorage](#localstorage)
  - [Serve from cache only](#serve-from-cache-only)
- [Error Handling](#error-handling)
- [FAQ](#faq)
  - [How is swrv different from the swr react library](#how-is-swrv-different-from-the-swr-react-library)
  - [Why does swrv make so many requests](#why-does-swrv-make-so-many-requests)
  - [How can I refetch swrv data to update it](#how-can-i-refetch-swrv-data-to-update-it)
- [Contributors ✨](#contributors-)

## Installation

The version of `swrv` you install depends on the Vue dependency in your project.

### Vue 3

```shell
# Install the latest version
yarn add swrv
```

### Vue 2.7

This version removes the dependency of the external `@vue/composition-api` plugin and adds `vue` to the `peerDependencies`, requiring a version that matches the following pattern: `>= 2.7.0 < 3`

```shell
# Install the 0.10.x version for Vue 2.7
yarn add swrv@v2-latest
```

### Vue 2.6 and below

If you're installing for Vue `2.6.x` and below, you may want to check out a [previous version of the README](https://github.com/Kong/swrv/blob/b621aac02b7780a4143c5743682070223e793b10/README.md) to view how to initialize `swrv` utilizing the external `@vue/composition-api` plugin.

```shell
# Install the 0.9.x version for Vue < 2.7
yarn add swrv@legacy
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

In this example, the Vue Hook `useSWRV` accepts a `key` and a `fetcher` function. `key` is a unique identifier of the request, normally the URL of the API. And the fetcher accepts key as its parameter and returns the data asynchronously.

`useSWRV` also returns 2 values: `data` and `error`. When the request (fetcher) is not yet finished, data will be `undefined`. And when we get a response, it sets `data` and `error` based on the result of fetcher and rerenders the component. This is because `data` and `error` are Vue [Refs](https://vuejs.org/api/reactivity-core.html#ref), and their values will be set by the fetcher response.

Note that fetcher can be any asynchronous function, so you can use your favorite data-fetching library to handle that part. When omitted, swrv falls back to the  browser [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).

## Api

```ts
const { data, error, isValidating, mutate } = useSWRV(key, fetcher, options)
```

### Parameters

| Param     | Required | Description                                                                                                                                                                                                                                  |
| --------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `key`     | yes      | a unique key string for the request (or a reactive reference / watcher function / null) (advanced usage)                                                                                                                                     |
| `fetcher` |          | a Promise returning function to fetch your data. If `null`, swrv will fetch from cache only and not revalidate. If omitted (i.e. `undefined`) then the [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) api will be used. |
| `options` |          | an object of configuration options                                                                                                                                                                                                           |

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
  [src/lib/cache](src/lib/cache.ts), and [Cache](#cache) below.

## Prefetching

Prefetching can be useful for when you anticipate user actions, like hovering over a link. SWRV exposes the `mutate` function so that results can be stored in the SWRV cache at a predetermined time.

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

## Dependent Fetching

swrv also allows you to fetch data that depends on other data. It ensures the maximum possible parallelism (avoiding waterfalls), as well as serial fetching when a piece of dynamic data is required for the next data fetch to happen.

```vue
<template>
  <p v-if="!projects">loading...</p>
  <p v-else>You have {{ projects.length }} projects</p>
</template>

<script>
import { ref } from 'vue'
import useSWRV from 'swrv'

export default {
  name: 'Profile',

  setup() {
    const { data: user } = useSWRV('/api/user', fetch)
    const { data: projects } = useSWRV(() => user.value && '/api/projects?uid=' + user.value.id, fetch)
    // if the return value of the cache key function is falsy, the fetcher
    // will not trigger, but since `user` is inside the cache key function,
    // it is being watched so when it is available, then the projects will
    // be fetched.

    return {
      user,
      projects
    }
  },
}
</script>
```

## Stale-if-error

One of the benefits of a stale content caching strategy is that the cache can be served when requests fail.`swrv` uses a [stale-if-error](https://tools.ietf.org/html/rfc5861#section-4) strategy and will maintain `data` in the cache even if a `useSWRV` fetch returns an `error`.

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
import { ref } from 'vue'
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

### useSwrvState

Sometimes you might want to know the exact state where swrv is during stale-while-revalidate lifecyle. This is helpful when representing the UI as a function of state. Here is one way to detect state using a user-land composable `useSwrvState` function:

```js
import { ref, watchEffect } from 'vue'

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
import { computed } from 'vue'
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

### Vuex

Most of the features of swrv handle the complex logic / ceremony that you'd have to implement yourself inside a vuex store. All swrv instances use the same global cache, so if you are using swrv alongside vuex, you can use global watchers on resolved swrv returned refs. It is encouraged to wrap useSWRV in a custom composable function so that you can do application level side effects if desired (e.g. dispatch a vuex action when data changes to log events or perform some logic).

Vue 3 example:

```vue
<script>
import { defineComponent, ref, computed, watch } from 'vue'
import { useStore } from 'vuex'
import useSWRV from 'swrv'
import { getAllTasks } from './api'

export default defineComponent({
  setup() {
    const store = useStore()

    const tasks = computed({
      get: () => store.getters.allTasks,
      set: (tasks) => {
        store.dispatch('setTaskList', tasks)
      },
    })

    const addTasks = (newTasks) => store.dispatch('addTasks', { tasks: newTasks })

    const { data } = useSWRV('tasks', getAllTasks)

    // Using a watcher, you can update the store with any changes coming from swrv
    watch(data, newTasks => {
      store.dispatch('addTasks', { source: 'Todoist', tasks: newTasks })
    })

    return {
      tasks
    }
  },
})
</script>
```

## Cache

By default, a custom cache implementation is used to store fetcher response data cache, in-flight promise cache, and ref cache. Response data cache can be customized via the `config.cache` property. Built in cache adapters:

### localStorage

A common usage case to have a better _offline_ experience is to read from `localStorage`. Checkout the [PWA example](https://github.com/Kong/swrv/tree/master/examples/pwa) for more inspiration.

```ts
import useSWRV from 'swrv'
import LocalStorageCache from 'swrv/dist/cache/adapters/localStorage'

function useTodos () {
  const { data, error } = useSWRV('/todos', undefined, {
    cache: new LocalStorageCache('swrv'),
    shouldRetryOnError: false
  })

  return {
    data,
    error
  }
}
```

### Serve from cache only

To only retrieve a swrv cache response without revalidating, you can set the fetcher function to `null` from the useSWRV call. This can be useful when there is some higher level swrv composable that is always sending data to other instances, so you can assume that composables with a `null` fetcher will have data available. This [isn't very intuitive](https://github.com/Kong/swrv/issues/148), so will be looking for ways to improve this api in the future.

```ts
// Component A
const { data } = useSWRV('/api/config', fetcher)

// Component B, only retrieve from cache
const { data } = useSWRV('/api/config', null)
```

## Error Handling

Since `error` is returned as a Vue Ref, you can use watchers to handle any onError callback functionality. Check out [the test](https://github.com/Kong/swrv/blob/a063c4aa142a5a13dbd39496cefab7aef54e610c/tests/use-swrv.spec.tsx#L481).

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

### How is swrv different from the [swr](https://github.com/zeit/swr) react library

#### Vue and Reactivity

The `swrv` library is meant to be used with the Vue Composition API (and eventually Vue 3) so it utilizes Vue's reactivity system to track dependencies and returns vue `Ref`'s as it's return values. This allows you to watch `data` or build your own computed props. For example, the key function is implemented as Vue `watch`er, so any changes to the dependencies in this function will trigger a revalidation in `swrv`.

#### Features

Features were built as needed for `swrv`, and while the initial development of `swrv` was mostly a port of swr, the feature sets are not 1-1, and are subject to diverge as they already have.

### Why does swrv make so many requests

The idea behind stale-while-revalidate is that you always get fresh data eventually. You can disable some of the eager fetching such as `config.revalidateOnFocus`, but it is preferred to serve a fast response from cache while also revalidating so users are always getting the most up to date data.

### How can I refetch swrv data to update it

Swrv fetcher functions can be triggered on-demand by using the `mutate` [return value](https://github.com/Kong/swrv/#return-values). This is useful when there is some event that needs to trigger a revalidation such a PATCH request that updates the initial GET request response data.

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://guuu.io/"><img src="https://avatars2.githubusercontent.com/u/5770711?v=4" width="100px;" alt=""/><br /><sub><b>Darren Jennings</b></sub></a><br /><a href="https://github.com/Kong/swrv/commits?author=darrenjennings" title="Code">💻</a> <a href="https://github.com/Kong/swrv/commits?author=darrenjennings" title="Documentation">📖</a></td>
    <td align="center"><a href="https://atinux.com"><img src="https://avatars2.githubusercontent.com/u/904724?v=4" width="100px;" alt=""/><br /><sub><b>Sébastien Chopin</b></sub></a><br /><a href="https://github.com/Kong/swrv/commits?author=Atinux" title="Code">💻</a> <a href="#ideas-Atinux" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://github.com/chuca"><img src="https://avatars0.githubusercontent.com/u/864496?v=4" width="100px;" alt=""/><br /><sub><b>Fernando Machuca</b></sub></a><br /><a href="#design-chuca" title="Design">🎨</a></td>
    <td align="center"><a href="https://zeit.co"><img src="https://avatars0.githubusercontent.com/u/14985020?v=4" width="100px;" alt=""/><br /><sub><b>ZEIT</b></sub></a><br /><a href="#ideas-zeit" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://www.adamdehaven.com"><img src="https://avatars.githubusercontent.com/u/2229946?v=4" width="100px;" alt=""/><br /><sub><b>Adam DeHaven</b></sub></a><br /><a href="https://github.com/Kong/swrv/commits?author=adamdehaven" title="Code">💻</a> <a href="https://github.com/Kong/swrv/commits?author=adamdehaven" title="Documentation">📖</a> <a href="#maintenance-adamdehaven" title="Maintenance">🚧</a></td>
  </tr>
</table>

<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
