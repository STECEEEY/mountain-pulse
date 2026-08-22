import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'、
import '@geoscene/core/assets/esri/themes/dark/main.css';

// 引入 Element Plus 和样式
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

// 引入 OpenLayers 样式
import 'ol/ol.css'

// 导入用户 store
import { useUserStore } from './stores/user'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(ElementPlus)

// 初始化用户状态（在挂载前执行）
const userStore = useUserStore()
userStore.init().then(() => {
  app.mount('#app')
})
