import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import AutoImport from 'unplugin-auto-import/vite'


export default defineConfig({
  plugins: [react({jsxRuntime: "classic"}),
    AutoImport({
      imports: ["vitest", "react"],
      dts: true
    }),    
  ],
  test: {
    setupFiles: ['setup-file.ts'],
    environment: "jsdom"
  }

})

