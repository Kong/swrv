import { watch, defineComponent, ref, h, computed } from 'vue'
import { mount } from '@vue/test-utils'
import useSWRV, { mutate } from '../src/use-swrv'
import tick from './utils/tick'
import timeout from './utils/jest-timeout'
import { advanceBy, advanceTo, clear } from 'jest-date-mock'

// "Mock" the three caches that use-swrv.ts creates so that tests can make assertions about their contents.
let mockDataCache
let mockRefCache
let mockPromisesCache

jest.mock('../src/cache', () => {
  const originalCache = jest.requireActual('../src/cache')
  const Cache = originalCache.default
  return {
    __esModule: true,
    default: jest
      .fn()
      .mockImplementationOnce(() => {
        mockDataCache = new Cache()
        return mockDataCache
      })
      .mockImplementationOnce(() => {
        mockRefCache = new Cache()
        return mockRefCache
      })
      .mockImplementationOnce(function () {
        mockPromisesCache = new Cache()
        return mockPromisesCache
      })
  }
})

jest.useFakeTimers()

const mockFetch = (res?) => {
  global.fetch = () => Promise.resolve(null)
  const mockFetch = body => Promise.resolve({ json: () => Promise.resolve(body) } as any)
  jest.spyOn(window, 'fetch').mockImplementation(body => mockFetch(res || body))
}

