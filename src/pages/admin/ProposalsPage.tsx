import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FilePlus2 } from 'lucide-react'
import { Badge, Button, EmptyState, ErrorBox, Select, Spinner } from '@/components/ui'
import { PageHeader } from '@/components/admin/common'
import { ProposalModal } from '@/components/admin/modals'
import { useCrmData } from '@/hooks/useCrmData'
import { PROPOSAL_STATUS } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Proposal, ProposalStatus } from '@/types'

export default function ProposalsPage() {
  const { data, loading, error, reload, leadById, brokerById, lotName } = useCrmData()
  const [status, setStatus] = useState<ProposalStatus | 'all'>('all')
  const [modal, setModal] = useState<{ proposal?: Proposal | null } | null>(null)
  const rows = data.proposals.filter((p) => status === 'all' || p.status === status)
  const total = rows.filter((p) => ['sent', 'accepted'].includes(p.status)).reduce((a, p) => a + p.amount, 0)

  return (
    <>
      <PageHeader title="Propostas" description={`${rows.length} propostas · ${formatCurrency(total)} em propostas enviadas/aceitas`}
        actions={<Button icon={<FilePlus2 className="h-4 w-4" />} onClick={() => setModal({})} disabled={!data.leads.length}>Nova proposta</Button>} />
      <Select value={status} onChange={(e) => setStatus(e.target.value as ProposalStatus | 'all')} className="mb-4 h-10 w-52" aria-label="Status">
        <option value="all">Todos os status</option>
        {(Object.keys(PROPOSAL_STATUS) as ProposalStatus[]).map((s) => <option key={s} value={s}>{PROPOSAL_STATUS[s].label}</option>)}
      </Select>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data.proposals.length ? <Spinner /> : rows.length === 0 ? <EmptyState title="Nenhuma proposta" description="Crie propostas a partir do perfil do lead ou aqui." /> : (
        <div className="overflow-x-auto rounded-xl border border-sand-300/70 bg-white shadow-card">
          <table className="table-luxe">
            <thead><tr><th>Cliente</th><th>Lote</th><th>Valor</th><th className="hidden md:table-cell">Entrada / Parcelas</th><th className="hidden lg:table-cell">Corretor</th><th className="hidden sm:table-cell">Validade</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="cursor-pointer" onClick={() => setModal({ proposal: p })}>
                  <td><Link to={`/admin/leads/${p.lead_id}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-forest hover:underline">{leadById.get(p.lead_id)?.full_name ?? '—'}</Link></td>
                  <td className="whitespace-nowrap">{lotName(p.lot_id)}</td>
                  <td className="whitespace-nowrap font-semibold">{formatCurrency(p.amount)}</td>
                  <td className="hidden whitespace-nowrap md:table-cell">{formatCurrency(p.down_payment)} · {p.installments ?? '—'}x</td>
                  <td className="hidden lg:table-cell">{p.broker_id ? brokerById.get(p.broker_id)?.full_name : '—'}</td>
                  <td className="hidden whitespace-nowrap sm:table-cell">{formatDate(p.valid_until)}</td>
                  <td><Badge color={PROPOSAL_STATUS[p.status].color}>{PROPOSAL_STATUS[p.status].label}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ProposalModal open={!!modal} onClose={() => setModal(null)} proposal={modal?.proposal} leads={data.leads} lots={data.lots} blocks={data.blocks} onSaved={() => void reload()} />
    </>
  )
}
