import Vue from 'vue/dist/vue.common.js'
import VueCompositionApi, { createComponent } from '@vue/composition-api'
import useSWR, { mutate } from '@/use-swrv'

Vue.use(VueCompositionApi)

jest.useFakeTimers()
const timeout: Function = milliseconds => jest.advanceTimersByTime(milliseconds)
const tick: Function = async (vm, times) => {
  for (let _ in [...Array(times).keys()]) {
    await vm.$nextTick()
  }
}

describe('useSWR', () => {
  it('should return `undefined` on hydration', done => {
    const vm = new Vue({
      template: `<div>hello, {{ data }}</div>`,
      setup  () {
        return useSWR('cache-key-1', () => 'SWR')
      }
    }).$mount()

    expect(vm.data).toBe(undefined)
    done()
  })

  it('should return data after hydration', async done => {
    const vm = new Vue({
      template: `<div>hello, {{ data }}</div>`,
      setup  () {
        return useSWR('cache-key-2', () => 'SWR')
      }
    }).$mount()

    await tick(vm, 1)

    expect(vm.$el.textContent).toBe('hello, SWR')
    done()
  })

  it('should return data from a promise', async done => {
    const vm = new Vue({
      template: `<div>hello, {{ data }}</div>`,
      setup  () {
        return useSWR('cache-key-promise', () => new Promise(resolve => resolve('SWR')))
      }
    }).$mount()

    expect(vm.$el.textContent).toBe('hello, ')

    await tick(vm, 2)

    expect(vm.$el.textContent).toEqual('hello, SWR')
    done()
  })

  it('should allow functions as key and reuse the cache', async done => {
    const vm = new Vue({
      template: `<div>hello, {{ data }}</div>`,
      setup  () {
        return useSWR(() => 'cache-key-2', () => 'SWR')
      }
    }).$mount()

    // immediately available via cache without waiting for $nextTick
    expect(vm.$el.textContent).toBe('hello, SWR')
    done()
  })

  it('should return error when thrown', async done => {
    const vm = new Vue({
      template: `<div>
        <div v-if="data">hello, {{ data }}</div>
        <div v-if="error">{{error}}</div>
      </div>`,
      setup  () {
        return useSWR(() => 'cache-key-3', () => new Promise((_, reject) => {
          reject(new Error('unauthorized'))
        }))
      }
    }).$mount()

    await tick(vm, 2)

    // immediately available via cache without waiting for $nextTick
    expect(vm.$el.textContent.trim()).toBe('Error: unauthorized')
    done()
  })

  it('should dedupe requests by default', async done => {
    let count = 0
    const fetch = () => {
      count++
      return new Promise(res => setTimeout(() => res('SWR'), 200))
    }

    const vm = new Vue({
      template: `<div>{{v1}}, {{v2}}</div>`,
      setup  () {
        const { data: v1 } = useSWR('cache-key-4', fetch)
        const { data: v2 } = useSWR('cache-key-4', fetch)
        return { v1, v2 }
      }
    }).$mount()

    expect(vm.$el.textContent).toBe(', ')

    timeout(200)
    await tick(vm, 2)
    expect(vm.$el.textContent).toBe('SWR, SWR')

    // only fetches once
    expect(count).toEqual(1)
    done()
  })
})

describe('useSWR - loading', () => {
  const loadData = () => new Promise(res => setTimeout(() => res('data'), 100))

  it('should return loading state via undefined data', async done => {
    let renderCount = 0
    const vm = new Vue({
      render: h => h(createComponent({
        setup() {
          const { data } = useSWR('is-validating-1', loadData)
          return () => {
            renderCount++
            return <div>hello, {!data.value ? 'loading' : data.value}</div>
          }
        }
      }))
    }).$mount()

    expect(renderCount).toEqual(1)
    expect(vm.$el.textContent).toBe('hello, loading')
    timeout(100)

    await tick(vm, 2)

    expect(vm.$el.textContent).toBe('hello, data')
    expect(renderCount).toEqual(2)
    done()
  })

  it('should return loading state via isValidating', async done => {
    // Prime the cache
    const vm = new Vue({
      render: h => h(createComponent({
        setup() {
          const { data, isValidating } = useSWR('is-validating-2', loadData)

          return () => <div>hello, {data.value}, {isValidating.value ? 'loading' : 'ready'}</div>
        }
      }))
    }).$mount()

    expect(vm.$el.textContent).toBe('hello, , loading')

    timeout(100)
    await tick(vm, 2)

    expect(vm.$el.textContent).toBe('hello, data, ready')
    done()
  })
})

