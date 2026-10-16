import { useEffect, useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  BarChart3, CalendarDays, ExternalLink, FileText, Images, KanbanSquare, LayoutDashboard, LogOut, Map, Menu, Settings, UserCog, Users, X,
} from 'lucide-react'
import { Button, Spinner } from '@/components/ui'
import { LogoMark } from '@/components/ui/icons'
import { useAuth } from '@/context/AuthContext'
import { backend, isDemoMode } from '@/services/backend'
import { cn, initials } from '@/lib/format'

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/leads', label: 'Leads', icon: Users },
  { to: '/admin/funil', label: 'Funil comercial', icon: KanbanSquare },
  { to: '/admin/lotes', label: 'Lotes', icon: Map },
  { to: '/admin/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/admin/propostas', label: 'Propostas', icon: FileText },
  { to: '/admin/corretores', label: 'Corretores', icon: UserCog, admin: true },
  { to: '/admin/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/admin/galeria', label: 'Galeria', icon: Images, admin: true },
  { to: '/admin/configuracoes', label: 'Configurações', icon: Settings, admin: true },
]

export function AdminLayout() {
  const { user, profile, loading, isAdmin, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => setOpen(false), [pathname])

  // Libera reservas vencidas ao abrir o painel (também pode ser agendado com pg_cron)
  useEffect(() => {
    if (profile?.active) backend.expireReservations().catch(() => undefined)
  }, [profile?.active])

  useEffect(() => {
    document.title = 'Painel — Vista do Lago'
    return () => { document.title = 'Vista do Lago — O lugar onde seus sonhos encontram a natureza' }
  }, [])

  if (loading) return <Spinner className="min-h-screen" />
  if (!user) return <Navigate to="/admin/login" replace state={{ from: pathname }} />
  if (!profile || !profile.active || (profile.role === 'broker' && !profile.broker_id)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand px-6">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-soft">
          <LogoMark className="mx-auto h-12 w-12 text-forest" />
          <h1 className="mt-4 font-display text-3xl text-forest">Acesso pendente</h1>
          <p className="mt-2 text-sm text-graphite-500">
            Seu usuário ({user.email}) foi autenticado, mas ainda não foi liberado ou vinculado a um corretor por um administrador.
          </p>
          <Button className="mt-6" variant="outline" onClick={() => void signOut()}>Sair</Button>
        </div>
      </div>
    )
  }

  const items = NAV.filter((n) => !n.admin || isAdmin)

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link to="/admin" className="flex items-center gap-3 px-6 py-6 text-gold">
        <LogoMark className="h-9 w-9" />
        <span className="leading-none">
          <span className="block whitespace-nowrap font-display text-lg tracking-[0.12em] text-white">VISTA DO LAGO</span>
          <span className="mt-1 block text-[9px] uppercase tracking-[0.36em] text-gold-300">CRM Imobiliário</span>
        </span>
      </Link>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3" aria-label="Menu do painel">
        {items.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}
            className={({ isActive }) => cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
              isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white')}>
            {({ isActive }) => <><n.icon className={cn('h-[18px] w-[18px]', isActive && 'text-gold')} />{n.label}</>}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <a href={import.meta.env.BASE_URL} target="_blank" rel="noopener noreferrer" className="mb-3 flex items-center gap-2 px-2 text-xs text-white/50 hover:text-white">
          <ExternalLink className="h-3.5 w-3.5" /> Ver site público
        </a>
        <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-xs font-bold text-forest-900">{initials(profile.full_name ?? user.email)}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{profile.full_name ?? user.email}</p>
            <p className="text-[11px] text-white/50">{isAdmin ? 'Administrador' : 'Corretor'}</p>
          </div>
          <button onClick={() => void signOut()} className="rounded p-1.5 text-white/50 hover:bg-white/10 hover:text-white" aria-label="Sair" title="Sair">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F7F5EF]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-forest lg:block">{sidebar}</aside>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
            <motion.aside className="absolute inset-y-0 left-0 w-72 bg-forest" initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}>
              <button className="absolute right-3 top-5 p-2 text-white/70" onClick={() => setOpen(false)} aria-label="Fechar menu"><X className="h-5 w-5" /></button>
              {sidebar}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-sand-300/70 bg-white/90 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} className="rounded p-1.5 text-forest" aria-label="Abrir menu"><Menu className="h-6 w-6" /></button>
          <span className="font-display text-lg tracking-[0.14em] text-forest">VISTA DO LAGO</span>
        </header>
        {isDemoMode && (
          <div className="border-b border-gold/40 bg-gold-100 px-4 py-2 text-center text-xs text-gold-700 sm:px-8">
            <strong>Modo demonstração:</strong> dados fictícios em memória — alterações somem ao recarregar. Configure o Supabase para uso real.
          </div>
        )}
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-8 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
