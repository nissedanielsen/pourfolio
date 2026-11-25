import createClient from 'openapi-fetch'
import type { components, paths } from './schema'

export type Schemas = components['schemas']
export type InventoryItem = Schemas['InventoryItemResponse']
export type InventoryItemRequest = Schemas['InventoryItemRequest']
export type InventoryItemPage = Schemas['PageResponseInventoryItemResponse']
export type Category = Schemas['CategoryResponse']
export type UnitType = InventoryItem['unitType']

// Backend origin. Unset in development (Vite proxies /api to the local backend);
// set VITE_API_URL when the frontend is hosted separately (e.g. on Vercel).
const baseUrl = import.meta.env.VITE_API_URL || window.location.origin

export const api = createClient<paths>({
  baseUrl,
  // Look up fetch per call (not at import time) so test mocks can intercept it.
  fetch: (request) => globalThis.fetch(request),
})

/** An error response from the backend, parsed from RFC 9457 problem details. */
export class ApiError extends Error {
  readonly status: number
  /** Field name to (English) backend message, for validation errors. */
  readonly fieldErrors: Record<string, string>

  constructor(status: number, detail: string | undefined, fieldErrors: Record<string, string>) {
    super(detail ?? `Request failed with status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

interface FetchResult<T> {
  data?: T
  error?: unknown
  response: Response
}

/** Returns the response data, or throws an {@link ApiError} for non-2xx responses. */
export async function unwrap<T>(request: Promise<FetchResult<T>>): Promise<T> {
  const { data, error, response } = await request
  if (!response.ok) {
    const problem = (error ?? {}) as { detail?: string; errors?: Record<string, string> }
    throw new ApiError(response.status, problem.detail, problem.errors ?? {})
  }
  return data as T
}
