import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Menu, X } from 'lucide-react'
import { LogoMark } from '@/components/ui/icons'
import { cn } from '@/lib/format'

export const NAV = [
  { href: '#sobre', label: 'O empreendimento' },
  { href: '#galeria', label: 'Galeria' },
  { href: '#lotes', label: 'Lotes' },
  { href: '#localizacao', label: 'Localização' },
  { href: '#diferenciais', label: 'Diferenciais' },
  { href: '#contato', label: 'Contato' },
]

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const onHome = pathname === '/'
  const solid = scrolled || !onHome || open

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setOpen(false), [pathname])


  return (
    <header className={cn('fixed inset-x-0 top-0 z-50 transition-all duration-500',
      solid ? 'bg-forest/95 shadow-lg shadow-forest-900/10 backdrop-blur-md' : 'bg-gradient-to-b from-forest-900/50 to-transparent')}>
      <div className={cn('container-luxe flex items-center justify-between transition-all duration-500', solid ? 'h-16' : 'h-20 sm:h-24')}>
        <Link to="/" className="flex items-center gap-3 text-gold" aria-label="Vista do Lago — início">
          <LogoMark className="h-9 w-9 sm:h-10 sm:w-10" />
          <span className="leading-none">
            <span className="block font-display text-xl tracking-[0.18em] text-white sm:text-2xl">VISTA DO LAGO</span>
            <span className="mt-1 block text-[9px] uppercase tracking-[0.42em] text-gold-300">Loteamento</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Navegação principal">
          {NAV.map((n) => (
            <Link key={n.href} to={{ pathname: '/', hash: n.href }} className="group relative text-[13px] font-medium tracking-wide text-white/85 transition hover:text-white">
              {n.label}
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-gold transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
          <Link to={{ pathname: '/', hash: '#contato' }} className="rounded-full border border-gold/70 px-5 py-2 text-[13px] font-semibold text-gold transition hover:bg-gold hover:text-forest-900">
            Fale com um consultor
          </Link>
        </nav>

        <button className="rounded-full p-2 text-white lg:hidden" onClick={() => setOpen((o) => !o)} aria-label={open ? 'Fechar menu' : 'Abrir menu'} aria-expanded={open}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/10 bg-forest lg:hidden" aria-label="Navegação móvel"
          >
            <div className="container-luxe flex flex-col py-4">
              {NAV.map((n) => (
                <Link key={n.href} to={{ pathname: '/', hash: n.href }} onClick={() => setOpen(false)} className="border-b border-white/5 py-3.5 font-display text-2xl text-white/90">
                  {n.label}
                </Link>
              ))}
              <Link to={{ pathname: '/', hash: '#contato' }} onClick={() => setOpen(false)} className="mt-5 rounded-full bg-gold py-3 text-center text-sm font-semibold text-forest-900">
                Fale com um consultor
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}
