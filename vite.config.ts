import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // 网页应用使用绝对路径
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React相关
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor';
          }
          // Antd相关
          if (id.includes('antd') || id.includes('@ant-design')) {
            return 'antd-vendor';
          }
          // 路由相关
          if (id.includes('react-router')) {
            return 'router-vendor';
          }
          // 解析器相关（较大的功能模块）
          if (id.includes('src/parsers') || id.includes('src/utils/aiParser')) {
            return 'parsers';
          }
          // 导入相关组件
          if (id.includes('src/components/Import')) {
            return 'import-components';
          }
          // 其他第三方库
          if (id.includes('node_modules')) {
            return 'vendor';
          }
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
