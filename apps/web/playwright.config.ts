import { defineConfig } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  outputDir: "../../node_modules/.cache/merit-circle/playwright",
  use: {
    baseURL,
    channel: "chrome",
    headless: true,
    trace: "on-first-retry",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "pnpm dev",
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
        env: {
          NEXT_PUBLIC_API_URL: "http://127.0.0.1:4000",
        },
      },
});
