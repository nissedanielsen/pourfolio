import CloudOffIcon from '@mui/icons-material/CloudOff'
import Alert from '@mui/material/Alert'
import { useOnline } from './useOnline'

/** Tells the user that what they see may be old and that changes won't go through. */
export function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <Alert severity="warning" icon={<CloudOffIcon />} square role="status">
      Du är offline. Du ser det som senast hämtades – ändringar kräver anslutning.
    </Alert>
  )
}
