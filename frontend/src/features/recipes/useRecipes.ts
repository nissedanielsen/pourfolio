import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '../../api/client'

export type RecipeFilter = 'CAN_MAKE' | 'MISSING_ONE' | 'ALL'

const recipesKey = ['recipes'] as const

export function useRecipes(filter: RecipeFilter) {
  return useQuery({
    queryKey: [...recipesKey, 'list', filter],
    queryFn: () => unwrap(api.GET('/api/recipes', { params: { query: { filter } } })),
  })
}

export function useRecipe(id: number) {
  return useQuery({
    queryKey: [...recipesKey, 'detail', id],
    queryFn: () => unwrap(api.GET('/api/recipes/{id}', { params: { path: { id } } })),
  })
}

export function useShoppingSuggestions() {
  return useQuery({
    queryKey: [...recipesKey, 'shopping-suggestions'],
    queryFn: () => unwrap(api.GET('/api/recipes/shopping-suggestions')),
  })
}
