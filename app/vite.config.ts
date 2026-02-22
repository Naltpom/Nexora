import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern',
      },
    },
  },
  define: {
    'import.meta.env.VITE_ENV': JSON.stringify(process.env.VITE_ENV || 'production'),
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    watch: {
      usePolling: true,
    },
    allowedHosts: ['localhost', '127.0.0.1'],
    hmr: {
      host: 'localhost',
      port: 5472,
      clientPort: 5472,
    },
    proxy: {
      '/api': {
        target: 'http://api:8000',
        changeOrigin: true,
      },
    },
  },
})
