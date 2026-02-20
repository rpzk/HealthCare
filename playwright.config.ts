import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testMatch: /.*\.spec\.ts/,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    timeout: 120 * 1000,
    reuseExistingServer: true,
  },
});
