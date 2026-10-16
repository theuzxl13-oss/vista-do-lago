import { Maximize, Grid3x3, Ruler, Trees, MapPin, Building2, type LucideIcon } from 'lucide-react'
import { useSettings } from '@/context/SettingsContext'
import { assetUrl } from '@/lib/format'
import { Reveal, SectionHeading } from './Reveal'

const ICONS: Record<string, LucideIcon> = {
  total_area: Maximize, lots: Grid3x3, sizes: Ruler, green: Trees, location: MapPin, infra: Building2,
}

export function About({ lotsCount, planIsDemo }: { lotsCount: number; planIsDemo: boolean }) {
  const { settings } = useSettings()
  const { about, stats } = settings
  const cards = stats.filter((s) => s.visible)

  return (
    <section id="sobre" className="relative overflow-hidden bg-sand py-24 sm:py-32">
      <div className="container-luxe grid gap-16 lg:grid-cols-[1.05fr_1fr] lg:items-center">
        <div>
          <SectionHeading eyebrow="O empreendimento" title={about.title} />
          <Reveal delay={0.1} className="mt-8 space-y-5 text-[15px] leading-relaxed text-graphite-500">
            {about.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
          </Reveal>
          <Reveal delay={0.2} className="mt-10 flex flex-wrap gap-4">
            <a href="#lotes" className="inline-flex h-12 items-center rounded-full bg-forest px-7 text-sm font-semibold text-white transition hover:bg-forest-600">Ver lotes disponíveis</a>
            <a href="#contato" className="inline-flex h-12 items-center rounded-full border border-forest/25 px-7 text-sm font-semibold text-forest transition hover:border-forest">Agendar uma visita</a>
          </Reveal>
        </div>
        <Reveal delay={0.15} className="relative">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-soft sm:aspect-[5/4] lg:aspect-[4/5]">
            <img src={assetUrl('demo/gallery/perspectiva.svg')} alt="Ilustração conceitual do empreendimento" loading="lazy" className="h-full w-full object-cover" />
            <span className="absolute bottom-4 left-4 rounded-full bg-black/30 px-3 py-1 text-[10px] uppercase tracking-widest text-white backdrop-blur">Imagem ilustrativa</span>
          </div>
          <div className="absolute -bottom-8 -left-4 hidden rounded-2xl bg-forest px-7 py-6 text-white shadow-soft sm:block">
            <p className="font-display text-4xl text-gold">Natureza</p>
            <p className="mt-1 text-xs uppercase tracking-luxe text-white/70">como vizinhança</p>
          </div>
        </Reveal>
      </div>

      <div className="container-luxe mt-24">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-sand-300 bg-sand-300 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c, i) => {
            const Icon = ICONS[c.key] ?? Grid3x3
            let value = c.value
            let hint = c.hint
            if (!value && c.key === 'lots' && lotsCount > 0) {
              value = `${lotsCount} lotes`
              hint = planIsDemo ? 'Planta demonstrativa — sujeito à planta oficial' : c.hint
            }
            return (
              <Reveal key={c.key} delay={i * 0.06} y={16} className="group bg-white p-8 transition-colors hover:bg-forest">
                <Icon className="h-6 w-6 text-gold-700 transition-colors group-hover:text-gold" strokeWidth={1.4} />
                <p className="mt-6 text-[11px] font-semibold uppercase tracking-widest text-graphite-400 transition-colors group-hover:text-white/60">{c.label}</p>
                <p className={`mt-2 font-display text-3xl transition-colors group-hover:text-white ${value ? 'text-forest' : 'italic text-olive'}`}>
                  {value || hint || 'A confirmar'}
                </p>
                {value && hint && <p className="mt-1 text-xs text-graphite-400 transition-colors group-hover:text-white/60">{hint}</p>}
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
