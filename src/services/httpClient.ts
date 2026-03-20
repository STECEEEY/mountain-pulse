import axios from 'axios'

const baseURL = import.meta.env.VITE_AI_BASE_URL || '/api'

export const httpClient = axios.create({
  baseURL,
  timeout: 12000,
})

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error?.response?.data?.message || error?.message || '请求失败'
    return Promise.reject(new Error(message))
  }
)