describe('useSWR - mutate', () => {
  const loadData = () => new Promise(res => setTimeout(() => res('data'), 100))

  it('prefetches via mutate', done => {
    // Prime the cache
    mutate('is-prefetched-1', loadData()).then(() => {

      const vm = new Vue({
        render: h => h(createComponent({
          setup() {
            const { data: dataFromCache } = useSWR('is-prefetched-1', loadData)
            const { data: dataNotFromCache } = useSWR('is-prefetched-2', loadData)

            const msg1 = !dataFromCache.value ? 'loading' : dataFromCache.value
            const msg2 = !dataNotFromCache.value ? 'loading' : dataNotFromCache.value

            return () => <div>hello, {msg1} and {msg2}</div>
          }
        }))
      }).$mount()

      expect(vm.$el.textContent).toBe('hello, data and loading')
      done()
    })

    timeout(100)
  })
})

describe('useSWR - listeners', () => {
  it('tears down listeners', async done => {
    let revalidate

    const f1 = jest.fn()
    const f2 = jest.fn()
    const f3 = jest.fn()
    const f4 = jest.fn()

    document.addEventListener = f1
    document.removeEventListener = f2
    window.addEventListener = f3
    window.removeEventListener = f4

    const vm = new Vue({
      template: `<div>hello, {{ data }}</div>`,
      setup  () {
        const refs = useSWR('cache-key-1', () => 'SWR')
        revalidate = refs.revalidate
        return refs
      }
    }).$mount()

    await vm.$nextTick()

    vm.$destroy()

    expect(f1).toHaveBeenLastCalledWith('visibilitychange', revalidate, false)
    expect(f2).toHaveBeenLastCalledWith('visibilitychange', revalidate, false)
    expect(f3).toHaveBeenLastCalledWith('focus', revalidate, false)
    expect(f4).toHaveBeenLastCalledWith('focus', revalidate, false)
    done()
  })
})

