import type { App, Plugin } from 'vue'
import { provideSwrvCache } from './use-swrv'

/**
 * Vue plugin that gives the installing app its own cache bundle.
 *
 * `provideSwrvCache` is not itself a plugin: Vue calls `install(app, ...options)`, so using it as
 * one (`app.use({ install: provideSwrvCache })`) would feed any plugin options into its
 * `overrides` parameter. This wrapper takes the app alone, so options passed to `app.use` are
 * ignored rather than reinterpreted as caches.
 *
 * Installing twice on one app is a no-op, so it is safe to combine with an explicit
 * `provideSwrvCache` call elsewhere in the same app's setup.
 */
export const swrvCachePlugin: Plugin = {
  install (app: App) {
    provideSwrvCache(app)
  }
}

export default swrvCachePlugin
