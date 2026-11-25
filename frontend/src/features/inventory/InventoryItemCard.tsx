import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import TuneIcon from '@mui/icons-material/Tune'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { Link as RouterLink } from 'react-router'
import type { InventoryItem } from '../../api/client'
import { fillLevel, formatAbv, formatAmount, isLowStock } from '../../lib/units'

interface Props {
  item: InventoryItem
  /** Where the edit page should return to, e.g. the current filtered list. */
  returnTo: string
  onAdjust: (item: InventoryItem) => void
  onDelete: (item: InventoryItem) => void
}

export function InventoryItemCard({ item, returnTo, onAdjust, onDelete }: Props) {
  const level = fillLevel(item.remaining, item.capacity)
  const empty = item.remaining === 0
  const low = isLowStock(item.remaining, item.capacity)
  const details = [item.brand, item.category.name, item.abv !== undefined && formatAbv(item.abv)]
    .filter(Boolean)
    .join(' · ')

  return (
    <Card variant="outlined" component="article" aria-label={item.name}>
      <CardContent sx={{ '&:last-child': { pb: 2 } }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600 }} noWrap>
              {item.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {details}
            </Typography>
          </Box>
          <Stack direction="row" sx={{ flexShrink: 0, mr: -1, mt: -0.5 }}>
            <Tooltip title="Justera mängd kvar">
              <IconButton
                aria-label={`Justera mängd kvar för ${item.name}`}
                onClick={() => onAdjust(item)}
              >
                <TuneIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Ändra">
              <IconButton
                aria-label={`Ändra ${item.name}`}
                component={RouterLink}
                to={`/items/${item.id}`}
                state={{ returnTo }}
              >
                <EditOutlinedIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Ta bort">
              <IconButton aria-label={`Ta bort ${item.name}`} onClick={() => onDelete(item)}>
                <DeleteOutlinedIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mt: 1.5 }}>
          <LinearProgress
            variant="determinate"
            value={level * 100}
            color={low ? 'error' : 'primary'}
            aria-label="Fyllnadsgrad"
            sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
          />
          <Typography
            variant="body2"
            color={low ? 'error' : 'text.secondary'}
            sx={{ minWidth: 110, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
          >
            {empty
              ? 'Slut'
              : `${formatAmount(item.remaining, item.unitType)} av ${formatAmount(item.capacity, item.unitType)}`}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  )
}
