import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Test Configuration
 * Run tests with: npx playwright test
 */
export default defineConfig({
  // Test directory
  testDir: "./tests",

  // Test files pattern
  testMatch: "**/*.spec.ts",

  // Fully parallelize tests
  fullyParallel: true,

  // Fail build on CI if test retries are needed
  forbidOnly: !!process.env.CI,

  // Retry failed tests
  retries: process.env.CI ? 2 : 0,

  // Parallel workers
  workers: process.env.CI ? 1 : undefined,

  // Reporter
  reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],

  // Shared settings for all projects
  use: {
    // Base URL for tests
    baseURL: "http://localhost:3000",

    // Trace on first retry
    trace: "on-first-retry",

    // Collect screenshots on failure
    screenshot: "only-on-failure",

    // Video on failure
    video: "retain-on-failure",
  },

  // Configure projects for different browsers
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],

  // Local web server configuration
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
