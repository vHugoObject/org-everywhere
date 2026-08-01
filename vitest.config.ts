import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  plugins: [react({ jsxRuntime: "classic" })],
  test: {
    projects: [
      {
        test: {
          name: "unit",
          globals: true,
          setupFiles: ["vitest-setup.ts"],
          environment: "jsdom",
          include: ["**/*.unit.test.ts"],
	  retry: {
	    count: 3,
	    delay: 500, // Wait 500ms between retries
	  },
        },
      },
      {
        test: {
          include: ["**/*.browser.test.tsx"],
          name: "browser",
          globals: true,
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
	    headless: true,
          },
        },
      }
    ],
  },
});