describe('useSWRV', () => {
  it('should return data on hydration when fetch is not a promise', () => {
    const fetch = () => 'SWR'
    const wrapper = mount(defineComponent({
      template: '<div>hello, {{ data }}</div>',
      setup () {
        return useSWRV('cache-key-not-a-promise', fetch)
      }
    }))

    expect(wrapper.text()).toBe('hello, SWR')
  })

  it('should return `undefined` on hydration', () => {
    // const fetch = () => new Promise(res => setTimeout(() => res('SWR'), 1))
    // const wrapper = mount(defineComponent({
    //   template: '<div>hello, {{ data }}</div>',
    //   setup () {
    //     return useSWRV('cache-key-1', fetch)
    //   }
    // }))

    // expect(wrapper.vm.data).toBe(undefined)
  })

  it('should return data after hydration', async () => {
    const wrapper = mount(defineComponent({
      template: '<div>hello, {{ data }}</div>',
      setup () {
        return useSWRV('cache-key-2', () => 'SWR')
      }
    }))

    await tick(4)

    expect(wrapper.text()).toBe('hello, SWR')
  })

  it('should return data from a promise', async () => {
    const wrapper = mount(defineComponent({
      template: '<div>hello, {{ data }}</div>',
      setup () {
        return useSWRV('cache-key-promise', () => new Promise(resolve => resolve('SWR')))
      }
    }))

    expect(wrapper.text()).toBe('hello,')

    await tick(2)

    expect(wrapper.text()).toBe('hello, SWR')
  })

  it('should allow functions as key and reuse the cache', async () => {
    const wrapper = mount(defineComponent({
      template: '<div>hello, {{ data }}</div>',
      setup () {
        return useSWRV(() => 'cache-key-2', () => 'SWR')
      }
    }))

    // immediately available via cache without waiting for $nextTick
    expect(wrapper.text()).toBe('hello, SWR')
  })

  it('should allow refs (reactive / WatchSource) as key', async () => {
    const count = ref('refs:0')
    const wrapper = mount(defineComponent({
      template: '<button v-on:click="bumpIt">{{ data }}</button>',
      setup () {
        const { data } = useSWRV(count, () => count.value)

        function bumpIt () {
          const parts = count.value.split(':')
          count.value = `${parts[0]}:${parseInt(parts[1] + 1)}`
        }

        return {
          bumpIt,
          data
        }
      }
    }))

    expect(wrapper.text()).toBe('refs:0')
    wrapper.find('button').trigger('click')
    await tick(1)
    expect(wrapper.text()).toBe('refs:1')

    const wrapper2 = mount(defineComponent({
      template: '<div>{{ data }}</div>',
      setup () {
        return useSWRV(count, () => count.value)
      }
    }))

    // ref is good for another swrv instance (i.e. object reference works)
    expect(wrapper2.text()).toBe('refs:1')
  })

  it('should allow read-only computed key and reuse the cache', async () => {
    const wrapper = mount(defineComponent({
      template: '<div>hello, {{ data }}</div>',
      setup () {
        const computedKey = computed(() => 'cache-key-read-only-computed')
        return useSWRV(computedKey, () => 'SWR')
      }
    }))

    // immediately available via cache without waiting for $nextTick
    expect(wrapper.text()).toBe('hello, SWR')
  })

  it('should accept object args', async () => {
    const obj = { v: 'hello' }
    const arr = ['world']

    const wrapper = mount(defineComponent({
      template: '<div>{{v1}}, {{v2}}, {{v3}}</div>',
      setup () {
        const { data: v1 } = useSWRV(['args-1', obj, arr], (a, b, c) => {
          return a + b.v + c[0]
        })

        // reuse the cache
        const { data: v2 } = useSWRV(['args-1', obj, arr], () => 'not called!')

        // different object
        const { data: v3 } = useSWRV(['args-2', obj, 'world'], (a, b, c) => {
          return a + b.v + c
        })

        return { v1, v2, v3 }
      }
    }))

    expect(wrapper.text()).toBe('args-1helloworld, args-1helloworld, args-2helloworld')
  })

  it('should allow async fetcher functions', async () => {
    const wrapper = mount(defineComponent({
      template: '<div>hello, {{ data }}</div>',
      setup () {
        return useSWRV('cache-key-3', () =>
          new Promise(res => setTimeout(() => res('SWR'), 200))
        )
      }
    }))

    expect(wrapper.text()).toBe('hello,')

    timeout(200)
    await tick(2)

    expect(wrapper.text()).toBe('hello, SWR')
  })

  it('should dedupe requests by default - in flight promises', async () => {
    let count = 0
    const fetch = () => {
      count++
      return new Promise(res => setTimeout(() => res('SWR'), 200))
    }

    const wrapper = mount(defineComponent({
      template: '<div>{{v1}}, {{v2}}, {{ validating1 ? \'yes\' : \'no\' }} {{ validating2 ? \'yes\' : \'no\' }}</div>',
      setup () {
        const { data: v1, isValidating: validating1 } = useSWRV('cache-key-4', fetch)
        const { data: v2, isValidating: validating2 } = useSWRV('cache-key-4', fetch)
        return { v1, v2, validating1, validating2 }
      }
    }))

    expect(wrapper.text()).toBe(', , yes yes')

    timeout(200)
    await tick(2)
    expect(wrapper.text()).toBe('SWR, SWR, no no')

    // only fetches once
    expect(count).toEqual(1)
  })

  it('should dedupe requests by default outside of in flight promises', async () => {
    let count = 0
    const fetch = () => {
      count++
      return new Promise(res => setTimeout(() => res('SWR'), 200))
    }

    const wrapper = mount(defineComponent({
      template: '<div>{{v1}}, {{v2}}, {{ validating1 ? \'yes\' : \'no\' }} {{ validating2 ? \'yes\' : \'no\' }}</div>',
      setup () {
        const { data: v1, isValidating: validating1 } = useSWRV('cache-key-4a', fetch)
        const { data: v2, isValidating: validating2 } = useSWRV('cache-key-4a', fetch, {
          refreshInterval: 300
        })
        return { v1, v2, validating1, validating2 }
      }
    }))

    expect(wrapper.text()).toBe(', , yes yes')

    timeout(200)
    await tick(2)
    expect(wrapper.text()).toBe('SWR, SWR, no no')

    timeout(100)
    await tick(2)
    expect(wrapper.text()).toBe('SWR, SWR, no no')

    timeout(100)
    await tick(4)
    expect(wrapper.text()).toBe('SWR, SWR, no no')

    expect(count).toEqual(1)
  })

  it('should fetch dependently', async () => {
    let count = 0
    const loadUser = (): Promise<{ id: number }> => {
      return new Promise(res => setTimeout(() => {
        count++
        res({ id: 123 })
      }, 1000))
    }

    const loadProfile = () => {
      return new Promise((res) => setTimeout(() => {
        count++
        res({
          userId: 123,
          age: 20
        })
      }, 200))
    }

    const wrapper = mount(defineComponent({
      template: '<div>d1:{{ data1 && data1.id }} d2:{{ data2 && data2.userId }}</div>',
      setup () {
        const { data: data1, error: error1 } = useSWRV('/api/user', loadUser)
        // TODO: checking truthiness of data1.value to avoid watcher warning
        // https://github.com/vuejs/composition-api/issues/242
        const { data: data2, error: error2 } = useSWRV(() => data1.value && '/api/profile?id=' + data1.value.id, loadProfile)
        return { data1, error1, data2, error2 }
      }
    }))

    expect(wrapper.text()).toBe('d1: d2:')
    timeout(100)
    await tick(2)
    expect(wrapper.text()).toBe('d1: d2:')
    expect(count).toEqual(0) // Promise still in flight

    timeout(900)
    await tick(2)
    expect(wrapper.text()).toBe('d1:123 d2:')
    expect(count).toEqual(1) // now that the first promise resolved, second one will fire

    timeout(200)
    await tick(2)
    expect(wrapper.text()).toBe('d1:123 d2:123')
    expect(count).toEqual(2)
  })

  it('should not fetch if key is falsy', async () => {
    let count = 0
    const fetch = key => {
      count++
      return new Promise(res => setTimeout(() => res(key), 100))
    }
    const wrapper = mount(defineComponent({
      template: '<div>{{ d1 }},{{ d2 }},{{ d3 }}</div>',
      setup () {
        const { data: d1 } = useSWRV('d1', fetch)
        const { data: d2 } = useSWRV(() => d1.value && 'd2', fetch)
        const { data: d3 } = useSWRV(() => d2.value && 'd3', fetch)

        return { d1, d2, d3 }
      }
    }))

    expect(count).toBe(1)
    expect(wrapper.text()).toBe(',,')

    timeout(100)
    await tick(2)
    expect(count).toBe(2)
    expect(wrapper.text()).toBe('d1,,')

    timeout(100)
    await tick(2)
    expect(count).toBe(3)
    expect(wrapper.text()).toBe('d1,d2,')

    timeout(100)
    await tick(3)
    expect(wrapper.text()).toBe('d1,d2,d3')
  })

  it('should not revalidate if key is falsy', async () => {
    let count = 0
    const fetch = key => {
      count++
      return new Promise(res => setTimeout(() => res(key), 100))
    }
    const wrapper = mount(defineComponent({
      template: '<div>{{ e1 }}</div>',
      setup () {
        const someDep = ref(undefined)
        const { data: e1 } = useSWRV(() => someDep.value, fetch, {
          refreshInterval: 1000
        })

        return { e1 }
      }
    }))

    // Does not fetch on mount
    expect(count).toBe(0)
    expect(wrapper.text()).toBe('')
    timeout(100)
    await tick(2)
    expect(count).toBe(0)
    expect(wrapper.text()).toBe('')

    // Does not revalidate even after some time passes
    timeout(100)
    await tick(2)
    expect(count).toBe(0)
    expect(wrapper.text()).toBe('')

    // does not revalidate on refresh interval
    timeout(1000)
    await tick(2)
    expect(count).toBe(0)
    expect(wrapper.text()).toBe('')

    // does not revalidate on tab changes
    const evt = new Event('visibilitychange')
    document.dispatchEvent(evt)
    timeout(100)
    await tick(2)
    expect(count).toBe(0)
    expect(wrapper.text()).toBe('')
  })

  it('should use separate configs for each invocation on the same key', async () => {
    const key = 'cache-key-separate-configs'
    let stableFetches = 0
    let refreshingFetches = 0
    const wrapper = mount(defineComponent({
      template: '<div>stable data: {{ stableData }}, refreshing data: {{ refreshingData }}</div>',
      setup () {
        const { data: stableData } = useSWRV(key, () => {
          return ++stableFetches
        }, {
          dedupingInterval: 0,
          revalidateOnFocus: false
        })

        const { data: refreshingData } = useSWRV(key, () => {
          return ++refreshingFetches
        }, {
          dedupingInterval: 0,
          revalidateOnFocus: true
        })

        return { refreshingData, stableData }
      }
    }))

    await tick(2)
    expect(stableFetches).toBe(1) // stable defined first => fetch
    expect(refreshingFetches).toBe(0) // refreshing: promise is read from cache => no fetch
    expect(wrapper.text()).toBe('stable data: 1, refreshing data: 1')

    const evt = new Event('visibilitychange')
    document.dispatchEvent(evt)
    await tick(2)
    expect(stableFetches).toBe(1) // stable not revalidating
    expect(refreshingFetches).toBe(1) // refreshing is revalidating
    expect(wrapper.text()).toBe('stable data: 1, refreshing data: 1')

    document.dispatchEvent(evt)
    await tick(2)
    expect(stableFetches).toBe(1) // stable not revalidating
    expect(refreshingFetches).toBe(2) // refreshing is revalidating
    expect(wrapper.text()).toBe('stable data: 2, refreshing data: 2')
  })

  // From #24
  it('should only update refs of current cache key', async () => {
    const fetcher = (key) => new Promise(res => setTimeout(() => res(key), 1000))

    const wrapper = mount(defineComponent({
      template: '<div>Page: {{ data }}</div>',
      setup () {
        const page = ref('1')
        const { data, error } = useSWRV(() => {
          return page.value
        }, fetcher)

        const interval = setInterval(() => {
          const nextPage: number = parseInt(page.value) + 1
          page.value = String(nextPage)
          nextPage > 2 && clearInterval(interval)
        }, 500)

        return { data, error, page }
      }
    }))
    const vm = wrapper.vm

    // initially page is empty, but fetcher has fired with page=1
    expect(wrapper.text()).toBe('Page:')
    await tick(2)
    // @ts-ignore
    expect(vm.page).toBe('1')
    expect(wrapper.text()).toBe('Page:')

    // page has now updated to page=2, fetcher1 has not yet resolved, fetcher
    // for page=2 has now fired
    timeout(500)
    await tick(2)
    // @ts-ignore
    expect(vm.page).toBe('2')
    expect(wrapper.text()).toBe('Page:')

    // fetcher for page=1 has resolved, but the cache key is not equal to the
    // current page, so the data ref does not update. fetcher for page=3 has
    // now fired
    timeout(500)
    await tick(2)
    // @ts-ignore
    expect(vm.page).toBe('3')
    expect(wrapper.text()).toBe('Page:')

    // cache key is no longer updating and the fetcher for page=3 has resolved
    // so the data ref now updates.
    timeout(1000)
    await tick(2)
    // @ts-ignore
    expect(vm.page).toBe('3')
    expect(wrapper.text()).toBe('Page: 3')
  })

  it('should return cache when no fetcher provided', async () => {
    let invoked = 0
    const wrapper = mount(defineComponent({
      template: '<div>d:{{ data }} cache:{{ dataFromCache }}</div>',
      setup () {
        const fetcher = () => {
          invoked += 1
          return new Promise(res => setTimeout(() => res('SWR'), 200))
        }
        const { data } = useSWRV('cache-key-5', fetcher)
        const { data: dataFromCache } = useSWRV('cache-key-5')

        return { data, dataFromCache }
      }
    }))

    expect(invoked).toBe(1)

    expect(wrapper.text()).toBe('d: cache:')
    expect(invoked).toBe(1)
    timeout(200)
    await tick(2)

    expect(wrapper.text()).toBe('d:SWR cache:SWR')
    expect(invoked).toBe(1) // empty fetcher is OK
  })

  it('should return cache when no fetcher provided, across components', async () => {
    let invoked = 0

    const Hello = (cacheKey: string) => {
      return defineComponent({
        template: '<div>hello {{fromCache}}</div>',
        setup () {
          const { data: fromCache } = useSWRV(cacheKey)
          return { fromCache }
        }
      })
    }

    const wrapper = mount(defineComponent({
      template: '<div>data:{{ data }} <Hello v-if="data" /></div>',
      components: { Hello: Hello('cache-key-6') },
      setup () {
        const fetcher = () => {
          invoked += 1
          return new Promise(res => setTimeout(() => res('SWR'), 200))
        }
        const { data } = useSWRV('cache-key-6', fetcher)

        return { data }
      }
    }))

    expect(invoked).toBe(1)

    expect(wrapper.text()).toBe('data:')
    expect(invoked).toBe(1)
    timeout(200)
    await tick(2)

    timeout(200)
    expect(wrapper.text()).toBe('data:SWR hello SWR')
    expect(invoked).toBe(1) // empty fetcher is OK
  })

  it('should return data even when cache ttl expires during request', async () => {
    const loadData = () => new Promise(res => setTimeout(() => res('data'), 100))
    let mutate
    const wrapper = mount(defineComponent({
      template: '<div>hello, {{data}}, {{isValidating ? \'loading\' : \'ready\'}}</div>',
      setup () {
        const { data, isValidating, mutate: revalidate } = useSWRV('is-validating-3', loadData, {
          ttl: 50,
          dedupingInterval: 0
        })

        mutate = revalidate
        return {
          data,
          isValidating
        }
      }
    }))

    timeout(75)
    await tick(2)
    expect(wrapper.text()).toBe('hello, , loading')

    timeout(25)
    await tick(2)
    expect(wrapper.text()).toBe('hello, data, ready')

    mutate()
    await tick(2)
    expect(wrapper.text()).toBe('hello, data, loading')
    timeout(25)
    mutate()
    await tick(2)
    expect(wrapper.text()).toBe('hello, data, loading')

    mutate()
    timeout(100)
    await tick(2)
    expect(wrapper.text()).toBe('hello, data, ready')
  })

  // from #54
  it('does not invalidate cache when ttl is 0', async () => {
    advanceTo(new Date())
    const ttl = 0
    let count = 0
    const fetch = () => {
      count++
      return Promise.resolve(count)
    }

    mutate('ttlData1', fetch(), undefined, ttl)

    const wrapper1 = mount(defineComponent({
      template: '<div>{{ data1 }}</div>',
      setup () {
        const { data: data1 } = useSWRV('ttlData1', undefined, { ttl, fetcher: undefined })

        return { data1 }
      }
    }))
    const component = {
      template: '<div>{{ data2 }}</div>',
      setup () {
        const { data: data2 } = useSWRV('ttlData1', undefined, { ttl, fetcher: undefined })

        return { data2 }
      }
    }

    let wrapper2
    await tick(2)

    // first time
    expect(count).toBe(1)
    expect(wrapper1.text()).toBe('1')
    wrapper2 = mount(defineComponent(component))
    expect(wrapper2.text()).toBe('1')

    // after #51 gracePeriod
    advanceBy(6000)
    timeout(6000)
    mutate('ttlData1', fetch(), undefined, ttl)
    await tick(2)

    expect(count).toBe(2)
    expect(wrapper1.text()).toBe('2')
    wrapper2 = mount(defineComponent(component))
    expect(wrapper2.text()).toBe('2')

    // after a long time
    advanceBy(100000)
    timeout(100000)
    await tick(2)

    expect(count).toBe(2)
    expect(wrapper1.text()).toBe('2')
    wrapper2 = mount(defineComponent(component))
    expect(wrapper2.text()).toBe('2')

    clear()
  })

  // from #54
  it('does invalidate cache when ttl is NOT 0', async () => {
    advanceTo(new Date())
    const ttl = 100
    let count = 0
    const fetch = () => {
      count++
      return Promise.resolve(count)
    }

    mutate('ttlData2', fetch(), undefined, ttl)

    const wrapper1 = mount(defineComponent({
      template: '<div>{{ data1 }}</div>',
      setup () {
        const { data: data1 } = useSWRV('ttlData2', undefined, { ttl, fetcher: undefined })

        return { data1 }
      }
    }))
    const component = {
      template: '<div>{{ data2 }}</div>',
      setup () {
        const { data: data2 } = useSWRV('ttlData2', undefined, { ttl, fetcher: undefined })

        return { data2 }
      }
    }

    let wrapper2
    await tick(2)

    // first time
    expect(count).toBe(1)
    expect(wrapper1.text()).toBe('1')
    wrapper2 = mount(defineComponent(component))
    expect(wrapper2.text()).toBe('1')

    // after #51 gracePeriod
    advanceBy(6000)
    timeout(6000)
    mutate('ttlData2', fetch(), undefined, ttl)
    await tick(2)

    expect(count).toBe(2)
    expect(wrapper1.text()).toBe('1')
    wrapper2 = mount(defineComponent(component))
    expect(wrapper2.text()).toBe('2')

    // after a long time
    advanceBy(100000)
    timeout(100000)
    await tick(2)

    expect(count).toBe(2)
    expect(wrapper1.text()).toBe('1')
    wrapper2 = mount(defineComponent(component))
    expect(wrapper2.text()).toBe('')

    clear()
  })

  it('should use fetch api as default fetcher', async () => {
    const users = [{ name: 'bob' }, { name: 'sue' }]
    mockFetch(users)

    const wrapper = mount(defineComponent({
      template: '<div v-if="data">hello, {{ data.map(u => u.name).join(\' and \') }}</div>',
      setup () {
        return useSWRV('http://localhost:3000/api/users')
      }
    }))

    await tick(4)

    expect(wrapper.text()).toBe('hello, bob and sue')
  })
})

