import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      // 代理讯飞API请求
      '/upload': {
        target: 'https://office-api-ist-dx.iflyaisol.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/upload/, '/v2/upload')
      },
      // 代理结果查询请求
      '/result': {
        target: 'https://office-api-ist-dx.iflyaisol.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/result/, '/v2/getResult')
      }
    }
  }
})