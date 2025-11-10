import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/app/',
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // Proxy other API endpoints without /api prefix
      '/devices': 'http://localhost:8080',
      '/stats': 'http://localhost:8080',
      '/access-points': 'http://localhost:8080',
      '/config': 'http://localhost:8080',
      '/metrics': 'http://localhost:8080',
      '/ingest': 'http://localhost:8080'
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
