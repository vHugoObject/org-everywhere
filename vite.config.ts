import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { githubPagesSpa } from "@sctg/vite-plugin-github-pages-spa";
import { patchCssModules } from "vite-css-modules";
import mkcert from "vite-plugin-mkcert";

export default defineConfig({
  base: "/org-everywhere/",
  plugins: [
    react({ jsxRuntime: "classic" }),
    nodePolyfills(),
    githubPagesSpa({ verbose: true }),
    patchCssModules(),
    mkcert({
      savePath: "./cert",
    }),
  ],
  build: {
    rollupOptions: {
      external: ["**/*.{unit, browser, integration}.test.ts[x]"],
    },
    target: "es2024",
  },
});
