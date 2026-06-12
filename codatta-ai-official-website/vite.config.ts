import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import svgr from 'vite-plugin-svgr'


export default defineConfig({
  base: process.env.CDN_ASSETS_PATH ? `https://s.codatta.ai/${process.env.CDN_ASSETS_PATH}` : undefined,
  plugins: [react(), svgr()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5175,
    host: '0.0.0.0',
    proxy: {
      '^/api': {
        target: 'https://app-test.b18a.io/',
        changeOrigin: true
      }
    }
  }
})
