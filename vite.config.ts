import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { fileURLToPath } from 'url'

// 在 ESM 中获取 __dirname
const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://47.102.147.118:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      // 添加地质云代理
      '/geology-cloud': {
        target: 'https://igss.cgs.gov.cn:6160',
        changeOrigin: true,
        secure: false, // 如果目标服务器是https但证书有问题，设置为false
        rewrite: (path) => path.replace(/^\/geology-cloud/, ''),
        headers: {
          'Origin': 'https://igss.cgs.gov.cn',
          'Referer': 'https://igss.cgs.gov.cn'
        }
      }
    }
  }
})