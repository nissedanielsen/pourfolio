import { createContext, useContext } from 'react'

export type Severity = 'success' | 'error' | 'info'

/** A button in the toast, e.g. "Ångra". */
export interface NotifyAction {
  label: string
  onClick: () => void
}

export type Notify = (message: string, severity?: Severity, action?: NotifyAction) => void

export const NotificationContext = createContext<Notify | null>(null)

/** Shows a short toast message, e.g. "Sparat". */
export function useNotify(): Notify {
  const notify = useContext(NotificationContext)
  if (!notify) {
    throw new Error('useNotify must be used within NotificationProvider')
  }
  return notify
}
