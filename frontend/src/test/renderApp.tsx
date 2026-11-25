import { QueryClient } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AppProviders } from '../AppProviders'
import { routes } from '../routes'

/** Renders the whole app at the given URL, with a fresh query cache. */
export function renderApp(url = '/') {
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
