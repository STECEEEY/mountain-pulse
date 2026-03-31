import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { httpClient } from '@/services/httpClient'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref<any>(null)
  
  const isLoggedIn = computed(() => !!token.value)
  const userRole = computed(() => userInfo.value?.role || '')
  const userRoleLevel = computed(() => userInfo.value?.role_level || 3)
  
  // 登录
  const login = async (username: string, password: string) => {
    try {
      const response = await httpClient.post('/auth/login', { username, password })
      token.value = response.token
      userInfo.value = response.user
      localStorage.setItem('token', response.token)
      return response
    } catch (error) {
      throw error
    }
  }
  
  // 注册
  const register = async (userData: {
    username: string
    email: string
    password: string
    full_name: string
    role: string
    role_level?: number
    phone?: string
    organization?: string
    area_code?: string
  }) => {
    try {
      const response = await httpClient.post('/auth/register', userData)
      return response
    } catch (error) {
      throw error
    }
  }
  
  // 登出
  const logout = () => {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
  }
  
  // 获取当前用户信息
  const fetchUserInfo = async () => {
    if (!token.value) return null
    try {
      const response = await httpClient.get('/auth/me')
      userInfo.value = response
      return response
    } catch (error) {
      logout()
      throw error
    }
  }
  
  // 初始化
  const init = async () => {
    const savedToken = localStorage.getItem('token')
    if (savedToken) {
      token.value = savedToken
      try {
        await fetchUserInfo()
      } catch (error) {
        logout()
      }
    }
  }
  
  return {
    token,
    userInfo,
    isLoggedIn,
    userRole,
    userRoleLevel,
    login,
    register,
    logout,
    fetchUserInfo,
    init
  }
})
