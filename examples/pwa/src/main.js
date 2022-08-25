import Vue from 'vue'
import App from './App.vue'
import './registerServiceWorker'

Vue.config.productionTip = false

Vue.prototype.$api = path => fetch(`https://jsonplaceholder.typicode.com${path}`).then(res => res.json())

new Vue({
  render: h => h(App)
}).$mount('#app')
