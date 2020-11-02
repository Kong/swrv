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
import useSWRV from 'swrv'

const fetcher = key => fetch(key).then(resp => {
  return resp && resp.json()
}).then(data => {
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
  setup (props) {
    const endpoint = `https://api.github.com/orgs/${props.org}/repos`
    const { data, error } = useSWRV(endpoint, fetcher, {
      revalidateOnFocus: false
    })

    return {
      data,
      error
    }
  }
}
</script>
