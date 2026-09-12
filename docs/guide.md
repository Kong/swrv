---
title: Getting Started
---

# {{ $frontmatter.title }}

|   Version   |  Downloads | Build |
| --------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [![](https://img.shields.io/npm/v/swrv.svg)](https://www.npmjs.com/package/swrv) | [![npm](https://img.shields.io/npm/dm/swrv)](https://www.npmjs.com/package/swrv) | [![build](https://github.com/Kong/swrv/workflows/build/badge.svg)](https://github.com/Kong/swrv) |

## Overview

`swrv` (pronounced "swerve") is a library using [Vue Composition API](https://vuejs.org/guide/extras/composition-api-faq.html) hooks for remote data fetching. It is largely a port of [swr](https://github.com/zeit/swr).

The name “SWR” is derived from stale-while-revalidate, a cache invalidation strategy popularized by HTTP [RFC 5861](https://tools.ietf.org/html/rfc5861). SWR first returns the data from cache (stale), then sends the fetch request (revalidate), and finally comes with the up-to-date data again.

## Features

- 📡 Transport and protocol agnostic data fetching
- ⚡️ Fast page navigation
- ⏲ Interval polling
- ~~🖥 SSR support~~ (removed as of version `0.10.0` - [read more](https://github.com/Kong/swrv/pull/304))
- 🖖 Vue 3 Support
- Revalidation on focus
- Request deduplication
- TypeScript ready
- Minimal API
- Stale-if-error
- Customizable cache implementation
- Error Retry

With `swrv`, components will get a stream of data updates constantly and automatically. Thus, the UI will be always fast and reactive.

## Installation

### Vue 3

```shell
yarn add swrv
```

`swrv` supports every Vue 3 minor release since `3.2` (`^3.2.0`). Testing and bug reports track the latest patch of each minor.

### Vue 2

Vue 2 reached end of life on 31 December 2023 and is no longer supported. The last releases to support it stay installable:

- Vue 2.7 — `swrv@0.10.0`, under the `v2-latest` tag
- Vue 2.6 and below — `swrv@0.9.6`, under the `legacy` tag. It uses the external `@vue/composition-api` plugin, set up as described in [a previous version of the README](https://github.com/Kong/swrv/blob/b621aac02b7780a4143c5743682070223e793b10/README.md).

## Usage

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

In this example, the Vue Hook `useSWRV` accepts a `key` and a `fetcher` function. `key` is a unique identifier of the request, normally the URL of the API. And the fetcher accepts key as its parameter and returns the data asynchronously.

`useSWRV` also returns 2 values: `data` and `error`. When the request (fetcher) is not yet finished, data will be `undefined`. And when we get a response, it sets `data` and `error` based on the result of fetcher and rerenders the component. This is because `data` and `error` are Vue [Refs](https://vuejs.org/api/reactivity-core.html#ref), and their values will be set by the fetcher response.

Note that fetcher can be any asynchronous function, so you can use your favorite data-fetching library to handle that part. When omitted, swrv falls back to the  browser [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).
