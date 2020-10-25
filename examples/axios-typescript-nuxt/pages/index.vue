<template>
  <div id="app">
    <div v-if="data">
      <h3>Page {{ page }}</h3>
      <ul>
        <li v-for="article in data.data">
          <a :href="article.url">{{ article.title }}</a>
        </li>
      </ul>
      <div v-if="isValidating">
        loading...
      </div>
      <nuxt-link :to="`/?page=${page - 1}`" v-if="page > 1">
        Previous page
      </nuxt-link>
      <nuxt-link :to="`/?page=${page + 1}`">Next page</nuxt-link>
    </div>
  </div>
</template>

<script lang="ts">
import useSWRV, { IConfig } from '../../../esm'
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'
import {
  ref,
  computed,
  Ref,
  watch,
  defineComponent
} from '@vue/composition-api'

type RequestKey = (() => AxiosRequestConfig) | AxiosRequestConfig

function useRequest<Data = unknown, Error = unknown> (
  request: Ref<RequestKey>,
  config?: IConfig
) {
  return useSWRV<AxiosResponse<Data>, AxiosError<Error>>(
    () => JSON.stringify(request.value),
    key => axios(JSON.parse(key)),
    config
  )
}

export default defineComponent({
  name: 'App',
  setup (props, context) {
    const page = ref(1)
    watch(
      () => context.root.$route.query.page,
      queryPage => {
        page.value = parseNumberQueryParam(queryPage, 1)
      }
    )
    const request = computed(() => {
      const requestConfig: AxiosRequestConfig = {
        method: 'get',
        url: `https://dev.to/api/articles?tag=nuxt&state=rising&page=${page.value}`
      }
      return requestConfig
    })
    const { data, isValidating } = useRequest<Post[]>(request)
    function nextPage () {
      page.value += 1
    }
    return { data, nextPage, page, isValidating }
  }
})

type QueryParam = string | (string | null)[]

function parseNumberQueryParam (
  param: QueryParam | undefined,
  defaultValue: number
): number {
  if (!param) return defaultValue
  const p = Array.isArray(param) ? param[0] : param
  if (p) {
    const int = parseInt(p)
    if (isFinite(int)) return int
  }
  return defaultValue
}

type Post = {
  type_of: string
  id: number
  title: string
  description: string
  url: string
}
</script>
