<template>
  <div>
    <button @click="org = 'kong'">Kong</button>
    <button @click="org = 'yyx990803'">Evan You</button>
    <button @click="org = 'vuejs'">Vue.js</button>
    <Repos :org="org" />
  </div>
</template>

<script>
import Repos from "./Repos";

export default {
  components: { Repos },
  data() {
    return {
      org: "vuejs"
    };
  }
};
</script>

<style scoped>
body {
  font-size: 1rem;
}
</style>
