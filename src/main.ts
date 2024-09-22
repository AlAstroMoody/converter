import App from './App.vue'

import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import DialogService from 'primevue/dialogservice'
import ToastService from 'primevue/toastservice'
const app = createApp(App)

app.use(ToastService)
app.use(DialogService)

app.use(PrimeVue, {
  theme: {
    preset: Aura
  }
})

app.mount('#app')
