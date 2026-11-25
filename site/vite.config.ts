import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite-plus'
import { beforePaintScript } from './src/theme'

const themeColorMeta = /<meta name="theme-color"[^>]*>/

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // The reader's theme setting, applied before first paint: inlined right
    // after the theme-color meta it updates, so it runs ahead of the
    // stylesheet link instead of waiting for it.
    {
      name: 'theme-before-paint',
      transformIndexHtml(html) {
        if (!themeColorMeta.test(html)) throw new Error('index.html needs a theme-color meta for the theme script')
        return html.replace(themeColorMeta, (meta) => `${meta}\n    <script>${beforePaintScript}</script>`)
      },
    },
  ],
  // allowedHosts: reach the dev server by hostname from other devices on the LAN (with --host).
  server: { host: '127.0.0.1', port: 3015, strictPort: true, allowedHosts: true },
})
