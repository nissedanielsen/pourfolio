import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import type { UnitType } from '../../api/client'
import { parseNumberInput } from '../../lib/units'

export interface InventoryFilters {
  q: string
  categoryId?: number
  unitType?: UnitType
  lowStock: boolean
  minAbv?: number
  maxAbv?: number
  sort: string
  /** One-based page number, as shown in the UI. */
  page: number
}

export const SORT_OPTIONS = [
  { value: 'name,asc', label: 'Namn (A–Ö)' },
  { value: 'abv,desc', label: 'Alkoholhalt (högst först)' },
  { value: 'updatedAt,desc', label: 'Senast ändrad' },
  { value: 'createdAt,desc', label: 'Senast tillagd' },
] as const

export const DEFAULT_SORT = SORT_OPTIONS[0].value

function optionalNumber(value: string | null): number | undefined {
  if (value === null) return undefined
  const parsed = parseNumberInput(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

export function parseFilters(params: URLSearchParams): InventoryFilters {
  const unitType = params.get('unitType')
  const sort = params.get('sort')
  const page = optionalNumber(params.get('page'))
  return {
    q: params.get('q') ?? '',
    categoryId: optionalNumber(params.get('categoryId')),
    unitType: unitType === 'VOLUME' || unitType === 'COUNT' ? unitType : undefined,
    lowStock: params.get('lowStock') === 'true',
    minAbv: optionalNumber(params.get('minAbv')),
    maxAbv: optionalNumber(params.get('maxAbv')),
    sort: SORT_OPTIONS.some((o) => o.value === sort) ? (sort as string) : DEFAULT_SORT,
    page: page !== undefined && page >= 1 ? Math.floor(page) : 1,
  }
}

export function toSearchParams(filters: InventoryFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.categoryId !== undefined) params.set('categoryId', String(filters.categoryId))
  if (filters.unitType) params.set('unitType', filters.unitType)
  if (filters.lowStock) params.set('lowStock', 'true')
  if (filters.minAbv !== undefined) params.set('minAbv', String(filters.minAbv))
  if (filters.maxAbv !== undefined) params.set('maxAbv', String(filters.maxAbv))
  if (filters.sort !== DEFAULT_SORT) params.set('sort', filters.sort)
  if (filters.page > 1) params.set('page', String(filters.page))
  return params
}

export function hasActiveFilters(filters: InventoryFilters): boolean {
  return Boolean(
    filters.q ||
    filters.categoryId !== undefined ||
    filters.unitType ||
    filters.lowStock ||
    filters.minAbv !== undefined ||
    filters.maxAbv !== undefined,
  )
}

/**
 * Filters live in the URL so a filtered view survives reloads and can be bookmarked.
 * Changing any filter other than the page resets to page 1.
 */
export function useInventoryFilters() {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => parseFilters(params), [params])

  const update = useCallback(
    (changes: Partial<InventoryFilters>) => {
      setParams(
        (current) => {
          const next = { ...parseFilters(current), ...changes }
          if (!('page' in changes)) next.page = 1
          return toSearchParams(next)
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const reset = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams])

  return { filters, update, reset }
}
