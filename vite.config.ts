import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // 网页应用使用绝对路径
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          antd: ['antd'],
          router: ['react-router-dom']
        }
      }
    }
  },
  server: {
    port: 5173,
    open: true, // 自动打开浏览器
    host: true
  },
  preview: {
    port: 4173,
    open: true
  }
})
