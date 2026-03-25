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
      // 你的后端API代理
      '/api': {
        target: 'http://47.102.147.118:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      // 腾讯地图API代理 - 修改配置
      '/tencent-map': {
        target: 'https://apis.map.qq.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/tencent-map/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // 设置请求头
            proxyReq.setHeader('Origin', 'https://apis.map.qq.com');
            proxyReq.setHeader('Referer', 'https://apis.map.qq.com');
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('腾讯地图代理响应状态:', proxyRes.statusCode);
          });
          proxy.on('error', (err, req, res) => {
            console.log('腾讯地图代理错误:', err);
          });
        }
      }
    }
  }
})