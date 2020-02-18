<template>
  <div id="app">
    <h1>Todos</h1>
    <Todos v-if="!todo" @view="id => todo = id" />
    <button v-if="todo" @click="todo = null">back</button>
    <Todo v-if="todo" :id="todo"/>
  </div>
</template>

<script>
import { ref } from '@vue/composition-api'
import Todos from './components/Todos.vue'
import Todo from './components/Todo.vue'

export default {
  name: 'App',
  components: {
    Todos,
    Todo
  },
  setup () {
    const todo = ref(null)

    return {
      todo
    }
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  margin-top: 1rem;
}
</style>
