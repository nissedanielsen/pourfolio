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

test('opens offline with what was last fetched', async ({ page, context, request }, testInfo) => {
  // A bottle of this test's own (the database may be empty, as in CI).
  const login = await request.post('/api/auth/login', {
    data: { username: USERNAME, password: PASSWORD },
  })
  const { token } = (await login.json()) as { token: string }
  const headers = { Authorization: `Bearer ${token}` }
  const categories = (await (await request.get('/api/categories', { headers })).json()) as {
    children: { id: number; code: string }[]
  }[]
  const gin = categories.flatMap((c) => c.children).find((c) => c.code === 'gin')!.id
  const name = `E2E Offline ${testInfo.project.name} ${Date.now()}`
  const created = await request.post('/api/inventory-items', {
    headers,
    data: { categoryId: gin, name, unitType: 'VOLUME', capacity: 700, remaining: 700 },
  })
  const { id } = (await created.json()) as { id: number }

  try {
    await page.goto(`/items/${id}`)
    await page.getByLabel('Användarnamn').fill(USERNAME)
    await page.getByLabel('Lösenord').fill(PASSWORD)
    await page.getByRole('button', { name: 'Logga in' }).click()
    const nameField = page.getByRole('textbox', { name: /Namn/ })
    await expect(nameField).toHaveValue(name)

    // Once the service worker controls the page, the API answers are kept.
    await page.evaluate('navigator.serviceWorker.ready.then(() => true)')
    await page.reload()
    await expect(nameField).toHaveValue(name)

    await context.setOffline(true)
    try {
      await page.reload()
      await expect(page.getByText(/Du är offline/)).toBeVisible()
      await expect(nameField).toHaveValue(name)
    } finally {
      await context.setOffline(false)
    }
  } finally {
    await request.delete(`/api/inventory-items/${id}`, { headers })
  }
})
