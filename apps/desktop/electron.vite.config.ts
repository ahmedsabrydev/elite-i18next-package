import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import renderer from './vite.renderer.config'

export default defineConfig({
  main: { plugins: [externalizeDepsPlugin({ exclude: ['@faang/i18n'] })] },
  preload: { plugins: [externalizeDepsPlugin()] },
  renderer,
})
