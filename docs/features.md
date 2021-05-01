---
title: Features
lang: en-US
---

# {{ $frontmatter.title }}

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

## Dependent Fetching

swrv also allows you to fetch data that depends on other data. It ensures the
maximum possible parallelism (avoiding waterfalls), as well as serial fetching
when a piece of dynamic data is required for the next data fetch to happen.

```vue
<template>
  <p v-if="!projects">loading...</p>
  <p v-else>You have {{ projects.length }} projects</p>
</template>

<script>
import { ref } from '@vue/composition-api'
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

### useSwrvState

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
    <div v-if="[STATES.SUCCESS, STATES.VALIDATING, STATES.STALE_IF_ERROR].includes(state)">
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

### Vuex

Most of the features of swrv handle the complex logic / ceremony that you'd have
to implement yourself inside a vuex store. All swrv instances use the same
global cache, so if you are using swrv alongside vuex, you can use global
watchers on resolved swrv returned refs. It is encouraged to wrap useSWRV in a
custom composable function so that you can do application level side effects if
desired (e.g. dispatch a vuex action when data changes to log events or perform
some logic).

Vue 3 example

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

## Cache

By default, a custom cache implementation is used to store fetcher response
data cache, in-flight promise cache, and ref cache. Response data cache can be 
customized via the `config.cache` property. Built in cache adapters:

### localStorage

A common usage case to have a better _offline_ experience is to read from
`localStorage`. Checkout the [PWA example](/examples/pwa/) for more inspiration.

```ts
import useSWRV from 'swrv'
import LocalStorageCache from 'swrv/dist/cache/adapters/localStorage'

function useTodos () {
  const { data, error } = useSWRV('/todos', undefined, {
    cache: new LocalStorageCache(),
    shouldRetryOnError: false
  })

  return {
    data,
    error
  }
}
```

### Serve from cache only

To only retrieve a swrv cache response without revalidating, you can set the fetcher function to `null` from the useSWRV
call. This can be useful when there is some higher level swrv composable that is always sending data to other instances,
so you can assume that composables with a `null` fetcher will have data available. This 
[isn't very intuitive](https://github.com/Kong/swrv/issues/148), so will be looking for ways to improve this api in the
future.

```ts
// Component A
const { data } = useSWRV('/api/config', fetcher)

// Component B, only retrieve from cache
const { data } = useSWRV('/api/config', null)
```
