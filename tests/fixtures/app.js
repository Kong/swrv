import Vue from 'vue/dist/vue.runtime.common.js'
import VueCompositionApi from '@vue/composition-api'
import useSWRV from '../../esm'

Vue.use(VueCompositionApi)

function fetcher (result) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(result)
    }, 200)
  })
}

export default context => {
  return new Promise(resolve => {
    resolve(new Vue({
      template: '<div>data:{{data}}</div>',
      setup () {
        const { data } = useSWRV('data', () => fetcher('foo'))

        return {
          data
        }
      }
    }))
  })
}
