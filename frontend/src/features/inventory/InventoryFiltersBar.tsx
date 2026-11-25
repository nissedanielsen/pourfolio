import SearchIcon from '@mui/icons-material/Search'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import FormControlLabel from '@mui/material/FormControlLabel'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import { useCallback } from 'react'
import type { Category } from '../../api/client'
import { DebouncedTextField } from '../../components/DebouncedTextField'
import { formatNumberInput, parseNumberInput } from '../../lib/units'
import { CategorySelect } from '../categories/CategorySelect'
import { hasActiveFilters, SORT_OPTIONS, type InventoryFilters } from './filters'

interface Props {
  filters: InventoryFilters
  categories: Category[]
  onChange: (changes: Partial<InventoryFilters>) => void
  onReset: () => void
}

export function InventoryFiltersBar({ filters, categories, onChange, onReset }: Props) {
  const commitQuery = useCallback((q: string) => onChange({ q: q.trim() }), [onChange])
  const commitAbv = useCallback(
    (key: 'minAbv' | 'maxAbv', text: string) => {
      if (text.trim() === '') {
        onChange({ [key]: undefined })
        return
      }
      const value = parseNumberInput(text)
      // Ignore half-typed input such as "40," until it becomes a number.
      if (!Number.isNaN(value)) onChange({ [key]: value })
    },
    [onChange],
  )
  const commitMinAbv = useCallback((text: string) => commitAbv('minAbv', text), [commitAbv])
  const commitMaxAbv = useCallback((text: string) => commitAbv('maxAbv', text), [commitAbv])

  return (
    <Stack spacing={2} sx={{ mb: 3 }}>
      <DebouncedTextField
        label="Sök"
        placeholder="Namn eller märke"
        value={filters.q}
        onCommit={commitQuery}
        fullWidth
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          },
          htmlInput: { type: 'search' },
        }}
      />
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr 1fr', sm: '2fr 1fr 1fr' },
        }}
      >
        <CategorySelect
          label="Kategori"
          categories={categories}
          value={filters.categoryId === undefined ? '' : String(filters.categoryId)}
          onChange={(value) => onChange({ categoryId: value === '' ? undefined : Number(value) })}
          allowTopLevel
          size="small"
          sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}
        />
        <TextField
          select
          label="Typ"
          size="small"
          slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}
          value={filters.unitType ?? ''}
          onChange={(event) =>
            onChange({
              unitType: event.target.value === '' ? undefined : (event.target.value as 'VOLUME'),
            })
          }
        >
          <MenuItem value="">Alla</MenuItem>
          <MenuItem value="VOLUME">Flytande (cl)</MenuItem>
          <MenuItem value="COUNT">Styckvaror</MenuItem>
        </TextField>
        <TextField
          select
          label="Sortering"
          size="small"
          value={filters.sort}
          onChange={(event) => onChange({ sort: event.target.value })}
        >
          {SORT_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Box>
      <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <DebouncedTextField
          label="Alkohol från"
          size="small"
          value={formatNumberInput(filters.minAbv)}
          onCommit={commitMinAbv}
          sx={{ width: 150 }}
          slotProps={{
            input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
            htmlInput: { inputMode: 'decimal' },
          }}
        />
        <DebouncedTextField
          label="till"
          size="small"
          value={formatNumberInput(filters.maxAbv)}
          onCommit={commitMaxAbv}
          sx={{ width: 110 }}
          slotProps={{
            input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
            htmlInput: { inputMode: 'decimal' },
          }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={filters.lowStock}
              onChange={(event) => onChange({ lowStock: event.target.checked })}
            />
          }
          label="Snart slut"
        />
        {hasActiveFilters(filters) && (
          <Button onClick={onReset} sx={{ ml: 'auto' }}>
            Rensa filter
          </Button>
        )}
      </Stack>
    </Stack>
  )
}
