import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createFakeBackend, makeItem, server } from '../../test/server'
import { renderApp } from '../../test/renderApp'
import { describeServings, describeShortfall, formatRecipeAmount } from './recipeFormat'

function setup() {
  const backend = createFakeBackend([makeItem()])
  server.use(...backend.handlers)
  return backend
}

describe('DrinksPage', () => {
  it('shows what can be made, with servings and shopping tips', async () => {
    setup()
    renderApp('/drinks')

    const gimlet = await screen.findByRole('article', { name: 'Gimlet' })
    expect(within(gimlet).getByText('Räcker till 3 drinkar')).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: 'Gin & Tonic' })).not.toBeInTheDocument()

    const tips = await screen.findByRole('region', { name: 'Köptips' })
    expect(within(tips).getByText('Tonic')).toBeInTheDocument()
    expect(tips).toHaveTextContent('1 drink till: Gin & Tonic')
  })

  it('filters on recipes missing one thing and keeps the filter in the URL', async () => {
    setup()
    const user = userEvent.setup()
    const { router } = renderApp('/drinks')
    await screen.findByRole('article', { name: 'Gimlet' })

    await user.click(screen.getByRole('button', { name: 'Saknar en' }))

    const gt = await screen.findByRole('article', { name: 'Gin & Tonic' })
    expect(within(gt).getByText('Saknas: Tonic')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?visa=MISSING_ONE')
  })

  it('explains amounts that are not enough', async () => {
    setup()
    renderApp('/drinks?visa=ALL')

    const negroni = await screen.findByRole('article', { name: 'Negroni' })
    expect(
      within(negroni).getByText('Saknas: Campari (har 2 cl, behöver 3 cl), Söt vermouth'),
    ).toBeInTheDocument()
    expect(within(negroni).getByText('Saknar 2')).toBeInTheDocument()
  })

  it('searches by name', async () => {
    setup()
    const user = userEvent.setup()
    renderApp('/drinks?visa=ALL')
    await screen.findByRole('article', { name: 'Negroni' })

    await user.type(screen.getByRole('searchbox', { name: 'Sök drink' }), 'neg')

    expect(screen.getByRole('article', { name: 'Negroni' })).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: 'Gimlet' })).not.toBeInTheDocument()
  })

  it('is reachable from the menu and opens a recipe', async () => {
    setup()
    const user = userEvent.setup()
    const { router } = renderApp('/')
    await screen.findByRole('article', { name: 'Tanqueray London Dry' })

    await user.click(screen.getByRole('link', { name: 'Drinkar' }))
    await user.click(await screen.findByRole('link', { name: /Gimlet/ }))

    await screen.findByRole('heading', { name: 'Gimlet', level: 1 })
    expect(router.state.location.pathname).toBe('/drinks/1')
  })
})

describe('RecipeDetailPage', () => {
  it('shows each ingredient with whether it is at home', async () => {
    setup()
    renderApp('/drinks/1')

    await screen.findByRole('heading', { name: 'Gimlet', level: 1 })
    expect(screen.getByText('Du har allt som behövs. Räcker till 3 drinkar.')).toBeInTheDocument()

    const list = screen.getByRole('list', { name: 'Ingredienser' })
    const gin = within(list).getByRole('listitem', { name: 'Gin (valfri sort): Finns hemma' })
    expect(gin).toHaveTextContent('6 clGin (valfri sort)')
    expect(gin).toHaveTextContent('Tanqueray London Dry')

    const lime = within(list).getByRole('listitem', { name: 'Lime / limejuice: För lite' })
    expect(lime).toHaveTextContent('För lite (har 1 cl, behöver 2 cl)')

    expect(
      within(list).getByRole('listitem', { name: 'Sodavatten: Finns alltid' }),
    ).toHaveTextContent('Fyll upp')
    expect(within(list).getByRole('listitem', { name: 'Mynta: Saknas' })).toHaveTextContent(
      '(valfritt)',
    )

    expect(screen.getByText(/Skaka alla ingredienser/)).toBeInTheDocument()
    expect(screen.getByText('Glas: Coupe · Garnityr: Limehjul')).toBeInTheDocument()
  })

  it('shows a message for an unknown recipe', async () => {
    setup()
    renderApp('/drinks/999')
    expect(await screen.findByText('Receptet finns inte.')).toBeInTheDocument()
  })
})

describe('recipe formatting', () => {
  it('formats amounts in the units people use', () => {
    expect(formatRecipeAmount(30, 'ML')).toBe('3 cl')
    expect(formatRecipeAmount(22.5, 'ML')).toBe('2,25 cl')
    expect(formatRecipeAmount(2, 'DASH')).toBe('2 stänk')
    expect(formatRecipeAmount(1, 'TSP')).toBe('1 tsk')
    expect(formatRecipeAmount(1, 'PIECE')).toBe('1 st')
    expect(formatRecipeAmount(undefined, 'TOP_UP')).toBe('Fyll upp')
  })

  it('describes shortfalls and servings', () => {
    expect(describeShortfall({ name: 'Bourbon', status: 'MISSING' })).toBe('Bourbon')
    expect(
      describeShortfall({
        name: 'Mynta',
        status: 'NOT_ENOUGH',
        measure: 'PIECES',
        needed: 2,
        available: 1,
      }),
    ).toBe('Mynta (har 1 st, behöver 2 st)')
    expect(describeServings(1)).toBe('Räcker till 1 drink')
    expect(describeServings(undefined)).toBe('Kan göras')
  })
})

describe('ingredient on inventory items', () => {
  it('guesses the ingredient from the name and sends it when saving', async () => {
    const backend = setup()
    const user = userEvent.setup()
    renderApp('/items/new')

    const category = await screen.findByRole('combobox', { name: /Kategori/ })
    await user.selectOptions(category, 'Citrus')
    await user.click(screen.getByRole('button', { name: 'Styckvara' }))
    await user.type(screen.getByRole('textbox', { name: /Namn/ }), 'Lime')

    const ingredient = screen.getByRole('combobox', { name: /Ingrediens/ })
    expect(ingredient).toHaveValue('501')

    await user.click(screen.getByRole('button', { name: 'Lägg till' }))
    await waitFor(() =>
      expect(backend.requests.find((r) => r.method === 'POST')?.body).toMatchObject({
        name: 'Lime',
        ingredientId: 501,
      }),
    )
  })

  it('stops guessing once an ingredient is chosen by hand', async () => {
    setup()
    const user = userEvent.setup()
    renderApp('/items/new')

    await user.selectOptions(await screen.findByRole('combobox', { name: /Kategori/ }), 'Citrus')
    const ingredient = screen.getByRole('combobox', { name: /Ingrediens/ })
    await user.selectOptions(ingredient, 'Citron / citronjuice')
    await user.type(screen.getByRole('textbox', { name: /Namn/ }), 'Lime')

    expect(ingredient).toHaveValue('502')
  })

  it('hides the ingredient field for categories without ingredients', async () => {
    setup()
    const user = userEvent.setup()
    renderApp('/items/new')

    await user.selectOptions(await screen.findByRole('combobox', { name: /Kategori/ }), 'Gin')

    expect(screen.queryByRole('combobox', { name: /Ingrediens/ })).not.toBeInTheDocument()
  })
})
