import Vue from 'vue/dist/vue.common.js'
import VueCompositionApi, { createComponent } from '@vue/composition-api'
import useSWR, { mutate } from '@/use-swrv'

Vue.use(VueCompositionApi)

jest.useFakeTimers()

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

    await vm.$nextTick()
    await vm.$nextTick()

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

    await vm.$nextTick()
    await vm.$nextTick()

    expect(vm.$el.textContent).toBe('hello, SWR')
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

    await vm.$nextTick()
    await vm.$nextTick()

    // immediately available via cache without waiting for $nextTick
    expect(vm.$el.textContent.trim()).toBe('Error: unauthorized')
    done()
  })
})

describe('useSWR - loading', () => {
  const loadData = () => new Promise(res => setTimeout(() => res('data'), 100))

  it('should return loading state', async done => {
    let renderCount = 0
    const vm = new Vue({
      render: h => h(createComponent({
        name: 'App',
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
    jest.advanceTimersByTime(100)

    await vm.$nextTick()
    await vm.$nextTick()

    expect(vm.$el.textContent).toBe('hello, data')
    expect(renderCount).toEqual(2)
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
          name: 'App',
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

    jest.advanceTimersByTime(100)
  })
})
