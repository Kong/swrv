<template>
  <div class="mt-3">
    <div>
      <h2 v-if="data && data.title">Post {{ page }}: {{ data.title}}</h2>
      <div>
        <div v-if="error">{{ error }}</div>
        <div v-if="data === undefined && !error">Loading...</div>
        <div v-if="data">
          <em>By user {{data.userId}}</em>
          <div>{{data.body}}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from '@vue/composition-api'
import useSWRV from 'swrv'

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function fetcher (id) {
  await sleep(500)
  return fetch(`https://jsonplaceholder.typicode.com/posts/${id}`)
    .then(res => res.json())
}

export default {
  setup (props, context) {
    const page = computed(() => context.root.$route.params.id)

    const { data, error, isValidating } = useSWRV(
      () => page.value, fetcher)

    return {
      data,
      error,
      page,
      isValidating
    }
  }
}
</script>
