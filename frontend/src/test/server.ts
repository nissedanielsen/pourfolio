import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { Category, InventoryItem, InventoryItemRequest } from '../api/client'

export const categories: Category[] = [
  {
    id: 1,
    code: 'spirits',
    name: 'Sprit',
    children: [
      { id: 11, code: 'gin', name: 'Gin', children: [] },
      { id: 12, code: 'vodka', name: 'Vodka', children: [] },
    ],
  },
  {
    id: 2,
    code: 'fresh',
    name: 'Färskvaror',
    children: [{ id: 21, code: 'citrus', name: 'Citrus', children: [] }],
  },
]

export function makeItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 1,
    category: { id: 11, code: 'gin', name: 'Gin', parentId: 1 },
    name: 'Tanqueray London Dry',
    brand: 'Tanqueray',
    abv: 43.1,
    unitType: 'VOLUME',
    capacity: 700,
    remaining: 520,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

/** A tiny in-memory backend good enough for UI tests. */
export function createFakeBackend(initial: InventoryItem[]) {
  let items = [...initial]
  let nextId = Math.max(0, ...items.map((i) => i.id)) + 1
  const requests: { method: string; url: URL; body?: unknown }[] = []

  const handlers = [
    http.get('*/api/categories', () => HttpResponse.json(categories)),
    http.get('*/api/inventory-items', ({ request }) => {
      const url = new URL(request.url)
      requests.push({ method: 'GET', url })
      const q = url.searchParams.get('q')?.toLowerCase()
      const content = items
        .filter((i) => !q || i.name.toLowerCase().includes(q))
        .sort((a, b) => a.name.localeCompare(b.name))
      return HttpResponse.json({
        content,
        page: 0,
        size: 50,
        totalElements: content.length,
        totalPages: content.length > 0 ? 1 : 0,
      })
    }),
    http.post('*/api/inventory-items', async ({ request }) => {
      const body = (await request.json()) as InventoryItemRequest
      requests.push({ method: 'POST', url: new URL(request.url), body })
      const category = categories.flatMap((c) => c.children).find((c) => c.id === body.categoryId)!
      const item = makeItem({
        ...body,
        id: nextId++,
        category: { id: category.id, code: category.code, name: category.name },
      })
      items.push(item)
      return HttpResponse.json(item, { status: 201 })
    }),
    http.delete('*/api/inventory-items/:id', ({ params, request }) => {
      requests.push({ method: 'DELETE', url: new URL(request.url) })
      items = items.filter((i) => i.id !== Number(params.id))
      return new HttpResponse(null, { status: 204 })
    }),
  ]

  return { handlers, requests }
}

export const server = setupServer()
