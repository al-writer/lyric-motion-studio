import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import lms from './engine/vite/plugin.js'

// LMS_PROJECTS: folder of projects (default ./tracks); LMS_TRACK: build only
// that one (render.mjs does); LMS_DIST: output folder (default ./dist).
const here = (p) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  root: here('./engine'),
  base: './',
  plugins: [react(), lms({ projects: process.env.LMS_PROJECTS || 'tracks', track: process.env.LMS_TRACK || null })],
  resolve: {
    // projects import the engine's building blocks as 'lms'
    alias: { lms: here('./engine/src/lib/index.js') },
    // project files live outside the studio: their bare imports resolve here
    dedupe: ['react', 'react-dom', 'framer-motion'],
  },
  build: { outDir: process.env.LMS_DIST || here('./dist'), emptyOutDir: true, chunkSizeWarningLimit: 2000 },
})
