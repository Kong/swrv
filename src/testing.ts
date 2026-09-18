/**
 * Side-effect module for test-runner setup files: every component mounted through
 * @vue/test-utils gets its own cache bundle. See "Per-app cache isolation" in the README.
 */
import { config } from '@vue/test-utils'
import { swrvCachePlugin } from './plugin.js'

const plugins = config.global.plugins ?? []

if (!plugins.includes(swrvCachePlugin)) {
  config.global.plugins = [...plugins, swrvCachePlugin]
}

// Cypress bundles its own copy of @vue/test-utils, so the `config` mutated above isn't the
// object its mount() reads from — warn rather than silently no-op.
if ((globalThis as { Cypress?: unknown }).Cypress) {
  console.warn(
    '[swrv] swrv/testing has no effect under Cypress: e2e doesn\'t mount components so it never ' +
    'needs this module, and component testing bundles its own @vue/test-utils. See ' +
    'https://github.com/Kong/swrv#runners-that-vendor-their-own-vuetest-utils'
  )
}
