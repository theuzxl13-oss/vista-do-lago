import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, CalendarPlus, FilePlus2, Mail, MessageSquarePlus, Pencil, Phone, Plus, Trash2, Lock, Unlock, BadgeDollarSign,
} from 'lucide-react'
import { Badge, Button, ConfirmDialog, EmptyState, ErrorBox, Field, Input, Modal, Select, Spinner, Textarea } from '@/components/ui'
import { WhatsAppIcon } from '@/components/ui/icons'
import { Section, StageBadge, StageSelect } from '@/components/admin/common'
import { LeadEditorModal, ProposalModal, ReserveModal, SaleModal, VisitModal, lotOptionLabel } from '@/components/admin/modals'
import { useCrmData } from '@/hooks/useCrmData'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { backend, toAppError } from '@/services/backend'
import {
  ACTIVITY_LABEL, LEAD_SOURCE_LABEL, LOT_STATUS, PROPOSAL_STATUS, RESERVATION_STATUS, STAGE_LABEL, VISIT_STATUS,
} from '@/lib/constants'
import { formatCurrency, formatDate, formatDateTime, formatPhone, whatsappLink } from '@/lib/format'
import type { ActivityType, LeadStage, Proposal, Visit } from '@/types'

const MANUAL_TYPES: ActivityType[] = ['note', 'call', 'whatsapp', 'email', 'meeting']

