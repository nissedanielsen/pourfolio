import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { AuthProvider } from './auth/AuthProvider'
import { NotificationProvider } from './components/NotificationProvider'
import { theme } from './theme'

/** Everything the app needs around its routes; shared by main.tsx and tests. */
export function AppProviders({
  queryClient,
  children,
}: {
  queryClient: QueryClient
  children: ReactNode
}) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NotificationProvider>{children}</NotificationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
