import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite-plus'
import { beforePaintScript } from './src/theme'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // The reader's theme setting, applied in the head before first paint. At
    // the end of the head, so the theme-color meta is already there.
    {
      name: 'theme-before-paint',
      transformIndexHtml: () => [{ tag: 'script', children: beforePaintScript, injectTo: 'head' }],
    },
  ],
  server: { host: '127.0.0.1', port: 3015, strictPort: true },
})
