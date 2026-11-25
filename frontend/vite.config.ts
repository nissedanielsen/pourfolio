/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // In development, /api calls go to the local Spring Boot backend.
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        // Proxied calls are same-origin from the browser's point of view; drop Origin so the
        // backend's CORS check (meant for separately hosted frontends) doesn't apply.
        configure: (proxy) => proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin')),
      },
    },
  },
  test: {
    environment: 'jsdom',
    // Playwright specs in e2e/ run separately via npm run e2e.
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
  },
})
