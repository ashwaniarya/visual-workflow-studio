import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

const application = createApp(App)
const piniaStore = createPinia()

application.use(piniaStore)
application.mount('#app')
