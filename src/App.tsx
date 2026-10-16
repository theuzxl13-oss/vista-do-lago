import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { SettingsProvider } from '@/context/SettingsContext'
import { AuthProvider } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { SiteLayout } from '@/layouts/SiteLayout'
import { Spinner } from '@/components/ui'
import HomePage from '@/pages/site/HomePage'

const PrivacyPage = lazy(() => import('@/pages/site/PrivacyPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))
const AdminApp = lazy(() => import('@/pages/admin/AdminApp'))

export default function App() {
  return (
    <ToastProvider>
      <SettingsProvider>
        <AuthProvider>
          <Suspense fallback={<Spinner className="min-h-screen" />}>
            <Routes>
              <Route element={<SiteLayout />}>
                <Route index element={<HomePage />} />
                <Route path="privacidade" element={<PrivacyPage />} />
              </Route>
              <Route path="admin/*" element={<AdminApp />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </SettingsProvider>
    </ToastProvider>
  )
}
