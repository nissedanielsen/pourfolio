import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '../../api/client'

export interface Deduction {
  itemId: number
  /** In the item's unit: ml for VOLUME, pieces for COUNT. */
  amount: number
}

/** What making the recipe would take from which item. */
export function useMakePlan(recipeId: number, servings: number) {
  return useQuery({
    queryKey: ['recipes', 'make-plan', recipeId, servings],
    queryFn: () =>
      unwrap(
        api.GET('/api/recipes/{id}/make-plan', {
          params: { path: { id: recipeId }, query: { servings } },
        }),
      ),
    placeholderData: keepPreviousData,
    // Always plan from the latest inventory.
    staleTime: 0,
  })
}

/** Refreshes everything that depends on what's at home. */
export function useRefreshInventory() {
  const queryClient = useQueryClient()
  return async () => {
    await queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
    await queryClient.invalidateQueries({ queryKey: ['recipes'] })
  }
}

export function useMakeDrink(recipeId: number) {
  const refresh = useRefreshInventory()
  return useMutation({
    mutationFn: (body: { servings: number; deductions: Deduction[] }) =>
      unwrap(api.POST('/api/recipes/{id}/make', { params: { path: { id: recipeId } }, body })),
    onSuccess: refresh,
  })
}

/** Undo as a plain function: it runs from a toast after the dialog has closed. */
export async function undoDrink(drinkLogId: number): Promise<void> {
  await unwrap(api.POST('/api/drink-log/{id}/undo', { params: { path: { id: drinkLogId } } }))
}
