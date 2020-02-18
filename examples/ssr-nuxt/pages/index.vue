<template functional>
  <div class="mb-3">
    <div title="swrv">Vue hooks for data fetching.
      <p class="mb-0">
        Try clicking into the different links to show that a slow api call will
        show "loading..." at first, but then SWRV will cache the response, so subsequent
        fetches will follow the stale-while-revalidate data fetching/cache strategy. For more
        information visit
        <a
          target="_blank"
          href="https://github.com/Kong/swrv"
        >https://github.com/Kong/swrv</a>
      </p>
    </div>
  </div>
</template>
