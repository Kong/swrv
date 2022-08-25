<template>
  <div>
    <button @click="repoUrl = 'Kong/swrv'">Kong/swrv</button>
    <button @click="repoUrl = 'vercel/swr'">vercel/swr</button>
    <button @click="repoUrl = 'vuejs/core'">vuejs/core</button>
    <Repos :key="`${repoUrl}-${idx}`" v-for="idx in 5" :repoUrl="repoUrl" />
  </div>
</template>

<script>
import Repos from './Repos'

export default {
  components: { Repos },
  data () {
    return {
      repoUrl: 'Kong/swrv'
    }
  }
}
</script>

<style scoped>
body {
  font-size: 1rem;
}
</style>
