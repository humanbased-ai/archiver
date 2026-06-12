import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5175,
    open: false,
    proxy: {
      '^/api/': {
        // target: 'https://app.b18a.io',
        target: 'https://kanban.codatta.io',
        changeOrigin: true,
      },
    },
  },
})
