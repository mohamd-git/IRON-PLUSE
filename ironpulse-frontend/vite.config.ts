import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'IRON PULSE',
        short_name: 'IRONPULSE',
        theme_color: '#cafd00',
        background_color: '#0e0e0e',
        display: 'standalone',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/framer-motion')) {
            return 'vendor'
          }
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) {
            return 'charts'
          }
          if (id.includes('node_modules/leaflet') || id.includes('node_modules/react-leaflet')) {
            return 'maps'
          }
        }
      }
    }
  },
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8085',
        changeOrigin: true,
        // Required for SSE streaming (AI coach) — disables proxy buffering
        headers: { 'X-Accel-Buffering': 'no' },
      },
      '/ws': {
        target: 'ws://localhost:8085',
        ws: true,
      },
    },
  },
})
