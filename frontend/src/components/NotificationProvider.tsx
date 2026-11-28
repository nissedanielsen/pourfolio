import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Snackbar from '@mui/material/Snackbar'
import { useCallback, useState, type ReactNode } from 'react'
import { NotificationContext, type Notify, type NotifyAction, type Severity } from './notify'

interface Notification {
  key: number
  message: string
  severity: Severity
  action?: NotifyAction
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<Notification | null>(null)

  const notify = useCallback<Notify>((message, severity = 'success', action) => {
    setCurrent({ key: Date.now(), message, severity, action })
  }, [])

  const close = () => setCurrent(null)

  return (
    <NotificationContext.Provider value={notify}>
      {children}
      <Snackbar
        key={current?.key}
        open={current !== null}
        // Give a little more time when there is something to click (e.g. "Ångra").
        autoHideDuration={current?.action ? 8000 : 4000}
        onClose={(_, reason) => reason !== 'clickaway' && close()}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {current ? (
          <Alert
            severity={current.severity}
            variant="filled"
            onClose={close}
            action={
              current.action ? (
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => {
                    close()
                    current.action?.onClick()
                  }}
                >
                  {current.action.label}
                </Button>
              ) : undefined
            }
          >
            {current.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </NotificationContext.Provider>
  )
}