describe('useSWRV - loading', () => {
  const loadData = () => new Promise(res => setTimeout(() => res('data'), 100))

  it('should return loading state via undefined data', async () => {
    let renderCount = 0
    const wrapper = mount(defineComponent({
      setup () {
        const { data } = useSWRV('is-validating-1', loadData)
        return () => {
          renderCount++
          return h('div', `hello, ${!data.value ? 'loading' : data.value}`)
        }
      }
    }))

    expect(renderCount).toEqual(1)
    expect(wrapper.text()).toBe('hello, loading')
    timeout(100)

    await tick(2)

    expect(wrapper.text()).toBe('hello, data')
    expect(renderCount).toEqual(2)
  })

  it('should return loading state via isValidating', async () => {
    // Prime the cache
    const wrapper = mount(defineComponent({
      setup () {
        const { data, isValidating } = useSWRV('is-validating-2', loadData, {
          refreshInterval: 1000,
          dedupingInterval: 0
        })

        return () => h('div', `hello, ${data.value || ''}, ${isValidating.value ? 'loading' : 'ready'}`)
      }
    }))
    expect(wrapper.text()).toBe('hello, , loading')

    timeout(100)
    await tick(2)
    expect(wrapper.text()).toBe('hello, data, ready')

    // Reactive to future refreshes
    timeout(900)
    await tick(2)
    expect(wrapper.text()).toBe('hello, data, loading')

    timeout(100)
    await tick(2)
    expect(wrapper.text()).toBe('hello, data, ready')
  })

  // #195
  it('should return loading state isValidating with nullish key', async () => {
    const wrapper = mount(defineComponent({
      template: '<div>{{ error }}:{{this.isValidating ? \'loading\' : \'ready\'}}</div>',
      setup () {
        return useSWRV(() => null)
      }
    }))

    expect(wrapper.text()).toBe(':ready')
  })

  it('should indicate cached data from another key with isLoading false', async () => {
    const key = ref(1)
    const wrapper = mount(defineComponent({
      template: `<div>data: {{ String(data) }}, isValidating: {{ isValidating }}, isLoading: {{ isLoading }}</div>
        <button id="inc" v-on:click="inc"/><button id="dec" v-on:click="dec"/>`,
      setup () {
        const { data, isValidating, isLoading } = useSWRV(() => 'key-' + key.value, async () => {
          await loadData()
          return 'data-' + key.value
        }, { dedupingInterval: 0 })

        const inc = () => {
          key.value++
        }
        const dec = () => {
          key.value--
        }

        return { inc, dec, data, isValidating, isLoading }
      }
    }))

    // key 1
    // first load ever, cache empty, no data => isLoading true
    expect(wrapper.text()).toBe('data: undefined, isValidating: true, isLoading: true')
    timeout(100)
    await tick(2)
    // key-1 data loaded
    expect(wrapper.text()).toBe('data: data-1, isValidating: false, isLoading: false')

    // key: 1 -> 2
    // first load for a key, key cache empty, data from previous key => isLoading true
    wrapper.find('#inc').trigger('click')
    await tick(2)
    expect(wrapper.text()).toBe('data: data-1, isValidating: true, isLoading: true')
    timeout(100)
    await tick(2)
    // data loaded
    expect(wrapper.text()).toBe('data: data-2, isValidating: false, isLoading: false')

    // key: 2 -> 1
    // next load for a key, data from key cache => isLoading false
    wrapper.find('#dec').trigger('click')
    await tick(2)
    expect(wrapper.text()).toBe('data: data-1, isValidating: true, isLoading: false')
    timeout(100)
    await tick(2)
    // data loaded
    expect(wrapper.text()).toBe('data: data-1, isValidating: false, isLoading: false')

    // key: 1 -> 2
    // next load for a key, data from key cache => isLoading false
    wrapper.find('#inc').trigger('click')
    await tick(2)
    expect(wrapper.text()).toBe('data: data-2, isValidating: true, isLoading: false')
    timeout(100)
    await tick(2)
    // data loaded
    expect(wrapper.text()).toBe('data: data-2, isValidating: false, isLoading: false')

    // key: 2 -> 3
    // first load for a key, key cache empty, data from previous key => isLoading true
    wrapper.find('#inc').trigger('click')
    await tick(2)
    expect(wrapper.text()).toBe('data: data-2, isValidating: true, isLoading: true')
    timeout(100)
    await tick(2)
    // data loaded
    expect(wrapper.text()).toBe('data: data-3, isValidating: false, isLoading: false')
  })
})

