<template>
  <div>
    <button @click="org = 'kong'">kong</button>
    <button @click="org = 'zeit'">zeit</button>
    <button @click="org = 'vuejs'">vuejs</button>
    <Repos :key="`${org}-${idx}`" v-for="idx in 5" :org="org" />
  </div>
</template>

<script>
import Repos from './Repos'

export default {
  components: { Repos },
  data () {
    return {
      org: 'vuejs'
    }
  }
}
</script>

<style scoped>
body {
  font-size: 1rem;
}
</style>
