import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'html',
  use: { baseURL: 'http://127.0.0.1:47831', trace: 'on-first-retry' },
  webServer: { command: 'pnpm preview --host 127.0.0.1 --port 47831', port: 47831, reuseExistingServer: false },
  projects: [
    { name: 'mobile-chromium', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } }
  ]
})
