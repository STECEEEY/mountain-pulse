import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { httpClient } from '@/services/httpClient'

// 定义响应类型
interface LoginResponse {
  token: string
  user: {
    id: number
    username: string
    email: string
    full_name: string
    role: string
    role_level: number
    phone?: string
    organization?: string
    area_code?: string
  }
}

interface RegisterResponse {
  user: any
  token: string
}

interface UserInfoResponse {
  id: number
  username: string
  email: string
  full_name: string
  role: string
  role_level: number
  phone?: string
  organization?: string
  area_code?: string
  is_active: boolean
  created_at: string
  last_login: string
}

export const useUserStore = defineStore('user', () => {
  const token = ref(sessionStorage.getItem('token') || '')
  const userInfo = ref<any>(null)
  
  const isLoggedIn = computed(() => !!token.value)
  const userRole = computed(() => userInfo.value?.role || '')
  const userRoleLevel = computed(() => userInfo.value?.role_level || 3)
  
  // 登录
  const login = async (username: string, password: string) => {
    try {
      const response = await httpClient.post('/auth/login', { username, password }) as unknown as LoginResponse
      token.value = response.token
      userInfo.value = response.user
      sessionStorage.setItem('token', response.token)
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
      const response = await httpClient.post('/auth/register', userData) as unknown as RegisterResponse
      return response
    } catch (error) {
      throw error
    }
  }
  
  // 登出
  const logout = () => {
    token.value = ''
    userInfo.value = null
    sessionStorage.removeItem('token')
  }
  
  // 获取当前用户信息
  const fetchUserInfo = async () => {
    if (!token.value) return null
    try {
      const response = await httpClient.get('/auth/me') as unknown as UserInfoResponse
      userInfo.value = response
      return response
    } catch (error) {
      logout()
      throw error
    }
  }
  
  // 初始化
  const init = async () => {
    const savedToken = sessionStorage.getItem('token')
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
