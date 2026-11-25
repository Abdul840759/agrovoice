import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true, // lets tunnel links (for phone testing) reach the dev server
    // Keep local development on the Express server while production can point to Render.
    proxy: { '/api': process.env.VITE_API_URL || 'http://localhost:4000' },
  },
})
