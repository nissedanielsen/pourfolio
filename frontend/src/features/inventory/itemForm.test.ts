import { describe, expect, it } from 'vitest'
import type { InventoryItem } from '../../api/client'
import {
  emptyItemForm,
  itemFormSchema,
  toFormValues,
  toRequest,
  type ItemFormValues,
} from './itemForm'

const valid: ItemFormValues = {
  ...emptyItemForm,
  categoryId: '17',
  name: ' Tanqueray ',
  abv: '43,1',
  capacity: '70',
  remaining: '37,5',
}

function errors(values: ItemFormValues): Record<string, string> {
  const result = itemFormSchema.safeParse(values)
  if (result.success) return {}
  return Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]))
}

describe('itemFormSchema', () => {
  it('accepts valid values', () => {
    expect(errors(valid)).toEqual({})
  })

  it('requires category, name, size and remaining', () => {
    expect(errors({ ...emptyItemForm, capacity: '', remaining: '' })).toEqual({
      categoryId: 'Välj en kategori',
      name: 'Ange ett namn',
      capacity: 'Ange storlek',
      remaining: 'Ange hur mycket som finns kvar',
    })
  })

  it('validates abv range and format', () => {
    expect(errors({ ...valid, abv: '120' }).abv).toBe('Måste vara mellan 0 och 100')
    expect(errors({ ...valid, abv: '40,25' }).abv).toBe('Högst en decimal')
    expect(errors({ ...valid, abv: 'fyrtio' }).abv).toMatch(/Ange ett tal/)
  })

  it('does not allow more remaining than capacity', () => {
    expect(errors({ ...valid, remaining: '71' }).remaining).toBe('Kan inte vara mer än storleken')
  })

  it('requires whole numbers for countable items and ignores abv', () => {
    const count = {
      ...valid,
      unitType: 'COUNT' as const,
      abv: 'x',
      capacity: '6',
      remaining: '2,5',
    }
    expect(errors(count)).toEqual({ remaining: 'Ange ett heltal' })
  })
})

describe('form conversion', () => {
  it('converts form values to an API request in ml', () => {
    const parsed = itemFormSchema.parse(valid)
    expect(toRequest(parsed)).toEqual({
      categoryId: 17,
      ingredientId: undefined,
      name: 'Tanqueray',
      brand: undefined,
      abv: 43.1,
      unitType: 'VOLUME',
      capacity: 700,
      remaining: 375,
      notes: undefined,
    })
  })

  it('drops abv for countable items', () => {
    const parsed = itemFormSchema.parse({
      ...valid,
      unitType: 'COUNT',
      capacity: '6',
      remaining: '4',
    })
    expect(toRequest(parsed)).toMatchObject({
      unitType: 'COUNT',
      abv: undefined,
      capacity: 6,
      remaining: 4,
    })
  })

  it('converts an API item to form values in cl', () => {
    const item: InventoryItem = {
      id: 1,
      category: { id: 17, code: 'gin', name: 'Gin', parentId: 1 },
      name: 'Tanqueray',
      abv: 43.1,
      unitType: 'VOLUME',
      capacity: 700,
      remaining: 375,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }
    expect(toFormValues(item)).toEqual({
      categoryId: '17',
      ingredientId: '',
      name: 'Tanqueray',
      brand: '',
      unitType: 'VOLUME',
      abv: '43,1',
      capacity: '70',
      remaining: '37,5',
      notes: '',
      barcode: '',
    })
  })
})
