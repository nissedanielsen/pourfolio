import { z } from 'zod'
import type {
  BarcodeLookup,
  Ingredient,
  InventoryItem,
  InventoryItemRequest,
} from '../../api/client'
import { isValidGtin } from '../../lib/gtin'
import { guessIngredient } from '../ingredients/useIngredients'
import {
  formatNumberInput,
  fromDisplayAmount,
  parseNumberInput,
  toDisplayAmount,
} from '../../lib/units'

/**
 * Form values are the strings the user typed. Amounts are in display units
 * (cl for liquids, pieces for countable items) and may use a decimal comma.
 */
export const itemFormSchema = z
  .object({
    categoryId: z.string().min(1, 'Välj en kategori'),
    /** Optional; '' means no specific ingredient. */
    ingredientId: z.string(),
    name: z.string().trim().min(1, 'Ange ett namn').max(200, 'Högst 200 tecken'),
    brand: z.string().trim().max(200, 'Högst 200 tecken'),
    unitType: z.enum(['VOLUME', 'COUNT']),
    abv: z.string().trim(),
    capacity: z.string().trim(),
    remaining: z.string().trim(),
    notes: z.string().trim().max(2000, 'Högst 2000 tecken'),
    /** Optional EAN; spaces are ignored. */
    barcode: z.string(),
  })
  .superRefine((values, ctx) => {
    const volume = values.unitType === 'VOLUME'
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: 'custom', path: [path], message })

    if (volume && values.abv !== '') {
      const abv = parseNumberInput(values.abv)
      if (Number.isNaN(abv)) issue('abv', 'Ange ett tal, t.ex. 40 eller 37,5')
      else if (abv < 0 || abv > 100) issue('abv', 'Måste vara mellan 0 och 100')
      else if (!hasAtMostOneDecimal(abv)) issue('abv', 'Högst en decimal')
    }

    const capacity = parseNumberInput(values.capacity)
    if (values.capacity === '') issue('capacity', 'Ange storlek')
    else if (Number.isNaN(capacity)) issue('capacity', 'Ange ett tal')
    else if (capacity <= 0) issue('capacity', 'Måste vara större än 0')
    else if (volume ? !hasAtMostOneDecimal(capacity) : !Number.isInteger(capacity))
      issue('capacity', volume ? 'Högst en decimal' : 'Ange ett heltal')

    const remaining = parseNumberInput(values.remaining)
    if (values.remaining === '') issue('remaining', 'Ange hur mycket som finns kvar')
    else if (Number.isNaN(remaining)) issue('remaining', 'Ange ett tal')
    else if (remaining < 0) issue('remaining', 'Kan inte vara negativ')
    else if (volume ? !hasAtMostOneDecimal(remaining) : !Number.isInteger(remaining))
      issue('remaining', volume ? 'Högst en decimal' : 'Ange ett heltal')
    else if (!Number.isNaN(capacity) && remaining > capacity)
      issue('remaining', 'Kan inte vara mer än storleken')

    const barcode = values.barcode.replace(/\s/g, '')
    if (barcode !== '' && !isValidGtin(barcode))
      issue('barcode', 'Ogiltig streckkod – kontrollera siffrorna')
  })

export type ItemFormValues = z.infer<typeof itemFormSchema>

function hasAtMostOneDecimal(value: number): boolean {
  return Math.abs(value * 10 - Math.round(value * 10)) < 1e-9
}

export const emptyItemForm: ItemFormValues = {
  categoryId: '',
  ingredientId: '',
  name: '',
  brand: '',
  unitType: 'VOLUME',
  abv: '',
  capacity: '70',
  remaining: '70',
  notes: '',
  barcode: '',
}

export function toFormValues(item: InventoryItem): ItemFormValues {
  return {
    categoryId: String(item.category.id),
    ingredientId: item.ingredient ? String(item.ingredient.id) : '',
    name: item.name,
    brand: item.brand ?? '',
    unitType: item.unitType,
    abv: formatNumberInput(item.abv),
    capacity: formatNumberInput(toDisplayAmount(item.capacity, item.unitType)),
    remaining: formatNumberInput(toDisplayAmount(item.remaining, item.unitType)),
    notes: item.notes ?? '',
    barcode: item.barcode ?? '',
  }
}

/**
 * Form values for a new item from a barcode lookup: the suggestion (if any) as a full
 * bottle, the barcode, and an ingredient guessed from the name when none was suggested.
 */
export function fromLookup(lookup: BarcodeLookup, ingredients: Ingredient[]): ItemFormValues {
  const s = lookup.suggestion
  if (!s) return { ...emptyItemForm, barcode: lookup.barcode }
  const size =
    s.capacity !== undefined
      ? formatNumberInput(toDisplayAmount(s.capacity, s.unitType))
      : emptyItemForm.capacity
  const ingredientId =
    s.ingredientId ??
    (s.categoryId !== undefined
      ? guessIngredient(ingredients, s.categoryId, s.name)?.id
      : undefined)
  return {
    ...emptyItemForm,
    categoryId: s.categoryId !== undefined ? String(s.categoryId) : '',
    ingredientId: ingredientId !== undefined ? String(ingredientId) : '',
    name: s.name,
    brand: s.brand ?? '',
    unitType: s.unitType,
    abv: formatNumberInput(s.abv),
    capacity: size,
    remaining: size,
    barcode: lookup.barcode,
  }
}

/** Converts validated form values to an API request (cl → ml). */
export function toRequest(values: ItemFormValues): InventoryItemRequest {
  const volume = values.unitType === 'VOLUME'
  return {
    categoryId: Number(values.categoryId),
    ingredientId: values.ingredientId ? Number(values.ingredientId) : undefined,
    name: values.name,
    brand: values.brand || undefined,
    abv: volume && values.abv !== '' ? parseNumberInput(values.abv) : undefined,
    unitType: values.unitType,
    capacity: fromDisplayAmount(parseNumberInput(values.capacity), values.unitType),
    remaining: fromDisplayAmount(parseNumberInput(values.remaining), values.unitType),
    notes: values.notes || undefined,
    barcode: values.barcode.replace(/\s/g, '') || undefined,
  }
}

const serverMessages: Record<string, string> = {
  'must not be greater than capacity': 'Kan inte vara mer än storleken',
  'must be a subcategory': 'Välj en underkategori',
  'category does not exist': 'Kategorin finns inte',
  'ingredient does not belong to the category': 'Ingrediensen hör inte till kategorin',
  'ingredient does not exist': 'Ingrediensen finns inte',
  'invalid barcode': 'Ogiltig streckkod – kontrollera siffrorna',
}

/** Translates a backend validation message (English) to Swedish. */
export function translateServerError(message: string): string {
  return serverMessages[message] ?? 'Ogiltigt värde'
}
