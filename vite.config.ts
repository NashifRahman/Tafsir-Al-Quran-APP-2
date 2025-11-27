import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server:{
    proxy:{
      '/api-kemenag': {
        target: 'https://quran-api.lpmqkemenag.id', // URL Asli
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-kemenag/, ''), // Hapus prefix saat meneruskan
      },
    }
  }
})
