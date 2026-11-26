import { createContext, useContext } from 'react'
import type { EndReason, Session } from './session'

export interface AuthState {
  session: Session | null
  /** Why the previous session ended, if it did during this visit. */
  endReason: EndReason | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const auth = useContext(AuthContext)
  if (!auth) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return auth
}
