import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CancelIcon from '@mui/icons-material/Cancel'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { Link as RouterLink, useParams } from 'react-router'
import { ApiError, type RecipeLine } from '../../api/client'
import { describeServings, describeShortfall, formatRecipeAmount } from './recipeFormat'
import { useRecipe } from './useRecipes'

export function RecipeDetailPage() {
  const id = Number(useParams().id)
  const recipe = useRecipe(id)

  const back = (
    <Button component={RouterLink} to="/drinks" startIcon={<ArrowBackIcon />} sx={{ mb: 1 }}>
      Drinkar
    </Button>
  )

  if (recipe.isError) {
    const notFound = recipe.error instanceof ApiError && recipe.error.status === 404
    return (
      <>
        {back}
        <Alert severity="error">
          {notFound ? 'Receptet finns inte.' : 'Kunde inte hämta receptet.'}
        </Alert>
      </>
    )
  }
  if (!recipe.data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress aria-label="Laddar" />
      </Box>
    )
  }

  const r = recipe.data
  const shortfalls = r.lines.filter(
    (l) => !l.optional && (l.status === 'MISSING' || l.status === 'NOT_ENOUGH'),
  )

  return (
    <>
      {back}
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h4" component="h1">
          {r.name}
        </Typography>
        {r.description && (
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {r.description}
          </Typography>
        )}

        {r.canMake ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            Du har allt som behövs. {describeServings(r.servings)}.
          </Alert>
        ) : (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Saknas:{' '}
            {shortfalls
              .map((l) =>
                describeShortfall({
                  name: l.name,
                  status: l.status,
                  measure: l.measure,
                  needed: l.needed,
                  available: l.available,
                }),
              )
              .join(', ')}
          </Alert>
        )}

        <Typography variant="h6" component="h2">
          Ingredienser
        </Typography>
        <List dense aria-label="Ingredienser">
          {r.lines.map((line) => (
            <IngredientRow key={line.position} line={line} />
          ))}
        </List>

        <Typography variant="h6" component="h2" sx={{ mt: 1 }}>
          Gör så här
        </Typography>
        <Typography sx={{ mb: 2 }}>{r.method}</Typography>

        {(r.glass || r.garnish) && (
          <Typography variant="body2" color="text.secondary">
            {r.glass && <>Glas: {r.glass}</>}
            {r.glass && r.garnish && ' · '}
            {r.garnish && <>Garnityr: {r.garnish}</>}
          </Typography>
        )}
      </Paper>
    </>
  )
}

const STATUS_TEXT: Record<RecipeLine['status'], string> = {
  OK: 'Finns hemma',
  ALWAYS_AVAILABLE: 'Finns alltid',
  MISSING: 'Saknas',
  NOT_ENOUGH: 'För lite',
}

function StatusIcon({ status }: { status: RecipeLine['status'] }) {
  switch (status) {
    case 'OK':
      return <CheckCircleIcon color="success" />
    case 'ALWAYS_AVAILABLE':
      return <CheckCircleOutlineIcon color="disabled" />
    case 'MISSING':
      return <CancelIcon color="error" />
    case 'NOT_ENOUGH':
      return <WarningAmberIcon color="warning" />
  }
}

function IngredientRow({ line }: { line: RecipeLine }) {
  const name = line.anyOfCategory ? `${line.name} (valfri sort)` : line.name
  const details: string[] = []
  if (line.status === 'NOT_ENOUGH') {
    details.push(describeShortfall({ ...line, name: 'För lite' }))
  } else if (line.matchedItems.length > 0) {
    details.push(line.matchedItems.map((i) => i.name).join(', '))
  } else if (line.status === 'ALWAYS_AVAILABLE') {
    details.push('Finns alltid')
  } else if (line.status === 'MISSING') {
    details.push('Saknas')
  }
  if (line.usesSubstitute) details.push('ersätter')

  return (
    <ListItem disableGutters aria-label={`${name}: ${STATUS_TEXT[line.status]}`}>
      <ListItemIcon sx={{ minWidth: 36 }}>
        <StatusIcon status={line.status} />
      </ListItemIcon>
      <ListItemText
        primary={
          <>
            <Box component="span" sx={{ fontWeight: 600, mr: 1 }}>
              {formatRecipeAmount(line.amount, line.unit)}
            </Box>
            {name}
            {line.optional && (
              <Box component="span" sx={{ color: 'text.secondary' }}>
                {' '}
                (valfritt)
              </Box>
            )}
          </>
        }
        secondary={details.join(' · ')}
      />
    </ListItem>
  )
}