export default function LeadDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { isAdmin } = useAuth()
  const crm = useCrmData()
  const acts = useAsync(() => backend.list('lead_activities', { eq: { lead_id: id }, order: { column: 'created_at', ascending: false } }), [id])
  const reloadAll = async () => {
    await Promise.all([crm.reload(), acts.reload()])
  }

  const [editing, setEditing] = useState(false)
  const [visitModal, setVisitModal] = useState<{ visit?: Visit | null } | null>(null)
  const [proposalModal, setProposalModal] = useState<{ proposal?: Proposal | null } | null>(null)
  const [reserveOpen, setReserveOpen] = useState(false)
  const [saleOpen, setSaleOpen] = useState(false)
  const [lostOpen, setLostOpen] = useState(false)
  const [lostReason, setLostReason] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [releaseId, setReleaseId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState({ type: 'note' as ActivityType, description: '' })
  const [addLot, setAddLot] = useState('')

  const lead = crm.leadById.get(id)
  const d = crm.data
  const rel = useMemo(() => ({
    interests: d.interests.filter((i) => i.lead_id === id),
    visits: d.visits.filter((v) => v.lead_id === id),
    proposals: d.proposals.filter((p) => p.lead_id === id),
    reservations: d.reservations.filter((r) => r.lead_id === id),
    sales: d.sales.filter((s) => s.lead_id === id),
  }), [d, id])

  if (crm.loading && !lead) return <Spinner />
  if (!lead) {
    return <EmptyState title="Lead não encontrado" description="Ele pode ter sido removido ou você não tem acesso." action={<Link to="/admin/leads" className="font-semibold text-forest underline">Voltar aos leads</Link>} />
  }

  const broker = lead.broker_id ? crm.brokerById.get(lead.broker_id) : null
  const phone = lead.whatsapp || lead.phone

  const changeStage = async (stage: LeadStage, reason?: string) => {
    if (stage === 'lost' && reason === undefined) {
      setLostReason(lead.lost_reason ?? '')
      return setLostOpen(true)
    }
    try {
      await backend.update('leads', lead.id, { stage, lost_reason: stage === 'lost' ? reason || null : lead.lost_reason })
      toast(`Etapa alterada para “${STAGE_LABEL[stage]}”.`)
      await reloadAll()
    } catch (e) {
      toast(toAppError(e).message, 'error')
    }
  }

  const assignBroker = async (brokerId: string) => {
    try {
      await backend.update('leads', lead.id, { broker_id: brokerId || null })
      toast('Corretor atualizado.')
      await reloadAll()
    } catch (e) {
      toast(toAppError(e).message, 'error')
    }
  }

  const addActivity = async () => {
    if (!note.description.trim()) return
    setBusy(true)
    try {
      await backend.insert('lead_activities', { lead_id: lead.id, type: note.type, description: note.description.trim() })
      if (lead.stage === 'new' && note.type !== 'note') await backend.update('leads', lead.id, { stage: 'first_contact' })
      setNote({ type: note.type, description: '' })
      toast('Atendimento registrado.')
      await reloadAll()
    } catch (e) {
      toast(toAppError(e).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const addInterest = async () => {
    if (!addLot) return
    try {
      await backend.insert('lead_lot_interests', { lead_id: lead.id, lot_id: addLot })
      setAddLot('')
      await crm.reload()
    } catch (e) {
      toast(toAppError(e).message, 'error')
    }
  }

  const removeInterest = async (interestId: string) => {
    try {
      await backend.remove('lead_lot_interests', interestId)
      await crm.reload()
    } catch (e) {
      toast(toAppError(e).message, 'error')
    }
  }

  const release = async () => {
    if (!releaseId) return
    setBusy(true)
    try {
      await backend.releaseReservation(releaseId, 'Liberada pelo perfil do lead')
      toast('Reserva liberada; o lote voltou a ficar disponível.')
      setReleaseId(null)
      await reloadAll()
    } catch (e) {
      toast(toAppError(e).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await backend.remove('leads', lead.id)
      toast('Lead excluído.')
      navigate('/admin/leads')
    } catch (e) {
      toast(toAppError(e).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const brokerName = (bid: string | null) => (bid ? crm.brokerById.get(bid)?.full_name ?? '—' : '—')
  const activeReservation = rel.reservations.find((r) => r.status === 'active')
  const acceptedProposal = rel.proposals.find((p) => p.status === 'accepted')
  const interestLotIds = new Set(rel.interests.map((i) => i.lot_id))

  return (
    <>
      <Link to="/admin/leads" className="mb-4 inline-flex items-center gap-1.5 text-sm text-graphite-400 hover:text-forest"><ArrowLeft className="h-4 w-4" /> Leads</Link>

      <div className="mb-6 flex flex-col gap-4 rounded-xl border border-sand-300/70 bg-white p-5 shadow-card lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="admin-h1">{lead.full_name}</h1>
            <StageBadge stage={lead.stage} />
          </div>
          <p className="mt-1 text-sm text-graphite-400">
            {LEAD_SOURCE_LABEL[lead.source]} · cadastrado em {formatDateTime(lead.created_at)}
            {lead.consent && <> · <span className="text-forest">consentimento LGPD {lead.consent_at ? `em ${formatDate(lead.consent_at)}` : 'registrado'}</span></>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StageSelect value={lead.stage} onChange={(s) => void changeStage(s)} />
          {phone && (
            <a href={whatsappLink(phone, `Olá, ${lead.full_name.split(' ')[0]}! Aqui é da equipe Vista do Lago.`)} target="_blank" rel="noopener noreferrer"
              onClick={() => void backend.insert('lead_activities', { lead_id: lead.id, type: 'whatsapp', description: 'Conversa iniciada pelo WhatsApp' }).then(() => acts.reload()).catch(() => undefined)}
              className="inline-flex h-9 items-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-semibold text-white hover:brightness-95">
              <WhatsAppIcon className="h-4 w-4" /> WhatsApp
            </a>
          )}
          <Button size="sm" variant="outline" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditing(true)}>Editar</Button>
          {isAdmin && <Button size="sm" variant="ghost" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setDeleteOpen(true)} aria-label="Excluir lead" />}
        </div>
      </div>

      {crm.error && <div className="mb-4"><ErrorBox message={crm.error} onRetry={crm.reload} /></div>}

      <div className="grid gap-6 xl:grid-cols-[1fr_1.35fr]">
        <div className="space-y-6">
          <Section title="Dados pessoais">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <Info label="Telefone" value={lead.phone ? <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1.5 hover:underline"><Phone className="h-3.5 w-3.5" />{formatPhone(lead.phone)}</a> : '—'} />
              <Info label="WhatsApp" value={formatPhone(lead.whatsapp)} />
              <Info label="E-mail" value={lead.email ? <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1.5 break-all hover:underline"><Mail className="h-3.5 w-3.5" />{lead.email}</a> : '—'} />
              <Info label="Corretor responsável" value={isAdmin ? (
                <Select value={lead.broker_id ?? ''} onChange={(e) => void assignBroker(e.target.value)} className="h-9" aria-label="Corretor responsável">
                  <option value="">Sem corretor</option>
                  {d.brokers.filter((b) => b.active || b.id === lead.broker_id).map((b) => <option key={b.id} value={b.id}>{b.full_name}</option>)}
                </Select>
              ) : broker?.full_name ?? '—'} />
              <Info label="Próxima ação" value={lead.next_action ? `${lead.next_action}${lead.next_action_at ? ` · ${formatDateTime(lead.next_action_at)}` : ''}` : '—'} />
              {lead.stage === 'lost' && <Info label="Motivo da perda" value={lead.lost_reason ?? '—'} />}
              {lead.utm && <Info label="Campanha / origem" value={Object.entries(lead.utm).map(([k, v]) => `${k}: ${v}`).join(' · ')} />}
            </dl>
            {lead.message && (
              <div className="mt-4 rounded-lg bg-sand/60 p-3 text-sm text-graphite-500">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-graphite-400">Mensagem do cliente</p>
                <p className="mt-1 whitespace-pre-line">{lead.message}</p>
              </div>
            )}
            {lead.notes && (
              <div className="mt-3 rounded-lg border border-gold/30 bg-gold-100/50 p-3 text-sm text-graphite-500">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gold-700">Observações internas</p>
                <p className="mt-1 whitespace-pre-line">{lead.notes}</p>
              </div>
            )}
          </Section>

          <Section title="Lotes de interesse">
            {rel.interests.length ? (
              <ul className="space-y-2">
                {rel.interests.map((i) => {
                  const lot = crm.lotById.get(i.lot_id)
                  return (
                    <li key={i.id} className="flex items-center justify-between gap-3 rounded-lg border border-sand-200 px-3 py-2 text-sm">
                      <span className="font-semibold text-forest">{crm.lotName(i.lot_id)}</span>
                      <div className="flex items-center gap-2">
                        {lot && <Badge color={LOT_STATUS[lot.status].color}>{LOT_STATUS[lot.status].label}</Badge>}
                        <button onClick={() => void removeInterest(i.id)} className="rounded p-1 text-graphite-400 hover:bg-sand hover:text-red-600" aria-label="Remover interesse"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : <p className="text-sm text-graphite-400">Nenhum lote vinculado.</p>}
            <div className="mt-3 flex gap-2">
              <Select value={addLot} onChange={(e) => setAddLot(e.target.value)} className="h-10" aria-label="Adicionar lote de interesse">
                <option value="">Adicionar lote…</option>
                {d.lots.filter((l) => !interestLotIds.has(l.id)).sort((a, b) => crm.lotName(a.id).localeCompare(crm.lotName(b.id), 'pt-BR', { numeric: true }))
                  .map((l) => <option key={l.id} value={l.id}>{lotOptionLabel(l, crm.blockById)}</option>)}
              </Select>
              <Button size="md" variant="outline" onClick={() => void addInterest()} disabled={!addLot} icon={<Plus className="h-4 w-4" />}>Adicionar</Button>
            </div>
          </Section>

          <Section title="Reservas e vendas" actions={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" icon={<Lock className="h-3.5 w-3.5" />} onClick={() => setReserveOpen(true)}>Reservar</Button>
              {isAdmin && <Button size="sm" variant="outline" icon={<BadgeDollarSign className="h-3.5 w-3.5" />} onClick={() => setSaleOpen(true)}>Registrar venda</Button>}
            </div>
          }>
            {rel.reservations.length + rel.sales.length === 0 ? <p className="text-sm text-graphite-400">Sem reservas ou vendas.</p> : (
              <ul className="space-y-2 text-sm">
                {rel.reservations.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sand-200 px-3 py-2">
                    <span><strong className="text-forest">Reserva</strong> · {crm.lotName(r.lot_id)} · até {formatDate(r.expires_at)}</span>
                    <span className="flex items-center gap-2">
                      <Badge color={r.status === 'active' ? '#E1B53B' : '#9A9A96'}>{RESERVATION_STATUS[r.status]}</Badge>
                      {r.status === 'active' && <Button size="sm" variant="ghost" icon={<Unlock className="h-3.5 w-3.5" />} onClick={() => setReleaseId(r.id)}>Liberar</Button>}
                    </span>
                  </li>
                ))}
                {rel.sales.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sand-200 px-3 py-2">
                    <span><strong className="text-forest">Venda</strong> · {crm.lotName(s.lot_id)} · {formatCurrency(s.amount)} · {formatDate(s.sold_at)}</span>
                    <Badge color={s.status === 'completed' ? '#2F8A4E' : '#9A9A96'}>{s.status === 'completed' ? 'Concluída' : 'Cancelada'}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Registrar atendimento">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={note.type} onChange={(e) => setNote({ ...note, type: e.target.value as ActivityType })} className="h-10 sm:w-44" aria-label="Tipo de atendimento">
                {MANUAL_TYPES.map((t) => <option key={t} value={t}>{ACTIVITY_LABEL[t]}</option>)}
              </Select>
              <Input value={note.description} onChange={(e) => setNote({ ...note, description: e.target.value })} placeholder="O que foi conversado?" className="h-10"
                onKeyDown={(e) => e.key === 'Enter' && void addActivity()} aria-label="Descrição do atendimento" />
              <Button onClick={() => void addActivity()} loading={busy} icon={<MessageSquarePlus className="h-4 w-4" />}>Registrar</Button>
            </div>
          </Section>

          <Section title="Visitas" actions={<Button size="sm" variant="outline" icon={<CalendarPlus className="h-3.5 w-3.5" />} onClick={() => setVisitModal({})}>Agendar visita</Button>}>
            {rel.visits.length ? (
              <ul className="space-y-2 text-sm">
                {rel.visits.map((v) => (
                  <li key={v.id}>
                    <button onClick={() => setVisitModal({ visit: v })} className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border border-sand-200 px-3 py-2 text-left hover:border-forest/40">
                      <span>{formatDateTime(v.scheduled_at)} · {crm.lotName(v.lot_id)} · {brokerName(v.broker_id)}</span>
                      <Badge color={VISIT_STATUS[v.status].color}>{VISIT_STATUS[v.status].label}</Badge>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-graphite-400">Nenhuma visita.</p>}
          </Section>

          <Section title="Propostas" actions={<Button size="sm" variant="outline" icon={<FilePlus2 className="h-3.5 w-3.5" />} onClick={() => setProposalModal({})}>Criar proposta</Button>}>
            {rel.proposals.length ? (
              <ul className="space-y-2 text-sm">
                {rel.proposals.map((p) => (
                  <li key={p.id}>
                    <button onClick={() => setProposalModal({ proposal: p })} className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border border-sand-200 px-3 py-2 text-left hover:border-forest/40">
                      <span>{crm.lotName(p.lot_id)} · <strong>{formatCurrency(p.amount)}</strong>{p.valid_until && ` · válida até ${formatDate(p.valid_until)}`}</span>
                      <Badge color={PROPOSAL_STATUS[p.status].color}>{PROPOSAL_STATUS[p.status].label}</Badge>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-graphite-400">Nenhuma proposta.</p>}
          </Section>

          <Section title="Histórico de atendimento">
            {acts.loading && !acts.data ? <Spinner /> : (
              <ol className="relative space-y-4 border-l border-sand-300 pl-5">
                {(acts.data ?? []).map((a) => (
                  <li key={a.id} className="relative">
                    <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-white bg-olive" />
                    <p className="text-xs text-graphite-400">{formatDateTime(a.created_at)} · {ACTIVITY_LABEL[a.type]}</p>
                    <p className="text-sm text-graphite">
                      {a.type === 'stage_change' && a.metadata
                        ? <>Etapa: {STAGE_LABEL[a.metadata.from as LeadStage] ?? '—'} → <strong>{STAGE_LABEL[a.metadata.to as LeadStage] ?? '—'}</strong></>
                        : a.type === 'assignment' && a.metadata
                          ? <>Corretor: {brokerName((a.metadata.from as string) ?? null)} → <strong>{brokerName((a.metadata.to as string) ?? null)}</strong></>
                          : a.description}
                    </p>
                    {typeof a.metadata?.message === 'string' && a.metadata.message && <p className="mt-0.5 text-xs italic text-graphite-400">“{a.metadata.message}”</p>}
                  </li>
                ))}
                {!acts.data?.length && <li className="text-sm text-graphite-400">Sem registros.</li>}
              </ol>
            )}
          </Section>
        </div>
      </div>

      <LeadEditorModal open={editing} onClose={() => setEditing(false)} lead={lead} brokers={d.brokers} lots={d.lots} blocks={d.blocks} onSaved={() => void reloadAll()} />
      <VisitModal open={!!visitModal} onClose={() => setVisitModal(null)} visit={visitModal?.visit} leads={[lead]} defaultLeadId={lead.id}
        lots={d.lots} blocks={d.blocks} brokers={d.brokers} onSaved={() => void reloadAll()} />
      <ProposalModal open={!!proposalModal} onClose={() => setProposalModal(null)} proposal={proposalModal?.proposal} leads={[lead]} defaultLeadId={lead.id}
        lots={d.lots} blocks={d.blocks} onSaved={() => void reloadAll()} />
      <ReserveModal open={reserveOpen} onClose={() => setReserveOpen(false)} leads={[lead]} defaultLeadId={lead.id} lots={d.lots} blocks={d.blocks} onSaved={() => void reloadAll()} />
      <SaleModal open={saleOpen} onClose={() => setSaleOpen(false)} leads={[lead]} defaultLeadId={lead.id} lots={d.lots} blocks={d.blocks}
        lot={activeReservation ? crm.lotById.get(activeReservation.lot_id) : acceptedProposal ? crm.lotById.get(acceptedProposal.lot_id) : null}
        defaultAmount={acceptedProposal?.amount} onSaved={() => void reloadAll()} />

      <Modal open={lostOpen} onClose={() => setLostOpen(false)} title="Marcar como perdido" size="sm"
        footer={<><Button variant="ghost" onClick={() => setLostOpen(false)}>Cancelar</Button><Button variant="danger" onClick={() => { setLostOpen(false); void changeStage('lost', lostReason) }}>Confirmar</Button></>}>
        <Field label="Motivo da perda"><Textarea rows={3} value={lostReason} onChange={(e) => setLostReason(e.target.value)} placeholder="Ex.: orçamento, optou por outro empreendimento…" /></Field>
      </Modal>
      <ConfirmDialog open={!!releaseId} title="Liberar reserva" message="O lote voltará a ficar disponível no mapa público." confirmLabel="Liberar" loading={busy} onConfirm={() => void release()} onClose={() => setReleaseId(null)} />
      <ConfirmDialog open={deleteOpen} danger title="Excluir lead" loading={busy} confirmLabel="Excluir definitivamente"
        message="Esta ação remove o lead e seu histórico (por exemplo, para atender a um pedido de eliminação de dados pela LGPD). Leads com reservas ou vendas não podem ser excluídos."
        onConfirm={() => void remove()} onClose={() => setDeleteOpen(false)} />
    </>
  )
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-graphite-400">{label}</dt>
      <dd className="mt-1 text-graphite">{value}</dd>
    </div>
  )
}
