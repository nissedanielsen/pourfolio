import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from './authContext'

/** Shows its children only when signed in; otherwise sends the user to the login page. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const location = useLocation()

  if (!session) {
    const returnTo = `${location.pathname}${location.search}`
    const target = returnTo === '/' ? '/login' : `/login?returnTo=${encodeURIComponent(returnTo)}`
    return <Navigate to={target} replace />
  }
  return children
}
