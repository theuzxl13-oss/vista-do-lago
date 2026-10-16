import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { FileDown, FileSpreadsheet } from 'lucide-react'
import { Button, ErrorBox, Input, Select, Spinner } from '@/components/ui'
import { KpiCard, PageHeader, Section } from '@/components/admin/common'
import { useCrmData } from '@/hooks/useCrmData'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { LEAD_SOURCE_LABEL, LEAD_STAGES, LOT_STATUS, PROPOSAL_STATUS } from '@/lib/constants'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { buildPeriodBuckets, inPeriod, PERIODS, type PeriodKey } from '@/lib/periods'
import { exportExcel, exportPdf, type ReportTable } from '@/lib/export'
import type { LeadSource, LotStatus } from '@/types'

const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1).replace('.', ',')}%` : '—')

export default function ReportsPage() {
  const crm = useCrmData()
  const { data, leadById, brokerById, lotName } = crm
  const { isAdmin } = useAuth()
  const toast = useToast()
  const [period, setPeriod] = useState<PeriodKey>('90d')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | null>(null)
  const custom = { from, to }
  const inP = (d: string | null | undefined) => inPeriod(d, period, custom)
  const periodLabel = from || to ? `${from ? formatDate(from) : 'início'} a ${to ? formatDate(to) : 'hoje'}` : PERIODS.find((p) => p.key === period)!.label

  const r = useMemo(() => {
    const leads = data.leads.filter((l) => inP(l.created_at))
    const visits = data.visits.filter((v) => inP(v.scheduled_at))
    const proposals = data.proposals.filter((p) => p.status !== 'draft' && inP(p.sent_at ?? p.created_at))
    const sales = data.sales.filter((s) => s.status === 'completed' && inP(s.sold_at))
    const visitedLeads = new Set(data.visits.filter((v) => v.status === 'done').map((v) => v.lead_id))
    const proposalLeads = new Set(data.proposals.filter((p) => p.status !== 'draft').map((p) => p.lead_id))

    const bySource = (Object.keys(LEAD_SOURCE_LABEL) as LeadSource[]).map((s) => {
      const ls = leads.filter((l) => l.source === s)
      return { source: LEAD_SOURCE_LABEL[s], total: ls.length, won: ls.filter((l) => l.stage === 'won').length }
    }).filter((x) => x.total > 0).sort((a, b) => b.total - a.total)

    const interestCount = new Map<string, number>()
    for (const i of data.interests) if (inP(i.created_at)) interestCount.set(i.lot_id, (interestCount.get(i.lot_id) ?? 0) + 1)
    const topLots = [...interestCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)

    const brokers = data.brokers.map((b) => {
      const bl = leads.filter((l) => l.broker_id === b.id)
      const bs = sales.filter((s) => s.broker_id === b.id)
      return {
        name: b.full_name, leads: bl.length,
        visits: visits.filter((v) => v.broker_id === b.id && v.status === 'done').length,
        proposals: proposals.filter((p) => p.broker_id === b.id).length,
        sales: bs.length, volume: bs.reduce((a, s) => a + s.amount, 0),
        conversion: pct(bl.filter((l) => l.stage === 'won').length, bl.length),
      }
    })

    const blocks = [...data.blocks].sort((a, b) => a.code.localeCompare(b.code))
    const availability = blocks.map((b) => {
      const bl = data.lots.filter((l) => l.block_id === b.id)
      const c = (s: LotStatus) => bl.filter((l) => l.status === s).length
      return { block: b.code, total: bl.length, available: c('available'), reserved: c('reserved'), sold: c('sold'), unavailable: c('unavailable') }
    })

    return {
      leads, visits, proposals, sales, bySource, topLots, brokers, availability,
      series: buildPeriodBuckets(period === 'all' && (from || to) ? 'all' : period, leads.map((l) => l.created_at)),
      funnel: [
        { stage: 'Leads gerados', n: leads.length },
        { stage: 'Com contato realizado', n: leads.filter((l) => l.stage !== 'new').length },
        { stage: 'Visitaram o empreendimento', n: leads.filter((l) => visitedLeads.has(l.id)).length },
        { stage: 'Receberam proposta', n: leads.filter((l) => proposalLeads.has(l.id)).length },
        { stage: 'Compraram', n: leads.filter((l) => l.stage === 'won').length },
      ],
      byStage: LEAD_STAGES.map((s) => ({ stage: s.label, n: leads.filter((l) => l.stage === s.key).length })),
      volume: sales.reduce((a, s) => a + s.amount, 0),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, period, from, to])

  const tables = (): ReportTable[] => [
    { title: 'Leads por período', head: ['Período', 'Leads'], rows: r.series.map((s) => [s.label, s.value]) },
    { title: 'Leads por origem', head: ['Origem', 'Leads', 'Vendas', 'Conversão'], rows: r.bySource.map((s) => [s.source, s.total, s.won, pct(s.won, s.total)]) },
    { title: 'Conversões', head: ['Etapa', 'Leads', '% do total'], rows: r.funnel.map((f) => [f.stage, f.n, pct(f.n, r.funnel[0].n)]) },
    { title: 'Desempenho dos corretores', head: ['Corretor', 'Leads', 'Visitas realizadas', 'Propostas', 'Vendas', 'Volume', 'Conversão'], rows: r.brokers.map((b) => [b.name, b.leads, b.visits, b.proposals, b.sales, formatCurrency(b.volume), b.conversion]) },
    { title: 'Visitas realizadas', head: ['Data', 'Cliente', 'Lote', 'Corretor'], rows: r.visits.filter((v) => v.status === 'done').map((v) => [formatDateTime(v.scheduled_at), leadById.get(v.lead_id)?.full_name ?? '—', lotName(v.lot_id), v.broker_id ? brokerById.get(v.broker_id)?.full_name ?? '—' : '—']) },
    { title: 'Propostas enviadas', head: ['Data', 'Cliente', 'Lote', 'Valor', 'Status'], rows: r.proposals.map((p) => [formatDate(p.sent_at ?? p.created_at), leadById.get(p.lead_id)?.full_name ?? '—', lotName(p.lot_id), formatCurrency(p.amount), PROPOSAL_STATUS[p.status].label]) },
    { title: 'Lotes mais procurados', head: ['Lote', 'Interessados', 'Situação'], rows: r.topLots.map(([id, n]) => { const lot = crm.lotById.get(id); return [lotName(id), n, lot ? LOT_STATUS[lot.status].label : '—'] }) },
    { title: 'Vendas concluídas', head: ['Data', 'Lote', 'Comprador', 'Corretor', 'Valor'], rows: r.sales.map((s) => [formatDate(s.sold_at), lotName(s.lot_id), leadById.get(s.lead_id)?.full_name ?? '—', s.broker_id ? brokerById.get(s.broker_id)?.full_name ?? '—' : '—', formatCurrency(s.amount)]) },
    { title: 'Disponibilidade de lotes', head: ['Quadra', 'Total', 'Disponíveis', 'Reservados', 'Vendidos', 'Indisponíveis'], rows: r.availability.map((a) => [a.block, a.total, a.available, a.reserved, a.sold, a.unavailable]) },
  ]

  const doExport = async (kind: 'pdf' | 'xlsx') => {
    setExporting(kind)
    try {
      const stamp = new Date().toISOString().slice(0, 10)
      if (kind === 'pdf') await exportPdf(`relatorio-vista-do-lago-${stamp}.pdf`, 'Relatório comercial', periodLabel, tables())
      else await exportExcel(`relatorio-vista-do-lago-${stamp}.xlsx`, tables())
    } catch (e) {
      console.error(e)
      toast('Não foi possível gerar o arquivo.', 'error')
    } finally {
      setExporting(null)
    }
  }

  if (crm.loading && !data.lots.length) return <Spinner />
  const t = tables()

  return (
    <>
      <PageHeader title="Relatórios comerciais" description={`${periodLabel}${isAdmin ? '' : ' · seus dados'}`}
        actions={<>
          <Button variant="outline" icon={<FileDown className="h-4 w-4" />} loading={exporting === 'pdf'} onClick={() => void doExport('pdf')}>PDF</Button>
          <Button variant="outline" icon={<FileSpreadsheet className="h-4 w-4" />} loading={exporting === 'xlsx'} onClick={() => void doExport('xlsx')}>Excel</Button>
        </>} />
      <div className="mb-6 flex flex-wrap items-end gap-2">
        <Select value={period} onChange={(e) => { setPeriod(e.target.value as PeriodKey); setFrom(''); setTo('') }} className="h-10 w-48" aria-label="Período">
          {PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </Select>
        <label className="text-xs text-graphite-400">De<Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 w-40" /></label>
        <label className="text-xs text-graphite-400">Até<Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 w-40" /></label>
      </div>
      {crm.error && <ErrorBox message={crm.error} onRetry={crm.reload} />}

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Leads no período" value={r.leads.length} />
        <KpiCard label="Visitas realizadas" value={r.visits.filter((v) => v.status === 'done').length} />
        <KpiCard label="Propostas enviadas" value={r.proposals.length} />
        <KpiCard label="Vendas concluídas" value={r.sales.length} hint={formatCurrency(r.volume)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Leads por período">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={r.series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="#ECE6D7" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B6B6B' }} tickLine={false} axisLine={false} minTickGap={12} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6B6B6B' }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: '#F5F2EA' }} formatter={(v) => [v, 'Leads']} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="value" fill="#18392B" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
        <Section title="Conversões (leads gerados no período)">
          <div className="space-y-3">
            {r.funnel.map((f) => (
              <div key={f.stage}>
                <div className="flex justify-between text-sm"><span className="text-graphite-500">{f.stage}</span><span className="font-semibold text-forest">{f.n} <span className="font-normal text-graphite-400">· {pct(f.n, r.funnel[0].n)}</span></span></div>
                <div className="mt-1 h-2 rounded-full bg-sand"><div className="h-2 rounded-full bg-olive" style={{ width: r.funnel[0].n ? `${(f.n / r.funnel[0].n) * 100}%` : 0 }} /></div>
              </div>
            ))}
          </div>
        </Section>
        {t.slice(1).filter((x) => x.title !== 'Conversões').map((table) => (
          <Section key={table.title} title={table.title}>
            <ReportGrid table={table} />
          </Section>
        ))}
      </div>
    </>
  )
}

function ReportGrid({ table }: { table: ReportTable }) {
  if (!table.rows.length) return <p className="py-6 text-center text-sm text-graphite-400">Sem dados no período.</p>
  return (
    <div className="-mx-5 -my-5 max-h-80 overflow-auto">
      <table className="table-luxe">
        <thead className="sticky top-0"><tr>{table.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{table.rows.map((row, i) => <tr key={i}>{row.map((c, j) => <td key={j} className="whitespace-nowrap">{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}
