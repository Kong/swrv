import { defineComponent, effectScope, inject, reactive, type App } from 'vue'
import { mount } from '@vue/test-utils'
import useSWRV, { mutate, provideSwrvCache, swrvCacheInjectionKey } from '../src/use-swrv'
import { swrvCachePlugin } from '../src/plugin'
import SWRVCache from '../src/cache'
import type { SwrvCacheBundle } from '../src/types'
import tick from './utils/tick'

const withProvidedCache = (overrides: Partial<SwrvCacheBundle> = {}) => ({
  install (app: App) {
    provideSwrvCache(app, overrides)
  }
})

describe('swrv cache provide/inject', () => {
  it('fully isolates two app instances sharing the same key — each fetcher fires independently', async () => {
    const fetcherA = jest.fn(() => 'RESULT-FROM-APP-A')
    const fetcherB = jest.fn(() => 'RESULT-FROM-APP-B')
    const cacheA = new SWRVCache<any>()
    const cacheB = new SWRVCache<any>()

    const CompA = defineComponent({
      template: '<div>{{ data }}</div>',
      setup () {
        return useSWRV('shared-key', fetcherA)
      }
    })
    const CompB = defineComponent({
      template: '<div>{{ data }}</div>',
      setup () {
        return useSWRV('shared-key', fetcherB)
      }
    })

    mount(CompA, { global: { plugins: [withProvidedCache({ data: cacheA })] } })
    mount(CompB, { global: { plugins: [withProvidedCache({ data: cacheB })] } })

    await tick(2)

    // The dedup and ref-fanout caches share the data cache's key space, so isolation only
    // holds if all three are isolated together — each mount's fetcher must fire independently.
    expect(fetcherA).toHaveBeenCalledTimes(1)
    expect(fetcherB).toHaveBeenCalledTimes(1)
    expect(cacheA.get('shared-key').data.data).toBe('RESULT-FROM-APP-A')
    expect(cacheB.get('shared-key').data.data).toBe('RESULT-FROM-APP-B')
  })

  it('lets an explicit per-call config.cache override the injected cache', async () => {
    const injected = new SWRVCache()
    const explicit = new SWRVCache()

    const Comp = defineComponent({
      template: '<div>{{ data }}</div>',
      setup () {
        return useSWRV('explicit-override-key', () => 'from-fetch', { cache: explicit })
      }
    })

    mount(Comp, { global: { plugins: [withProvidedCache({ data: injected })] } })

    await tick(2)

    expect(explicit.get('explicit-override-key')).toBeDefined()
    expect(injected.get('explicit-override-key')).toBeUndefined()
  })

  it('falls back to the module-singleton caches inside an effect scope with no component instance', async () => {
    // Mirrors the "useSWRV - effect scopes" describe block in use-swrv.spec.tsx: no component
    // instance exists, so inject() can't resolve a provided bundle — falls back to the
    // module-singleton caches without throwing or warning.
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const fetcher = jest.fn(() => 'SWR')
    const scope = effectScope()

    const refs = scope.run(() => useSWRV('effect-scope-cache-provide-key', fetcher))!
    await tick(2)

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(refs.data.value).toBe('SWR')
    expect(spy).not.toHaveBeenCalled()

    scope.stop()
    spy.mockRestore()
  })

  it('provideSwrvCache with no overrides creates three fresh, distinct cache instances', () => {
    let bundle: SwrvCacheBundle

    mount(defineComponent({
      template: '<div />',
      setup () {}
    }), {
      global: {
        plugins: [{
          install (app: App) {
            bundle = provideSwrvCache(app)
          }
        }]
      }
    })

    expect(bundle!.data).toBeInstanceOf(SWRVCache)
    expect(bundle!.promises).toBeInstanceOf(SWRVCache)
    expect(bundle!.refs).toBeInstanceOf(SWRVCache)
    expect(bundle!.data).not.toBe(bundle!.promises)
    expect(bundle!.data).not.toBe(bundle!.refs)
    expect(bundle!.promises).not.toBe(bundle!.refs)
  })

  it('is idempotent per app instance — a second call returns the first bundle instead of overwriting it', () => {
    let firstBundle: SwrvCacheBundle
    let secondBundle: SwrvCacheBundle

    mount(defineComponent({
      template: '<div />',
      setup () {}
    }), {
      global: {
        plugins: [{
          install (app: App) {
            firstBundle = provideSwrvCache(app)
            secondBundle = provideSwrvCache(app)
          }
        }]
      }
    })

    expect(secondBundle!).toBe(firstBundle!)
  })

  it('swrvCachePlugin ignores plugin options rather than reading them as cache overrides', () => {
    let bundle: SwrvCacheBundle | undefined

    mount(defineComponent({
      template: '<div />',
      setup () {
        bundle = inject(swrvCacheInjectionKey, undefined)

        return {}
      }
    }), {
      global: {
        // Vue calls install(app, ...options), so anything passed through app.use lands in the
        // second parameter — it must not be treated as a cache bundle.
        plugins: [[swrvCachePlugin, { data: 'not-a-cache', anything: true }] as any]
      }
    })

    expect(bundle).toBeDefined()
    expect(bundle!.data).toBeInstanceOf(SWRVCache)
    expect(bundle!.promises).toBeInstanceOf(SWRVCache)
    expect(bundle!.refs).toBeInstanceOf(SWRVCache)
  })

  it('throws rather than discarding overrides when a bundle is already provided on the app', () => {
    const seeded = new SWRVCache<any>()
    let thrown: Error | undefined

    mount(defineComponent({
      template: '<div />',
      setup () {}
    }), {
      global: {
        plugins: [{
          install (app: App) {
            provideSwrvCache(app)

            try {
              provideSwrvCache(app, { data: seeded })
            } catch (err) {
              thrown = err as Error
            }
          }
        }]
      }
    })

    expect(thrown).toBeDefined()
    expect(thrown!.message).toContain('overrides')
  })

  it('uses a globally registered key so an independently computed Symbol.for resolves the same provide', () => {
    const seeded = new SWRVCache<any>()
    let resolved: SwrvCacheBundle | undefined

    // A second copy of this package in the dependency graph computes its key the same way rather
    // than importing this module's binding.
    const keyFromOtherCopy = Symbol.for('swrv.cache')

    const Comp = defineComponent({
      template: '<div />',
      setup () {
        resolved = inject(keyFromOtherCopy as any, undefined) as SwrvCacheBundle | undefined

        return {}
      }
    })

    mount(Comp, {
      global: {
        plugins: [{
          install (app: App) {
            provideSwrvCache(app, { data: seeded })
          }
        }]
      }
    })

    expect(resolved).toBeDefined()
    expect(resolved!.data).toBe(seeded)
  })

  it('resolves the injected data cache for the standalone mutate() export when called within an active injection context', async () => {
    const injected = new SWRVCache<any>()

    const Comp = defineComponent({
      template: '<div />',
      setup () {
        mutate('mutate-inject-key', 'from-mutate')

        return {}
      }
    })

    mount(Comp, { global: { plugins: [withProvidedCache({ data: injected })] } })

    await tick(2)

    expect(injected.get('mutate-inject-key').data.data).toBe('from-mutate')
  })

  it('resolves the injected refs cache for the standalone mutate() export, fanning out to registered refs', async () => {
    const refs = new SWRVCache<any>()
    const registeredRef = reactive({ data: undefined, error: undefined, isValidating: true, isLoading: true, key: 'mutate-fanout-key' })
    refs.set('mutate-fanout-key', [registeredRef], 0)

    const Comp = defineComponent({
      template: '<div />',
      setup () {
        mutate('mutate-fanout-key', 'from-mutate')

        return {}
      }
    })

    mount(Comp, { global: { plugins: [withProvidedCache({ refs })] } })

    await tick(2)

    expect(registeredRef.data).toBe('from-mutate')
  })

  it('exposes the injection key so consumers can provide their own bundle directly', () => {
    expect(typeof swrvCacheInjectionKey).toBe('symbol')
  })
})
