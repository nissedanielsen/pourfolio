import { expect, test } from '@playwright/test'

// The service worker only exists in a production build: CI, or locally with E2E_PREVIEW=1.
test.skip(
  !process.env.CI && !process.env.E2E_PREVIEW,
  'needs a production build (set E2E_PREVIEW=1)',
)

const USERNAME = process.env.E2E_USERNAME ?? 'pourfolio'
const PASSWORD = process.env.E2E_PASSWORD ?? 'pourfolio'

test('can be installed as an app', async ({ page, request }) => {
  await page.goto('/')
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  const manifest = (await (await request.get(href!)).json()) as Record<string, unknown>
  expect(manifest).toMatchObject({ name: 'Pourfolio', display: 'standalone', start_url: '/' })
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    'href',
    '/apple-touch-icon-180x180.png',
  )
})

test('opens offline with what was last fetched', async ({ page, context }) => {
  await page.goto('/')
  await page.getByLabel('Användarnamn').fill(USERNAME)
  await page.getByLabel('Lösenord').fill(PASSWORD)
  await page.getByRole('button', { name: 'Logga in' }).click()
  await expect(page.getByRole('heading', { name: 'Inventarie' })).toBeVisible()

  // Once the service worker controls the page, the API answers are kept.
  await page.evaluate('navigator.serviceWorker.ready.then(() => true)')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Inventarie' })).toBeVisible()
  await page.waitForLoadState('networkidle')
  const items = await page.getByRole('article').allTextContents()
  expect(items.length).toBeGreaterThan(0)

  await context.setOffline(true)
  try {
    await page.reload()
    await expect(page.getByText(/Du är offline/)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Inventarie' })).toBeVisible()
    await expect(page.getByRole('article')).toHaveText(items)
  } finally {
    await context.setOffline(false)
  }
})
