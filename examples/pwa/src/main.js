import Vue from 'vue'
import App from './App.vue'
import VueCompositionApi from '@vue/composition-api'
import LocalStorageCache from './localStorageCache'
import './registerServiceWorker'

Vue.use(VueCompositionApi)
Vue.config.productionTip = false

Vue.prototype.$api = path => fetch(`https://jsonplaceholder.typicode.com${path}`).then(res => res.json())
Vue.prototype.$swrvCache = new LocalStorageCache()

new Vue({
  render: h => h(App)
}).$mount('#app')