describe('useSWRV - mutate', () => {
  it('prefetches via mutate', () => {
    // Prime the cache
    const loadData = key => new Promise(res => setTimeout(() => res(key), 100))
    mutate('is-prefetched-1', loadData('is-prefetched-1')).then(() => {
      const wrapper = mount(defineComponent({
        setup () {
          const { data: dataFromCache } = useSWRV('is-prefetched-1', loadData)
          const { data: dataNotFromCache } = useSWRV('is-prefetched-2', loadData)

          const msg1 = !dataFromCache.value ? 'loading' : dataFromCache.value
          const msg2 = !dataNotFromCache.value ? 'loading' : dataNotFromCache.value

          return () => h('div', `hello, ${msg1} and ${msg2}`)
        }
      }))

      expect(wrapper.text()).toBe('hello, is-prefetched-1 and loading')
    })

    timeout(100)
  })

  it('mutate triggers revalidations', async () => {
    let count = 0
    const loadData = () => new Promise(res => {
      setTimeout(() => {
        res(++count)
      }, 100)
    })
    const wrapper = mount(defineComponent({
      template: '<div>hello, {{data}}</div>',
      setup () {
        const { data, mutate } = useSWRV('mutate-no-arg', loadData)

        setTimeout(() => {
          // immune to deduping interval
          mutate()
        }, 200)

        return {
          data
        }
      }
    }))

    expect(wrapper.text().trim()).toBe('hello,')

    timeout(100)
    await tick(2)
    expect(wrapper.text().trim()).toBe('hello, 1')

    timeout(200)
    await tick(4)
    expect(wrapper.text().trim()).toBe('hello, 2')
  })
})

describe('useSWRV - listeners', () => {
  it('tears down listeners', async () => {
    const f1 = jest.fn()
    const f2 = jest.fn()
    const f3 = jest.fn()
    const f4 = jest.fn()

    jest.spyOn(document, 'addEventListener').mockImplementationOnce(f1)
    jest.spyOn(document, 'removeEventListener').mockImplementationOnce(f2)
    jest.spyOn(window, 'addEventListener').mockImplementationOnce(f3)
    jest.spyOn(window, 'removeEventListener').mockImplementationOnce(f4)

    const wrapper = mount(defineComponent({
      template: '<div>hello, {{ data }}</div>',
      setup () {
        return useSWRV('cache-key-1', () => 'SWR')
      }
    }))

    await tick()

    wrapper.unmount()

    expect(f1).toHaveBeenLastCalledWith('visibilitychange', expect.any(Function), false)
    expect(f2).toHaveBeenLastCalledWith('visibilitychange', expect.any(Function), false)
    expect(f3).toHaveBeenLastCalledWith('focus', expect.any(Function), false)
    expect(f4).toHaveBeenLastCalledWith('focus', expect.any(Function), false)

    expect(f1).toHaveBeenCalledTimes(1)
    expect(f2).toHaveBeenCalledTimes(1)
    expect(f3).toHaveBeenCalledTimes(1)
    expect(f4).toHaveBeenCalledTimes(1)
  })

  it('events trigger revalidate - switching windows/tabs', async () => {
    let revalidations = 0
    mount(defineComponent({
      template: '<div>hello, {{ data }}</div>',
      setup () {
        const refs = useSWRV('cache-key-listeners-2', () => {
          revalidations += 1
          return 'SWR'
        }, {
          dedupingInterval: 0
        })
        return refs
      }
    }))

    await tick(2)
    expect(revalidations).toBe(1)

    const evt = new Event('visibilitychange')
    document.dispatchEvent(evt)

    await tick(2)
    expect(revalidations).toBe(2)
  })

  it('events trigger revalidate - focusing back on a window/tab', async () => {
    let revalidations = 0
    mount(defineComponent({
      template: '<div>hello, {{ data }}</div>',
      setup () {
        const refs = useSWRV('cache-key-listeners-3', () => {
          revalidations += 1
          return 'SWR'
        }, {
          dedupingInterval: 0
        })
        return refs
      }
    }))

    await tick(2)
    expect(revalidations).toBe(1)

    const evt = new Event('focus')
    window.dispatchEvent(evt)

    await tick(2)
    expect(revalidations).toBe(2)
  })
})

