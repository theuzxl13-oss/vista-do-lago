import { lazy, Suspense } from 'react'
import { MapPin, Navigation, Route, Milestone, Landmark } from 'lucide-react'
import { useSettings } from '@/context/SettingsContext'
import { Spinner } from '@/components/ui'
import { Reveal, SectionHeading } from './Reveal'

const LeafletMap = lazy(() => import('./LeafletMap'))

export function Location() {
  const { settings } = useSettings()
  const loc = settings.location
  const hasCoords = loc.latitude != null && loc.longitude != null
  const fullAddress = [loc.address, loc.city, loc.state].filter(Boolean).join(', ')
  const destination = hasCoords ? `${loc.latitude},${loc.longitude}` : fullAddress
  const directions = destination ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}` : null

  return (
    <section id="localizacao" className="bg-sand py-24 sm:py-32">
      <div className="container-luxe grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:items-start">
        <div>
          <SectionHeading eyebrow="Localização" title={<>Perto do que importa,<br /><em>longe do excesso.</em></>} />
          <Reveal delay={0.1} className="mt-10 space-y-7">
            <Item icon={<MapPin className="h-5 w-5" />} title="Endereço">
              {fullAddress || <span className="italic text-olive">Endereço será divulgado em breve.</span>}
            </Item>
            {loc.access_roads.length > 0 && (
              <Item icon={<Route className="h-5 w-5" />} title="Vias de acesso">{loc.access_roads.join(' · ')}</Item>
            )}
            {loc.highways.length > 0 && (
              <Item icon={<Milestone className="h-5 w-5" />} title="Rodovias próximas">{loc.highways.join(' · ')}</Item>
            )}
            {loc.points_of_interest.length > 0 && (
              <Item icon={<Landmark className="h-5 w-5" />} title="Pontos de interesse e distâncias">
                <ul className="mt-1 divide-y divide-sand-300">
                  {loc.points_of_interest.map((p, i) => (
                    <li key={i} className="flex justify-between gap-4 py-2"><span>{p.name}</span><span className="font-semibold text-forest">{p.distance}</span></li>
                  ))}
                </ul>
              </Item>
            )}
            {directions ? (
              <a href={directions} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-full bg-forest px-7 text-sm font-semibold text-white transition hover:bg-forest-600">
                <Navigation className="h-4 w-4" /> Como chegar
              </a>
            ) : (
              <a href="#contato" className="inline-flex h-12 items-center gap-2 rounded-full border border-forest/25 px-7 text-sm font-semibold text-forest transition hover:border-forest">
                <Navigation className="h-4 w-4" /> Solicitar localização
              </a>
            )}
          </Reveal>
        </div>
        <Reveal delay={0.15} className="relative h-[420px] overflow-hidden rounded-[1.75rem] border border-sand-300 shadow-soft sm:h-[520px]">
          {hasCoords ? (
            <Suspense fallback={<Spinner className="h-full" label="Carregando mapa…" />}>
              <LeafletMap lat={loc.latitude!} lng={loc.longitude!} zoom={loc.zoom || 14} label={fullAddress || 'Vista do Lago'} />
            </Suspense>
          ) : (
            <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-forest p-10 text-center text-white">
              <svg className="absolute inset-0 h-full w-full opacity-[0.12]" aria-hidden="true">
                <defs><pattern id="topo" width="120" height="120" patternUnits="userSpaceOnUse">
                  <path d="M0 60 Q30 30 60 60 T120 60 M0 90 Q30 60 60 90 T120 90 M0 30 Q30 0 60 30 T120 30" stroke="#C6A76A" fill="none" />
                </pattern></defs>
                <rect width="100%" height="100%" fill="url(#topo)" />
              </svg>
              <MapPin className="relative h-12 w-12 text-gold" strokeWidth={1.2} />
              <p className="relative mt-5 font-display text-3xl">Localização em breve</p>
              <p className="relative mt-2 max-w-sm text-sm text-white/70">
                O mapa será exibido assim que as coordenadas oficiais do empreendimento forem cadastradas no painel administrativo.
              </p>
            </div>
          )}
        </Reveal>
      </div>
    </section>
  )
}

function Item({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold/50 text-gold-700">{icon}</div>
      <div className="flex-1 text-[15px] text-graphite-500">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-graphite-400">{title}</p>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  )
}
