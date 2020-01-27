/* eslint-disable */
import Vue from '../../node_modules/vue/dist/vue.common'
import VueCompositionApi from '../../node_modules/@vue/composition-api'
import App from './App'

Vue.use(VueCompositionApi)

new Vue({
  template: '<App />',
  components: { App }
}).$mount('#app')