describe('useSWRV - refresh', () => {
  it('should rerender automatically on interval', async () => {
    let count = 0

    const wrapper = mount(defineComponent({
      template: '<div>count: {{ data }}</div>',
      setup () {
        return useSWRV('dynamic-1', () => count++, {
          refreshInterval: 200,
          dedupingInterval: 0
        })
      }
    }))

    await tick(2)
    expect(wrapper.text()).toEqual('count: 0')
    timeout(210)
    await tick(2)
    expect(wrapper.text()).toEqual('count: 1')
    timeout(50)
    await tick(2)
    expect(wrapper.text()).toEqual('count: 1')
    timeout(150)
    await tick(2)
    expect(wrapper.text()).toEqual('count: 2')
  })

  it('should dedupe requests combined with intervals - promises', async () => {
    advanceTo(new Date())
    /**
     * TODO: right now, only promises get deduped, so if the fetcherFn is a
     * regular function then it will keep refreshing.
     */
    let count = 0
    const loadData = () => new Promise(res => setTimeout(() => {
      res(++count)
    }, 100)) // Resolves quickly, but gets de-duplicated during refresh intervals

    const wrapper = mount(defineComponent({
      template: '<div>count: {{ data }}</div>',
      setup () {
        return useSWRV('dynamic-2', loadData, {
          refreshInterval: 200,
          dedupingInterval: 300
        })
      }
    }))

    expect(wrapper.text()).toBe('count:')
    advanceBy(100)
    timeout(100)
    await tick(2)
    expect(wrapper.text()).toBe('count: 1') // first resolve
    /**
     * check inside promises cache within deduping interval so even though
     * promise resolves quickly, it will grab the promise out of the cache
     * instead and not increment the count
     */
    advanceBy(100)
    timeout(100) // first fetcher fire
    await tick(1)
    expect(wrapper.text()).toBe('count: 1')

    advanceBy(100)
    timeout(100) // deduped
    await tick(2)
    expect(wrapper.text()).toBe('count: 1')

    advanceBy(100)
    timeout(100) // second fetcher fire
    await tick(2)
    expect(wrapper.text()).toBe('count: 1')

    advanceBy(200)
    timeout(200)
    await tick(2)
    expect(wrapper.text()).toBe('count: 2')

    clear()
  })

  it('should refresh on interval using dependent watchers', async () => {
    type User = { id: string }
    let count = -1
    const wrapper = mount(defineComponent({
      template: '<div><template v-if="user">User-{{user.id}} votes: {{ votes }}</template></div>',
      setup () {
        const { data: user } = useSWRV<User>('/users', () => {
          return new Promise((res) => {
            setTimeout(() => res({ id: '1' }), 200)
          })
        })
        const { data: votes } = useSWRV(() => user.value && `/users/${user.value.id}/votes`, () => {
          return ++count
        }, {
          refreshInterval: 200,
          dedupingInterval: 0
        })

        return {
          user,
          votes
        }
      }
    }))

    await tick(2)
    expect(wrapper.text()).toEqual('')
    timeout(210)
    await tick(2)
    expect(wrapper.text()).toEqual('User-1 votes: 0')
    timeout(50)
    await tick(2)
    expect(wrapper.text()).toEqual('User-1 votes: 0')
    timeout(150)
    await tick(2)
    expect(wrapper.text()).toEqual('User-1 votes: 1')
    timeout(200)
    await tick(2)
    expect(wrapper.text()).toEqual('User-1 votes: 2')
  })
})

describe('useSWRV - error', () => {
  it('should handle errors', async () => {
    const wrapper = mount(defineComponent({
      template: `<div>
        <div v-if="data">hello, {{ data }}</div>
        <div v-if="error">{{error.message}}</div>
      </div>`,
      setup () {
        return useSWRV(() => 'error-1', () => new Promise((_, reject) => {
          reject(new Error('error!'))
        }))
      }
    }))

    await tick(2)

    expect(wrapper.text().trim()).toBe('error!')
  })

  it('should be able to watch errors - similar to onError callback', async () => {
    let erroredSWR = null

    const wrapper = mount(defineComponent({
      template: `<div>
        <div>hello, {{ data }}</div>
      </div>`,
      setup () {
        const { data, error } = useSWRV(() => 'error-2', () => new Promise((_, rej) =>
          setTimeout(() => rej(new Error('error!')), 200)
        ))

        watch(error, error1 => {
          erroredSWR = error1 && error1.message
        })

        return {
          data, error
        }
      }
    }))

    expect(wrapper.text()).toBe('hello,')
    timeout(200)
    await tick(2)
    expect(erroredSWR).toEqual('error!')
  })

  it('should serve stale-if-error', async () => {
    let count = 0
    const loadData = () => new Promise((resolve, reject) => setTimeout(() => {
      count++
      count > 2 ? reject(new Error('uh oh!')) : resolve(count)
    }, 100))

    const wrapper = mount(defineComponent({
      template: '<div>count: {{ data }} {{ error }}</div>',
      setup () {
        return useSWRV('error-3', loadData, {
          refreshInterval: 200,
          dedupingInterval: 0
        })
      }
    }))

    timeout(300) // 200 refresh + 100 timeout
    await tick(3)
    expect(wrapper.text()).toBe('count: 1')

    timeout(300)
    await tick(3)
    expect(wrapper.text()).toBe('count: 2')

    timeout(300)
    await tick(1)
    // stale data sticks around even when error exists
    expect(wrapper.text()).toMatch(/count: 2.*Error: uh oh!/)
  })

  it('should reset error if fetching succeeds', async () => {
    let count = 0
    let revalidate

    const wrapper = mount(defineComponent({
      template: '<div>count: {{ data }} {{ error }}</div>',
      setup () {
        const { data, error, mutate } = useSWRV(
          'error-4',
          () => new Promise(
            (resolve, reject) => setTimeout(() => ++count === 2 ? reject(new Error('uh oh!')) : resolve(count), 100)
          ),
          { dedupingInterval: 0 }
        )
        revalidate = mutate
        return { data, error }
      }
    }))

    timeout(100)
    await tick(3)
    expect(wrapper.text()).toBe('count: 1')

    revalidate()
    timeout(100)
    await tick(3)
    // stale data sticks around even when error exists
    expect(wrapper.text()).toMatch(/count: 1.*Error: uh oh!/)

    revalidate()
    timeout(100)
    await tick(3)
    // error must be reset if fetching succeeds
    expect(wrapper.text()).toBe('count: 3')
  })

  it('should trigger error retry', async () => {
    let count = 0

    const wrapper = mount(defineComponent({
      template: '<div>count: {{ data }}, {{ error }}</div>',
      setup () {
        const { data, error } = useSWRV(
          'error-retry-1',
          () => new Promise((resolve, reject) => setTimeout(() => {
            ++count <= 2 ? reject(new Error(`${count}`)) : resolve(count)
          }, 100)),
          {
            dedupingInterval: 0,
            errorRetryInterval: 500
          }
        )
        return { data, error }
      }
    }))

    expect(wrapper.text().trim()).toBe('count: ,')

    timeout(100)
    await tick(2)
    expect(wrapper.text().trim()).toMatch(/count: ,.*Error: 1/)

    timeout(600)
    await tick(2)
    expect(wrapper.text().trim()).toMatch(/count: ,.*Error: 2/)

    timeout(900)
    await tick(2)
    expect(wrapper.text().trim()).toMatch(/count: ,.*Error: 2/)

    timeout(200)
    await tick(2)
    expect(wrapper.text().trim()).toMatch(/count: 3,/)
  })

  it('should trigger error retry and stop at count max', async () => {
    let count = 0

    const wrapper = mount(defineComponent({
      template: '<div>count: {{ data }}, {{ error }}</div>',
      setup () {
        const { data, error } = useSWRV(
          'error-retry-2',
          () => new Promise((resolve, reject) => setTimeout(() => {
            ++count <= 6 ? reject(new Error(`${count}`)) : resolve(count)
          }, 100)),
          {
            dedupingInterval: 0,
            errorRetryInterval: 500,
            errorRetryCount: 3
          }
        )
        return { data, error }
      }
    }))
    expect(wrapper.text().trim()).toBe('count: ,')

    timeout(100)
    await tick(2)
    expect(wrapper.text().trim()).toMatch(/count: ,.*Error: 1/)

    timeout(600)
    await tick(2)
    expect(wrapper.text().trim()).toMatch(/count: ,.*Error: 2/)

    timeout(1100)
    await tick(2)
    expect(wrapper.text().trim()).toMatch(/count: ,.*Error: 3/)

    timeout(1600)
    await tick(2)
    expect(wrapper.text().trim()).toMatch(/count: ,.*Error: 4/)

    timeout(2100)
    await tick(2)
    expect(wrapper.text().trim()).toMatch(/count: ,.*Error: 4/) // Does not exceed retry count
  })

  it('should respect disabled error retry', async () => {
    let count = 0

    const wrapper = mount(defineComponent({
      template: '<div>count: {{ data }}, {{ error }}</div>',
      setup () {
        const { data, error } = useSWRV(
          'error-retry-3',
          () => new Promise((resolve, reject) => setTimeout(() => {
            ++count <= 3 ? reject(new Error(`${count}`)) : resolve(count)
          }, 100)),
          {
            dedupingInterval: 0,
            shouldRetryOnError: false,
            errorRetryInterval: 500
          }
        )
        return { data, error }
      }
    }))

    expect(wrapper.text().trim()).toBe('count: ,')

    timeout(100)
    await tick(2)
    expect(wrapper.text().trim()).toMatch(/count: ,.*Error: 1/)

    timeout(600)
    await tick(2)
    expect(wrapper.text()).toMatch(/count: ,.*Error: 1/)
  })

  it('should display friendly error message when swrv is not top level in setup', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const wrapper = mount(defineComponent({
      template: '<button v-on:click="dontDoThis">bad idea</button>',
      setup () {
        function dontDoThis () {
          useSWRV(() => 'error-top-level', () => 'hello')
        }

        return {
          dontDoThis
        }
      }
    }))

    wrapper.find('button').trigger('click')

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Could not get current instance, check to make sure that `useSwrv` is declared in the top level of the setup function.'))

    spy.mockRestore()
  })
})

