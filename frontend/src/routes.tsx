import type { RouteObject } from 'react-router'
import { AppLayout } from './components/AppLayout'
import { InventoryPage } from './features/inventory/InventoryPage'
import { ItemFormPage } from './features/inventory/ItemFormPage'

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <InventoryPage /> },
      { path: 'items/new', element: <ItemFormPage /> },
      { path: 'items/:id', element: <ItemFormPage /> },
    ],
  },
]
