import { expect, test, type Page } from '@playwright/test'

// Credentials default to the development ones in backend/src/main/resources/application-local.yml.
const USERNAME = process.env.E2E_USERNAME ?? 'pourfolio'
const PASSWORD = process.env.E2E_PASSWORD ?? 'pourfolio'

/** A valid, unique GTIN-14 (indicator digit 9), unlikely to exist in Open Food Facts. */
function uniqueBarcode(): string {
  const body = ('9' + Date.now().toString() + Math.floor(Math.random() * 10)).slice(0, 13)
  let sum = 0
  for (let i = 0; i < body.length; i++) {
    sum += Number(body[body.length - 1 - i]) * (i % 2 === 0 ? 3 : 1)
  }
  return body + ((10 - (sum % 10)) % 10)
}

async function signIn(page: Page) {
  await page.goto('/')
  await page.getByLabel('Användarnamn').fill(USERNAME)
  await page.getByLabel('Lösenord').fill(PASSWORD)
  await page.getByRole('button', { name: 'Logga in' }).click()
  await expect(page.getByRole('heading', { name: 'Inventarie' })).toBeVisible()
}

async function scan(page: Page, barcode: string) {
  await page.getByRole('button', { name: 'Skanna', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Skanna streckkod' })
  // No camera in the test browser: type the digits instead.
  await dialog.getByRole('textbox', { name: 'Streckkod' }).fill(barcode)
  await dialog.getByRole('button', { name: 'Sök' }).click()
}

test('a scanned bottle is recognised the next time', async ({ page }, testInfo) => {
  const barcode = uniqueBarcode()
  const name = `E2E Skannad ${testInfo.project.name} ${Date.now()}`

  await signIn(page)

  // First scan: unknown, so the form starts with just the barcode
  await scan(page, barcode)
  await expect(page.getByRole('heading', { name: 'Lägg till' })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Streckkod (EAN)' })).toHaveValue(barcode)
  await page.getByRole('combobox', { name: /Kategori/ }).selectOption({ label: 'Gin' })
  await page.getByRole('textbox', { name: /Namn/ }).fill(name)
  await page.getByRole('textbox', { name: 'Alkoholhalt' }).fill('40')
  await page.getByRole('button', { name: 'Lägg till' }).click()
  await expect(page.getByText(`${name} har lagts till`)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Inventarie' })).toBeVisible()

  // Second scan: you already have it, and a new bottle is filled in from last time
  await scan(page, barcode)
  const found = page.getByRole('dialog', { name: 'Du har redan den här' })
  await expect(found.getByRole('button', { name: new RegExp(name) })).toBeVisible()
  await found.getByRole('button', { name: 'Lägg till ny flaska' }).click()
  await expect(
    page.getByText('Ifyllt från förra gången du registrerade den här streckkoden.'),
  ).toBeVisible()
  await expect(page.getByRole('textbox', { name: /Namn/ })).toHaveValue(name)
  await expect(page.getByRole('textbox', { name: 'Alkoholhalt' })).toHaveValue('40')
  await page.getByRole('button', { name: 'Avbryt' }).click()

  // Clean up
  await expect(page.getByRole('heading', { name: 'Inventarie' })).toBeVisible()
  await page.getByRole('searchbox', { name: 'Sök' }).fill(name)
  await page
    .getByRole('article', { name })
    .getByRole('button', { name: /Ta bort/ })
    .click()
  await page.getByRole('dialog').getByRole('button', { name: 'Ta bort' }).click()
  await expect(page.getByText(`${name} har tagits bort`)).toBeVisible()
})
