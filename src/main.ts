import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import { useThemePreferenceStore } from './stores/themePreferenceStore'
import { useWorkflowCanvasStore } from './stores/workflowCanvasStore'

const application = createApp(App)
const piniaStore = createPinia()

application.use(piniaStore)

const themePreferenceStore = useThemePreferenceStore(piniaStore)
themePreferenceStore.initializeThemePreference()
const workflowCanvasStore = useWorkflowCanvasStore(piniaStore)
workflowCanvasStore.restoreWorkflowSnapshotFromStorage()

application.mount('#app')
