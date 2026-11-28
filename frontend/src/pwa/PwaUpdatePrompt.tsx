import Button from '@mui/material/Button'
import Snackbar from '@mui/material/Snackbar'
import { useRegisterSW } from 'virtual:pwa-register/react'

/** How often an app left open (e.g. on the home screen) looks for a new version. */
const UPDATE_CHECK_MS = 60 * 60 * 1000

/**
 * Registers the service worker and offers to reload when a new version has been deployed.
 * The new version only takes over when the user says so, so nothing is lost mid-edit.
 */
export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      setInterval(() => {
        if (navigator.onLine) void registration.update()
      }, UPDATE_CHECK_MS)
    },
  })

  return (
    <Snackbar
      open={needRefresh}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      message="Det finns en ny version av Pourfolio."
      action={
        <>
          <Button color="inherit" size="small" onClick={() => setNeedRefresh(false)}>
            Senare
          </Button>
          <Button
            color="inherit"
            size="small"
            sx={{ fontWeight: 700 }}
            onClick={() => void updateServiceWorker()}
          >
            Ladda om
          </Button>
        </>
      }
    />
  )
}
