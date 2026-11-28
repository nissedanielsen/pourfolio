import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import type { Schemas } from '../../api/client'
import { useNotify } from '../../components/notify'
import {
  formatAmount,
  formatNumberInput,
  fromDisplayAmount,
  parseNumberInput,
  toDisplayAmount,
  unitLabel,
} from '../../lib/units'
import { formatRecipeAmount } from './recipeFormat'
import {
  undoDrink,
  useMakeDrink,
  useMakePlan,
  useRefreshInventory,
  type Deduction,
} from './useMake'

type PlannedLine = Schemas['PlannedLine']

const MAX_SERVINGS = 20

/** A line where the user picked another bottle or changed the amount. */
interface Override {
  itemId: number
  /** As typed, in cl (VOLUME) or pieces (COUNT). */
  amountText: string
}

interface Props {
  recipeId: number
  recipeName: string
  open: boolean
  onClose: () => void
}

/** "Jag gjorde den!": confirm what to take from which bottle, then take it. */
export function MakeDialog({ recipeId, recipeName, open, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="make-title">
      <DialogTitle id="make-title">Jag gjorde {recipeName}</DialogTitle>
      {/* Mounted only while open, so every opening starts from a fresh plan. */}
      {open && <MakeContent recipeId={recipeId} recipeName={recipeName} onClose={onClose} />}
    </Dialog>
  )
}

function MakeContent({
  recipeId,
  recipeName,
  onClose,
}: {
  recipeId: number
  recipeName: string
  onClose: () => void
}) {
  const [servings, setServings] = useState(1)
  const [overrides, setOverrides] = useState<Record<number, Override>>({})
  const plan = useMakePlan(recipeId, servings)
  const make = useMakeDrink(recipeId)
  const refresh = useRefreshInventory()
  const notify = useNotify()

  const changeServings = (next: number) => {
    setServings(next)
    // Amounts depend on the number of drinks; start over from the new plan.
    setOverrides({})
  }

  const lines = plan.data?.lines ?? []
  const deductLines = lines.filter((l) => l.kind === 'DEDUCT')
  const errors: Record<number, string> = {}
  const deductions: Deduction[] = []
  for (const line of deductLines) {
    const override = overrides[line.position]
    if (!override) {
      line.deductions.forEach((d) => deductions.push({ itemId: d.itemId, amount: d.amount }))
      continue
    }
    const item = line.alternatives.find((a) => a.itemId === override.itemId)
    const typed = parseNumberInput(override.amountText)
    const amount = item && !Number.isNaN(typed) ? fromDisplayAmount(typed, item.unitType) : NaN
    if (!item || Number.isNaN(amount) || amount <= 0) {
      errors[line.position] = 'Ange en mängd'
    } else if (amount > item.remaining) {
      errors[line.position] = `Bara ${formatAmount(item.remaining, item.unitType)} kvar`
    } else {
      deductions.push({ itemId: item.itemId, amount })
    }
  }
  const canSubmit =
    !!plan.data?.canMake &&
    !plan.isPlaceholderData &&
    Object.keys(errors).length === 0 &&
    deductions.length > 0

  const submit = () => {
    make.mutate(
      { servings, deductions },
      {
        onSuccess: (result) => {
          onClose()
          const what = result.servings === 1 ? recipeName : `${result.servings} × ${recipeName}`
          notify(`Skål! ${what} – lagret är uppdaterat.`, 'success', {
            label: 'Ångra',
            onClick: () => {
              undoDrink(result.drinkLogId)
                .then(refresh)
                .then(() => notify('Ångrat – lagret är som innan.'))
                .catch(() => notify('Kunde inte ångra', 'error'))
            },
          })
        },
        onError: () => notify('Kunde inte dra av från lagret', 'error'),
      },
    )
  }

  return (
    <>
      <DialogContent>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
          <Typography>Antal:</Typography>
          <IconButton
            aria-label="Färre"
            disabled={servings <= 1}
            onClick={() => changeServings(servings - 1)}
          >
            <RemoveIcon />
          </IconButton>
          <Typography aria-label="Antal drinkar" sx={{ minWidth: 24, textAlign: 'center' }}>
            {servings}
          </Typography>
          <IconButton
            aria-label="Fler"
            disabled={servings >= MAX_SERVINGS}
            onClick={() => changeServings(servings + 1)}
          >
            <AddIcon />
          </IconButton>
        </Stack>

        {plan.isError ? (
          <Alert severity="error">Kunde inte räkna ut vad som ska dras av.</Alert>
        ) : !plan.data ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress aria-label="Laddar" />
          </Box>
        ) : (
          <>
            {!plan.data.canMake && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Det du har hemma räcker inte till {servings} st.
              </Alert>
            )}
            <List dense aria-label="Det här dras av">
              {lines.map((line) => (
                <PlanRow
                  key={line.position}
                  line={line}
                  servings={servings}
                  override={overrides[line.position]}
                  error={errors[line.position]}
                  onOverride={(o) =>
                    setOverrides((current) => ({ ...current, [line.position]: o }))
                  }
                />
              ))}
            </List>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Avbryt</Button>
        <Button variant="contained" onClick={submit} disabled={!canSubmit} loading={make.isPending}>
          Dra av
        </Button>
      </DialogActions>
    </>
  )
}

