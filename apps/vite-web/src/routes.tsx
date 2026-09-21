import { createBrowserRouter, Navigate } from 'react-router'
import { runtime } from './i18n'
import { LocaleGuard } from './locale-guard'
import { Home } from './pages/Home'
import { Settings } from './pages/Settings'

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to={`/${runtime.config.defaultLocale}`} replace /> },
  {
    path: '/:lng',
    element: (
      <LocaleGuard>
        <Home />
      </LocaleGuard>
    ),
  },
  {
    path: '/:lng/settings',
    element: (
      <LocaleGuard>
        <Settings />
      </LocaleGuard>
    ),
  },
])
