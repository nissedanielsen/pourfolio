import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router'
import type { RecipeSummary } from '../../api/client'
import { describeServings, describeShortfall } from './recipeFormat'
import { SurpriseButton } from './SurpriseButton'
import { useRecipes, useShoppingSuggestions, type RecipeFilter } from './useRecipes'

const FILTERS: { value: RecipeFilter; label: string }[] = [
  { value: 'CAN_MAKE', label: 'Kan göras' },
  { value: 'MISSING_ONE', label: 'Saknar en' },
  { value: 'ALL', label: 'Alla' },
]

const EMPTY_TEXT: Record<RecipeFilter, string> = {
  CAN_MAKE: 'Inget kan göras med det du har hemma just nu.',
  MISSING_ONE: 'Inga drinkar saknar bara en sak.',
  ALL: 'Inga recept hittades.',
}

function parseFilter(value: string | null): RecipeFilter {
  return FILTERS.some((f) => f.value === value) ? (value as RecipeFilter) : 'CAN_MAKE'
}

export function DrinksPage() {
  const [params, setParams] = useSearchParams()
  const filter = parseFilter(params.get('visa'))
  const [search, setSearch] = useState('')
  const recipes = useRecipes(filter)

  const visible = (recipes.data ?? []).filter((r) =>
    r.name.toLowerCase().includes(search.trim().toLowerCase()),
  )

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
          Drinkar
        </Typography>
        <SurpriseButton />
      </Stack>

      <ShoppingSuggestions />

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 2, alignItems: { sm: 'center' } }}
      >
        <ToggleButtonGroup
          exclusive
          color="primary"
          size="small"
          value={filter}
          onChange={(_, value: RecipeFilter | null) =>
            value && setParams(value === 'CAN_MAKE' ? {} : { visa: value }, { replace: true })
          }
          aria-label="Visa"
        >
          {FILTERS.map((f) => (
            <ToggleButton key={f.value} value={f.value}>
              {f.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <TextField
          size="small"
          label="Sök drink"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          slotProps={{ htmlInput: { type: 'search' } }}
          sx={{ flexGrow: 1 }}
        />
      </Stack>

      {recipes.isError ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => recipes.refetch()}>
              Försök igen
            </Button>
          }
        >
          Kunde inte hämta drinkarna.
        </Alert>
      ) : recipes.isPending ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Laddar" />
        </Box>
      ) : visible.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography gutterBottom>
            {search.trim() ? 'Ingen drink matchar sökningen.' : EMPTY_TEXT[filter]}
          </Typography>
          {filter === 'CAN_MAKE' && !search.trim() && (
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480, mx: 'auto' }}>
              Tips: ange vilken ingrediens en flaska är (t.ex. Campari eller söt vermouth) när du
              lägger till eller ändrar den, så hittar appen fler drinkar.
            </Typography>
          )}
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {visible.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </Stack>
      )}
    </>
  )
}

function RecipeCard({ recipe }: { recipe: RecipeSummary }) {
  return (
    <Card variant="outlined" component="article" aria-label={recipe.name}>
      <CardActionArea component={RouterLink} to={`/drinks/${recipe.id}`}>
        <CardContent sx={{ '&:last-child': { pb: 2 } }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600, flexGrow: 1 }}>
              {recipe.name}
            </Typography>
            {recipe.canMake ? (
              <Chip size="small" color="success" label={describeServings(recipe.servings)} />
            ) : (
              <Chip
                size="small"
                variant="outlined"
                color={recipe.missingCount === 1 ? 'warning' : 'default'}
                label={recipe.missingCount === 1 ? 'Saknar 1' : `Saknar ${recipe.missingCount}`}
              />
            )}
          </Stack>
          {recipe.description && (
            <Typography variant="body2" color="text.secondary">
              {recipe.description}
            </Typography>
          )}
          {!recipe.canMake && (
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              Saknas: {recipe.missing.map(describeShortfall).join(', ')}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

function ShoppingSuggestions() {
  const suggestions = useShoppingSuggestions()
  const top = (suggestions.data ?? []).slice(0, 3)
  if (top.length === 0) return null

  return (
    <Paper variant="outlined" component="section" aria-label="Köptips" sx={{ p: 2, mb: 3 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
        <ShoppingCartOutlinedIcon color="primary" />
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600 }}>
          Köptips
        </Typography>
      </Stack>
      <Stack spacing={0.5}>
        {top.map((s) => (
          <Typography key={s.name} variant="body2">
            <strong>{s.name}</strong> –{' '}
            {s.recipeCount === 1 ? '1 drink till' : `${s.recipeCount} drinkar till`}:{' '}
            {s.recipes.map((r) => r.name).join(', ')}
          </Typography>
        ))}
      </Stack>
    </Paper>
  )
}