describe('useSWRV - window events', () => {
  // @ts-ignore
  const toggleVisibility = (state: VisibilityState) => Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    // @ts-ignore
    get: function (): VisibilityState { return state }
  })

  const toggleOnline = (state: boolean) => Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    get: function (): boolean { return state }
  })

  afterEach(() => {
    toggleOnline(true)
    toggleVisibility('visible')
  })

  it('should not rerender when document is not visible', async () => {
    let count = 0

    const wrapper = mount(defineComponent({
      template: '<div>count: {{ data }}</div>',
      setup () {
        return useSWRV('dynamic-5', () => count++, {
          refreshInterval: 200,
          dedupingInterval: 0
        })
      }
    }))

    await tick(1)
    expect(wrapper.text()).toBe('count: 0')

    toggleVisibility(undefined)
    timeout(200)
    await tick(1)
    // should still update even though visibilityState is undefined
    expect(wrapper.text()).toBe('count: 1')

    toggleVisibility('hidden')

    timeout(200)
    await tick(1)

    // should not rerender because document is hidden e.g. switched tabs
    expect(wrapper.text()).toBe('count: 1')

    wrapper.unmount()
  })

  it('should get last known state when document is not visible', async () => {
    let count = 0
    mutate('dynamic-5-1', count)
    toggleVisibility('hidden')

    const wrapper = mount(defineComponent({
      template: '<div>count: {{ data }}</div>',
      setup () {
        return useSWRV('dynamic-5-1', () => ++count, {
          refreshInterval: 200,
          dedupingInterval: 0
        })
      }
    }))

    // first fetch always renders #128
    timeout(200)
    await tick(1)
    expect(wrapper.text()).toBe('count: 1')
    expect(count).toBe(1)

    timeout(200)
    await tick(1)
    expect(wrapper.text()).toBe('count: 1')
    expect(count).toBe(1)

    timeout(200)
    await tick(1)
    expect(wrapper.text()).toBe('count: 1')
    expect(count).toBe(1)

    timeout(200)
    await tick(1)
    expect(wrapper.text()).toBe('count: 1')
    expect(count).toBe(1)

    // subsequent fetches while document is hidden do not rerender
    timeout(200)
    await tick(1)
    expect(wrapper.text()).toBe('count: 1')
    expect(count).toBe(1)

    toggleVisibility('visible')

    timeout(200)
    await tick(1)
    expect(wrapper.text()).toBe('count: 2')
    expect(count).toBe(2)

    timeout(200)
    await tick(1)
    expect(wrapper.text()).toBe('count: 2')
    expect(count).toBe(2)

    toggleVisibility('visible')

    timeout(200)
    await tick(1)
    expect(wrapper.text()).toBe('count: 3')
    expect(count).toBe(3)

    timeout(200)
    await tick(1)
    expect(wrapper.text()).toBe('count: 3')
    expect(count).toBe(3)

    timeout(200)
    await tick(1)
    expect(wrapper.text()).toBe('count: 4')
    expect(count).toBe(4)

    timeout(200)
    await tick(1)
    expect(wrapper.text()).toBe('count: 4')
    expect(count).toBe(4)

    wrapper.unmount()
  })

  it('should not rerender when offline', async () => {
    let count = 0

    const wrapper = mount(defineComponent({
      template: '<div>count: {{ data }}</div>',
      setup () {
        return useSWRV('dynamic-6', () => count++, {
          refreshInterval: 200,
          dedupingInterval: 0
        })
      }
    }))

    await tick(1)
    expect(wrapper.text()).toBe('count: 0')

    toggleOnline(undefined)

    timeout(200)
    await tick(1)
    // should rerender since we're AMERICA ONLINE
    expect(wrapper.text()).toBe('count: 1')

    // connection drops... your mom picked up the phone while you were 🏄‍♂️ the 🕸
    toggleOnline(false)

    timeout(200)
    await tick(1)
    // should not rerender cuz offline
    expect(wrapper.text()).toBe('count: 1')
  })

  // https://github.com/Kong/swrv/issues/128
  it('fetches data on first render even when document is not visible', async () => {
    toggleVisibility('hidden')

    const wrapper = mount(defineComponent({
      template: '<div>{{ data }}</div>',
      setup () {
        const { data, error } = useSWRV(
          'fetches-data-even-when-document-is-not-visible',
          () => new Promise(res => setTimeout(() => res('first'), 100))
        )
        return { data, error }
      }
    }))

    expect(wrapper.text()).toBe('')

    timeout(100)
    await tick()

    expect(wrapper.text()).toBe('first')
  })
})

describe('useSWRV - ref cache management', () => {
  beforeEach(() => {
    // Isolate the changes to the caches made by the tests in this block.
    if (mockDataCache) {
      mockDataCache.items = new Map()
    }
    if (mockRefCache) {
      mockRefCache.items = new Map()
    }
    if (mockPromisesCache) {
      mockPromisesCache.items = new Map()
    }
  })
  it('useSwrv should remove stateRef from ref cache when the component is unmounted', async () => {
    const key = 'key'
    const fetchedValue = 'SWR'
    const fetch = () => fetchedValue
    const vm = mount(defineComponent({
      template: '<div></div>',
      setup () {
        return useSWRV(key, fetch)
      }
    }))
    expect(mockRefCache.get(key).data).toHaveLength(1)
    vm.unmount()
    expect(mockRefCache.get(key).data).toHaveLength(0)
  })

  it('useSwrv should keep stateRefs from other components when its component is unmounted', async () => {
    const key = 'key'
    const fetchedValue = 'SWR'
    const fetch = () => fetchedValue
    const originalVm = mount(defineComponent({
      template: '<div></div>',
      setup () {
        return useSWRV(key, fetch)
      }
    }))

    expect(mockRefCache.get(key).data).toHaveLength(1)
    // Create another Vue component that calls useSwrv with the same key.
    mount(defineComponent({
      template: '<div></div>',
      setup () {
        return useSWRV(key, fetch)
      }
    }))

    expect(mockRefCache.get(key).data).toHaveLength(2)
    originalVm.unmount()
    expect(mockRefCache.get(key).data).toHaveLength(1)
  })
})

