import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Spinner } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { AdminLayout } from '@/layouts/AdminLayout'
import LoginPage from './LoginPage'

const DashboardPage = lazy(() => import('./DashboardPage'))
const LeadsPage = lazy(() => import('./LeadsPage'))
const LeadDetailPage = lazy(() => import('./LeadDetailPage'))
const PipelinePage = lazy(() => import('./PipelinePage'))
const LotsPage = lazy(() => import('./LotsPage'))
const AgendaPage = lazy(() => import('./AgendaPage'))
const ProposalsPage = lazy(() => import('./ProposalsPage'))
const BrokersPage = lazy(() => import('./BrokersPage'))
const ReportsPage = lazy(() => import('./ReportsPage'))
const GalleryAdminPage = lazy(() => import('./GalleryAdminPage'))
const SettingsPage = lazy(() => import('./SettingsPage'))
const ResetPasswordPage = lazy(() => import('./ResetPasswordPage'))

function AdminOnly({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth()
  return isAdmin ? <>{children}</> : <Navigate to="/admin" replace />
}

export default function AdminApp() {
  return (
    <Suspense fallback={<Spinner className="min-h-screen" />}>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="redefinir-senha" element={<ResetPasswordPage />} />
        <Route element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="leads/:id" element={<LeadDetailPage />} />
          <Route path="funil" element={<PipelinePage />} />
          <Route path="lotes" element={<LotsPage />} />
          <Route path="agenda" element={<AgendaPage />} />
          <Route path="propostas" element={<ProposalsPage />} />
          <Route path="corretores" element={<AdminOnly><BrokersPage /></AdminOnly>} />
          <Route path="relatorios" element={<ReportsPage />} />
          <Route path="galeria" element={<AdminOnly><GalleryAdminPage /></AdminOnly>} />
          <Route path="configuracoes" element={<AdminOnly><SettingsPage /></AdminOnly>} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
