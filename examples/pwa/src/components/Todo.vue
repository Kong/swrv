<template>
  <div>
    <div v-if="todo === undefined && !error">Loading...</div>
    <div v-if="error">{{error}}</div>
    {{ todo }}
  </div>
</template>

<script>
import useSWRV from 'swrv'

export default {
  props: {
    id: {
      type: Number,
      required: true
    }
  },
  setup ({ id }, { root }) {
    const { data: todo, error } = useSWRV(`/todos/${id}`, path => root.$api(`${path}`), {
      cache: root.$swrvCache
    })

    return {
      todo,
      error
    }
  }
}
</script>

<style lang="scss" scoped>
</style>
