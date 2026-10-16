import {
  Baby, Bike, Droplets, Dumbbell, Fence, HeartPulse, LayoutGrid, Leaf, Lightbulb, Mountain, Route, ShieldCheck, Sparkles, Sun,
  Trees, TrendingUp, Waves, Wifi, type LucideIcon,
} from 'lucide-react'
import { useSettings } from '@/context/SettingsContext'
import { Reveal, SectionHeading } from './Reveal'

// Ícones disponíveis para os diferenciais (lista enxuta para não carregar todo o pacote de ícones)
export const DIFFERENTIAL_ICONS: Record<string, LucideIcon> = {
  Trees, Mountain, LayoutGrid, HeartPulse, TrendingUp, Route, ShieldCheck, Waves, Sun, Bike, Dumbbell, Baby, Lightbulb, Droplets, Wifi, Fence, Leaf, Sparkles,
}

export function resolveIcon(name: string): LucideIcon {
  return DIFFERENTIAL_ICONS[name] ?? Sparkles
}

export function Differentials() {
  const { settings } = useSettings()
  const items = settings.differentials.filter((d) => d.visible)
  if (!items.length) return null
  return (
    <section id="diferenciais" className="relative overflow-hidden bg-forest-900 py-24 text-white sm:py-32">
      <div className="pointer-events-none absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-olive/20 blur-3xl" />
      <div className="container-luxe relative">
        <SectionHeading light align="center" eyebrow="Diferenciais" title={<>Pensado para <em className="text-gold">viver melhor</em></>} />
        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((d, i) => {
            const Icon = resolveIcon(d.icon)
            return (
              <Reveal key={i} delay={i * 0.07} className="group h-full">
                <div className="h-full rounded-2xl border border-white/10 bg-white/[0.03] p-8 transition duration-500 hover:-translate-y-1 hover:border-gold/50 hover:bg-white/[0.06]">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 text-gold transition group-hover:bg-gold group-hover:text-forest-900">
                    <Icon className="h-6 w-6" strokeWidth={1.4} />
                  </div>
                  <h3 className="mt-6 font-display text-2xl">{d.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/65">{d.description}</p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
