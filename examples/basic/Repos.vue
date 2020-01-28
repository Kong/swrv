<template>
  <div>
    <div v-if="successState">
      <pre>Number of repos in {{ org }}: {{ data.length }}</pre>
    </div>
    <div v-else-if="errorState">{{ error }}</div>
    <div v-else-if="loadingState">Loading...</div>
  </div>
</template>

<script>
import { computed } from '@vue/composition-api'
import useSWR from '../../esm'
const fetcher = key => fetch(key).then(resp => {
  return resp && resp.json()
}).then((data, res) => {
  if (data.message) {
    throw new Error(data.message)
  }
  return data
})

export default {
  props: {
    org: {
      type: String,
      required: true
    }
  },
  setup ({ org }) {
    const { data, error } = useSWR(`https://api.github.com/orgs/${org}/repos`, fetcher)

    const loadingState = computed(() => !data.value && !error.value)
    const errorState = computed(() => !data.value && error.value)
    const successState = computed(() => data.value && !error.value)

    return {
      data,
      error,
      loadingState,
      errorState,
      successState
    }
  }
}
</script>

<style lang="scss" scoped>

</style>
