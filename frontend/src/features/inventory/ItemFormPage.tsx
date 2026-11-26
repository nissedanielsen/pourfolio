import { zodResolver } from '@hookform/resolvers/zod'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import InputAdornment from '@mui/material/InputAdornment'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { useRef } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useLocation, useNavigate, useParams } from 'react-router'
import { ApiError, type Category, type Ingredient, type InventoryItem } from '../../api/client'
import { useNotify } from '../../components/notify'
import { unitLabel } from '../../lib/units'
import { CategorySelect } from '../categories/CategorySelect'
import { useCategories } from '../categories/useCategories'
import { guessIngredient, useIngredients } from '../ingredients/useIngredients'
import {
  emptyItemForm,
  itemFormSchema,
  toFormValues,
  toRequest,
  translateServerError,
  type ItemFormValues,
} from './itemForm'
import { useCreateItem, useInventoryItem, useUpdateItem } from './useInventory'

const BOTTLE_SIZES_CL = [20, 35, 50, 70, 75, 100]

/** Create (/items/new) or edit (/items/:id) an inventory item. */
export function ItemFormPage() {
  const { id } = useParams()
  const isNew = id === undefined
  const itemId = Number(id)
  const item = useInventoryItem(itemId, { enabled: !isNew })
  const categories = useCategories()
  const ingredients = useIngredients()

  if (!isNew && Number.isNaN(itemId)) {
    return <Alert severity="error">Ogiltig adress.</Alert>
  }
  if (!isNew && item.isError) {
    const notFound = item.error instanceof ApiError && item.error.status === 404
    return (
      <Alert severity="error">{notFound ? 'Posten finns inte.' : 'Kunde inte hämta posten.'}</Alert>
    )
  }
  if (categories.isError || ingredients.isError) {
    return <Alert severity="error">Kunde inte hämta kategorierna.</Alert>
  }
  // Render the form only when everything it needs is loaded, so nothing changes under the user.
  if ((!isNew && !item.data) || !categories.data || !ingredients.data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress aria-label="Laddar" />
      </Box>
    )
  }
  return (
    <ItemForm
      key={id ?? 'new'}
      item={item.data}
      categories={categories.data}
      ingredients={ingredients.data}
    />
  )
}

