import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  root: resolve(import.meta.dirname, 'src/renderer'),
  plugins: [react()],
  server: {
    host: true,
    port: 5174,
    strictPort: true,
    allowedHosts: ['.monkeycode-ai.live'],
  },
  build: {
    outDir: resolve(import.meta.dirname, 'out/renderer'),
    emptyOutDir: true,
  },
})
