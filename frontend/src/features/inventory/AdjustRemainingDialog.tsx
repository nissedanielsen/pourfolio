import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import type { InventoryItem } from '../../api/client'
import { useNotify } from '../../components/notify'
import { formatAmount } from '../../lib/units'
import { useUpdateRemaining } from './useInventory'

interface Props {
  item: InventoryItem
  onClose: () => void
}

/** Quick way to record how much is left, e.g. after pouring a drink. */
export function AdjustRemainingDialog({ item, onClose }: Props) {
  const [remaining, setRemaining] = useState(item.remaining)
  const updateRemaining = useUpdateRemaining()
  const notify = useNotify()
  // Volumes move in steps of 0.5 cl; pieces one at a time.
  const step = item.unitType === 'VOLUME' ? 5 : 1

  const save = () => {
    updateRemaining.mutate(
      { id: item.id, remaining },
      {
        onSuccess: () => {
          notify(`${item.name}: ${formatAmount(remaining, item.unitType)} kvar`)
          onClose()
        },
        onError: () => notify('Kunde inte spara mängden', 'error'),
      },
    )
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Mängd kvar – {item.name}</DialogTitle>
      <DialogContent>
        <Typography variant="h4" component="p" sx={{ textAlign: 'center', my: 2 }}>
          {formatAmount(remaining, item.unitType)}
        </Typography>
        <Slider
          value={remaining}
          min={0}
          max={item.capacity}
          step={step}
          onChange={(_, value) => setRemaining(value as number)}
          aria-label="Mängd kvar"
          getAriaValueText={(value) => formatAmount(value, item.unitType)}
        />
        <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
          <Button size="small" onClick={() => setRemaining(0)}>
            Slut
          </Button>
          <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
            av {formatAmount(item.capacity, item.unitType)}
          </Typography>
          <Button size="small" onClick={() => setRemaining(item.capacity)}>
            Full
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Avbryt</Button>
        <Button
          variant="contained"
          onClick={save}
          loading={updateRemaining.isPending}
          disabled={remaining === item.remaining}
        >
          Spara
        </Button>
      </DialogActions>
    </Dialog>
  )
}
