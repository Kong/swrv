/**
 * Side-effect module for test runners: add it to your setup files and every component mounted
 * through @vue/test-utils gets its own cache bundle, with no per-mount or per-app wiring.
 *
 *   // vitest.config.ts
 *   test: { setupFiles: ['swrv/esm/testing'] }
 *
 * Without it, swrv's caches are module singletons shared by every mount in a file, so one test
 * can be served an entry left behind by an earlier one and its own fetcher never runs.
 *
 * Importing this from application code has no effect beyond registering a test-utils plugin, but
 * it is only meaningful in a test environment.
 */
import { config } from '@vue/test-utils'
import { swrvCachePlugin } from './plugin'

const plugins = config.global.plugins ?? []

if (!plugins.includes(swrvCachePlugin as any)) {
  config.global.plugins = [...plugins, swrvCachePlugin as any]
}
