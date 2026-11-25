import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap, type InventoryItemRequest } from '../../api/client'
import type { InventoryFilters } from './filters'

export const PAGE_SIZE = 50

const inventoryKey = ['inventory-items'] as const

export function useInventoryItems(filters: InventoryFilters) {
  const query = {
    q: filters.q || undefined,
    categoryId: filters.categoryId,
    unitType: filters.unitType,
    lowStock: filters.lowStock || undefined,
    minAbv: filters.minAbv,
    maxAbv: filters.maxAbv,
    sort: [filters.sort],
    page: filters.page - 1,
    size: PAGE_SIZE,
  }
  return useQuery({
    queryKey: [...inventoryKey, 'list', query],
    queryFn: () => unwrap(api.GET('/api/inventory-items', { params: { query } })),
    placeholderData: keepPreviousData,
  })
}

export function useInventoryItem(id: number, options: { enabled?: boolean } = {}) {
  return useQuery({
    enabled: options.enabled ?? true,
    queryKey: [...inventoryKey, 'detail', id],
    queryFn: () => unwrap(api.GET('/api/inventory-items/{id}', { params: { path: { id } } })),
  })
}

function useInvalidateInventory() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: inventoryKey })
}

export function useCreateItem() {
  const invalidate = useInvalidateInventory()
  return useMutation({
    mutationFn: (body: InventoryItemRequest) => unwrap(api.POST('/api/inventory-items', { body })),
    onSuccess: invalidate,
  })
}

export function useUpdateItem(id: number) {
  const invalidate = useInvalidateInventory()
  return useMutation({
    mutationFn: (body: InventoryItemRequest) =>
      unwrap(api.PUT('/api/inventory-items/{id}', { params: { path: { id } }, body })),
    onSuccess: invalidate,
  })
}

export function useUpdateRemaining() {
  const invalidate = useInvalidateInventory()
  return useMutation({
    mutationFn: ({ id, remaining }: { id: number; remaining: number }) =>
      unwrap(
        api.PATCH('/api/inventory-items/{id}/remaining', {
          params: { path: { id } },
          body: { remaining },
        }),
      ),
    onSuccess: invalidate,
  })
}

export function useDeleteItem() {
  const invalidate = useInvalidateInventory()
  return useMutation({
    mutationFn: (id: number) =>
      unwrap(api.DELETE('/api/inventory-items/{id}', { params: { path: { id } } })),
    onSuccess: invalidate,
  })
}