function PlanRow({
  line,
  servings,
  override,
  error,
  onOverride,
}: {
  line: PlannedLine
  servings: number
  override?: Override
  error?: string
  onOverride: (override: Override) => void
}) {
  const amount =
    line.unit === 'TOP_UP'
      ? formatRecipeAmount(undefined, 'TOP_UP')
      : formatRecipeAmount((line.amount ?? 0) * servings, line.unit)
  const title = (
    <Typography>
      <Box component="span" sx={{ fontWeight: 600, mr: 1 }}>
        {amount}
      </Box>
      {line.name}
    </Typography>
  )

  if (line.kind !== 'DEDUCT') {
    const note =
      line.kind === 'ALWAYS_AVAILABLE'
        ? 'Finns alltid – dras inte av'
        : line.kind === 'OPTIONAL'
          ? 'Valfritt – dras inte av'
          : 'Dras inte av'
    return (
      <ListItem disableGutters sx={{ display: 'block', color: 'text.secondary' }}>
        {title}
        <Typography variant="body2">{note}</Typography>
      </ListItem>
    )
  }

  // One bottle: it can be swapped for another of the same kind, and the amount changed.
  const single = line.deductions.length === 1 ? line.deductions[0] : undefined
  const choices = single ? line.alternatives.filter((a) => a.unitType === single.unitType) : []

  return (
    <ListItem disableGutters sx={{ display: 'block' }} aria-label={line.name}>
      {title}
      {!line.enough && (
        <Typography variant="body2" color="error">
          Räcker inte
        </Typography>
      )}
      {single ? (
        <SingleDeduction
          single={single}
          choices={choices}
          override={override}
          error={error}
          onOverride={onOverride}
        />
      ) : (
        line.deductions.map((d) => (
          <Typography key={d.itemId} variant="body2" color="text.secondary">
            från {d.itemName}: {formatAmount(d.remainingBefore, d.unitType)} →{' '}
            {formatAmount(d.remainingBefore - d.amount, d.unitType)}
          </Typography>
        ))
      )}
    </ListItem>
  )
}

function SingleDeduction({
  single,
  choices,
  override,
  error,
  onOverride,
}: {
  single: PlannedLine['deductions'][number]
  choices: PlannedLine['alternatives']
  override?: Override
  error?: string
  onOverride: (override: Override) => void
}) {
  const itemId = override?.itemId ?? single.itemId
  const item = choices.find((c) => c.itemId === itemId)
  const unitType = item?.unitType ?? single.unitType
  const amountText =
    override?.amountText ?? formatNumberInput(toDisplayAmount(single.amount, single.unitType))
  const amount = fromDisplayAmount(parseNumberInput(amountText), unitType)
  const remaining = item?.remaining ?? single.remainingBefore

  return (
    <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      {choices.length > 1 ? (
        <TextField
          select
          size="small"
          label="Från"
          value={String(itemId)}
          onChange={(event) => onOverride({ itemId: Number(event.target.value), amountText })}
          slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
          sx={{ minWidth: 180, flexGrow: 1 }}
        >
          {choices.map((c) => (
            <option key={c.itemId} value={String(c.itemId)}>
              {c.itemName} ({formatAmount(c.remaining, c.unitType)} kvar)
            </option>
          ))}
        </TextField>
      ) : (
        <Typography variant="body2" sx={{ alignSelf: 'center', flexGrow: 1 }}>
          från {single.itemName}
        </Typography>
      )}
      <TextField
        size="small"
        label="Mängd"
        value={amountText}
        onChange={(event) => onOverride({ itemId, amountText: event.target.value })}
        error={!!error}
        helperText={
          error ??
          (Number.isNaN(amount)
            ? ' '
            : `${formatAmount(remaining, unitType)} → ${formatAmount(Math.max(0, remaining - amount), unitType)}`)
        }
        slotProps={{
          input: {
            endAdornment: <InputAdornment position="end">{unitLabel(unitType)}</InputAdornment>,
          },
          htmlInput: { inputMode: 'decimal', 'aria-label': 'Mängd' },
        }}
        sx={{ width: 150 }}
      />
    </Stack>
  )
}
