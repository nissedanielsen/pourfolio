import CasinoOutlinedIcon from '@mui/icons-material/CasinoOutlined'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'
import { useState, type ReactNode } from 'react'
import { Link as RouterLink } from 'react-router'
import type { RecipeSummary } from '../../api/client'
import { describeServings, describeShortfall } from './recipeFormat'
import { pickNext } from './surprise'
import { useRecipes } from './useRecipes'

/** "Överraska mig": a random drink you can make right now, with "Ge mig en annan". */
export function SurpriseButton() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  return (
    <>
      <Button variant="outlined" startIcon={<CasinoOutlinedIcon />} onClick={() => setOpen(true)}>
        Överraska mig
      </Button>
      <Dialog open={open} onClose={close} fullWidth maxWidth="xs" aria-labelledby="surprise-title">
        <DialogTitle id="surprise-title">Vad sägs om …</DialogTitle>
        {/* Mounted only while open, so every opening starts a fresh round. */}
        {open && <Surprise onClose={close} />}
      </Dialog>
    </>
  )
}

/** Loads the candidates: drinks you can make, or else drinks missing only one thing. */
function Surprise({ onClose }: { onClose: () => void }) {
  const canMake = useRecipes('CAN_MAKE')
  const missingOne = useRecipes('MISSING_ONE')

  const fallback = canMake.data?.length === 0
  const candidates = fallback ? missingOne.data : canMake.data

  if (canMake.isError || (fallback && missingOne.isError)) {
    return (
      <Frame onClose={onClose}>
        <Alert severity="error">Kunde inte hämta drinkarna.</Alert>
      </Frame>
    )
  }
  if (!candidates) {
    return (
      <Frame onClose={onClose}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress aria-label="Laddar" />
        </Box>
      </Frame>
    )
  }
  if (candidates.length === 0) {
    return (
      <Frame onClose={onClose}>
        <Typography>
          Inget kan göras med det du har hemma just nu, och ingen drink saknar bara en sak.
        </Typography>
      </Frame>
    )
  }
  return <Picker candidates={candidates} fallback={fallback} onClose={onClose} />
}

/** Shows one random candidate at a time, going through all before repeating. */
function Picker({
  candidates,
  fallback,
  onClose,
}: {
  candidates: RecipeSummary[]
  fallback: boolean
  onClose: () => void
}) {
  const [shown, setShown] = useState<number[]>(() => pickNext(candidates, [])?.shown ?? [])
  const currentId = shown[shown.length - 1]
  const current = candidates.find((r) => r.id === currentId) ?? candidates[0]

  const next = () => {
    const result = pickNext(candidates, shown)
    if (result) setShown(result.shown)
  }

  return (
    <Frame
      onClose={onClose}
      actions={
        <>
          <Button onClick={next} disabled={candidates.length < 2}>
            Ge mig en annan
          </Button>
          <Button variant="contained" component={RouterLink} to={`/drinks/${current.id}`}>
            Visa receptet
          </Button>
        </>
      }
    >
      {fallback && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Inget kan göras med det du har just nu – men den här saknar bara en sak.
        </Alert>
      )}
      <Typography variant="h4" component="h3" gutterBottom>
        {current.name}
      </Typography>
      {current.description && (
        <Typography color="text.secondary" gutterBottom>
          {current.description}
        </Typography>
      )}
      {fallback ? (
        <Typography sx={{ mt: 1 }}>
          Saknas: {current.missing.map(describeShortfall).join(', ')}
        </Typography>
      ) : (
        <Chip color="success" size="small" label={describeServings(current.servings)} />
      )}
      {current.glass && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Glas: {current.glass}
        </Typography>
      )}
      {candidates.length === 1 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {fallback
            ? 'Det här är den enda som saknar bara en sak.'
            : 'Det här är den enda drinken du kan göra just nu.'}
        </Typography>
      )}
    </Frame>
  )
}

function Frame({
  children,
  actions,
  onClose,
}: {
  children: ReactNode
  actions?: ReactNode
  onClose: () => void
}) {
  return (
    <>
      <DialogContent>{children}</DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={onClose}>Stäng</Button>
        {actions}
      </DialogActions>
    </>
  )
}
