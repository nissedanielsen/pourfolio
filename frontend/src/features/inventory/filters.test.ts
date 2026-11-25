import { describe, expect, it } from 'vitest'
import { DEFAULT_SORT, parseFilters, toSearchParams } from './filters'

describe('inventory filters', () => {
  it('uses defaults for an empty URL', () => {
    expect(parseFilters(new URLSearchParams())).toEqual({
      q: '',
      categoryId: undefined,
      unitType: undefined,
      lowStock: false,
      minAbv: undefined,
      maxAbv: undefined,
      sort: DEFAULT_SORT,
      page: 1,
    })
  })

  it('round-trips through the URL', () => {
    const filters = {
      q: 'gin',
      categoryId: 3,
      unitType: 'VOLUME' as const,
      lowStock: true,
      minAbv: 37.5,
      maxAbv: 45,
      sort: 'abv,desc',
      page: 2,
    }
    expect(parseFilters(toSearchParams(filters))).toEqual(filters)
  })

  it('ignores invalid values', () => {
    const filters = parseFilters(
      new URLSearchParams('unitType=BOTTLE&sort=price,asc&page=-3&categoryId=x'),
    )
    expect(filters.unitType).toBeUndefined()
    expect(filters.sort).toBe(DEFAULT_SORT)
    expect(filters.page).toBe(1)
    expect(filters.categoryId).toBeUndefined()
  })
})
