---
title: Page Moved
---

# {{ $frontmatter.title }}

The page you are looking for has been moved to [`/use-swrv`](/use-swrv).

Automatically redirecting in {{ seconds }} seconds...

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vitepress'

let timeout
let seconds = ref(3)

onMounted(() => {
  const router = useRouter()

  timeout = setInterval(() => {
    seconds.value--

    if (seconds.value === 0) {
      clearInterval(timeout)
      router.go('/use-swrv')
    }
  }, 1000)
})

onUnmounted(() => {
  clearInterval(timeout)
})
</script>
