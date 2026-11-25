import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createFakeBackend, makeItem, server } from '../../test/server'
import { renderApp } from '../../test/renderApp'

function setup(items = [makeItem()]) {
  const backend = createFakeBackend(items)
  server.use(...backend.handlers)
  return backend
}

describe('InventoryPage', () => {
  it('lists items with amounts in cl', async () => {
    setup([
      makeItem(),
      makeItem({
        id: 2,
        name: 'Lime',
        brand: undefined,
        abv: undefined,
        unitType: 'COUNT',
        capacity: 6,
        remaining: 0,
      }),
    ])
    renderApp()

    const gin = await screen.findByRole('article', { name: 'Tanqueray London Dry' })
    expect(within(gin).getByText('Tanqueray · Gin · 43,1 %')).toBeInTheDocument()
    expect(within(gin).getByText('52 cl av 70 cl')).toBeInTheDocument()
    expect(
      within(screen.getByRole('article', { name: 'Lime' })).getByText('Slut'),
    ).toBeInTheDocument()
    expect(screen.getByText('2 saker')).toBeInTheDocument()
  })

  it('searches and keeps the search in the URL', async () => {
    const backend = setup([makeItem(), makeItem({ id: 2, name: 'Absolut Vodka' })])
    const { router } = renderApp()
    await screen.findByText('2 saker')

    await userEvent.type(screen.getByRole('searchbox', { name: 'Sök' }), 'absolut')

    await waitFor(() => expect(router.state.location.search).toBe('?q=absolut'))
    expect(await screen.findByText('1 sak')).toBeInTheDocument()
    expect(backend.requests.at(-1)?.url.searchParams.get('q')).toBe('absolut')
  })

  it('shows an empty state', async () => {
    setup([])
    renderApp()
    expect(await screen.findByText('Inventariet är tomt.')).toBeInTheDocument()
  })

  it('adds an item and converts cl to ml', async () => {
    const backend = setup([])
    const user = userEvent.setup()
    const { router } = renderApp()

    await user.click(await screen.findByRole('link', { name: /Lägg till din första flaska/ }))
    await user.click(await screen.findByRole('combobox', { name: /Kategori/ }))
    await user.click(await screen.findByRole('option', { name: 'Gin' }))
    await user.type(screen.getByRole('textbox', { name: /Namn/ }), 'Hendrick’s')
    await user.type(screen.getByRole('textbox', { name: 'Alkoholhalt' }), '41,4')
    await user.click(screen.getByText('50 cl'))
    expect(screen.getByRole('textbox', { name: /Kvar/ })).toHaveValue('50')
    await user.click(screen.getByRole('button', { name: 'Lägg till' }))

    await screen.findByRole('article', { name: 'Hendrick’s' })
    expect(router.state.location.pathname).toBe('/')
    expect(backend.requests.find((r) => r.method === 'POST')?.body).toMatchObject({
      categoryId: 11,
      name: 'Hendrick’s',
      abv: 41.4,
      unitType: 'VOLUME',
      capacity: 500,
      remaining: 500,
    })
  })

  it('deletes an item after confirmation', async () => {
    setup()
    const user = userEvent.setup()
    renderApp()

    await user.click(await screen.findByRole('button', { name: 'Ta bort Tanqueray London Dry' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Ta bort' }))

    expect(await screen.findByText('Inventariet är tomt.')).toBeInTheDocument()
    expect(screen.getByText('Tanqueray London Dry har tagits bort')).toBeInTheDocument()
  })
})
