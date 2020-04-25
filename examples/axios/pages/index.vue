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
      <nuxt-link :to="`/?page=${page - 1}`" v-if="page > 1">Previous page</nuxt-link>
      <nuxt-link :to="`/?page=${page + 1}`">Next page</nuxt-link>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import useSWRV, { IConfig } from '../../../esm'
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'
import { ref, computed, Ref, watch } from '@vue/composition-api'

type RequestKey = (() => AxiosRequestConfig) | AxiosRequestConfig

function useRequest<Data = unknown, Error = unknown>(
  request: Ref<RequestKey>,
  config?: IConfig
) {
  return useSWRV<AxiosResponse<Data>, AxiosError<Error>>(
    () => JSON.stringify(request.value),
    key => axios(JSON.parse(key)),
    config
  )
}

export default Vue.extend({
  name: 'App',
  setup() {
    const page = ref(1)
    watch('$route.query.page', (queryPage: string) => {
      if (queryPage) page.value = +queryPage;
    })
    const request = computed(() => {
      const requestConfig: AxiosRequestConfig = {
        method: 'get',
        url: `https://dev.to/api/articles?tag=nuxt&state=rising&page=${page.value}`
      }
      return requestConfig
    })
    const { data, isValidating } = useRequest<Post[]>(request)
    function nextPage() {
      page.value += 1
    }
    return { data, nextPage, page, isValidating }
  }
})

type Post = {
  type_of: string
  id: number
  title: string
  description: string
  url: string
}
</script>
