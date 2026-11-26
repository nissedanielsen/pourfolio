import { QueryClient } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AppProviders } from '../AppProviders'
import { saveSession } from '../auth/session'
import { routes } from '../routes'
import { TEST_TOKEN } from './server'

/**
 * Renders the whole app at the given URL, with a fresh query cache.
 * Starts signed in unless `signedIn: false` is passed.
 */
export function renderApp(url = '/', { signedIn = true }: { signedIn?: boolean } = {}) {
  if (signedIn) {
    saveSession({ token: TEST_TOKEN, expiresAt: new Date(Date.now() + 3_600_000).toISOString() })
  }
  const router = createMemoryRouter(routes, { initialEntries: [url] })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return { router }
}
