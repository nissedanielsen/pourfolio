import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner'
import Backdrop from '@mui/material/Backdrop'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'
import { api, unwrap, type BarcodeLookup } from '../../api/client'
import { useNotify } from '../../components/notify'
import { formatAmount } from '../../lib/units'
import { ScanDialog } from './ScanDialog'

/** Passed to the item form (as router state) after a scan. */
export interface ItemPrefill {
  lookup: BarcodeLookup
}

/** "Skanna" on the inventory page: scan, look up, then add or open. */
export function ScanButton({ returnTo }: { returnTo: string }) {
  const navigate = useNavigate()
  const notify = useNotify()
  const [scanning, setScanning] = useState(false)
  const [looking, setLooking] = useState(false)
  const [found, setFound] = useState<BarcodeLookup | null>(null)

  const addNew = useCallback(
    (lookup: BarcodeLookup) => {
      const prefill: ItemPrefill = { lookup }
      navigate('/items/new', { state: { returnTo, prefill } })
    },
    [navigate, returnTo],
  )

  const onCode = useCallback(
    async (barcode: string) => {
      setScanning(false)
      setLooking(true)
      try {
        const lookup = await unwrap(
          api.GET('/api/barcodes/{barcode}', { params: { path: { barcode } } }),
        )
        if (lookup.existingItems.length > 0) setFound(lookup)
        else addNew(lookup)
      } catch {
        notify('Kunde inte slå upp streckkoden', 'error')
      } finally {
        setLooking(false)
      }
    },
    [addNew, notify],
  )

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<QrCodeScannerIcon />}
        onClick={() => setScanning(true)}
      >
        Skanna
      </Button>
      <ScanDialog open={scanning} onClose={() => setScanning(false)} onCode={onCode} />
      <Backdrop open={looking} sx={{ zIndex: (theme) => theme.zIndex.modal + 1 }}>
        <CircularProgress aria-label="Söker streckkoden" />
      </Backdrop>
      {found && (
        <Dialog open onClose={() => setFound(null)} fullWidth maxWidth="xs">
          <DialogTitle>Du har redan den här</DialogTitle>
          <DialogContent>
            <DialogContentText>Öppna den du har, eller lägg till en ny flaska.</DialogContentText>
            <List aria-label="Flaskor med streckkoden">
              {found.existingItems.map((item) => (
                <ListItemButton
                  key={item.id}
                  onClick={() => navigate(`/items/${item.id}`, { state: { returnTo } })}
                >
                  <ListItemText
                    primary={item.name}
                    secondary={
                      item.remaining === 0
                        ? 'Slut'
                        : `${formatAmount(item.remaining, item.unitType)} kvar`
                    }
                  />
                </ListItemButton>
              ))}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFound(null)}>Avbryt</Button>
            <Button variant="contained" onClick={() => addNew(found)}>
              Lägg till ny flaska
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  )
}