function ItemForm({
  item,
  categories,
  ingredients,
}: {
  item?: InventoryItem
  categories: Category[]
  ingredients: Ingredient[]
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const notify = useNotify()
  const create = useCreateItem()
  const update = useUpdateItem(item?.id ?? 0)
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo ?? '/'

  const {
    control,
    handleSubmit,
    setValue,
    setError,
    getFieldState,
    getValues,
    formState: { isSubmitting },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: item ? toFormValues(item) : emptyItemForm,
  })
  const unitType = useWatch({ control, name: 'unitType' })
  const unit = unitLabel(unitType)
  const categoryId = useWatch({ control, name: 'categoryId' })
  const ingredientId = useWatch({ control, name: 'ingredientId' })
  const ingredientsInCategory = ingredients.filter((i) => String(i.categoryId) === categoryId)

  // Guess the ingredient from the name and category ("Campari Bitter" -> Campari) until the
  // user picks one, but never override an ingredient an existing item already has.
  const autoIngredient = useRef(!item?.ingredient)
  const updateIngredientGuess = (nextCategoryId: string, nextName: string) => {
    const current = ingredients.find((i) => String(i.id) === ingredientId)
    if (current && String(current.categoryId) !== nextCategoryId) {
      // The chosen ingredient doesn't belong to the new category.
      setValue('ingredientId', '')
    }
    if (!autoIngredient.current) return
    const guess = guessIngredient(ingredients, Number(nextCategoryId), nextName)
    setValue('ingredientId', guess ? String(guess.id) : '')
  }

  // While the user hasn't touched "remaining", keep it equal to the size (a full bottle).
  const setCapacity = (value: string) => {
    setValue('capacity', value, { shouldDirty: true })
    if (!item && !getFieldState('remaining').isDirty) {
      setValue('remaining', value)
    }
  }

  // On a new item with an untouched size, switch to a sensible default for the unit.
  const changeUnitType = (
    value: ItemFormValues['unitType'],
    onChange: (value: ItemFormValues['unitType']) => void,
  ) => {
    onChange(value)
    if (!item && !getFieldState('capacity').isDirty) {
      const size = value === 'VOLUME' ? emptyItemForm.capacity : '1'
      setValue('capacity', size)
      setValue('remaining', size)
    }
  }

  const onSubmit = async (values: ItemFormValues) => {
    try {
      const saved = item
        ? await update.mutateAsync(toRequest(values))
        : await create.mutateAsync(toRequest(values))
      notify(item ? `${saved.name} har sparats` : `${saved.name} har lagts till`)
      navigate(returnTo)
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          if (field in emptyItemForm) {
            setError(field as keyof ItemFormValues, { message: translateServerError(message) })
          }
        }
      } else {
        notify('Kunde inte spara', 'error')
      }
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" component="h1" gutterBottom>
        {item ? `Ändra ${item.name}` : 'Lägg till'}
      </Typography>
      <Stack component="form" spacing={2.5} noValidate onSubmit={handleSubmit(onSubmit)}>
        <Controller
          control={control}
          name="unitType"
          render={({ field }) => (
            <ToggleButtonGroup
              exclusive
              color="primary"
              value={field.value}
              onChange={(_, value: ItemFormValues['unitType'] | null) =>
                value && changeUnitType(value, field.onChange)
              }
              aria-label="Typ av vara"
            >
              <ToggleButton value="VOLUME">Flytande (cl)</ToggleButton>
              <ToggleButton value="COUNT">Styckvara</ToggleButton>
            </ToggleButtonGroup>
          )}
        />

        <Controller
          control={control}
          name="categoryId"
          render={({ field, fieldState }) => (
            <CategorySelect
              label="Kategori"
              required
              categories={categories}
              value={field.value}
              onChange={(value) => {
                field.onChange(value)
                updateIngredientGuess(value, getValues('name'))
              }}
              onBlur={field.onBlur}
              inputRef={field.ref}
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="name"
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              onChange={(event) => {
                field.onChange(event)
                updateIngredientGuess(getValues('categoryId'), event.target.value)
              }}
              label="Namn"
              required
              placeholder={unitType === 'VOLUME' ? 't.ex. Tanqueray London Dry' : 't.ex. Lime'}
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
            />
          )}
        />

        {ingredientsInCategory.length > 0 && (
          <Controller
            control={control}
            name="ingredientId"
            render={({ field, fieldState }) => (
              <TextField
                select
                label="Ingrediens (för drinkförslag)"
                value={field.value}
                onChange={(event) => {
                  // A manual choice stops the automatic guessing.
                  autoIngredient.current = false
                  field.onChange(event.target.value)
                }}
                onBlur={field.onBlur}
                inputRef={field.ref}
                error={!!fieldState.error}
                helperText={
                  fieldState.error?.message ??
                  'Vad är det här? Då kan appen föreslå drinkar med den.'
                }
                slotProps={{ inputLabel: { shrink: true }, select: { native: true } }}
              >
                <option value="">Ingen särskild</option>
                {ingredientsInCategory.map((ingredient) => (
                  <option key={ingredient.id} value={String(ingredient.id)}>
                    {ingredient.name}
                  </option>
                ))}
              </TextField>
            )}
          />
        )}

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' } }}>
          <Controller
            control={control}
            name="brand"
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="Märke"
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              />
            )}
          />
          {unitType === 'VOLUME' && (
            <Controller
              control={control}
              name="abv"
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="Alkoholhalt"
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  slotProps={{
                    input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
                    htmlInput: { inputMode: 'decimal' },
                  }}
                />
              )}
            />
          )}
        </Box>

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
          <Controller
            control={control}
            name="capacity"
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                onChange={(event) => setCapacity(event.target.value)}
                label={unitType === 'VOLUME' ? 'Flaskstorlek' : 'Antal (fullt)'}
                required
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                slotProps={{
                  input: { endAdornment: <InputAdornment position="end">{unit}</InputAdornment> },
                  htmlInput: { inputMode: 'decimal' },
                }}
              />
            )}
          />
          <Controller
            control={control}
            name="remaining"
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="Kvar"
                required
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                slotProps={{
                  input: { endAdornment: <InputAdornment position="end">{unit}</InputAdornment> },
                  htmlInput: { inputMode: 'decimal' },
                }}
              />
            )}
          />
        </Box>

        {unitType === 'VOLUME' && (
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mt: -1 }}>
            {BOTTLE_SIZES_CL.map((size) => (
              <Chip
                key={size}
                label={`${size} cl`}
                size="small"
                variant="outlined"
                onClick={() => setCapacity(String(size))}
              />
            ))}
          </Stack>
        )}

        <Controller
          control={control}
          name="notes"
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label="Anteckningar"
              multiline
              minRows={2}
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
            />
          )}
        />

        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <Button onClick={() => navigate(returnTo)}>Avbryt</Button>
          <Button type="submit" variant="contained" loading={isSubmitting}>
            {item ? 'Spara' : 'Lägg till'}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  )
}
