<template>
  <h1>Hello Vite + Vue 3!</h1>
  <p>Edit ./App.vue to test hot module replacement (HMR).</p>
  <HelloWorld :count="count" />
  <p>
    <span>Count is: {{ count }}</span>
  </p>
  <button @click="count++">increment</button>
  <button @click="count--">decrement</button>
</template>

<script>
import HelloWorld from './components/HelloWorld.vue'

export default {
  components: { HelloWorld },
  data: () => ({ count: 1 })
}
</script>

<style scoped>
h1 {
  color: #4fc08d;
}

h1, p {
  font-family: Arial, Helvetica, sans-serif;
}
</style>
