import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  root: 'engine',
  base: './',
  plugins: [react()],
  resolve: { alias: { '@tracks': fileURLToPath(new URL('./tracks', import.meta.url)) } },
  server: { fs: { allow: ['..'] } },
  build: { outDir: '../dist', emptyOutDir: true, chunkSizeWarningLimit: 2000 },
})
