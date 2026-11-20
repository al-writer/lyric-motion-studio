import { defineConfig } from 'vitest/config'

// Unit tests of the engine's pure parts (the Vite config's root is engine/).
export default defineConfig({ test: { root: '.', include: ['test/**/*.test.js'] } })
