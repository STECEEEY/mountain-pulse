import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { fileURLToPath } from 'url'

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
      '/tencent-map': {
        target: 'https://apis.map.qq.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/tencent-map/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
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
      },
      // 添加阿里云代理
      '/aliyun': {
        target: 'https://dashscope.aliyuncs.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/aliyun/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('代理请求:', req.method, req.url)
          })
       }
    }
  }
})