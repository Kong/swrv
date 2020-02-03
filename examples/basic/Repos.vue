<template>
  <div>
    <div v-if="error">{{ error.message }}</div>
    <div v-if="data">
      <pre>Number of repos in {{ org }}: {{ data.length }}</pre>
    </div>
    <div v-if="!data && !error">Loading...</div>
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
    const endpoint = `https://api.github.com/orgs/${org}/repos`
    const { data, error } = useSWR(endpoint, fetcher, {
      revalidateOnFocus: false
    })

    return {
      data,
      error
    }
  }
}
</script>

<style lang="scss" scoped>

</style>
