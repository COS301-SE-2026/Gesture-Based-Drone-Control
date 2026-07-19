import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    cssMinify: "esbuild",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 3009,           // desired port
    strictPort: false,    // falls back to next available if 3000 is taken

    watch: {
      usePolling: true,
      interval: 100,   // milliseconds between polls (optional)
    },
  },
    
})
