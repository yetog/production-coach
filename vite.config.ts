import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
  base: '/production-coach/',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3021',
        changeOrigin: true,
      },
    },
  },
})