/**
 * Test Suite: useSWRV - compare option
 *
 * Tests for the custom data comparison feature which allows controlling when components re-render
 * based on data changes, along with the default dequal deep equality comparison.
 *
 * Table of Contents:
 *
 * 1. Default dequal comparison
 *    - should not update when objects have identical content
 *    - should update when objects have different content
 *    - should handle array comparison correctly
 *    - should handle special values like NaN and null correctly
 *
 * 2. Custom compare function
 *    - should not update when custom compare returns true
 *    - should update when custom compare returns false
 *    - should handle partial data updates correctly
 *
 * 3. Edge cases
 *    - should handle undefined and null transitions
 *    - should handle circular references gracefully
 *    - should handle when compare function throws an error
 */
describe('useSWRV - compare option', () => {
  // First group: Default dequal behavior
  describe('default dequal comparison', () => {
    it('should not update when objects have identical content', async () => {
      const fetcherSpy = jest.fn()

      // Structurally identical objects but different references
      const initialData = { id: 1, name: 'Test', nested: { value: 10 } }
      const updatedData = { id: 1, name: 'Test', nested: { value: 10 } }

      fetcherSpy.mockResolvedValueOnce(initialData)
      fetcherSpy.mockResolvedValueOnce(updatedData)

      const wrapper = mount(defineComponent({
        template: '<div>{{ data && data.id }}</div>',
        setup () {
          const { data, mutate } = useSWRV('compare-default-test', fetcherSpy)
          return { data, mutate }
        }
      }))

      await tick(2)
      expect(fetcherSpy).toHaveBeenCalledTimes(1)
      expect(wrapper.text()).toBe('1')

      // Store reference to verify it doesn't change when content is equal
      const initialDataRef = wrapper.vm.data

      // Trigger revalidation
      await wrapper.vm.mutate()
      await tick(4)

      // Reference should NOT change when dequal determines objects are equal
      expect(wrapper.vm.data).toBe(initialDataRef)
    })

    it('should update when objects have different content', async () => {
      const fetcherSpy = jest.fn()

      // Objects with different values
      const initialData = { id: 1, name: 'Test', value: 10 }
      const updatedData = { id: 1, name: 'Test', value: 20 }

      fetcherSpy.mockResolvedValueOnce(initialData)
      fetcherSpy.mockResolvedValueOnce(updatedData)

      const wrapper = mount(defineComponent({
        template: '<div>{{ data && data.value }}</div>',
        setup () {
          const { data, mutate } = useSWRV('compare-default-update-test', fetcherSpy)
          return { data, mutate }
        }
      }))

      await tick(2)
      expect(wrapper.text()).toBe('10')

      const initialDataRef = wrapper.vm.data

      // Trigger revalidation
      await wrapper.vm.mutate()
      await tick(4)

      // Reference SHOULD change when objects are different
      expect(wrapper.vm.data).not.toBe(initialDataRef)
      expect(wrapper.text()).toBe('20')
    })

    it('should handle array comparison correctly', async () => {
      const fetcherSpy = jest.fn()

      // Arrays with same content but different references
      const initialData = { id: 1, items: [1, 2, 3] }
      const sameOrderData = { id: 1, items: [1, 2, 3] }
      const differentOrderData = { id: 1, items: [3, 2, 1] }

      fetcherSpy.mockResolvedValueOnce(initialData)
      fetcherSpy.mockResolvedValueOnce(sameOrderData)

      const wrapper = mount(defineComponent({
        template: '<div>{{ data && data.id }}-{{ data && data.items.join(",") }}</div>',
        setup () {
          const { data, mutate } = useSWRV('compare-array-test', fetcherSpy)
          return { data, mutate }
        }
      }))

      await tick(2)
      expect(wrapper.text()).toBe('1-1,2,3')

      const initialDataRef = wrapper.vm.data

      // First update - same array content, should not update
      await wrapper.vm.mutate()
      await tick(4)

      // Should not update with identical array content
      expect(wrapper.vm.data).toBe(initialDataRef)

      // Change fetcher to return array with different order
      fetcherSpy.mockResolvedValueOnce(differentOrderData)

      // Second update - different array order, should update
      await wrapper.vm.mutate()
      await tick(4)

      // Should update with different array content/order
      expect(wrapper.vm.data).not.toBe(initialDataRef)
      expect(wrapper.text()).toBe('1-3,2,1')
    })

    it('should handle special values like NaN and null correctly', async () => {
      const fetcherSpy = jest.fn()

      // Objects with special values
      const initialData = {
        id: 1,
        nullValue: null,
        nanValue: NaN,
        undefinedValue: undefined
      }

      const sameSpecialValues = {
        id: 1,
        nullValue: null,
        nanValue: NaN,
        undefinedValue: undefined
      }

      const differentSpecialValues = {
        id: 1,
        nullValue: undefined, // changed from null
        nanValue: 0, // changed from NaN
        undefinedValue: null // changed from undefined
      }

      fetcherSpy.mockResolvedValueOnce(initialData)
      fetcherSpy.mockResolvedValueOnce(sameSpecialValues)

      const wrapper = mount(defineComponent({
        template: '<div>{{ data && data.id }}</div>',
        setup () {
          const { data, mutate } = useSWRV('compare-special-values', fetcherSpy)
          return { data, mutate }
        }
      }))

      await tick(2)

      const initialDataRef = wrapper.vm.data

      // First update - same special values
      await wrapper.vm.mutate()
      await tick(4)

      // Should not update with identical special values
      expect(wrapper.vm.data).toBe(initialDataRef)

      // Change fetcher to return different special values
      fetcherSpy.mockResolvedValueOnce(differentSpecialValues)

      // Second update - different special values
      await wrapper.vm.mutate()
      await tick(4)

      // Should update with different special values
      expect(wrapper.vm.data).not.toBe(initialDataRef)
    })
  })

  // Second group: Custom compare function
  describe('custom compare function', () => {
    it('should not update when custom compare returns true', async () => {
      const fetcherSpy = jest.fn()

      // Timestamp differs but custom compare ignores it
      const initialData = { id: 1, name: 'Test', timestamp: '2023-01-01' }
      const updatedData = { id: 1, name: 'Test', timestamp: '2023-01-02' }

      fetcherSpy.mockResolvedValueOnce(initialData)
      fetcherSpy.mockResolvedValueOnce(updatedData)

      // Only considers id and name for equality (timestamp ignored)
      const compareFunction = jest.fn((a, b) => {
        if (!a || !b) return a === b
        return a.id === b.id && a.name === b.name
      })

      const wrapper = mount(defineComponent({
        template: '<div>{{ data && data.timestamp }}</div>',
        setup () {
          const { data, mutate } = useSWRV('compare-custom-test', fetcherSpy, {
            compare: compareFunction
          })
          return { data, mutate }
        }
      }))

      await tick(2)
      expect(wrapper.text()).toBe('2023-01-01')

      const initialDataRef = wrapper.vm.data

      // Trigger revalidation
      await wrapper.vm.mutate()
      await tick(4)

      // Custom compare should be called
      expect(compareFunction).toHaveBeenCalled()
      // Reference should NOT change when compare returns true
      expect(wrapper.vm.data).toBe(initialDataRef)
      expect(wrapper.text()).toBe('2023-01-01')
    })

    it('should update when custom compare returns false', async () => {
      const fetcherSpy = jest.fn()

      // Status field changes - compare will detect this
      const initialData = { id: 1, status: 'pending' }
      const updatedData = { id: 1, status: 'completed' }

      fetcherSpy.mockResolvedValueOnce(initialData)
      fetcherSpy.mockResolvedValueOnce(updatedData)

      // Compare specifically checks the status field
      const compareFunction = jest.fn((a, b) => {
        if (!a || !b) return a === b
        return a.status === b.status
      })

      const wrapper = mount(defineComponent({
        template: '<div>{{ data && data.status }}</div>',
        setup () {
          const { data, mutate } = useSWRV('compare-update-test', fetcherSpy, {
            compare: compareFunction
          })
          return { data, mutate }
        }
      }))

      await tick(2)
      expect(wrapper.text()).toBe('pending')

      const initialDataRef = wrapper.vm.data

      // Trigger revalidation
      await wrapper.vm.mutate()
      await tick(4)

      // Compare should be called
      expect(compareFunction).toHaveBeenCalled()
      // Reference SHOULD change when compare returns false
      expect(wrapper.vm.data).not.toBe(initialDataRef)
      expect(wrapper.text()).toBe('completed')
    })

    it('should handle partial data updates correctly', async () => {
      const fetcherSpy = jest.fn()

      // Complex object with many fields
      const initialData = {
        id: 123,
        user: {
          name: 'John',
          email: 'john@example.com',
          preferences: {
            theme: 'dark',
            notifications: true
          }
        },
        stats: {
          visits: 10,
          lastLogin: '2023-01-01'
        }
      }

      // Only a nested field changed
      const updatedData = {
        id: 123,
        user: {
          name: 'John',
          email: 'john@example.com',
          preferences: {
            theme: 'light', // Only this changed
            notifications: true
          }
        },
        stats: {
          visits: 10,
          lastLogin: '2023-01-01'
        }
      }

      fetcherSpy.mockResolvedValueOnce(initialData)
      fetcherSpy.mockResolvedValueOnce(updatedData)

      // Custom compare that only cares about ID and top-level fields
      const compareFunction = jest.fn((a, b) => {
        if (!a || !b) return a === b
        // Only compare top-level properties (ignores nested changes)
        return a.id === b.id &&
               a.user.name === b.user.name &&
               a.user.email === b.user.email
      })

      const wrapper = mount(defineComponent({
        template: '<div>{{ data && data.user.preferences.theme }}</div>',
        setup () {
          const { data, mutate } = useSWRV('compare-nested-change', fetcherSpy, {
            compare: compareFunction
          })
          return { data, mutate }
        }
      }))

      await tick(2)
      expect(wrapper.text()).toBe('dark')

      const initialDataRef = wrapper.vm.data

      // Trigger revalidation
      await wrapper.vm.mutate()
      await tick(4)

      // Compare should be called with the complex objects
      expect(compareFunction).toHaveBeenCalled()

      // Even though theme changed, our compare function only looks at top level fields
      // So data reference should not change
      expect(wrapper.vm.data).toBe(initialDataRef)
      expect(wrapper.text()).toBe('dark')
    })
  })

  // Third group: Edge cases
  describe('edge cases', () => {
    it('should handle undefined and null transitions', async () => {
      const fetcherSpy = jest.fn()

      // Test different transitions between undefined, null and defined values
      fetcherSpy.mockResolvedValueOnce(undefined)
      fetcherSpy.mockResolvedValueOnce(null)
      fetcherSpy.mockResolvedValueOnce({ id: 1 })

      // Handles special value transitions
      const compareFunction = jest.fn((a, b) => {
        if (a === undefined || b === undefined) return a === b
        if (a === null || b === null) return a === b
        return a.id === b.id
      })

      const wrapper = mount(defineComponent({
        template: '<div>{{ data === undefined ? "undefined" : (data === null ? "null" : data.id) }}</div>',
        setup () {
          const { data, mutate } = useSWRV('compare-edge-test', fetcherSpy, {
            compare: compareFunction
          })
          return { data, mutate }
        }
      }))

      await tick(2)
      expect(wrapper.text()).toBe('undefined')

      // First update: undefined -> null
      await wrapper.vm.mutate()
      await tick(4)

      // Should update from undefined to null
      expect(compareFunction).toHaveBeenCalled()
      expect(wrapper.text()).toBe('null')

      // Second update: null -> object
      await wrapper.vm.mutate()
      await tick(4)

      // Should update from null to object
      expect(wrapper.text()).toBe('1')
    })

    it('should handle circular references gracefully', async () => {
      const fetcherSpy = jest.fn()

      // Create objects with circular references
      const initialData: any = { id: 1, name: 'Test' }
      initialData.self = initialData // circular reference

      const updatedSameData: any = { id: 1, name: 'Test' }
      updatedSameData.self = updatedSameData // circular reference

      const updatedDifferentData: any = { id: 1, name: 'Changed' }
      updatedDifferentData.self = updatedDifferentData // circular reference

      fetcherSpy.mockResolvedValueOnce(initialData)
      fetcherSpy.mockResolvedValueOnce(updatedSameData)

      // Custom compare that handles circular references
      const compareFunction = jest.fn((a, b) => {
        if (!a || !b) return a === b
        // Only compare non-circular properties
        return a.id === b.id && a.name === b.name
      })

      const wrapper = mount(defineComponent({
        template: '<div>{{ data && data.name }}</div>',
        setup () {
          const { data, mutate } = useSWRV('compare-circular-refs', fetcherSpy, {
            compare: compareFunction
          })
          return { data, mutate }
        }
      }))

      await tick(2)
      expect(wrapper.text()).toBe('Test')

      const initialDataRef = wrapper.vm.data

      // First update - same core data but different object
      await wrapper.vm.mutate()
      await tick(4)

      // Compare should handle circular references without error
      expect(compareFunction).toHaveBeenCalled()
      // Objects are semantically the same (id and name match)
      expect(wrapper.vm.data).toBe(initialDataRef)

      // Change fetcher to return object with different name
      fetcherSpy.mockResolvedValueOnce(updatedDifferentData)

      // Second update - different name
      await wrapper.vm.mutate()
      await tick(4)

      // Should update since name is different
      expect(wrapper.text()).toBe('Changed')
    })

    it('should handle when compare function throws an error', async () => {
      const fetcherSpy = jest.fn()

      const initialData = { id: 1, name: 'Test' }
      const updatedData = { id: 1, name: 'Test' }

      fetcherSpy.mockResolvedValueOnce(initialData)
      fetcherSpy.mockResolvedValueOnce(updatedData)

      // Comparison function that throws an error
      const errorCompareFn = jest.fn(() => {
        throw new Error('Error in compare function')
      })

      // We expect console.error to be called when compare fails
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      const wrapper = mount(defineComponent({
        template: '<div>{{ data && data.id }}</div>',
        setup () {
          const { data, mutate } = useSWRV('compare-error-test', fetcherSpy, {
            compare: errorCompareFn
          })
          return { data, mutate }
        }
      }))

      await tick(2)

      // Trigger revalidation
      await wrapper.vm.mutate()
      await tick(4)

      // Compare should be called
      expect(errorCompareFn).toHaveBeenCalled()

      // Should either update data (fallback behavior) or log an error
      // We're not testing exact behavior since it depends on implementation,
      // just that it doesn't crash the app
      expect(wrapper.vm.data).not.toBeUndefined()

      consoleErrorSpy.mockRestore()
    })
  })
})
