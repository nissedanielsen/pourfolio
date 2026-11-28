import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

// Credentials default to the development ones in backend/src/main/resources/application-local.yml.
const USERNAME = process.env.E2E_USERNAME ?? 'pourfolio'
const PASSWORD = process.env.E2E_PASSWORD ?? 'pourfolio'

interface Api {
  get: (path: string) => Promise<unknown>
  post: (path: string, data: unknown) => Promise<{ id: number }>
  remove: (path: string) => Promise<void>
}

/** A signed-in API client (through the same /api proxy as the app). */
async function api(request: APIRequestContext): Promise<Api> {
  const login = await request.post('/api/auth/login', {
    data: { username: USERNAME, password: PASSWORD },
  })
  const { token } = (await login.json()) as { token: string }
  const headers = { Authorization: `Bearer ${token}` }
  return {
    get: async (path) => (await request.get(path, { headers })).json(),
    post: async (path, data) => (await request.post(path, { headers, data })).json(),
    remove: async (path) => {
      await request.delete(path, { headers })
    },
  }
}

async function signIn(page: Page) {
  await page.goto('/')
  await page.getByLabel('Användarnamn').fill(USERNAME)
  await page.getByLabel('Lösenord').fill(PASSWORD)
  await page.getByRole('button', { name: 'Logga in' }).click()
  await expect(page.getByRole('heading', { name: 'Inventarie' })).toBeVisible()
}

test('making a drink takes it from the inventory and can be undone', async ({
  page,
  request,
}, testInfo) => {
  const client = await api(request)
  const suffix = `${testInfo.project.name} ${Date.now()}`
  const categories = (await client.get('/api/categories')) as {
    children: { id: number; code: string }[]
  }[]
  const category = (code: string) =>
    categories.flatMap((c) => c.children).find((c) => c.code === code)!.id
  const ingredients = (await client.get('/api/ingredients')) as { id: number; code: string }[]
  const lime = ingredients.find((i) => i.code === 'lime')!.id

  const ginName = `E2E Gin ${suffix}`
  const limeName = `E2E Lime ${suffix}`
  const gin = await client.post('/api/inventory-items', {
    categoryId: category('gin'),
    name: ginName,
    unitType: 'VOLUME',
    capacity: 700,
    remaining: 700,
  })
  const limes = await client.post('/api/inventory-items', {
    categoryId: category('citrus'),
    ingredientId: lime,
    name: limeName,
    unitType: 'COUNT',
    capacity: 6,
    remaining: 6,
  })
  const remaining = async (id: number) =>
    ((await client.get(`/api/inventory-items/${id}`)) as { remaining: number }).remaining

  try {
    await signIn(page)
    await page
      .getByRole('navigation', { name: 'Huvudmeny' })
      .getByRole('link', { name: 'Drinkar' })
      .click()
    await page.getByRole('searchbox', { name: 'Sök drink' }).fill('Gimlet')
    await page.getByRole('article', { name: 'Gimlet' }).click()
    await expect(page.getByRole('heading', { name: 'Gimlet', level: 1 })).toBeVisible()

    await page.getByRole('button', { name: 'Jag gjorde den!' }).click()
    const dialog = page.getByRole('dialog', { name: 'Jag gjorde Gimlet' })
    await expect(dialog.getByRole('list', { name: 'Det här dras av' })).toBeVisible()

    // Use this test's own bottles (the database may have others of the same kind).
    for (const [line, name, left] of [
      ['Gin', ginName, '70 cl'],
      ['Lime / limejuice', limeName, '6 st'],
    ]) {
      const from = dialog
        .getByRole('listitem', { name: line })
        .getByRole('combobox', { name: 'Från' })
      if (await from.count()) await from.selectOption({ label: `${name} (${left} kvar)` })
    }
    await dialog.getByRole('button', { name: 'Dra av' }).click()
    await expect(page.getByText('Skål! Gimlet – lagret är uppdaterat.')).toBeVisible()

    // 6 cl gin, and one lime for 2 cl juice.
    expect(await remaining(gin.id)).toBe(640)
    expect(await remaining(limes.id)).toBe(5)

    await page.getByRole('button', { name: 'Ångra' }).click()
    await expect(page.getByText('Ångrat – lagret är som innan.')).toBeVisible()
    expect(await remaining(gin.id)).toBe(700)
    expect(await remaining(limes.id)).toBe(6)
  } finally {
    await client.remove(`/api/inventory-items/${gin.id}`)
    await client.remove(`/api/inventory-items/${limes.id}`)
  }
})
