import { describe, expect, it } from 'vitest'
import {
  clToMl,
  formatAmount,
  formatNumberInput,
  fromDisplayAmount,
  isLowStock,
  parseNumberInput,
} from './units'

describe('units', () => {
  it('converts between cl and ml', () => {
    expect(clToMl(70)).toBe(700)
    expect(clToMl(37.5)).toBe(375)
    expect(fromDisplayAmount(37.5, 'VOLUME')).toBe(375)
    expect(fromDisplayAmount(4, 'COUNT')).toBe(4)
  })

  it('formats amounts with Swedish decimals and units', () => {
    expect(formatAmount(375, 'VOLUME')).toBe('37,5 cl')
    expect(formatAmount(700, 'VOLUME')).toBe('70 cl')
    expect(formatAmount(4, 'COUNT')).toBe('4 st')
  })

  it('parses numbers with decimal comma or point', () => {
    expect(parseNumberInput('37,5')).toBe(37.5)
    expect(parseNumberInput(' 40.1 ')).toBe(40.1)
    expect(parseNumberInput('40,')).toBeNaN()
    expect(parseNumberInput('abc')).toBeNaN()
    expect(parseNumberInput('')).toBeNaN()
  })

  it('formats input values without grouping', () => {
    expect(formatNumberInput(1000)).toBe('1000')
    expect(formatNumberInput(17.5)).toBe('17,5')
    expect(formatNumberInput(undefined)).toBe('')
  })

  it('treats a quarter or less as low stock', () => {
    expect(isLowStock(175, 700)).toBe(true)
    expect(isLowStock(176, 700)).toBe(false)
    expect(isLowStock(0, 700)).toBe(true)
  })
})
