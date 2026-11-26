import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createFakeBackend, makeItem, server, TEST_TOKEN, TEST_USER } from '../test/server'
import { renderApp } from '../test/renderApp'
import { loadSession, saveSession } from './session'

function setup() {
  const backend = createFakeBackend([makeItem()])
  server.use(...backend.handlers)
  return backend
}

async function signIn(username: string, password: string) {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText(/Användarnamn/), username)
  await user.type(screen.getByLabelText(/Lösenord/), password)
  await user.click(screen.getByRole('button', { name: 'Logga in' }))
}

describe('sign-in', () => {
  it('sends signed-out users to the login page and back where they were going', async () => {
    setup()
    const { router } = renderApp('/items/new', { signedIn: false })

    await screen.findByRole('heading', { name: 'Logga in' })
    expect(router.state.location.pathname).toBe('/login')
    expect(router.state.location.search).toBe('?returnTo=%2Fitems%2Fnew')

    await signIn(TEST_USER.username, TEST_USER.password)

    await screen.findByRole('heading', { name: 'Lägg till' })
    expect(router.state.location.pathname).toBe('/items/new')
    expect(loadSession()?.token).toBe(TEST_TOKEN)
  })

  it('sends the token with API calls', async () => {
    const backend = setup()
    renderApp('/', { signedIn: false })
    await signIn(TEST_USER.username, TEST_USER.password)

    await screen.findByRole('article', { name: 'Tanqueray London Dry' })
    expect(backend.requests.some((r) => r.url.pathname === '/api/inventory-items')).toBe(true)
  })

  it('shows an error for wrong credentials and stays on the login page', async () => {
    setup()
    const { router } = renderApp('/', { signedIn: false })

    await signIn(TEST_USER.username, 'fel')

    expect(await screen.findByText('Fel användarnamn eller lösenord.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(screen.getByLabelText(/Lösenord/)).toHaveValue('')
  })

  it('does not follow a returnTo that leaves the app', async () => {
    setup()
    const { router } = renderApp('/login?returnTo=//evil.example', { signedIn: false })
    await signIn(TEST_USER.username, TEST_USER.password)

    await screen.findByRole('heading', { name: 'Inventarie' })
    expect(router.state.location.pathname).toBe('/')
  })

  it('signs out from the menu', async () => {
    setup()
    const user = userEvent.setup()
    const { router } = renderApp()
    await screen.findByRole('article', { name: 'Tanqueray London Dry' })

    await user.click(screen.getByRole('button', { name: 'Logga ut' }))

    await screen.findByRole('heading', { name: 'Logga in' })
    expect(router.state.location.pathname).toBe('/login')
    expect(loadSession()).toBeNull()
    expect(screen.queryByText('Din inloggning har gått ut. Logga in igen.')).not.toBeInTheDocument()
  })

  it('signs out and explains why when the backend rejects the token', async () => {
    const backend = setup()
    backend.revokeTokens()
    const { router } = renderApp('/items/new')

    expect(
      await screen.findByText('Din inloggning har gått ut. Logga in igen.'),
    ).toBeInTheDocument()
    expect(loadSession()).toBeNull()
    expect(router.state.location.search).toBe('?returnTo=%2Fitems%2Fnew')
  })

  it('treats an expired stored session as signed out', async () => {
    setup()
    saveSession({ token: TEST_TOKEN, expiresAt: new Date(Date.now() - 1000).toISOString() })
    renderApp('/', { signedIn: false })

    await screen.findByRole('heading', { name: 'Logga in' })
    await waitFor(() => expect(loadSession()).toBeNull())
  })
})
