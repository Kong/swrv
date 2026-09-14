import type { App, Plugin } from 'vue'
import { provideSwrvCache } from './use-swrv'

/**
 * Vue plugin that gives the installing app its own cache bundle. Takes the app alone: Vue calls
 * `install(app, ...options)`, so `{ install: provideSwrvCache }` would read plugin options as
 * `overrides`.
 */
export const swrvCachePlugin: Plugin = {
  install (app: App) {
    provideSwrvCache(app)
  }
}

export default swrvCachePlugin
