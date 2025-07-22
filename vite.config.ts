import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: "org-everywhere",
  plugins: [
    react(),
    githubPagesSpa({verbose: true})
  ],
})
