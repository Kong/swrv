# swrv

[@vue/composition-api](https://github.com/vuejs/composition-api) hooks for remote data fetching.

Features:
  
- [x] Transport and protocol agnostic data fetching
- [x] Fast page navigation
- [x] Revalidation on focus
- [x] Interval polling
- [x] Request deduplication
- [] Local mutation
- [] Pagination
- [x] TypeScript ready
- [] SSR support
- [] Minimal API

## Installation

```sh
$ yarn add swrv
```

## Getting Started

```vue
<template>
  <div v-if="error">failed to load</div>
  <div v-if="!data">loading...</div>
  <div v-else>hello {{data.name}}</div>
</template>

<script>
import useSWR from 'swrv'

export default {
  name: 'Profile',

  setup() {
    return useSWR('/api/user', fetcher)
  }
}
</script>
```
