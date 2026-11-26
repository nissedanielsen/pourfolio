import type { ReactNode } from 'react'
import type { RouteObject } from 'react-router'
import { LoginPage } from './auth/LoginPage'
import { RequireAuth } from './auth/RequireAuth'
import { AppLayout } from './components/AppLayout'
import { InventoryPage } from './features/inventory/InventoryPage'
import { ItemFormPage } from './features/inventory/ItemFormPage'
import { DrinksPage } from './features/recipes/DrinksPage'
import { RecipeDetailPage } from './features/recipes/RecipeDetailPage'

const signedIn = (page: ReactNode) => <RequireAuth>{page}</RequireAuth>

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { path: 'login', element: <LoginPage /> },
      { index: true, element: signedIn(<InventoryPage />) },
      { path: 'items/new', element: signedIn(<ItemFormPage />) },
      { path: 'items/:id', element: signedIn(<ItemFormPage />) },
      { path: 'drinks', element: signedIn(<DrinksPage />) },
      { path: 'drinks/:id', element: signedIn(<RecipeDetailPage />) },
    ],
  },
]
