/* eslint-disable */
import Vue from 'vue/dist/vue.common'
import VueCompositionApi from '@vue/composition-api'
import App from './App'

Vue.use(VueCompositionApi)

new Vue({
  template: '<App />',
  components: { App }
}).$mount('#app')
