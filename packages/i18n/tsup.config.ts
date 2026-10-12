import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'react/index': 'src/react/index.ts',
    'next/index': 'src/next/index.ts',
    'vite/index': 'src/vite/index.ts',
    'store/zustand': 'src/store/zustand.ts',
    'store/redux': 'src/store/redux.ts',
    'native/index': 'src/native/index.ts',
    'electron/index': 'src/electron/index.ts',
    'stubs/node': 'src/stubs/node.ts',
    'cli/index': 'src/cli/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  treeshake: true,
  splitting: true,
  sourcemap: true,
  external: ['i18next', 'react', 'react-i18next', 'react/jsx-runtime', 'next', 'next/server', 'zustand', '@reduxjs/toolkit'],
})
