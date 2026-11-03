import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { apiPlugin } from './server/api.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiPlugin()],
  server: { watch: { ignored: ['**/data/**'] } },
})
