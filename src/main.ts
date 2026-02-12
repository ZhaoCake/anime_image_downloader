import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'viewerjs/dist/viewer.css'
import VueViewer from 'v-viewer'

import './style.css'
import App from './App.vue'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(VueViewer)
app.mount('#app')
