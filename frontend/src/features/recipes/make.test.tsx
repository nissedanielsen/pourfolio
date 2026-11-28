import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { createFakeBackend, gimletDetail, makeItem, server } from '../../test/server'
import { renderApp } from '../../test/renderApp'

function setup() {
  const backend = createFakeBackend([makeItem()])
  server.use(...backend.handlers)
  return backend
}

async function openMakeDialog() {
  const user = userEvent.setup()
  renderApp('/drinks/1')
  await user.click(await screen.findByRole('button', { name: 'Jag gjorde den!' }))
  const dialog = await screen.findByRole('dialog', { name: 'Jag gjorde Gimlet' })
  await within(dialog).findByRole('list', { name: 'Det här dras av' })
  return { user, dialog }
}

describe('Jag gjorde den!', () => {
  it('shows what will be taken from which bottle', async () => {
    setup()
    const { dialog } = await openMakeDialog()

    const gin = within(dialog).getByRole('listitem', { name: 'Gin' })
    expect(gin).toHaveTextContent('6 clGin')
    expect(within(gin).getByRole('combobox', { name: 'Från' })).toHaveValue('1')
    expect(within(gin).getByRole('textbox', { name: 'Mängd' })).toHaveValue('6')
    expect(gin).toHaveTextContent('52 cl → 46 cl')

    const lime = within(dialog).getByRole('listitem', { name: 'Lime / limejuice' })
    expect(lime).toHaveTextContent('från Lime')
    expect(within(lime).getByRole('textbox', { name: 'Mängd' })).toHaveValue('1')

    expect(dialog).toHaveTextContent('Finns alltid – dras inte av')
  })

  it('takes it from the inventory and can be undone right away', async () => {
    const backend = setup()
    const { user, dialog } = await openMakeDialog()

    await user.click(within(dialog).getByRole('button', { name: 'Dra av' }))

    expect(await screen.findByText('Skål! Gimlet – lagret är uppdaterat.')).toBeInTheDocument()
    expect(backend.requests.find((r) => r.url.pathname.endsWith('/make'))?.body).toEqual({
      servings: 1,
      deductions: [
        { itemId: 1, amount: 60 },
        { itemId: 7, amount: 1 },
      ],
    })

    // Wait for the dialog's closing transition, which hides the rest of the page from assistive tech.
    await user.click(await screen.findByRole('button', { name: 'Ångra' }))

    expect(await screen.findByText('Ångrat – lagret är som innan.')).toBeInTheDocument()
    expect(backend.requests.some((r) => r.url.pathname === '/api/drink-log/99/undo')).toBe(true)
  })

  it('plans for several drinks', async () => {
    const backend = setup()
    const { user, dialog } = await openMakeDialog()

    await user.click(within(dialog).getByRole('button', { name: 'Fler' }))

    expect(within(dialog).getByLabelText('Antal drinkar')).toHaveTextContent('2')
    await waitFor(() =>
      expect(
        within(within(dialog).getByRole('listitem', { name: 'Gin' })).getByRole('textbox', {
          name: 'Mängd',
        }),
      ).toHaveValue('12'),
    )
    await user.click(within(dialog).getByRole('button', { name: 'Dra av' }))
    await waitFor(() =>
      expect(backend.requests.find((r) => r.url.pathname.endsWith('/make'))?.body).toMatchObject({
        servings: 2,
        deductions: [
          { itemId: 1, amount: 120 },
          { itemId: 7, amount: 2 },
        ],
      }),
    )
    expect(await screen.findByText('Skål! 2 × Gimlet – lagret är uppdaterat.')).toBeInTheDocument()
  })

  it('says when there is not enough for that many', async () => {
    setup()
    const { user, dialog } = await openMakeDialog()

    for (let i = 0; i < 6; i++)
      await user.click(within(dialog).getByRole('button', { name: 'Fler' }))

    expect(
      await within(dialog).findByText('Det du har hemma räcker inte till 7 st.'),
    ).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Dra av' })).toBeDisabled()
  })

  it('lets you pick another bottle and change the amount', async () => {
    const backend = setup()
    const { user, dialog } = await openMakeDialog()
    const gin = within(dialog).getByRole('listitem', { name: 'Gin' })

    await user.selectOptions(
      within(gin).getByRole('combobox', { name: 'Från' }),
      "Hendrick's (70 cl kvar)",
    )
    const amount = within(gin).getByRole('textbox', { name: 'Mängd' })
    await user.clear(amount)
    await user.type(amount, '7,5')
    expect(gin).toHaveTextContent('70 cl → 62,5 cl')

    await user.click(within(dialog).getByRole('button', { name: 'Dra av' }))
    await waitFor(() =>
      expect(backend.requests.find((r) => r.url.pathname.endsWith('/make'))?.body).toMatchObject({
        deductions: [
          { itemId: 3, amount: 75 },
          { itemId: 7, amount: 1 },
        ],
      }),
    )
  })

  it('does not allow taking more than is left', async () => {
    setup()
    const { user, dialog } = await openMakeDialog()
    const gin = within(dialog).getByRole('listitem', { name: 'Gin' })

    const amount = within(gin).getByRole('textbox', { name: 'Mängd' })
    await user.clear(amount)
    await user.type(amount, '60')

    expect(within(gin).getByText('Bara 52 cl kvar')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Dra av' })).toBeDisabled()
  })

  it('is only offered when everything is at home', async () => {
    setup()
    server.use(
      http.get('*/api/recipes/:id', () =>
        HttpResponse.json({
          ...gimletDetail,
          canMake: false,
          missingCount: 1,
          servings: undefined,
          lines: gimletDetail.lines.map((l) =>
            l.position === 2 ? { ...l, status: 'MISSING', matchedItems: [] } : l,
          ),
        }),
      ),
    )
    renderApp('/drinks/1')

    await screen.findByText(/Saknas:/)
    expect(screen.queryByRole('button', { name: 'Jag gjorde den!' })).not.toBeInTheDocument()
  })

  it('can be started from Överraska mig', async () => {
    setup()
    const user = userEvent.setup()
    renderApp('/drinks')

    await user.click(await screen.findByRole('button', { name: 'Överraska mig' }))
    const surprise = await screen.findByRole('dialog', { name: 'Vad sägs om …' })
    await user.click(await within(surprise).findByRole('button', { name: 'Jag gjorde den!' }))

    expect(await screen.findByRole('dialog', { name: 'Jag gjorde Gimlet' })).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Vad sägs om …' })).not.toBeInTheDocument(),
    )
  })
})
