/**
 * Side-effect module for test-runner setup files: every component mounted through
 * @vue/test-utils gets its own cache bundle. See "Per-app cache isolation" in the README.
 */
import { config } from '@vue/test-utils'
import { swrvCachePlugin } from './plugin'

const plugins = config.global.plugins ?? []

if (!plugins.includes(swrvCachePlugin)) {
  config.global.plugins = [...plugins, swrvCachePlugin]
}
