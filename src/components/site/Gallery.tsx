import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { gsap, useGsap } from '@/lib/gsap'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react'
import { backend } from '@/services/backend'
import { useAsync } from '@/hooks/useAsync'
import { MEDIA_CATEGORY_LABEL } from '@/lib/constants'
import { assetUrl, cn } from '@/lib/format'
import type { MediaCategory, MediaItem } from '@/types'
import { SectionHeading } from './Reveal'

export function Gallery() {
  const { data, loading } = useAsync(() => backend.list('media', { eq: { published: true }, order: { column: 'sort_order' } }))
  const [filter, setFilter] = useState<MediaCategory | 'all'>('all')
  const [lightbox, setLightbox] = useState<number | null>(null)
  const track = useRef<HTMLDivElement>(null)

  const items = useMemo(() => (data ?? []).filter((m) => !m.lot_id && (filter === 'all' || m.category === filter)), [data, filter])
  const categories = useMemo(() => {
    const set = new Set((data ?? []).filter((m) => !m.lot_id).map((m) => m.category))
    return (Object.keys(MEDIA_CATEGORY_LABEL) as MediaCategory[]).filter((c) => set.has(c))
  }, [data])

  const scroll = (dir: 1 | -1) => {
    const el = track.current
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' })
  }

  useEffect(() => {
    track.current?.scrollTo({ left: 0 })
  }, [filter])

  // Revelação das fotos: o cartão sobe de dentro de uma máscara e a imagem desfaz um zoom discreto
  const section = useRef<HTMLElement>(null)
  useGsap(section, ({ reduce }, el) => {
    if (reduce) return
    const cards = gsap.utils.toArray<HTMLElement>('[data-card]', el)
    if (!cards.length) return
    gsap.fromTo(cards, { y: 70, opacity: 0 }, {
      y: 0, opacity: 1, duration: 1.3, stagger: 0.12, ease: 'expo.out',
      scrollTrigger: { trigger: track.current, start: 'top 85%', once: true },
    })
    gsap.fromTo(gsap.utils.toArray('[data-card-media]', el), { scale: 1.25 }, {
      scale: 1, duration: 1.8, stagger: 0.12, ease: 'power3.out',
      scrollTrigger: { trigger: track.current, start: 'top 85%', once: true },
    })
  }, [items.length, filter])

  return (
    <section ref={section} id="galeria" className="bg-forest py-24 text-white sm:py-32">
      <div className="container-luxe">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <SectionHeading light eyebrow="Galeria" title={<>Paisagens que inspiram <em className="text-gold">novos começos</em></>} />
          <div className="flex gap-2">
            <button onClick={() => scroll(-1)} className="rounded-full border border-white/25 p-3 transition hover:border-gold hover:text-gold" aria-label="Imagens anteriores"><ChevronLeft className="h-5 w-5" /></button>
            <button onClick={() => scroll(1)} className="rounded-full border border-white/25 p-3 transition hover:border-gold hover:text-gold" aria-label="Próximas imagens"><ChevronRight className="h-5 w-5" /></button>
          </div>
        </div>

        {categories.length > 1 && (
          <div className="mt-10 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Filtrar por categoria">
            {(['all', ...categories] as const).map((c) => (
              <button key={c} role="tab" aria-selected={filter === c} onClick={() => setFilter(c)}
                className={cn('whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wider transition',
                  filter === c ? 'border-gold bg-gold text-forest-900' : 'border-white/20 text-white/70 hover:border-white/50 hover:text-white')}>
                {c === 'all' ? 'Todas' : MEDIA_CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div ref={track} className="mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-5 pb-6 scroll-px-5 sm:px-8 sm:scroll-px-8 lg:px-[max(2rem,calc((100vw-80rem)/2+2rem))] lg:scroll-px-[max(2rem,calc((100vw-80rem)/2+2rem))] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {loading && Array.from({ length: 3 }).map((_, i) => <div key={i} className="aspect-[4/3] w-[82vw] shrink-0 animate-pulse rounded-2xl bg-white/10 sm:w-[46vw] lg:w-[34rem]" />)}
        {!loading && items.length === 0 && <p className="text-white/60">Novas imagens serão publicadas em breve.</p>}
        {items.map((m, i) => (
          <button
            key={m.id} data-card onClick={() => setLightbox(i)}
            className={cn('group relative shrink-0 snap-start overflow-hidden rounded-2xl text-left',
              i % 3 === 0 ? 'aspect-[4/3] w-[82vw] sm:w-[52vw] lg:w-[38rem]' : 'aspect-[4/3] w-[72vw] sm:w-[40vw] lg:w-[28rem]')}
            aria-label={`Ampliar: ${m.title}`}
          >
            <div data-card-media className="h-full w-full will-change-transform">
              <img src={assetUrl(m.url)} alt={m.title} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-[1200ms] ease-out group-hover:scale-[1.06]" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-forest-900/85 via-transparent to-transparent opacity-90" />
            <MediaBadge item={m} className="absolute left-4 top-4" />
            <Expand className="absolute right-4 top-4 h-5 w-5 text-white opacity-0 transition group-hover:opacity-100" />
            <div className="absolute inset-x-5 bottom-5 transition-transform duration-500 group-hover:-translate-y-1">
              <p className="text-[10px] uppercase tracking-luxe text-gold-300">{MEDIA_CATEGORY_LABEL[m.category]}</p>
              <p className="mt-1 font-display text-2xl">{m.title}</p>
              <span className="mt-2 block h-px w-0 bg-gold transition-all duration-500 group-hover:w-16" />
            </div>
          </button>
        ))}
      </div>

      <Lightbox items={items} index={lightbox} onClose={() => setLightbox(null)} onIndex={setLightbox} />
    </section>
  )
}

export function MediaBadge({ item, className }: { item: Pick<MediaItem, 'is_illustrative'>; className?: string }) {
  return (
    <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest backdrop-blur',
      item.is_illustrative ? 'bg-black/35 text-white' : 'bg-gold/90 text-forest-900', className)}>
      {item.is_illustrative ? 'Imagem ilustrativa' : 'Foto real'}
    </span>
  )
}

function Lightbox({ items, index, onClose, onIndex }: { items: MediaItem[]; index: number | null; onClose: () => void; onIndex: (i: number) => void }) {
  const go = useCallback((d: number) => {
    if (index == null) return
    onIndex((index + d + items.length) % items.length)
  }, [index, items.length, onIndex])

  useEffect(() => {
    if (index == null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [index, go, onClose])

  const touchX = useRef<number | null>(null)
  const item = index != null ? items[index] : null

  return (
    <AnimatePresence>
      {item && (
        <motion.div className="fixed inset-0 z-[90] flex flex-col bg-forest-900/95 backdrop-blur" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          role="dialog" aria-modal="true" aria-label={item.title}
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current == null) return
            const dx = e.changedTouches[0].clientX - touchX.current
            if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
            touchX.current = null
          }}>
          <div className="flex items-center justify-between px-5 py-4 text-white">
            <p className="text-sm text-white/70">{(index ?? 0) + 1} / {items.length}</p>
            <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10" aria-label="Fechar"><X className="h-6 w-6" /></button>
          </div>
          <div className="relative flex flex-1 items-center justify-center px-4 sm:px-16">
            <AnimatePresence mode="wait">
              <motion.img key={item.id} src={assetUrl(item.url)} alt={item.title}
                initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="max-h-[72vh] max-w-full rounded-xl object-contain shadow-2xl" />
            </AnimatePresence>
            <button onClick={() => go(-1)} className="absolute left-2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 sm:left-6" aria-label="Anterior"><ChevronLeft className="h-6 w-6" /></button>
            <button onClick={() => go(1)} className="absolute right-2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 sm:right-6" aria-label="Próxima"><ChevronRight className="h-6 w-6" /></button>
          </div>
          <div className="px-5 pb-8 pt-4 text-center text-white">
            <MediaBadge item={item} />
            <p className="mt-3 font-display text-3xl">{item.title}</p>
            {item.caption && <p className="mt-1 text-sm text-white/60">{item.caption}</p>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
