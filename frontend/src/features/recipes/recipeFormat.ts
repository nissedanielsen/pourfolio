import type { RecipeLine, Shortfall } from '../../api/client'

const number = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 2 })

/** A recipe line's amount as shown to the user, e.g. "3 cl", "2 stänk", "Fyll upp". */
export function formatRecipeAmount(amount: number | undefined, unit: RecipeLine['unit']): string {
  switch (unit) {
    case 'ML':
      return `${number.format((amount ?? 0) / 10)} cl`
    case 'DASH':
      return amount === 1 ? '1 stänk' : `${number.format(amount ?? 0)} stänk`
    case 'TSP':
      return `${number.format(amount ?? 0)} tsk`
    case 'PIECE':
      return `${number.format(amount ?? 0)} st`
    case 'TOP_UP':
      return 'Fyll upp'
  }
}

/** A compared amount: ml shown in cl, pieces in "st". */
export function formatMeasured(value: number, measure: Shortfall['measure']): string {
  return measure === 'PIECES' ? `${number.format(value)} st` : `${number.format(value / 10)} cl`
}

/** "Campari" or "Campari (har 2 cl, behöver 3 cl)". */
export function describeShortfall(shortfall: Shortfall): string {
  if (
    shortfall.status === 'NOT_ENOUGH' &&
    shortfall.available !== undefined &&
    shortfall.needed !== undefined
  ) {
    return `${shortfall.name} (har ${formatMeasured(shortfall.available, shortfall.measure)}, behöver ${formatMeasured(shortfall.needed, shortfall.measure)})`
  }
  return shortfall.name
}

/** "Räcker till 3 drinkar" / "Räcker till 1 drink" / "Kan göras". */
export function describeServings(servings: number | undefined): string {
  if (servings === undefined) return 'Kan göras'
  return servings === 1 ? 'Räcker till 1 drink' : `Räcker till ${servings} drinkar`
}
