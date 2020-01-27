<template>
  <div>
    <h1>{{ data }}</h1>
  </div>
</template>

<script>
import useSWR from '../../esm'

export default {
  setup () {
    const { data, error } = useSWR('example', () => {
      return 'Data here.'
    })

    return {
      data
    }
  }
}
</script>

<style lang="scss" scoped>
</style>
