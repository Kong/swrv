<template>
  <div>
    <div v-if="todo === undefined && !error">Loading...</div>
    {{ todo }}
    <div v-if="error">{{error}}</div>
  </div>
</template>

<script>
import { defineComponent } from '@vue/composition-api'
import useTodos from '../useTodos'

export default defineComponent({
  props: {
    id: {
      type: Number,
      required: true
    }
  },
  setup ({ id }, { root }) {
    const { data, error } = useTodos(root, `/todos/${id}`)

    return {
      todo: data,
      error
    }
  }
})
</script>
