import axios from 'axios'

// 从环境变量读取API地址
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'

export const httpClient = axios.create({
  baseURL,
  timeout: 30000,
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
  (response) => response.data,
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
