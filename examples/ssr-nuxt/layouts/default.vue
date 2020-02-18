<template>
  <div id="app">
    <div class="w-100">
      <div class="d-flex justify-content-center">
        <button class="mr-2" appearance="btn-link" @click="$router.push('/')">Home</button>
        <button class="mr-2" appearance="outline-primary" @click="prevPage">Prev Page</button>
        <button class="mr-2" appearance="outline-primary" @click="nextPage">Next Page</button>
      </div>
      <div class="ml-4">current page: {{ currentPage }}</div>
    </div>
    <div class="py-4 px-4">
      <nuxt />
    </div>
  </div>
</template>

<script>
import { ref } from '@vue/composition-api'

export default {
  name: 'App',
  setup (props, ctx) {
    const currentPage = ref(parseInt(ctx.root.$route.params.id || 0, 0))

    function nextPage () {
      currentPage.value += 1
      ctx.root.$router.push({ name: 'id', params: { id: currentPage.value } })
    }

    function prevPage () {
      currentPage.value -= 1
      ctx.root.$router.push({ name: 'id', params: { id: currentPage.value } })
    }

    return {
      currentPage,
      prevPage,
      nextPage
    }
  }
}
</script>

<style>
#app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
