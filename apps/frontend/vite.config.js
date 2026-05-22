import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  server: {
    port: 3000,           // desired port
    strictPort: false,    // falls back to next available if 3000 is taken

    watch: {
      usePolling: true,
      interval: 100,   // milliseconds between polls (optional)
    },
  },
    
})
