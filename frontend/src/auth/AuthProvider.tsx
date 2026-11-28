import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, unwrap } from '../api/client'
import { clearApiCache } from '../pwa/apiCache'
import { AuthContext, type AuthState } from './authContext'
import { clearSession, loadSession, onSessionChange, saveSession, type EndReason } from './session'

/** Keeps track of whether the user is signed in, across reloads and tabs. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState(loadSession)
  const [endReason, setEndReason] = useState<EndReason | null>(null)

  // Follow sign-in/out from the API client (401), other tabs and the expiry timer.
  useEffect(
    () =>
      onSessionChange((reason) => {
        const next = loadSession()
        setSession(next)
        if (!next) {
          setEndReason(reason ?? 'logout')
          // Don't leave the inventory in memory, or on the device, after signing out.
          queryClient.clear()
          void clearApiCache()
        }
      }),
    [queryClient],
  )

  // Sign out when the token expires, even if no request is made.
  useEffect(() => {
    if (!session) return
    const msLeft = Date.parse(session.expiresAt) - Date.now()
    const timer = setTimeout(() => clearSession('expired'), Math.max(0, msLeft))
    return () => clearTimeout(timer)
  }, [session])

  const login = useCallback(async (username: string, password: string) => {
    const response = await unwrap(api.POST('/api/auth/login', { body: { username, password } }))
    setEndReason(null)
    saveSession({ token: response.token, expiresAt: response.expiresAt })
  }, [])

  const logout = useCallback(() => clearSession('logout'), [])

  const value = useMemo<AuthState>(
    () => ({ session, endReason, login, logout }),
    [session, endReason, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
