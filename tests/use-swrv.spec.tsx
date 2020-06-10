import { createApp, watch, defineComponent, ref, h } from 'vue'
import { mount } from '@vue/test-utils'
import useSWRV, { mutate } from '@/use-swrv'

jest.useFakeTimers()
const timeout: Function = milliseconds => jest.advanceTimersByTime(milliseconds)
const tick: Function = async (vm, times) => {
  for (let _ in [...Array(times).keys()]) {
    await vm.$nextTick()
  }
}

const container = document.createElement('div')

describe('useSWRV', () => {
  it('should return data on hydration when fetch is not a promise', done => {
    const fetch = () => 'SWR'
    const wrapper = mount(defineComponent({
      template: `<div>hello, {{ data }}</div>`,
      setup  () {
        return useSWRV('cache-key-not-a-promise', fetch)
      }
    }))

    expect(wrapper.text()).toBe('hello, SWR')
    done()
  })

  it('should return `undefined` on hydration', done => {
    const fetch = () => new Promise(res => setTimeout(() => res('SWR'), 1))
    const wrapper = mount(defineComponent({
      template: `<div>hello, {{ data }}</div>`,
      setup  () {
        return useSWRV('cache-key-1', fetch)
      }
    }))

    expect(wrapper.vm.data).toBe(undefined)
    done()
  })

  it('should return data after hydration', done => {
    const vm = createApp({
      template: `<div>hello, {{ data }}</div>`,
      setup  () {
        return useSWRV('cache-key-2', () => 'SWR')
      }
    }).mount(container)

    expect(vm.$el.textContent).toBe('hello, SWR')
    done()
  })

  it('should return data from a promise', async done => {
    const vm = createApp({
      template: `<div>hello, {{ data }}</div>`,
      setup  () {
        return useSWRV('cache-key-promise', () => new Promise(resolve => resolve('SWR')))
      }
    }).mount(container)

    expect(vm.$el.textContent).toBe('hello, ')

    await tick(vm, 1)

    expect(vm.$el.textContent).toEqual('hello, SWR')
    done()
  })

  it('should allow functions as key and reuse the cache', async done => {
    const vm = createApp({
      template: `<div>hello, {{ data }}</div>`,
      setup  () {
        return useSWRV(() => 'cache-key-2', () => 'SWR')
      }
    }).mount(container)

    // immediately available via cache without waiting for $nextTick
    expect(vm.$el.textContent).toBe('hello, SWR')
    done()
  })

  it('should allow async fetcher functions', async done => {
    const vm = createApp({
      template: `<div>hello, {{ data }}</div>`,
      setup  () {
        return useSWRV('cache-key-3', () =>
          new Promise(res => setTimeout(() => res('SWR'), 200))
        )
      }
    }).mount(container)

    expect(vm.$el.textContent).toBe('hello, ')

    timeout(200)
    await tick(vm, 1)

    expect(vm.$el.textContent).toBe('hello, SWR')
    done()
  })

  it('should dedupe requests by default', async done => {
    let count = 0
    const fetch = () => {
      count++
      return new Promise(res => setTimeout(() => res('SWR'), 200))
    }

    const vm = createApp({
      template: `<div>{{v1}}, {{v2}}</div>`,
      setup  () {
        const { data: v1 } = useSWRV('cache-key-4', fetch)
        const { data: v2 } = useSWRV('cache-key-4', fetch)
        return { v1, v2 }
      }
    }).mount(container)

    expect(vm.$el.textContent).toBe(', ')

    timeout(200)
    await tick(vm, 1)
    expect(vm.$el.textContent).toBe('SWR, SWR')

    // only fetches once
    expect(count).toEqual(1)
    done()
  })

  it('should fetch dependently', async done => {
    let count = 0
    const loadUser = (): Promise<{ id: number }> => {
      return new Promise(res => setTimeout(() => {
        count++
        res({ id: 123 })
      }, 1000))
    }

    const loadProfile = endpoint => {
      return new Promise((res) => setTimeout(() => {
        count++
        endpoint && res({
          userId: 123,
          age: 20
        })
      }, 200))
    }

    const wrapper = mount(defineComponent({
      template: `<div>d1:{{ data1 && data1.id }} e1:{{ error1 }} d2:{{ data2 && data2.userId }} e2:{{ error2 }}</div>`,
      setup  () {
        const { data: data1, error: error1 } = useSWRV('/api/user', loadUser)
        // TODO: checking truthiness of data1.value to avoid watcher warning
        // https://github.com/vuejs/composition-api/issues/242
        const { data: data2, error: error2 } = useSWRV(() => data1.value && `/api/profile?id=` + data1.value.id, loadProfile)
        return { data1, error1, data2, error2 }
      }
    }))
    const vm = wrapper.vm

    expect(wrapper.text()).toBe('d1: e1: d2: e2:')
    timeout(100)
    await tick(vm, 1)
    expect(wrapper.text()).toBe('d1: e1: d2: e2:')
    expect(count).toEqual(0) // Promises still in flight

    timeout(900)
    await tick(vm, 1)
    expect(wrapper.text()).toBe('d1:123 e1: d2: e2:')
    expect(count).toEqual(2)

    timeout(200)
    await tick(vm, 1)
    expect(wrapper.text()).toBe('d1:123 e1: d2:123 e2:')
    expect(count).toEqual(3)
    done()
  })

  // From #24
  it('should only update refs of current cache key', async done => {
    const fetcher = (key) => new Promise(res => setTimeout(() => res(key), 1000))

    const wrapper = mount(defineComponent({
      template: `<div>Page: {{ data }}</div>`,
      setup  () {
        const page = ref('1')
        const { data, error } = useSWRV(() => {
          return page.value
        }, fetcher)

        let interval = setInterval(() => {
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
    await vm.$nextTick()
    expect(vm.page).toBe('1')
    expect(wrapper.text()).toBe('Page:')

    // page has now updated to page=2, fetcher1 has not yet resolved, fetcher
    // for page=2 has now fired
    timeout(500)
    await vm.$nextTick()
    expect(vm.page).toBe('2')
    expect(wrapper.text()).toBe('Page:')

    // fetcher for page=1 has resolved, but the cache key is not equal to the
    // current page, so the data ref does not update. fetcher for page=3 has
    // now fired
    timeout(500)
    await vm.$nextTick()
    expect(vm.page).toBe('3')
    expect(wrapper.text()).toBe('Page:')

    // cache key is no longer updating and the fetcher for page=3 has resolved
    // so the data ref now updates.
    timeout(1000)
    await vm.$nextTick()
    expect(vm.page).toBe('3')
    expect(wrapper.text()).toBe('Page: 3')

    done()
  })
})

describe('useSWRV - loading', () => {
  const loadData = () => new Promise(res => setTimeout(() => res('data'), 100))

  it('should return loading state via undefined data', async done => {
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

    const vm = wrapper.vm

    expect(renderCount).toEqual(1)
    expect(wrapper.text()).toBe('hello, loading')
    timeout(100)

    await tick(vm, 1)

    expect(wrapper.text()).toBe('hello, data')
    expect(renderCount).toEqual(2)
    done()
  })

  it('should return loading state via isValidating', async done => {
    // Prime the cache
    const wrapper = mount(defineComponent({
      setup () {
        const { data, isValidating } = useSWRV('is-validating-2', loadData, {
          refreshInterval: 1000
        })

        return () => h('div', `hello, ${data.value || ''}, ${isValidating.value ? 'loading' : 'ready'}`)
      }
    }))
    const vm = wrapper.vm

    expect(wrapper.text()).toBe('hello, , loading')

    timeout(100)
    await tick(vm, 2)
    expect(wrapper.text()).toBe('hello, data, ready')

    // Reactive to future refreshes
    timeout(900)
    await tick(vm, 2)
    expect(wrapper.text()).toBe('hello, data, loading')

    timeout(100)
    await vm.$nextTick()
    expect(wrapper.text()).toBe('hello, data, ready')
    done()
  })
})

describe('useSWRV - mutate', () => {
  it('prefetches via mutate', done => {
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
      done()
    })

    timeout(100)
  })

  test.todo('mutate triggers revalidations')
  // it('mutate triggers revalidations', done => {
  //   const loadData = key => new Promise(res => setTimeout(() => res(key + Date.now()), 100))
  //   mutate('mutate-is-revalidated-1', loadData('mutate-is-revalidated-1')).then(async () => {
  //     const vm = createApp({
  //       template: `<div>hello, {{ data }}</div>`,
  //       setup () {
  //         setTimeout(() => {
  //           mutate('mutate-is-revalidated-1', new Promise((resolve) => resolve('hey')))
  //         }, 50)

  //         return useSWRV('mutate-is-revalidated-1', loadData)
  //       }
  //     }).mount(container)

  //     tick(vm, 4)
  //     expect(vm.$el.textContent).toContain('hello, mutate-is-revalidated-1')
  //     timeout(100)
  //     tick(vm, 4)
  //     expect(vm.$el.textContent).toContain('hello, mutate-is-revalidated-1')
  //     timeout(50)
  //     tick(vm, 4)
  //
  //     // TODO: understand why revalidation isn't working here
  //     expect(vm.$el.textContent).toBe('hello, hey')
  //     done()
  //   })

  //   timeout(100)
  // })
})

describe('useSWRV - listeners', () => {
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

    const app = createApp({
      template: `<div>hello, {{ data }}</div>`,
      setup  () {
        const refs = useSWRV('cache-key-1', () => 'SWR')
        revalidate = refs.revalidate
        return refs
      }
    })
    const vm = app.mount(container)

    await vm.$nextTick()

    app.unmount(container)

    expect(f1).toHaveBeenLastCalledWith('visibilitychange', revalidate, false)
    expect(f2).toHaveBeenLastCalledWith('visibilitychange', revalidate, false)
    expect(f3).toHaveBeenLastCalledWith('focus', revalidate, false)
    expect(f4).toHaveBeenLastCalledWith('focus', revalidate, false)
    done()
  })
})

describe('useSWRV - refresh', () => {
  it('should rerender automatically on interval', async done => {
    let count = 0

    const vm = createApp({
      template: `<div>count: {{ data }}</div>`,
      setup  () {
        return useSWRV('dynamic-1', () => count++, {
          refreshInterval: 200,
          dedupingInterval: 100
        })
      }
    }).mount(container)

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

    const vm = createApp({
      template: `<div>count: {{ data }}</div>`,
      setup  () {
        return useSWRV('dynamic-2', loadData, {
          refreshInterval: 200,
          dedupingInterval: 300
        })
      }
    }).mount(container)

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
    await tick(vm, 1)
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
})

describe('useSWRV - error', () => {
  it('should handle errors', async done => {
    const vm = createApp({
      template: `<div>
        <div v-if="data">hello, {{ data }}</div>
        <div v-if="error">{{error.message}}</div>
      </div>`,
      setup  () {
        return useSWRV(() => 'error-1', () => new Promise((_, reject) => {
          reject(new Error('error!'))
        }))
      }
    }).mount(container)

    await tick(vm, 2)

    expect(vm.$el.textContent.trim()).toBe('error!')
    done()
  })

  it('should be able to watch errors - similar to onError callback', async done => {
    let erroredSWR = null

    const vm = createApp({
      template: `<div>
        <div>hello, {{ data }}</div>
      </div>`,
      setup  () {
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
    }).mount(container)

    expect(vm.$el.textContent).toBe('hello, ')
    timeout(200)
    await tick(vm, 2)
    expect(erroredSWR).toEqual('error!')
    done()
  })

  it('should serve stale-if-error', async done => {
    let count = 0
    const loadData = () => new Promise((resolve, reject) => setTimeout(() => {
      count++
      count > 2 ? reject(new Error('uh oh!')) : resolve(count)
    }, 100))

    const wrapper = mount(defineComponent({
      template: `<div>count: {{ data }} {{ error }}</div>`,
      setup  () {
        return useSWRV('error-3', loadData, {
          refreshInterval: 200
        })
      }
    }))
    const vm = wrapper.vm

    timeout(300) // 200 refresh + 100 timeout
    await tick(vm, 3)
    expect(wrapper.text()).toBe('count: 1')

    timeout(300)
    await tick(vm, 3)
    expect(wrapper.text()).toBe('count: 2')

    timeout(300)
    await tick(vm, 1)
    // stale data sticks around even when error exists
    expect(wrapper.text()).toBe('count: 2 "Error: uh oh!"')
    done()
  })
})

describe('useSWRV - window events', () => {
  const toggleVisibility = state => Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: function () { return state }
  })

  const toggleOnline = state => Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    get: function () { return state }
  })

  it('should not rerender when document is not visible', async done => {
    let count = 0

    const app = createApp({
      template: `<div>count: {{ data }}</div>`,
      setup  () {
        return useSWRV('dynamic-5', () => count++, {
          refreshInterval: 200
        })
      }
    })
    const vm = app.mount(container)

    await tick(vm, 1)
    expect(vm.$el.textContent).toBe('count: 0')

    toggleVisibility(undefined)
    timeout(200)
    await tick(vm, 1)
    // should still update even though visibilityState is undefined
    expect(vm.$el.textContent).toBe('count: 1')

    toggleVisibility('hidden')

    timeout(200)
    await tick(vm, 1)

    // should not rerender because document is hidden e.g. switched tabs
    expect(vm.$el.textContent).toBe('count: 1')

    app.unmount(container)

    // put it back to visible for other tests
    toggleVisibility('visible')

    done()
  })

  it('should not rerender when offline', async done => {
    let count = 0

    const wrapper = mount(defineComponent({
      template: `<div>count: {{ data }}</div>`,
      setup  () {
        return useSWRV('dynamic-6', () => count++, {
          refreshInterval: 200,
          dedupingInterval: 10
        })
      }
    }))
    const vm = wrapper.vm

    await tick(vm, 1)
    expect(wrapper.text()).toBe('count: 0')

    toggleOnline(undefined)

    timeout(200)
    await tick(vm, 1)
    // should rerender since we're AMERICA ONLINE
    expect(wrapper.text()).toBe('count: 1')

    // connection drops... your mom picked up the phone while you were 🏄‍♂️ the 🕸
    toggleOnline(false)

    timeout(200)
    await tick(vm, 1)
    // should not rerender cuz offline
    expect(wrapper.text()).toBe('count: 1')

    done()
  })
})
