import { expect, test } from '@playwright/test'

// Route changes render in a React transition, so each step waits for the new page's
// heading before interacting; otherwise it could act on the previous page.
//
// One full journey through the app. Uses a unique name so it can run against a
// database that already has data, and cleans up after itself by deleting the item.
test('add, find, adjust, edit and delete an item', async ({ page }, testInfo) => {
  const name = `E2E Gin ${testInfo.project.name} ${Date.now()}`
  const renamed = `${name} (ändrad)`

  // Add
  await page.goto('/')
  await page.getByRole('link', { name: 'Lägg till', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Lägg till' })).toBeVisible()
  await page.getByRole('combobox', { name: /Kategori/ }).selectOption({ label: 'Gin' })
  await page.getByRole('textbox', { name: /Namn/ }).fill(name)
  await page.getByRole('textbox', { name: 'Alkoholhalt' }).fill('41,5')
  await page.getByText('50 cl', { exact: true }).click()
  await expect(page.getByRole('textbox', { name: /Kvar/ })).toHaveValue('50')
  await page.getByRole('button', { name: 'Lägg till' }).click()
  await expect(page.getByText(`${name} har lagts till`)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Inventarie' })).toBeVisible()

  // Find it with search
  await page.getByRole('searchbox', { name: 'Sök' }).fill(name)
  await expect(page).toHaveURL(/q=E2E/)
  const card = page.getByRole('article', { name })
  await expect(card).toHaveCount(1)
  await expect(card.getByText('Gin · 41,5 %')).toBeVisible()
  await expect(card.getByText('50 cl av 50 cl')).toBeVisible()

  // Mark it as finished with the quick adjustment
  await card.getByRole('button', { name: /Justera mängd kvar/ }).click()
  const adjust = page.getByRole('dialog')
  await adjust.getByRole('button', { name: 'Slut' }).click()
  await adjust.getByRole('button', { name: 'Spara' }).click()
  await expect(card.getByText('Slut')).toBeVisible()

  // It now shows up under "Snart slut"
  const lowStock = page.getByRole('switch', { name: 'Snart slut' })
  await lowStock.click()
  await expect(lowStock).toBeChecked()
  await expect(page).toHaveURL(/lowStock=true/)
  await expect(page).toHaveURL(/q=E2E/)
  await expect(card).toBeVisible()

  // Edit
  await card.getByRole('link', { name: /Ändra/ }).click()
  await expect(page.getByRole('heading', { name: `Ändra ${name}` })).toBeVisible()
  await expect(page.getByRole('textbox', { name: /Namn/ })).toHaveValue(name)
  await expect(page.getByRole('textbox', { name: /Kvar/ })).toHaveValue('0')
  await page.getByRole('textbox', { name: /Namn/ }).fill(renamed)
  await page.getByRole('textbox', { name: /Kvar/ }).fill('12,5')
  await page.getByRole('button', { name: 'Spara' }).click()

  // Back on the filtered list (search still matches the new name)
  await expect(page.getByRole('heading', { name: 'Inventarie' })).toBeVisible()
  await expect(page).toHaveURL(/q=E2E/)
  await expect(page).toHaveURL(/lowStock=true/)
  await page.getByRole('switch', { name: 'Snart slut' }).click()
  await expect(page).not.toHaveURL(/lowStock/)
  const renamedCard = page.getByRole('article', { name: renamed })
  await expect(renamedCard.getByText('12,5 cl av 50 cl')).toBeVisible()

  // Delete
  await renamedCard.getByRole('button', { name: /Ta bort/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Ta bort' }).click()
  await expect(page.getByText(`${renamed} har tagits bort`)).toBeVisible()
  await expect(page.getByText('Inget matchar filtret.')).toBeVisible()
})
