import Vue from 'vue/dist/vue.common.js'
import VueCompositionApi from '@vue/composition-api'
import useSWR from '@/use-swrv'

Vue.use(VueCompositionApi)

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

    expect(vm.$el.textContent).toBe('hello, SWR')
    done()
  })
})
