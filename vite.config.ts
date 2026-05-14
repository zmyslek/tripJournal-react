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
    commonjsOptions: {
      include: [/heic2any/, /node_modules/]
    }
  },
  optimizeDeps: {
    include: ['heic2any']
  }
})
