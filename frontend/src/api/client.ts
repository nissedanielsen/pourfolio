// Base URL of the backend API. Empty in development (Vite proxies /api),
// set VITE_API_URL to the backend origin when the frontend is hosted separately (e.g. Vercel).
const baseUrl = import.meta.env.VITE_API_URL ?? ''

export function apiUrl(path: string): string {
  return `${baseUrl}${path}`
}
