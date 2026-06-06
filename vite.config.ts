import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    hmr: false
  },
  assetsInclude: [
    '**/*.heic',
    '**/*.heif',
    '**/*.avif',
    '**/*.tif',
    '**/*.tiff',
    '**/*.bmp',
    '**/*.mkv',
    '**/*.wmv',
    '**/*.flv',
    '**/*.3gp',
    '**/*.mpeg'
  ],
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    commonjsOptions: {
      include: [/heic2any/, /node_modules/]
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    },
  },
  optimizeDeps: {
    include: ['heic2any']
  }
})
