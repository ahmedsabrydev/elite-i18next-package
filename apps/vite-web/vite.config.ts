import react from '@vitejs/plugin-react'
import { i18nVitePlugin } from '@faang/i18n/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    react(),
    i18nVitePlugin({
      catalogsDir: 'node_modules/@faang/i18n/catalogs',
      locales: ['en', 'ar'],
    }),
  ],
  server: {
    allowedHosts: ['.monkeycode-ai.live'],
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
  },
})
