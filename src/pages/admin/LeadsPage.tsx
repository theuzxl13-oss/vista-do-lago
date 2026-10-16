import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { Button, EmptyState, ErrorBox, Input, Select, Spinner } from '@/components/ui'
import { WhatsAppIcon } from '@/components/ui/icons'
import { PageHeader, StageBadge } from '@/components/admin/common'
import { LeadEditorModal } from '@/components/admin/modals'
import { useCrmData } from '@/hooks/useCrmData'
import { useAuth } from '@/context/AuthContext'
import { LEAD_SOURCE_LABEL, LEAD_STAGES } from '@/lib/constants'
import { formatDate, formatPhone, whatsappLink } from '@/lib/format'
import type { LeadSource, LeadStage } from '@/types'

export default function LeadsPage() {
  const { data, loading, error, reload, brokerById, lotName } = useCrmData()
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [stage, setStage] = useState<LeadStage | 'all'>('all')
  const [source, setSource] = useState<LeadSource | 'all'>('all')
  const [broker, setBroker] = useState('all')
  const [creating, setCreating] = useState(false)

  const interestsByLead = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const i of data.interests) m.set(i.lead_id, [...(m.get(i.lead_id) ?? []), i.lot_id])
    return m
  }, [data.interests])

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    const digits = term.replace(/\D/g, '')
    return data.leads.filter((l) =>
      (stage === 'all' || l.stage === stage) &&
      (source === 'all' || l.source === source) &&
      (broker === 'all' || (broker === 'none' ? !l.broker_id : l.broker_id === broker)) &&
      (!term || l.full_name.toLowerCase().includes(term) || (l.email ?? '').includes(term) || (digits.length >= 3 && (l.phone ?? '').includes(digits))),
    )
  }, [data.leads, q, stage, source, broker])

  return (
    <>
      <PageHeader title="Leads" description={`${data.leads.length} contatos${isAdmin ? '' : ' atribuídos a você'}`}
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>Novo lead</Button>} />

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, e-mail ou telefone" className="pl-9" aria-label="Buscar leads" />
        </div>
        <Select value={stage} onChange={(e) => setStage(e.target.value as LeadStage | 'all')} aria-label="Etapa">
          <option value="all">Todas as etapas</option>
          {LEAD_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </Select>
        <Select value={source} onChange={(e) => setSource(e.target.value as LeadSource | 'all')} aria-label="Origem">
          <option value="all">Todas as origens</option>
          {(Object.keys(LEAD_SOURCE_LABEL) as LeadSource[]).map((s) => <option key={s} value={s}>{LEAD_SOURCE_LABEL[s]}</option>)}
        </Select>
        {isAdmin && (
          <Select value={broker} onChange={(e) => setBroker(e.target.value)} aria-label="Corretor">
            <option value="all">Todos os corretores</option>
            <option value="none">Sem corretor</option>
            {data.brokers.map((b) => <option key={b.id} value={b.id}>{b.full_name}</option>)}
          </Select>
        )}
      </div>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data.leads.length ? <Spinner /> : rows.length === 0 ? (
        <EmptyState title="Nenhum lead encontrado" description="Os contatos do site aparecem aqui automaticamente. Você também pode cadastrar manualmente." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-sand-300/70 bg-white shadow-card">
          <table className="table-luxe">
            <thead>
              <tr><th>Cliente</th><th>Contato</th><th>Etapa</th><th className="hidden md:table-cell">Origem</th><th className="hidden lg:table-cell">Lote(s)</th><th className="hidden md:table-cell">Corretor</th><th>Cadastro</th><th /></tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id} className="cursor-pointer" onClick={() => navigate(`/admin/leads/${l.id}`)}>
                  <td>
                    <Link to={`/admin/leads/${l.id}`} className="font-semibold text-forest hover:underline" onClick={(e) => e.stopPropagation()}>{l.full_name}</Link>
                    {l.next_action && <p className="text-xs text-graphite-400">→ {l.next_action}</p>}
                  </td>
                  <td className="whitespace-nowrap text-graphite-500">
                    <p>{formatPhone(l.phone)}</p>
                    {l.email && <p className="max-w-[200px] truncate text-xs text-graphite-400">{l.email}</p>}
                  </td>
                  <td><StageBadge stage={l.stage} /></td>
                  <td className="hidden whitespace-nowrap text-graphite-500 md:table-cell">{LEAD_SOURCE_LABEL[l.source]}</td>
                  <td className="hidden text-graphite-500 lg:table-cell">{(interestsByLead.get(l.id) ?? []).map(lotName).join(', ') || '—'}</td>
                  <td className="hidden whitespace-nowrap text-graphite-500 md:table-cell">{l.broker_id ? brokerById.get(l.broker_id)?.full_name ?? '—' : <span className="text-gold-700">Sem corretor</span>}</td>
                  <td className="whitespace-nowrap text-graphite-500">{formatDate(l.created_at)}</td>
                  <td>
                    {(l.whatsapp || l.phone) && (
                      <a href={whatsappLink(l.whatsapp || l.phone, `Olá, ${l.full_name.split(' ')[0]}! Aqui é da equipe Vista do Lago.`)} target="_blank" rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()} className="inline-flex rounded-full p-2 text-[#25D366] hover:bg-[#25D366]/10" aria-label={`WhatsApp de ${l.full_name}`}>
                        <WhatsAppIcon className="h-5 w-5" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <LeadEditorModal open={creating} onClose={() => setCreating(false)} brokers={data.brokers} lots={data.lots} blocks={data.blocks}
        onSaved={(lead) => { void reload(); navigate(`/admin/leads/${lead.id}`) }} />
    </>
  )
}
