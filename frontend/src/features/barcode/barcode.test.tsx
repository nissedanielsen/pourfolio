import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { BarcodeLookup } from '../../api/client'
import { isValidGtin, normalizeGtin } from '../../lib/gtin'
import { createFakeBackend, makeItem, server } from '../../test/server'
import { renderApp } from '../../test/renderApp'

const HENDRICKS = '5010327755014'
const LIME_BAG = '7310865000019'

function setup(barcodes: Record<string, BarcodeLookup> = {}) {
  const backend = createFakeBackend([makeItem()], { barcodes })
  server.use(...backend.handlers)
  return backend
}

async function scanByTyping(code: string) {
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Skanna' }))
  const dialog = await screen.findByRole('dialog', { name: 'Skanna streckkod' })
  await user.type(within(dialog).getByRole('textbox', { name: 'Streckkod' }), code)
  await user.click(within(dialog).getByRole('button', { name: 'Sök' }))
  return user
}

describe('GTIN', () => {
  it('validates check digits', () => {
    expect(isValidGtin(HENDRICKS)).toBe(true)
    expect(isValidGtin('5010327755015')).toBe(false)
    expect(isValidGtin('96385074')).toBe(true)
    expect(normalizeGtin('5010 3277 55014')).toBe(HENDRICKS)
    expect(normalizeGtin('12345')).toBeNull()
  })
})

