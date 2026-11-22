import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite-plus'

export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', port: 3015, strictPort: true },
})
