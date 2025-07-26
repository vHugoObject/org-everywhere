import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from "vite-plugin-node-polyfills"


export default defineConfig({
  plugins: [
    react({jsxRuntime: 'classic'}),
    nodePolyfills()
  ],
  build: {
    rollupOptions: {
      external: ['**/*.{unit, browser, integration}.test.ts[x]']
    }
  }
})
