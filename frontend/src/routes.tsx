import type { RouteObject } from 'react-router'
import { LoginPage } from './auth/LoginPage'
import { RequireAuth } from './auth/RequireAuth'
import { AppLayout } from './components/AppLayout'
import { InventoryPage } from './features/inventory/InventoryPage'
import { ItemFormPage } from './features/inventory/ItemFormPage'

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { path: 'login', element: <LoginPage /> },
      {
        index: true,
        element: (
          <RequireAuth>
            <InventoryPage />
          </RequireAuth>
        ),
      },
      {
        path: 'items/new',
        element: (
          <RequireAuth>
            <ItemFormPage />
          </RequireAuth>
        ),
      },
      {
        path: 'items/:id',
        element: (
          <RequireAuth>
            <ItemFormPage />
          </RequireAuth>
        ),
      },
    ],
  },
]
