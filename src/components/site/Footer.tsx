import { Link } from 'react-router-dom'
import { LogoMark } from '@/components/ui/icons'
import { useSettings } from '@/context/SettingsContext'
import { BRAND } from '@/lib/constants'
import { NAV } from './Header'

export function Footer() {
  const { settings } = useSettings()
  const year = new Date().getFullYear()
  return (
    <footer className="bg-forest-900 text-white/70">
      <div className="container-luxe grid gap-10 py-16 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3 text-gold">
            <LogoMark className="h-11 w-11" />
            <span className="font-display text-2xl tracking-[0.18em] text-white">VISTA DO LAGO</span>
          </div>
          <p className="mt-5 max-w-sm font-display text-xl italic text-white/80">“{BRAND.slogan}”</p>
        </div>
        <nav aria-label="Rodapé">
          <p className="text-[11px] font-semibold uppercase tracking-luxe text-gold">Navegação</p>
          <ul className="mt-4 space-y-2 text-sm">
            {NAV.map((n) => <li key={n.href}><Link to={{ pathname: '/', hash: n.href }} className="hover:text-white">{n.label}</Link></li>)}
          </ul>
        </nav>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-luxe text-gold">Institucional</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link to="/privacidade" className="hover:text-white">Política de Privacidade (LGPD)</Link></li>
            <li><Link to="/admin" className="hover:text-white">Área do corretor</Link></li>
            {settings.contact.instagram && <li><a href={settings.contact.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-white">Instagram</a></li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-luxe flex flex-col gap-2 py-6 text-xs text-white/45 sm:flex-row sm:justify-between">
          <p>© {year} {settings.privacy.controller_name || 'Vista do Lago'}. Todos os direitos reservados.</p>
          <p>Imagens ilustrativas. Informações sujeitas a alteração sem aviso prévio.</p>
        </div>
      </div>
    </footer>
  )
}
