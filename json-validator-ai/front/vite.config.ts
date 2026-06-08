import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy API requests to your Flask server
      '/api': {
        target: 'http://localhost:5001', // Your backend server address
        changeOrigin: true, // Recommended for virtual hosted sites
        // secure: false, // Uncomment if your backend is HTTP and not HTTPS
      },
    },
  },
})
