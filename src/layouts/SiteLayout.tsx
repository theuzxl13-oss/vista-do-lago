import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Outlet, useLocation } from 'react-router-dom'
import { Header } from '@/components/site/Header'
import { Footer } from '@/components/site/Footer'
import { WhatsAppFloat } from '@/components/site/WhatsAppFloat'
import { isDemoMode } from '@/services/backend'

/** Rola até a seção indicada no hash (inclusive vindo de outra página) ou ao topo. */
function ScrollManager() {
  const { pathname, hash, key } = useLocation()
  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0 })
      return
    }
    let tries = 0
    const tick = () => {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)))
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      else if (tries++ < 20) setTimeout(tick, 100)
    }
    tick()
  }, [pathname, hash, key])
  return null
}

export function SiteLayout() {
  const [demoNotice, setDemoNotice] = useState(isDemoMode)
  return (
    <>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-white focus:px-4 focus:py-2">
        Pular para o conteúdo
      </a>
      <ScrollManager />
      <Header />
      <main id="conteudo">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppFloat />
      {demoNotice && (
        <div className="fixed bottom-5 left-5 z-40 flex max-w-[230px] items-start gap-2 rounded-lg bg-graphite/85 px-3 py-2 text-[11px] leading-snug text-white shadow-lg backdrop-blur sm:bottom-7 sm:left-7">
          <p><strong className="text-gold">Modo demonstração</strong> — dados ilustrativos, sem banco conectado.</p>
          <button onClick={() => setDemoNotice(false)} aria-label="Fechar aviso" className="text-white/60 hover:text-white"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}
    </>
  )
}
