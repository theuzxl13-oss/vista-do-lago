import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  CalendarCheck, CheckCircle2, FileText, Handshake, MapPinned, Percent, Sparkles, UserPlus, Users, XCircle, Headphones, Ban,
} from 'lucide-react'
import { ErrorBox, Select, Spinner } from '@/components/ui'
import { KpiCard, PageHeader, Section, StageBadge } from '@/components/admin/common'
import { useCrmData } from '@/hooks/useCrmData'
import { useAuth } from '@/context/AuthContext'
import { LEAD_SOURCE_LABEL, LEAD_STAGES, VISIT_STATUS } from '@/lib/constants'
import { formatDateTime, formatNumber } from '@/lib/format'
import { buildPeriodBuckets, inPeriod, PERIODS, type PeriodKey } from '@/lib/periods'

const INK = '#18392B'
const GRID = '#ECE6D7'

export default function DashboardPage() {
  const { data, loading, error, reload, lotName } = useCrmData()
  const { isAdmin, profile } = useAuth()
  const [period, setPeriod] = useState<PeriodKey>('30d')

  const m = useMemo(() => {
    const leads = data.leads.filter((l) => inPeriod(l.created_at, period))
    const by = (stage: string) => data.leads.filter((l) => l.stage === stage).length
    const closed = leads.filter((l) => l.stage === 'won').length
    const visits = data.visits.filter((v) => inPeriod(v.scheduled_at, period) || new Date(v.scheduled_at) > new Date())
    return {
      total: data.leads.length,
      newInPeriod: leads.length,
      inProgress: by('first_contact') + by('in_progress'),
      visitsScheduled: data.visits.filter((v) => ['scheduled', 'confirmed'].includes(v.status) && new Date(v.scheduled_at) >= new Date()).length,
      proposalsSent: data.proposals.filter((p) => p.status === 'sent' && inPeriod(p.sent_at ?? p.created_at, period)).length,
      negotiations: by('negotiation') + by('proposal_sent'),
      won: data.sales.filter((s) => s.status === 'completed' && inPeriod(s.sold_at, period)).length,
      lost: leads.filter((l) => l.stage === 'lost').length,
      conversion: leads.length ? (closed / leads.length) * 100 : 0,
      lotsAvailable: data.lots.filter((l) => l.status === 'available').length,
      lotsSold: data.lots.filter((l) => l.status === 'sold').length,
      lotsReserved: data.lots.filter((l) => l.status === 'reserved').length,
      series: buildPeriodBuckets(period, data.leads.map((l) => l.created_at)),
      stages: LEAD_STAGES.map((s) => ({ name: s.label, value: data.leads.filter((l) => l.stage === s.key).length })),
      sources: Object.entries(
        leads.reduce<Record<string, number>>((acc, l) => ({ ...acc, [l.source]: (acc[l.source] ?? 0) + 1 }), {}),
      ).map(([k, v]) => ({ name: LEAD_SOURCE_LABEL[k as keyof typeof LEAD_SOURCE_LABEL], value: v })).sort((a, b) => b.value - a.value),
      upcoming: visits.filter((v) => new Date(v.scheduled_at) >= new Date() && ['scheduled', 'confirmed'].includes(v.status)).slice(0, 6),
      nextActions: data.leads.filter((l) => l.next_action_at && !['won', 'lost'].includes(l.stage))
        .sort((a, b) => a.next_action_at!.localeCompare(b.next_action_at!)).slice(0, 6),
    }
  }, [data, period])

  if (loading && !data.leads.length && !data.lots.length) return <Spinner />
  const leadById = new Map(data.leads.map((l) => [l.id, l]))

  return (
    <>
      <PageHeader
        title={`Olá, ${(profile?.full_name ?? '').split(' ')[0] || 'bem-vindo'}`}
        description={isAdmin ? 'Visão geral comercial do empreendimento.' : 'Seus leads, visitas e negociações.'}
        actions={
          <Select aria-label="Período" value={period} onChange={(e) => setPeriod(e.target.value as PeriodKey)} className="h-10 w-48">
            {PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </Select>
        }
      />
      {error && <div className="mb-4"><ErrorBox message={error} onRetry={reload} /></div>}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Total de leads" value={formatNumber(m.total)} icon={<Users className="h-5 w-5" />} />
        <KpiCard label="Novos contatos" value={formatNumber(m.newInPeriod)} hint="no período" icon={<UserPlus className="h-5 w-5" />} />
        <KpiCard label="Em atendimento" value={formatNumber(m.inProgress)} icon={<Headphones className="h-5 w-5" />} />
        <KpiCard label="Visitas agendadas" value={formatNumber(m.visitsScheduled)} hint="próximas" icon={<CalendarCheck className="h-5 w-5" />} />
        <KpiCard label="Propostas enviadas" value={formatNumber(m.proposalsSent)} hint="no período" icon={<FileText className="h-5 w-5" />} />
        <KpiCard label="Negociações abertas" value={formatNumber(m.negotiations)} icon={<Handshake className="h-5 w-5" />} />
        <KpiCard label="Vendas concluídas" value={formatNumber(m.won)} hint="no período" icon={<CheckCircle2 className="h-5 w-5" />} />
        <KpiCard label="Leads perdidos" value={formatNumber(m.lost)} hint="criados no período" icon={<XCircle className="h-5 w-5" />} />
        <KpiCard label="Taxa de conversão" value={`${m.conversion.toFixed(1).replace('.', ',')}%`} hint="leads do período → venda" icon={<Percent className="h-5 w-5" />} />
        <KpiCard label="Lotes disponíveis" value={formatNumber(m.lotsAvailable)} hint={`${m.lotsReserved} reservados`} icon={<MapPinned className="h-5 w-5" />} />
        <KpiCard label="Lotes vendidos" value={formatNumber(m.lotsSold)} icon={<Sparkles className="h-5 w-5" />} />
        <KpiCard label="Indisponíveis" value={formatNumber(data.lots.filter((l) => l.status === 'unavailable').length)} icon={<Ban className="h-5 w-5" />} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Section title="Evolução de novos leads">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={m.series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="leadsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={INK} stopOpacity={0.25} />
                    <stop offset="1" stopColor={INK} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B6B6B' }} tickLine={false} axisLine={false} minTickGap={16} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6B6B6B' }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => [v, 'Leads']} contentStyle={{ borderRadius: 10, border: '1px solid #DDD4BF', fontSize: 12 }} />
                <Area type="monotone" dataKey="value" stroke={INK} strokeWidth={2} fill="url(#leadsFill)" activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Section>
        <Section title="Leads por origem (período)">
          {m.sources.length ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={m.sources} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#6B6B6B' }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: '#4A4A4A' }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: '#F5F2EA' }} formatter={(v) => [v, 'Leads']} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                  <Bar dataKey="value" fill="#687B55" radius={[0, 4, 4, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="py-16 text-center text-sm text-graphite-400">Sem leads no período.</p>}
        </Section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Section title="Funil (situação atual)" className="xl:col-span-1">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={m.stages} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={118} tick={{ fontSize: 11, fill: '#4A4A4A' }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: '#F5F2EA' }} formatter={(v) => [v, 'Leads']} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="value" fill={INK} radius={[0, 4, 4, 0]} barSize={14} label={{ position: 'right', fontSize: 11, fill: '#4A4A4A' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
        <Section title="Próximas visitas" actions={<Link to="/admin/agenda" className="text-xs font-semibold text-olive hover:text-forest">Ver agenda</Link>}>
          {m.upcoming.length ? (
            <ul className="divide-y divide-sand-200">
              {m.upcoming.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <Link to={`/admin/leads/${v.lead_id}`} className="block truncate font-semibold text-forest hover:underline">{leadById.get(v.lead_id)?.full_name ?? 'Cliente'}</Link>
                    <p className="text-xs text-graphite-400">{formatDateTime(v.scheduled_at)} · {lotName(v.lot_id)}</p>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: VISIT_STATUS[v.status].color }}>{VISIT_STATUS[v.status].label}</span>
                </li>
              ))}
            </ul>
          ) : <p className="py-10 text-center text-sm text-graphite-400">Nenhuma visita agendada.</p>}
        </Section>
        <Section title="Próximas ações comerciais">
          {m.nextActions.length ? (
            <ul className="divide-y divide-sand-200">
              {m.nextActions.map((l) => {
                const late = new Date(l.next_action_at!) < new Date()
                return (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <Link to={`/admin/leads/${l.id}`} className="block truncate font-semibold text-forest hover:underline">{l.full_name}</Link>
                      <p className={`text-xs ${late ? 'font-semibold text-red-600' : 'text-graphite-400'}`}>{l.next_action} · {formatDateTime(l.next_action_at)}{late && ' (atrasada)'}</p>
                    </div>
                    <StageBadge stage={l.stage} />
                  </li>
                )
              })}
            </ul>
          ) : <p className="py-10 text-center text-sm text-graphite-400">Nenhuma ação pendente.</p>}
        </Section>
      </div>
    </>
  )
}
