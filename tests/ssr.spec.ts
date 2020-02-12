import Vue from 'vue/dist/vue.common.js'
import VueCompositionApi from '@vue/composition-api'
import { createRenderer } from 'vue-server-renderer'
import useSWRV from '@/use-swrv'

Vue.use(VueCompositionApi)

async function fetch (result) {
  await new Promise(resolve => {
    setTimeout(() => {
      resolve(result)
    }, 10)
  })
}

// TODO: find why window is still defined and $ssrContext is never populated
xdescribe('SSR', () => {
  it('should prefetch async operations before rendering', async () => {
    const wrapper = {
      template: '<div>{{data}}</div>',
      setup () {
        const { data } = useSWRV('1', fetch)

        return {
          data
        }
      }
    }

    const renderer = createRenderer()
    const html = await renderer.renderToString(new Vue(wrapper))

    expect(html).toBe('<div data-server-rendered="true">1</div>')
  })
})