describe('scanning a barcode', () => {
  it('offers photo and typing when the camera is unavailable, and checks typed digits', async () => {
    setup()
    renderApp('/')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Skanna' }))

    const dialog = await screen.findByRole('dialog', { name: 'Skanna streckkod' })
    expect(await within(dialog).findByText(/Kameran går inte att använda här/)).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Fota streckkoden')).toBeInTheDocument()

    await user.type(within(dialog).getByRole('textbox', { name: 'Streckkod' }), '5010327755015')
    await user.click(within(dialog).getByRole('button', { name: 'Sök' }))
    expect(
      within(dialog).getByText('Ogiltig streckkod – kontrollera siffrorna.'),
    ).toBeInTheDocument()
  })

  it('fills in a suggestion from Open Food Facts', async () => {
    const backend = setup({
      [HENDRICKS]: {
        barcode: HENDRICKS,
        source: 'OPEN_FOOD_FACTS',
        suggestion: {
          name: 'Hendrick’s Gin',
          brand: "Hendrick's",
          abv: 41.7,
          unitType: 'VOLUME',
          capacity: 700,
          categoryId: 11,
        },
        existingItems: [],
        externalLookupFailed: false,
      },
    })
    const { router } = renderApp('/')

    const user = await scanByTyping(HENDRICKS)

    await screen.findByRole('heading', { name: 'Lägg till' })
    expect(router.state.location.pathname).toBe('/items/new')
    expect(screen.getByText(/kontrollera uppgifterna innan du sparar/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open Food Facts' })).toHaveAttribute(
      'href',
      `https://world.openfoodfacts.org/product/${HENDRICKS}`,
    )
    expect(screen.getByRole('textbox', { name: /Namn/ })).toHaveValue('Hendrick’s Gin')
    expect(screen.getByRole('textbox', { name: 'Märke' })).toHaveValue("Hendrick's")
    expect(screen.getByRole('textbox', { name: 'Alkoholhalt' })).toHaveValue('41,7')
    expect(screen.getByRole('textbox', { name: /Flaskstorlek/ })).toHaveValue('70')
    expect(screen.getByRole('textbox', { name: /Kvar/ })).toHaveValue('70')
    expect(screen.getByRole('combobox', { name: /Kategori/ })).toHaveValue('11')
    expect(screen.getByRole('textbox', { name: 'Streckkod (EAN)' })).toHaveValue(HENDRICKS)

    await user.click(screen.getByRole('button', { name: 'Lägg till' }))
    await waitFor(() =>
      expect(backend.requests.find((r) => r.method === 'POST')?.body).toMatchObject({
        name: 'Hendrick’s Gin',
        capacity: 700,
        abv: 41.7,
        barcode: HENDRICKS,
      }),
    )
  })

  it('starts an empty form with the barcode when nothing is known', async () => {
    setup()
    renderApp('/')

    await scanByTyping(LIME_BAG)

    await screen.findByRole('heading', { name: 'Lägg till' })
    expect(screen.getByText(/Okänd streckkod\. Fyll i uppgifterna/)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /Namn/ })).toHaveValue('')
    expect(screen.getByRole('textbox', { name: 'Streckkod (EAN)' })).toHaveValue(LIME_BAG)
  })

  it('says when Open Food Facts could not be reached', async () => {
    setup({
      [LIME_BAG]: {
        barcode: LIME_BAG,
        source: 'NONE',
        existingItems: [],
        externalLookupFailed: true,
      },
    })
    renderApp('/')

    await scanByTyping(LIME_BAG)

    expect(await screen.findByText(/Open Food Facts gick inte att nå just nu/)).toBeInTheDocument()
  })

  it('guesses the ingredient for a suggestion without one', async () => {
    setup({
      [LIME_BAG]: {
        barcode: LIME_BAG,
        source: 'OPEN_FOOD_FACTS',
        suggestion: { name: 'Lime', unitType: 'COUNT', capacity: 6, categoryId: 21 },
        existingItems: [],
        externalLookupFailed: false,
      },
    })
    renderApp('/')

    await scanByTyping(LIME_BAG)

    await screen.findByRole('heading', { name: 'Lägg till' })
    expect(screen.getByRole('combobox', { name: /Ingrediens/ })).toHaveValue('501')
    expect(screen.getByRole('textbox', { name: /Antal/ })).toHaveValue('6')
  })

  it('lets you open a bottle you already have or add a new one', async () => {
    setup({
      [HENDRICKS]: {
        barcode: HENDRICKS,
        source: 'KNOWN_PRODUCT',
        suggestion: { name: "Hendrick's", unitType: 'VOLUME', capacity: 700, categoryId: 11 },
        existingItems: [
          {
            id: 1,
            name: 'Tanqueray London Dry',
            unitType: 'VOLUME',
            capacity: 700,
            remaining: 520,
          },
        ],
        externalLookupFailed: false,
      },
    })
    const { router } = renderApp('/')

    const user = await scanByTyping(HENDRICKS)

    const dialog = await screen.findByRole('dialog', { name: 'Du har redan den här' })
    expect(within(dialog).getByText('52 cl kvar')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Lägg till ny flaska' }))
    await screen.findByText('Ifyllt från förra gången du registrerade den här streckkoden.')
    expect(router.state.location.pathname).toBe('/items/new')
    expect(screen.getByRole('textbox', { name: /Namn/ })).toHaveValue("Hendrick's")
  })

  it('opens the existing bottle from the dialog', async () => {
    setup({
      [HENDRICKS]: {
        barcode: HENDRICKS,
        source: 'KNOWN_PRODUCT',
        suggestion: {
          name: 'Tanqueray London Dry',
          unitType: 'VOLUME',
          capacity: 700,
          categoryId: 11,
        },
        existingItems: [
          {
            id: 1,
            name: 'Tanqueray London Dry',
            unitType: 'VOLUME',
            capacity: 700,
            remaining: 520,
          },
        ],
        externalLookupFailed: false,
      },
    })
    const { router } = renderApp('/')

    const user = await scanByTyping(HENDRICKS)
    const dialog = await screen.findByRole('dialog', { name: 'Du har redan den här' })
    await user.click(within(dialog).getByRole('button', { name: /Tanqueray London Dry/ }))

    await screen.findByRole('heading', { name: 'Ändra Tanqueray London Dry' })
    expect(router.state.location.pathname).toBe('/items/1')
  })

  it('validates the barcode field in the form', async () => {
    setup()
    const user = userEvent.setup()
    renderApp('/items/new')

    await user.type(await screen.findByRole('textbox', { name: 'Streckkod (EAN)' }), '12345')
    await user.click(screen.getByRole('button', { name: 'Lägg till' }))

    expect(await screen.findByText('Ogiltig streckkod – kontrollera siffrorna')).toBeInTheDocument()
  })
})
