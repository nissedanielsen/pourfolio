import { defineConfig, devices } from '@playwright/test'

// End-to-end tests run the real frontend against the real backend and database.
// Locally: start PostgreSQL (docker compose up -d) and run `npm run e2e`; an already
// running backend on :8080 is reused. In CI both servers are started here, and the
// frontend is a production build (vite preview, which uses the same /api proxy).
const ci = !!process.env.CI
// A production build (vite preview) instead of the dev server; the service worker needs one.
const preview = ci || !!process.env.E2E_PREVIEW
const FRONTEND_PORT = 5180

export default defineConfig({
  testDir: './e2e',
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  workers: ci ? 1 : undefined,
  expect: { timeout: ci ? 10_000 : 5_000 },
  reporter: ci ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    locale: 'sv-SE',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command:
        process.platform === 'win32'
          ? String.raw`.\mvnw.cmd -B -q spring-boot:run`
          : './mvnw -B -q spring-boot:run',
      cwd: '../backend',
      // Barcode lookups must not depend on the real Open Food Facts in tests.
      env: { OPEN_FOOD_FACTS_ENABLED: 'false' },
      url: 'http://localhost:8080/actuator/health',
      reuseExistingServer: !ci,
      timeout: 180_000,
      stdout: 'ignore',
    },
    {
      command: preview
        ? `npm run build && npm run preview -- --port ${FRONTEND_PORT} --strictPort`
        : `npm run dev -- --port ${FRONTEND_PORT} --strictPort`,
      url: `http://localhost:${FRONTEND_PORT}`,
      reuseExistingServer: !ci,
      timeout: 120_000,
    },
  ],
})
