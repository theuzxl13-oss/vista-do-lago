import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowRight, Info, LayoutGrid, Map as MapIcon, Ruler, Tag, Grid2x2 } from 'lucide-react'
import { Badge, Button, Drawer, Modal, Select, Spinner, Tabs } from '@/components/ui'
import { WhatsAppIcon } from '@/components/ui/icons'
import { LotLegend, LotPlan } from '@/components/map/LotPlan'
import { useSettings } from '@/context/SettingsContext'
import type { LotWithBlock } from '@/hooks/useLots'
import { LOT_STATUS } from '@/lib/constants'
import { assetUrl, cn, formatArea, formatCurrency, lotDimensions, whatsappLink } from '@/lib/format'
import type { Block, LotStatus } from '@/types'
import { LeadForm } from './LeadForm'
import { Reveal, SectionHeading } from './Reveal'

interface Props {
  lots: LotWithBlock[]
  blocks: Block[]
  loading: boolean
  error: string | null
}

export function LotsSection({ lots, blocks, loading, error }: Props) {
  const { settings } = useSettings()
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState<'map' | 'list'>('map')
  const [status, setStatus] = useState<LotStatus | 'all'>('all')
  const [block, setBlock] = useState('all')
  const [selected, setSelected] = useState<LotWithBlock | null>(null)
  const [interest, setInterest] = useState<{ lot: LotWithBlock; proposal: boolean } | null>(null)

  // Link direto para um lote: ?lote=<id>
  useEffect(() => {
    const id = params.get('lote')
    if (id && lots.length) {
      const lot = lots.find((l) => l.id === id)
      if (lot) setSelected(lot)
    }
  }, [params, lots])

  // Mantém o painel sincronizado com atualizações em tempo real
  useEffect(() => {
    if (selected) {
      const fresh = lots.find((l) => l.id === selected.id)
      if (fresh && fresh !== selected) setSelected(fresh)
    }
  }, [lots, selected])

  const counts = useMemo(() => {
    const c: Partial<Record<LotStatus, number>> = {}
    for (const l of lots) c[l.status] = (c[l.status] ?? 0) + 1
    return c
  }, [lots])

  const matches = (l: LotWithBlock) => (status === 'all' || l.status === status) && (block === 'all' || l.block_id === block)
  const filtered = lots.filter(matches)

  const select = (lot: LotWithBlock) => {
    setSelected(lot)
    setParams((p) => {
      p.set('lote', lot.id)
      return p
    }, { replace: true, preventScrollReset: true })
  }
  const close = () => {
    setSelected(null)
    setParams((p) => {
      p.delete('lote')
      return p
    }, { replace: true, preventScrollReset: true })
  }

  return (
    <section id="lotes" className="bg-white py-24 sm:py-32">
      <div className="container-luxe">
        <SectionHeading
          eyebrow="Mapa interativo"
          title="Escolha o espaço onde seu futuro começa."
          description="Explore a planta, veja a situação de cada terreno e fale com nossa equipe sobre o lote que mais combina com você."
        />

        {settings.plan.is_demo && (
          <Reveal className="mt-8 flex items-start gap-3 rounded-xl border border-gold/40 bg-gold-100/60 px-4 py-3 text-sm text-gold-700">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{settings.plan.notice}</p>
          </Reveal>
        )}

        <div className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <LotLegend counts={counts} />
          <div className="flex flex-wrap items-center gap-2">
            <Select aria-label="Filtrar por situação" value={status} onChange={(e) => setStatus(e.target.value as LotStatus | 'all')} className="h-10 w-auto min-w-[150px]">
              <option value="all">Todas as situações</option>
              {(Object.keys(LOT_STATUS) as LotStatus[]).map((s) => <option key={s} value={s}>{LOT_STATUS[s].label}</option>)}
            </Select>
            <Select aria-label="Filtrar por quadra" value={block} onChange={(e) => setBlock(e.target.value)} className="h-10 w-auto min-w-[130px]">
              <option value="all">Todas as quadras</option>
              {blocks.map((b) => <option key={b.id} value={b.id}>Quadra {b.code}</option>)}
            </Select>
            <Tabs value={view} onChange={setView} items={[
              { value: 'map', label: <span className="flex items-center gap-1.5"><MapIcon className="h-4 w-4" />Planta</span> },
              { value: 'list', label: <span className="flex items-center gap-1.5"><LayoutGrid className="h-4 w-4" />Lista</span> },
            ]} />
          </div>
        </div>

        <div className="mt-6">
          {loading && !lots.length ? (
            <Spinner label="Carregando lotes…" />
          ) : error ? (
            <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">Não foi possível carregar os lotes agora. {error}</p>
          ) : view === 'map' ? (
            <LotPlan lots={lots} blocks={blocks} plan={settings.plan} selectedId={selected?.id} onSelect={select} isHighlighted={matches} className="shadow-soft" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {filtered.map((l) => (
                <button key={l.id} onClick={() => select(l)}
                  className="group relative overflow-hidden rounded-xl border border-sand-300 bg-white p-4 text-left transition duration-300 ease-out hover:-translate-y-1 hover:border-forest/40 hover:shadow-soft focus-visible:-translate-y-1">
                  <span className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100" style={{ backgroundColor: LOT_STATUS[l.status].color }} />
                  <div className="flex items-center justify-between">
                    <p className="font-display text-2xl text-forest transition-colors group-hover:text-forest-600">Lote {l.number}</p>
                    <Badge color={LOT_STATUS[l.status].color}>{LOT_STATUS[l.status].label}</Badge>
                  </div>
                  <p className="mt-1 flex items-center justify-between text-sm text-graphite-400">
                    <span>Quadra {l.block?.code} · {formatArea(l.area_m2)}</span>
                    <ArrowRight className="h-4 w-4 -translate-x-2 text-gold-700 opacity-0 transition duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                  </p>
                </button>
              ))}
              {!filtered.length && <p className="text-sm text-graphite-400">Nenhum lote encontrado com os filtros escolhidos.</p>}
            </div>
          )}
          <p className="mt-3 text-sm text-graphite-400">
            Mostrando {filtered.length} de {lots.length} lotes. Toque em um lote para ver os detalhes.
          </p>
        </div>
      </div>

      <LotDrawer
        lot={selected}
        onClose={close}
        whatsappNumber={settings.contact.whatsapp_number}
        onInterest={(lot, proposal) => setInterest({ lot, proposal })}
      />

      <Modal open={!!interest} onClose={() => setInterest(null)} size="lg"
        title={interest ? `${interest.proposal ? 'Solicitar proposta' : 'Tenho interesse'} · Lote ${interest.lot.number}, Quadra ${interest.lot.block?.code ?? ''}` : ''}>
        {interest && (
          <LeadForm
            key={interest.lot.id + String(interest.proposal)}
            lots={lots}
            defaultLotId={interest.lot.id}
            source="lot_map"
            submitLabel={interest.proposal ? 'QUERO RECEBER UMA PROPOSTA' : 'ENVIAR MEU INTERESSE'}
            defaultMessage={interest.proposal
              ? `Gostaria de receber uma proposta para o lote ${interest.lot.number}, quadra ${interest.lot.block?.code ?? ''}.`
              : `Tenho interesse no lote ${interest.lot.number}, quadra ${interest.lot.block?.code ?? ''}.`}
          />
        )}
      </Modal>
    </section>
  )
}

