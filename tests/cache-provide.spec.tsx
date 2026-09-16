import { createApp, defineComponent, effectScope, inject, reactive, type App } from 'vue'
import { mount } from '@vue/test-utils'
import useSWRV, { getSwrvCache, mutate, provideSwrvCache, swrvCacheInjectionKey } from '../src/use-swrv'
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

    const wrapperA = mount(CompA, { global: { plugins: [withProvidedCache({ data: cacheA })] } })
    const wrapperB = mount(CompB, { global: { plugins: [withProvidedCache({ data: cacheB })] } })

    await tick(2)

    // The dedup and ref-fanout caches share the data cache's key space, so isolation only
    // holds if all three are isolated together — each mount's fetcher must fire independently.
    expect(fetcherA).toHaveBeenCalledTimes(1)
    expect(fetcherB).toHaveBeenCalledTimes(1)
    expect(cacheA.get('shared-key').data.data).toBe('RESULT-FROM-APP-A')
    expect(cacheB.get('shared-key').data.data).toBe('RESULT-FROM-APP-B')
    // Rendering proves the refs cache is isolated: the assertions above cannot see fan-out.
    expect(wrapperA.text()).toBe('RESULT-FROM-APP-A')
    expect(wrapperB.text()).toBe('RESULT-FROM-APP-B')
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
    // No component instance, so inject() cannot resolve a provide — must fall back silently.
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
        // Junk options: Vue passes them to install(), which must not read them as a bundle.
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

  it('uses a globally registered key so a separate copy of this package resolves the same provide', () => {
    const seeded = new SWRVCache<any>()
    let resolved: SwrvCacheBundle | undefined

    // Symbol.keyFor returns only for globally registered symbols, not a plain Symbol().
    expect(Symbol.keyFor(swrvCacheInjectionKey as symbol)).toBe('swrv.cache.v1')

    const keyFromOtherCopy = Symbol.for('swrv.cache.v1')

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

  it('writes to a bundle\'s caches when the standalone mutate() export is passed them', async () => {
    const app = createApp({ render: () => null })
    const bundle = provideSwrvCache(app)
    const registeredRef = reactive({ data: undefined, error: undefined, isValidating: true, isLoading: true, key: 'mutate-explicit-key' })
    bundle.refs.set('mutate-explicit-key', [registeredRef], 0)

    await mutate('mutate-explicit-key', 'from-mutate', bundle.data, 0, bundle.refs)

    expect(bundle.data.get('mutate-explicit-key').data.data).toBe('from-mutate')
    expect(registeredRef.data).toBe('from-mutate')
  })

  it('leaves the standalone mutate() export on the module singletons with no caches passed', async () => {
    // mutate() is called from handlers and callbacks, where inject() is illegal, so it must not
    // depend on an injection context to pick a cache.
    let called: SwrvCacheBundle | undefined

    const Comp = defineComponent({
      template: '<div />',
      setup () {
        called = inject(swrvCacheInjectionKey, undefined)
        mutate('mutate-nocache-key', 'from-mutate')

        return {}
      }
    })

    mount(Comp, { global: { plugins: [withProvidedCache()] } })

    await tick(2)

    expect(called).toBeDefined()
    expect(called!.data.get('mutate-nocache-key')).toBeUndefined()
  })

  it('hands back the bundle it provided, so entries can be seeded after the fact', () => {
    const app = createApp({ render: () => null })

    expect(getSwrvCache(app)).toBeUndefined()

    const bundle = provideSwrvCache(app)
    getSwrvCache(app)!.data.set('seeded-key', { data: 'seeded' }, 0)

    expect(getSwrvCache(app)).toBe(bundle)
    expect(bundle.data.get('seeded-key').data.data).toBe('seeded')
  })

  it('exposes the injection key so consumers can provide their own bundle directly', () => {
    expect(typeof swrvCacheInjectionKey).toBe('symbol')
  })
})