describe('useSWR - refresh', () => {
  it('should rerender automatically on interval', async done => {
    let count = 0

    const vm = new Vue({
      template: `<div>count: {{ data }}</div>`,
      setup  () {
        return useSWR('dynamic-1', () => count++, {
          refreshInterval: 200,
          dedupingInterval: 100
        })
      }
    }).$mount()

    expect(vm.$el.textContent).toEqual('count: ')
    await tick(vm, 2)
    expect(vm.$el.textContent).toEqual('count: 0')
    timeout(210)
    await tick(vm, 2)
    expect(vm.$el.textContent).toEqual('count: 1')
    timeout(50)
    await tick(vm, 2)
    expect(vm.$el.textContent).toEqual('count: 1')
    timeout(150)
    await tick(vm, 2)
    expect(vm.$el.textContent).toEqual('count: 2')
    done()
  })

  it('should dedupe requests combined with intervals - promises', async done => {
    /**
     * TODO: right now, only promises get deduped, so if the fetcherFn is a
     * regular function then it will keep refreshing.
     */
    let count = 0
    const loadData = () => new Promise(res => setTimeout(() => {
      res(count++)
    }, 10)) // Resolves quickly, but gets de-duplicated during refresh intervals

    const vm = new Vue({
      template: `<div>count: {{ data }}</div>`,
      setup  () {
        return useSWR('dynamic-2', loadData, {
          refreshInterval: 200,
          dedupingInterval: 300
        })
      }
    }).$mount()

    expect(vm.$el.textContent).toBe('count: ')
    timeout(100)
    await tick(vm, 2)
    expect(vm.$el.textContent).toBe('count: 0')
    /**
     * check inside promises cache within deduping interval so even though
     * promise resolves quickly, it will grab the promise out of the cache
     * instead and not increment the count
     */
    timeout(100)
    await tick(vm, 2)
    expect(vm.$el.textContent).toBe('count: 0')

    timeout(100) // update
    await tick(vm, 2)
    expect(vm.$el.textContent).toBe('count: 1')

    timeout(200) // no update (deduped)
    await tick(vm, 2)
    expect(vm.$el.textContent).toBe('count: 1')
    timeout(150) // update
    await tick(vm, 2)
    expect(vm.$el.textContent).toBe('count: 2')
    done()
  })

  it('should serve stale-if-error', async done => {
    let count = 0
    const loadData = () => new Promise((resolve, reject) => setTimeout(() => {
      count++
      count > 2 ? reject('error!') : resolve(count)
    }, 100))

    const vm = new Vue({
      template: `<div>count: {{ data }} {{ error }}</div>`,
      setup  () {
        return useSWR('dynamic-3', loadData, {
          refreshInterval: 200
        })
      }
    }).$mount()

    timeout(300) // 200 refresh + 100 timeout
    await tick(vm, 2)
    expect(vm.$el.textContent).toBe('count: 1 ')

    timeout(300)
    await tick(vm, 2)
    expect(vm.$el.textContent).toBe('count: 2 ')

    timeout(300)
    await tick(vm, 2)
    // stale data sticks around even when error exists
    expect(vm.$el.textContent).toBe('count: 2 error!')
    done()
  })
})

describe('useSWR - window events', () => {
  const toggleVisibility = state => Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: function() { return state }
  })

  const toggleOnline = state => Object.defineProperty(navigator, "onLine", {
    configurable: true,
    get: function() { return state }
  })

  it('should not rerender when document is not visible', async done => {
    let count = 0

    const vm = new Vue({
      template: `<div>count: {{ data }}</div>`,
      setup  () {
        return useSWR('dynamic-5', () => count++, {
          refreshInterval: 200
        })
      }
    }).$mount()

    expect(vm.$el.textContent).toBe('count: ')
    await tick(vm, 2)
    expect(vm.$el.textContent).toBe('count: 0')

    toggleVisibility(undefined)
    timeout(200)
    await tick(vm, 2)
    // should still update even though visibilityState is undefined
    expect(vm.$el.textContent).toBe('count: 1')

    toggleVisibility('hidden')

    timeout(200)
    await tick(vm, 2)

    // should not rerender because document is hidden e.g. switched tabs
    expect(vm.$el.textContent).toBe('count: 1')

    vm.$destroy()

    // put it back to visible for other tests
    toggleVisibility('visible')

    done()
  })

  it('should not rerender when offline', async done => {
    let count = 0

    const vm = new Vue({
      template: `<div>count: {{ data }}</div>`,
      setup  () {
        return useSWR('dynamic-6', () => count++, {
          refreshInterval: 200,
          dedupingInterval: 10
        })
      }
    }).$mount()

    expect(vm.$el.textContent).toBe('count: ')
    await tick(vm, 2)
    expect(vm.$el.textContent).toBe('count: 0')

    toggleOnline(undefined)

    timeout(200)
    await tick(vm, 2)
    // should rerender since we're AMERICA ONLINE
    expect(vm.$el.textContent).toBe('count: 1')

    // connection drops... your mom picked up the phone while you were 🏄‍♂️ the 🕸
    toggleOnline(false)

    timeout(200)
    await tick(vm, 2)
    // should not rerender cuz offline
    expect(vm.$el.textContent).toBe('count: 1')

    done()
  })
})