function LotDrawer({ lot, onClose, onInterest, whatsappNumber }: {
  lot: LotWithBlock | null; onClose: () => void; whatsappNumber: string; onInterest: (lot: LotWithBlock, proposal: boolean) => void
}) {
  const st = lot ? LOT_STATUS[lot.status] : null
  const canBuy = lot?.status === 'available'
  const msg = lot
    ? `Olá! Tenho interesse no lote ${lot.number}, quadra ${lot.block?.code ?? ''}, do empreendimento Vista do Lago. Gostaria de receber mais informações.`
    : ''
  return (
    <Drawer open={!!lot} onClose={onClose} width="max-w-md"
      title={lot && (
        <div>
          <p className="eyebrow">Quadra {lot.block?.code}</p>
          <h3 className="mt-1 font-display text-4xl text-forest">Lote {lot.number}</h3>
        </div>
      )}
      footer={lot && (
        <div className="space-y-2">
          <Button variant="primary" size="lg" className="w-full" onClick={() => onInterest(lot, false)}>Tenho interesse</Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => onInterest(lot, true)} disabled={lot.status === 'sold' || lot.status === 'unavailable'}>Solicitar proposta</Button>
            <a href={whatsappLink(whatsappNumber, msg)} target="_blank" rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-semibold text-white transition hover:brightness-95">
              <WhatsAppIcon className="h-4 w-4" /> WhatsApp
            </a>
          </div>
        </div>
      )}>
      {lot && st && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ backgroundColor: st.soft, color: st.text }}>
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: st.color }} />
            <p className="text-sm font-semibold">{st.label}</p>
            {!canBuy && <p className="ml-auto text-xs">Fale conosco para opções semelhantes</p>}
          </div>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-sand-300 bg-sand-300">
            <Info2 icon={<Grid2x2 className="h-4 w-4" />} label="Identificação" value={`Q${lot.block?.code ?? '?'} · L${lot.number}`} />
            <Info2 icon={<Ruler className="h-4 w-4" />} label="Área" value={formatArea(lot.area_m2)} />
            <Info2 icon={<Ruler className="h-4 w-4" />} label="Dimensões" value={lotDimensions(lot)} wide />
            <Info2 icon={<Tag className="h-4 w-4" />} label="Valor" value={lot.price_on_request || lot.price == null ? 'Sob consulta' : formatCurrency(lot.price)} wide />
          </dl>
          {lot.description && <p className="text-sm leading-relaxed text-graphite-500">{lot.description}</p>}
          {lot.images.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {lot.images.map((src, i) => (
                <img key={i} src={assetUrl(src)} alt={`Lote ${lot.number} — imagem ${i + 1}`} loading="lazy" className={cn('aspect-[4/3] w-full rounded-lg object-cover', i === 0 && 'col-span-2')} />
              ))}
            </div>
          )}
          {lot.is_demo && <p className="text-xs text-graphite-400">Dados demonstrativos — confirme as informações oficiais com a equipe comercial.</p>}
        </div>
      )}
    </Drawer>
  )
}

function Info2({ icon, label, value, wide }: { icon: React.ReactNode; label: string; value: string; wide?: boolean }) {
  return (
    <div className={cn('bg-white p-4', wide && 'col-span-2')}>
      <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-graphite-400">{icon}{label}</dt>
      <dd className="mt-1 font-display text-xl text-forest">{value}</dd>
    </div>
  )
}
