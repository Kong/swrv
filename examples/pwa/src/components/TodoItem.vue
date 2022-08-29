<template>
  <div>
    <div v-if="todo === undefined && !error">Loading...</div>
    {{ todo }}
    <div v-if="error">{{error}}</div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import useTodos from '../useTodos'

export default defineComponent({
  props: {
    id: {
      type: Number,
      required: true
    }
  },
  setup (props) {
    const { data, error } = useTodos(`/todos/${props.id}`)

    return {
      todo: data,
      error
    }
  }
})
</script>
