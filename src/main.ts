import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/minimap/dist/style.css'
import { useThemePreferenceStore } from './stores/themePreferenceStore'
import { useWorkflowPersistenceStore } from './stores/workflowPersistenceStore'

const application = createApp(App)
const piniaStore = createPinia()

application.use(piniaStore)

const themePreferenceStore = useThemePreferenceStore(piniaStore)
themePreferenceStore.initializeThemePreference()
const workflowPersistenceStore = useWorkflowPersistenceStore(piniaStore)
workflowPersistenceStore.restoreWorkflowSnapshotFromStorage()

application.mount('#app')
