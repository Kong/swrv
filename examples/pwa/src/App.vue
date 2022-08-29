<template>
  <div id="app">
    <h1>Todos</h1>
    <TodosList v-if="!todo" @view="id => todo = id" />
    <button v-if="todo" @click="todo = null">back</button>
    <TodoItem v-if="todo" :id="todo"/>
  </div>
</template>

<script>
import { ref } from 'vue'
import TodosList from './components/TodosList.vue'
import TodoItem from './components/TodoItem.vue'

export default {
  name: 'App',
  components: {
    TodosList,
    TodoItem
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
