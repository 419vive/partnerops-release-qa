import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:8080';

export default defineConfig({
  testDir: './tests',
  testMatch: ['api/**/*.spec.ts', 'web/**/*.spec.ts'],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  outputDir: 'test-results',
  reporter: [
    ['line'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'results/junit.xml' }],
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'api',
      testMatch: 'api/**/*.spec.ts',
    },
    {
      name: 'chromium',
      testMatch: ['web/smoke.spec.ts', 'web/triage-and-isolation.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testMatch: 'web/smoke.spec.ts',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testMatch: 'web/smoke.spec.ts',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-web-pixel-7',
      testMatch: 'web/mobile-client.spec.ts',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-web-iphone-13',
      testMatch: 'web/mobile-client.spec.ts',
      use: { ...devices['iPhone 13'] },
    },
  ],
});
