import Vue from 'vue/dist/vue.runtime.common.js'
import VueCompositionApi from '@vue/composition-api'
import useSWRV from '../../esm'

Vue.config.devtools = false
Vue.use(VueCompositionApi)

function fetcher (result) {
  return new Promise(resolve => {
    return setTimeout(() => {
      resolve(result)
    }, 100)
  })
}

export default context => {
  return new Promise(resolve => {
    resolve(new Vue({
      template: `
        <div>
          <div v-if="!data && !error">
            loading data2
          </div>
          <div v-if="data">
            data: {{ data }}
          </div>
        </div>
      `,
      setup () {
        const { data, error } = useSWRV('data', () => fetcher('foo'), { fetchOnServer: false })
        return { data, error }
      }
    }))
  })
}
