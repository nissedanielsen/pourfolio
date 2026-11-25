import { useQuery } from '@tanstack/react-query'
import { api, unwrap, type Category } from '../../api/client'

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => unwrap(api.GET('/api/categories')),
    // Categories are fixed seed data.
    staleTime: Infinity,
  })
}

/** Flattens the tree into a lookup of subcategory id to "Parent › Child" label. */
export function categoryPath(categories: Category[], id: number): string | undefined {
  for (const top of categories) {
    if (top.id === id) return top.name
    const child = top.children.find((c) => c.id === id)
    if (child) return `${top.name} › ${child.name}`
  }
  return undefined
}
