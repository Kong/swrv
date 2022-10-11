---
title: Getting Started
---

# {{ $frontmatter.title }}

|   Version   |  Downloads | Build |
| --------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [![](https://img.shields.io/npm/v/swrv.svg)](https://www.npmjs.com/package/swrv) | [![npm](https://img.shields.io/npm/dm/swrv)](https://www.npmjs.com/package/swrv) | ![build](https://github.com/Kong/swrv/workflows/build/badge.svg) |

[[toc]]

## Overview

`swrv` (pronounced "swerve") is a library using [Vue Composition API](https://vuejs.org/guide/extras/composition-api-faq.html) hooks for remote data fetching. It is largely a port of [swr](https://github.com/zeit/swr).

The name “SWR” is derived from stale-while-revalidate, a cache invalidation strategy popularized by HTTP [RFC 5861](https://tools.ietf.org/html/rfc5861). SWR first returns the data from cache (stale), then sends the fetch request (revalidate), and finally comes with the up-to-date data again.

## Features

- 📡 Transport and protocol agnostic data fetching
- ⚡️ Fast page navigation
- ⏲ Interval polling
- ~~🖥 SSR support~~ (removed as of version `0.10.0` - [read more](https://github.com/Kong/swrv/pull/304))
- 🖖 Vue 3 Support
- 🖖 Vue 2.7.x Support (under the `v2-latest` tag on npm)
- 🖖 Vue <= 2.6.x Support (under the `legacy` tag on npm)
- Revalidation on focus
- Request deduplication
- TypeScript ready
- Minimal API
- Stale-if-error
- Customizable cache implementation
- Error Retry

With `swrv`, components will get a stream of data updates constantly and automatically. Thus, the UI will be always fast and reactive.

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
