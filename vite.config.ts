import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/LAN-Championship_2026/',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
})
