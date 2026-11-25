import type { UnitType } from '../api/client'

// The API stores VOLUME amounts in millilitres and COUNT amounts in pieces.
// The UI shows volumes in centilitres.

const displayFormat = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 1 })
const inputFormat = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 1, useGrouping: false })

export function mlToCl(ml: number): number {
  return ml / 10
}

export function clToMl(cl: number): number {
  return Math.round(cl * 10)
}

/** Converts an API amount to the unit shown in the UI (cl or pieces). */
export function toDisplayAmount(amount: number, unitType: UnitType): number {
  return unitType === 'VOLUME' ? mlToCl(amount) : amount
}

/** Converts an amount entered in the UI (cl or pieces) to the API unit (ml or pieces). */
export function fromDisplayAmount(amount: number, unitType: UnitType): number {
  return unitType === 'VOLUME' ? clToMl(amount) : Math.round(amount)
}

export function unitLabel(unitType: UnitType): string {
  return unitType === 'VOLUME' ? 'cl' : 'st'
}

/** Formats an API amount for display, e.g. "37,5 cl" or "4 st". */
export function formatAmount(amount: number, unitType: UnitType): string {
  return `${displayFormat.format(toDisplayAmount(amount, unitType))} ${unitLabel(unitType)}`
}

/** Formats a number for a text field, with Swedish decimal comma and no grouping. */
export function formatNumberInput(value: number | undefined): string {
  return value === undefined ? '' : inputFormat.format(value)
}

/** Parses user input that may use a decimal comma. Returns NaN for invalid input. */
export function parseNumberInput(value: string): number {
  const normalized = value.trim().replace(',', '.')
  if (normalized === '' || !/^-?\d+(\.\d+)?$/.test(normalized)) {
    return Number.NaN
  }
  return Number(normalized)
}

export function formatAbv(abv: number): string {
  return `${displayFormat.format(abv)} %`
}

/** Share left, 0–1. */
export function fillLevel(remaining: number, capacity: number): number {
  return capacity > 0 ? Math.min(1, Math.max(0, remaining / capacity)) : 0
}

/** Matches the backend's low-stock filter: at most a quarter left. */
export function isLowStock(remaining: number, capacity: number): boolean {
  return remaining * 4 <= capacity
}
