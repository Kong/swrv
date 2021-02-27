---
home: true
heroText: swrv
heroImage: /logo_45.png
tagline: Data fetching for Vue Composition Api
actionText: Get Started →
actionLink: /guide/getting-started
features:
- title: Feature-rich Data Fetching
  details: Transport and protocol agnostic data fetching, revalidation on focus,
    polling, in-flight de-duplication.
- title: Vue Composition Api
  details: Start developing with power of Vue 3, using the reactivity system of
    the Vue composition api. Supports both Vue 3 and @vue/composition-api
- title: Stale-while-revalidate
  details: Uses cache to serve pages fast, while revalidating data sources producing an eventually consistent UI.
footer: Copyright © 2020-present Kong
---

`swrv` (pronounced _"swerve"_) is a library for for data fetching. It is largely a port of [swr](https://github.com/vercel/swr).

The name “SWR” is derived from stale-while-revalidate, a cache invalidation
strategy popularized by HTTP RFC 5861. SWR first returns the data from cache 
(stale), then sends the fetch request (revalidate), and finally comes with the
up-to-date data again.

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
    const fetcher = key => fetch(key).then(res => res.json())
    const { data, error } = useSWRV('/api/user', key => fetcher)

    return {
      data,
      error
    }
  }
}
</script>
```

:sparkles: [Read the blogpost](https://guuu.io/2020/data-fetching-vue-composition-api/) 
introducing swrv

