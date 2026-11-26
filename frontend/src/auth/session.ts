// The sign-in token, kept in localStorage so it survives reloads until it expires.

const STORAGE_KEY = 'pourfolio.session'
const CHANGE_EVENT = 'pourfolio:session-change'

export interface Session {
  token: string
  /** ISO 8601 instant. */
  expiresAt: string
}

/** Why the session ended, so the login page can explain it. */
export type EndReason = 'logout' | 'expired'

function isValid(session: Session, now = Date.now()): boolean {
  return Date.parse(session.expiresAt) > now
}

/** The stored session, or null if there is none or it has expired. */
export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as Session
    return session.token && isValid(session) ? session : null
  } catch {
    return null
  }
}

export function saveSession(session: Session): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT))
}

export function clearSession(reason: EndReason): void {
  if (localStorage.getItem(STORAGE_KEY) === null) return
  localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new CustomEvent<EndReason>(CHANGE_EVENT, { detail: reason }))
}

/** Calls back when the session changes in this tab or another tab. */
export function onSessionChange(callback: (reason?: EndReason) => void): () => void {
  const local = (event: Event) => callback((event as CustomEvent<EndReason | undefined>).detail)
  const otherTab = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) callback(event.newValue ? undefined : 'logout')
  }
  window.addEventListener(CHANGE_EVENT, local)
  window.addEventListener('storage', otherTab)
  return () => {
    window.removeEventListener(CHANGE_EVENT, local)
    window.removeEventListener('storage', otherTab)
  }
}
