import { createRouter, createWebHashHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/register',
      name: 'Register',
      component: () => import('@/views/Register.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/map',
      name: 'Map',
      component: () => import('@/views/MapView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/',
      redirect: '/dashboard'
    }
  ]
})

// 修改后的路由守卫
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()
  
  // 确保用户状态已初始化
  if (!userStore.userInfo && userStore.token) {
    await userStore.fetchUserInfo().catch(() => {})
  }
  
  // ✅ 改这里：直接检查 token 是否存在
  const hasToken = !!userStore.token || !!sessionStorage.getItem('token')
  const requiresAuth = to.meta.requiresAuth !== false
  
  if (requiresAuth && !hasToken) {
    next('/login')
  } else if ((to.path === '/login' || to.path === '/register') && hasToken) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
