import { describe, expect, it } from 'vitest'
import { pickNext } from './surprise'

const drinks = [{ id: 1 }, { id: 2 }, { id: 3 }]

describe('pickNext', () => {
  it('returns null when there is nothing to pick from', () => {
    expect(pickNext([], [])).toBeNull()
  })

  it('shows every option once before repeating', () => {
    let shown: number[] = []
    const seen: number[] = []
    for (let i = 0; i < drinks.length; i++) {
      const next = pickNext(drinks, shown, Math.random)!
      seen.push(next.pick.id)
      shown = next.shown
    }
    expect([...seen].sort()).toEqual([1, 2, 3])
  })

  it('starts a new round without repeating the current one', () => {
    for (let i = 0; i < 20; i++) {
      const next = pickNext(drinks, [1, 2, 3], Math.random)!
      expect(next.pick.id).not.toBe(3)
      expect(next.shown).toEqual([next.pick.id])
    }
  })

  it('uses the random function to choose', () => {
    expect(pickNext(drinks, [], () => 0)!.pick.id).toBe(1)
    expect(pickNext(drinks, [], () => 0.99)!.pick.id).toBe(3)
    expect(pickNext(drinks, [1], () => 0)!.pick.id).toBe(2)
  })

  it('keeps showing the only option there is', () => {
    expect(pickNext([{ id: 7 }], [7])!.pick.id).toBe(7)
  })
})
