import axios from 'axios'

// 改为 VITE_API_BASE_URL，用于后端API
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'

export const httpClient = axios.create({
  baseURL,
  timeout: 30000,  // 增加超时时间，地质灾害数据可能较大
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器：自动添加 token
httpClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器
httpClient.interceptors.response.use(
  (response) => response.data,  // 直接返回 data，简化调用
  (error) => {
    // 401 未认证，跳转登录页
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    
    const message = error?.response?.data?.error || error?.message || '请求失败'
    return Promise.reject(new Error(message))
  }
)
