<template>
  <div>
    <Post/>
  </div>
</template>

<script>
import Post from '../Post'

export default {
  components: { Post },
  transition: {
    name: 'fade',
    mode: 'out-in'
  }
}
</script>
