import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  optimizeDeps: { include: ['maplibre-gl'] },
  build: {
    chunkSizeWarningLimit: 2500,
    rolldownOptions: {
      output: {
        // Android's WebView server doesn't know the .mjs MIME type; ship the map worker as .js.
        assetFileNames: (asset) =>
          (asset.names?.[0] || asset.name || '').endsWith('.mjs') ? 'assets/[name]-[hash].js' : 'assets/[name]-[hash][extname]',
      },
    },
  },
})
