import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge, Button, EmptyState, ErrorBox, Select, Spinner, Tabs } from '@/components/ui'
import { PageHeader } from '@/components/admin/common'
import { VisitModal } from '@/components/admin/modals'
import { useCrmData } from '@/hooks/useCrmData'
import { VISIT_STATUS } from '@/lib/constants'
import { cn, formatDateTime, formatTime } from '@/lib/format'
import type { Visit, VisitStatus } from '@/types'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export default function AgendaPage() {
  const { data, loading, error, reload, leadById, brokerById, lotName } = useCrmData()
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [status, setStatus] = useState<VisitStatus | 'all'>('all')
  const [modal, setModal] = useState<{ visit?: Visit | null; date?: string } | null>(null)

  const visits = data.visits.filter((v) => status === 'all' || v.status === status)
  const byDay = useMemo(() => {
    const m = new Map<string, Visit[]>()
    for (const v of visits) {
      const k = ymd(new Date(v.scheduled_at))
      m.set(k, [...(m.get(k) ?? []), v])
    }
    return m
  }, [visits])

  const cells = useMemo(() => {
    const first = new Date(month)
    const start = new Date(first)
    start.setDate(1 - first.getDay())
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d })
  }, [month])

  const today = ymd(new Date())
  const shift = (n: number) => setMonth((m) => { const d = new Date(m); d.setMonth(d.getMonth() + n); return d })
  const upcoming = visits.filter((v) => new Date(v.scheduled_at).getTime() >= Date.now() - 86_400_000)
  const past = visits.filter((v) => new Date(v.scheduled_at).getTime() < Date.now() - 86_400_000).reverse()

  const chip = (v: Visit) => (
    <button key={v.id} onClick={(e) => { e.stopPropagation(); setModal({ visit: v }) }}
      className="block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium text-white" style={{ backgroundColor: VISIT_STATUS[v.status].color }}
      title={`${formatTime(v.scheduled_at)} — ${leadById.get(v.lead_id)?.full_name ?? ''}`}>
      {formatTime(v.scheduled_at)} {leadById.get(v.lead_id)?.full_name.split(' ')[0]}
    </button>
  )

  return (
    <>
      <PageHeader title="Agenda de visitas" description="Organize as visitas ao empreendimento."
        actions={<Button icon={<CalendarPlus className="h-4 w-4" />} onClick={() => setModal({})} disabled={!data.leads.length}>Agendar visita</Button>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs value={view} onChange={setView} items={[{ value: 'calendar', label: 'Calendário' }, { value: 'list', label: 'Lista' }]} />
        <Select value={status} onChange={(e) => setStatus(e.target.value as VisitStatus | 'all')} className="h-10 w-48" aria-label="Status">
          <option value="all">Todos os status</option>
          {(Object.keys(VISIT_STATUS) as VisitStatus[]).map((s) => <option key={s} value={s}>{VISIT_STATUS[s].label}</option>)}
        </Select>
      </div>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data.visits.length ? <Spinner /> : view === 'calendar' ? (
        <div className="overflow-hidden rounded-xl border border-sand-300/70 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-sand-200 px-4 py-3">
            <button onClick={() => shift(-1)} className="rounded-full p-2 hover:bg-sand" aria-label="Mês anterior"><ChevronLeft className="h-5 w-5" /></button>
            <p className="font-display text-2xl text-forest">{month.toLocaleDateString('pt-BR', { month: 'long' }).replace(/^./, (c) => c.toUpperCase())} {month.getFullYear()}</p>
            <button onClick={() => shift(1)} className="rounded-full p-2 hover:bg-sand" aria-label="Próximo mês"><ChevronRight className="h-5 w-5" /></button>
          </div>
          <div className="grid grid-cols-7 border-b border-sand-200 bg-sand/50 text-center text-[11px] font-semibold uppercase tracking-wider text-graphite-400">
            {WEEKDAYS.map((w) => <div key={w} className="py-2">{w}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((d) => {
              const k = ymd(d)
              const items = byDay.get(k) ?? []
              const out = d.getMonth() !== month.getMonth()
              return (
                <div key={k} onClick={() => setModal({ date: k })} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setModal({ date: k })}
                  className={cn('min-h-[72px] cursor-pointer border-b border-r border-sand-200 p-1 transition hover:bg-sand/40 sm:min-h-[104px] sm:p-1.5', out && 'bg-sand/30 text-graphite-400')}
                  aria-label={`${d.toLocaleDateString('pt-BR')}: ${items.length} visita(s)`}>
                  <p className={cn('mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs', k === today && 'bg-forest font-bold text-white')}>{d.getDate()}</p>
                  <div className="hidden space-y-0.5 sm:block">{items.slice(0, 3).map(chip)}{items.length > 3 && <p className="text-[10px] text-graphite-400">+{items.length - 3}</p>}</div>
                  {items.length > 0 && <span className="ml-1 inline-block h-2 w-2 rounded-full bg-olive sm:hidden" />}
                </div>
              )
            })}
          </div>
        </div>
      ) : visits.length === 0 ? <EmptyState title="Nenhuma visita" /> : (
        <div className="space-y-6">
          {[{ title: 'Próximas', items: upcoming }, { title: 'Anteriores', items: past }].map((g) => g.items.length > 0 && (
            <div key={g.title}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-graphite-400">{g.title}</p>
              <div className="overflow-x-auto rounded-xl border border-sand-300/70 bg-white shadow-card">
                <table className="table-luxe">
                  <thead><tr><th>Data</th><th>Cliente</th><th className="hidden sm:table-cell">Lote</th><th className="hidden md:table-cell">Corretor</th><th>Status</th></tr></thead>
                  <tbody>
                    {g.items.map((v) => (
                      <tr key={v.id} className="cursor-pointer" onClick={() => setModal({ visit: v })}>
                        <td className="whitespace-nowrap">{formatDateTime(v.scheduled_at)}</td>
                        <td><Link to={`/admin/leads/${v.lead_id}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-forest hover:underline">{leadById.get(v.lead_id)?.full_name ?? '—'}</Link></td>
                        <td className="hidden sm:table-cell">{lotName(v.lot_id)}</td>
                        <td className="hidden md:table-cell">{v.broker_id ? brokerById.get(v.broker_id)?.full_name : '—'}</td>
                        <td><Badge color={VISIT_STATUS[v.status].color}>{VISIT_STATUS[v.status].label}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        {(Object.keys(VISIT_STATUS) as VisitStatus[]).map((s) => <Badge key={s} color={VISIT_STATUS[s].color}>{VISIT_STATUS[s].label}</Badge>)}
      </div>
      <VisitModal open={!!modal} onClose={() => setModal(null)} visit={modal?.visit} defaultDate={modal?.date}
        leads={data.leads.filter((l) => l.stage !== 'lost' || l.id === modal?.visit?.lead_id)} lots={data.lots} blocks={data.blocks} brokers={data.brokers} onSaved={() => void reload()} />
    </>
  )
}
