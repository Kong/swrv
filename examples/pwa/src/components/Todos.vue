<template>
  <div class="hello">
    {{ error }}
    <table v-if="todos !== undefined">
      <thead>
        <th>id</th>
        <th>title</th>
      </thead>
      <tbody>
        <tr :key="todo.id" v-for="todo in todos">
          <td>
            {{ todo.id }}
          </td>
          <td>
            {{ todo.title }}
          </td>
          <td>
            <button @click="viewTodo(todo.id)">View</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import useSWRV from 'swrv'

export default {
  setup (props, { root, emit }) {
    const { data: todos, error } = useSWRV(`/todos`, path => root.$api(`${path}`), {
      cache: root.$swrvCache
    })

    function viewTodo (id) {
      emit('view', id)
    }

    return {
      todos,
      error,
      viewTodo
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>
