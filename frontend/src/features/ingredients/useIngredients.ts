import { useQuery } from '@tanstack/react-query'
import { api, unwrap, type Ingredient } from '../../api/client'

export function useIngredients() {
  return useQuery({
    queryKey: ['ingredients'],
    queryFn: () => unwrap(api.GET('/api/ingredients')),
    // Ingredients are fixed seed data.
    staleTime: Infinity,
  })
}

/** The part of an ingredient name used for matching, e.g. "Lime" in "Lime / limejuice". */
function matchName(ingredient: Ingredient): string {
  return ingredient.name.split(' / ')[0].toLowerCase()
}

/**
 * Guesses the ingredient from an item's name within its category, e.g. "Campari Bitter"
 * → Campari. Returns undefined unless exactly one ingredient matches.
 */
export function guessIngredient(
  ingredients: Ingredient[],
  categoryId: number,
  itemName: string,
): Ingredient | undefined {
  const name = itemName.trim().toLowerCase()
  if (!name) return undefined
  const matches = ingredients.filter(
    (ingredient) => ingredient.categoryId === categoryId && name.includes(matchName(ingredient)),
  )
  return matches.length === 1 ? matches[0] : undefined
}
