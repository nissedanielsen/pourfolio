import AddIcon from '@mui/icons-material/Add'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Pagination from '@mui/material/Pagination'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { Link as RouterLink, useLocation } from 'react-router'
import type { InventoryItem } from '../../api/client'
import { ScanButton } from '../barcode/ScanButton'
import { useCategories } from '../categories/useCategories'
import { AdjustRemainingDialog } from './AdjustRemainingDialog'
import { DeleteItemDialog } from './DeleteItemDialog'
import { hasActiveFilters, useInventoryFilters } from './filters'
import { InventoryFiltersBar } from './InventoryFiltersBar'
import { InventoryItemCard } from './InventoryItemCard'
import { useInventoryItems } from './useInventory'

export function InventoryPage() {
  const { filters, update, reset } = useInventoryFilters()
  const categories = useCategories()
  const items = useInventoryItems(filters)
  const location = useLocation()
  const returnTo = `${location.pathname}${location.search}`

  const [adjusting, setAdjusting] = useState<InventoryItem | null>(null)
  const [deleting, setDeleting] = useState<InventoryItem | null>(null)
  // Remounts the filter bar on reset so half-typed, not yet applied input is cleared too.
  const [filterBarKey, setFilterBarKey] = useState(0)
  const resetFilters = () => {
    reset()
    setFilterBarKey((key) => key + 1)
  }

  const page = items.data
  const total = page?.totalElements ?? 0

  return (
    <>
      <Stack
        direction="row"
        useFlexGap
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
          mb: 2,
        }}
      >
        <Typography variant="h4" component="h1">
          Inventarie
        </Typography>
        <Stack direction="row" spacing={1}>
          <ScanButton returnTo={returnTo} />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            component={RouterLink}
            to="/items/new"
            state={{ returnTo }}
          >
            Lägg till
          </Button>
        </Stack>
      </Stack>

      <InventoryFiltersBar
        key={filterBarKey}
        filters={filters}
        categories={categories.data ?? []}
        onChange={update}
        onReset={resetFilters}
      />

      {items.isError ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => items.refetch()}>
              Försök igen
            </Button>
          }
        >
          Kunde inte hämta inventariet.
        </Alert>
      ) : items.isPending ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Laddar" />
        </Box>
      ) : total === 0 ? (
        <EmptyState
          filtered={hasActiveFilters(filters)}
          onReset={resetFilters}
          returnTo={returnTo}
        />
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {total === 1 ? '1 sak' : `${total} saker`}
          </Typography>
          <Stack spacing={1.5} sx={{ opacity: items.isPlaceholderData ? 0.6 : 1 }}>
            {page?.content.map((item) => (
              <InventoryItemCard
                key={item.id}
                item={item}
                returnTo={returnTo}
                onAdjust={setAdjusting}
                onDelete={setDeleting}
              />
            ))}
          </Stack>
          {page && page.totalPages > 1 && (
            <Pagination
              count={page.totalPages}
              page={filters.page}
              onChange={(_, value) => update({ page: value })}
              sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}
            />
          )}
        </>
      )}

      {adjusting && <AdjustRemainingDialog item={adjusting} onClose={() => setAdjusting(null)} />}
      {deleting && <DeleteItemDialog item={deleting} onClose={() => setDeleting(null)} />}
    </>
  )
}

function EmptyState({
  filtered,
  onReset,
  returnTo,
}: {
  filtered: boolean
  onReset: () => void
  returnTo: string
}) {
  return (
    <Box sx={{ textAlign: 'center', py: 6 }}>
      {filtered ? (
        <>
          <Typography gutterBottom>Inget matchar filtret.</Typography>
          <Button onClick={onReset}>Rensa filter</Button>
        </>
      ) : (
        <>
          <Typography gutterBottom>Inventariet är tomt.</Typography>
          <Button component={RouterLink} to="/items/new" state={{ returnTo }}>
            Lägg till din första flaska
          </Button>
        </>
      )}
    </Box>
  )
}
