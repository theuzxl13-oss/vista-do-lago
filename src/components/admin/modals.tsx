import { useEffect, useMemo, useState } from 'react'
import { Button, Checkbox, Field, Input, Modal, Select, Textarea } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { backend, toAppError } from '@/services/backend'
import { LEAD_SOURCE_LABEL, LEAD_STAGES, LOT_STATUS, PROPOSAL_STATUS, VISIT_STATUS } from '@/lib/constants'
import { formatCurrency, maskPhone, onlyDigits } from '@/lib/format'
import type {
  Block, Broker, Lead, LeadSource, LeadStage, Lot, Proposal, ProposalStatus, Visit, VisitStatus,
} from '@/types'
import { fromLocalInput, toLocalInput, todayIso } from './common'

const STAGE_INDEX = Object.fromEntries(LEAD_STAGES.map((s, i) => [s.key, i])) as Record<LeadStage, number>

/** Avança a etapa do lead quando uma ação comercial indica progresso (nunca regride). */
export async function advanceStage(lead: Lead | undefined, target: LeadStage) {
  if (!lead || lead.stage === 'won' || lead.stage === 'lost') return
  if (STAGE_INDEX[lead.stage] < STAGE_INDEX[target]) await backend.update('leads', lead.id, { stage: target })
}

export function lotOptionLabel(lot: Lot, blocks: Map<string, Block> | Block[]) {
  const code = Array.isArray(blocks) ? blocks.find((b) => b.id === lot.block_id)?.code : blocks.get(lot.block_id)?.code
  return `Quadra ${code ?? '?'} · Lote ${lot.number}${lot.area_m2 ? ` · ${lot.area_m2} m²` : ''} — ${LOT_STATUS[lot.status].label}`
}

function sortLots(lots: Lot[], blocks: Block[]) {
  const code = new Map(blocks.map((b) => [b.id, b.code]))
  return [...lots].sort((a, b) => (code.get(a.block_id) ?? '').localeCompare(code.get(b.block_id) ?? '') || a.number.localeCompare(b.number, 'pt-BR', { numeric: true }))
}

// ---------------------------------------------------------------------------
// Lead (cadastro manual / edição)
// ---------------------------------------------------------------------------
export function LeadEditorModal({ open, onClose, lead, brokers, lots, blocks, onSaved }: {
  open: boolean; onClose: () => void; lead?: Lead | null; brokers: Broker[]; lots: Lot[]; blocks: Block[]; onSaved: (lead: Lead) => void
}) {
  const { isAdmin, brokerId } = useAuth()
  const toast = useToast()
  const [f, setF] = useState(() => init(lead))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  function init(l?: Lead | null) {
    return {
      full_name: l?.full_name ?? '', phone: l?.phone ? maskPhone(l.phone) : '', whatsapp: l?.whatsapp ? maskPhone(l.whatsapp) : '',
      email: l?.email ?? '', source: (l?.source ?? 'manual') as LeadSource, broker_id: l?.broker_id ?? (isAdmin ? '' : brokerId ?? ''),
      stage: (l?.stage ?? 'new') as LeadStage, next_action: l?.next_action ?? '', next_action_at: toLocalInput(l?.next_action_at),
      notes: l?.notes ?? '', lot_id: '', consent: l?.consent ?? false, lost_reason: l?.lost_reason ?? '',
    }
  }
  useEffect(() => {
    if (open) {
      setF(init(lead))
      setErrors({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lead])

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }))

  const save = async () => {
    const e: Record<string, string> = {}
    if (f.full_name.trim().length < 3) e.full_name = 'Informe o nome completo.'
    const phone = onlyDigits(f.phone)
    const whats = onlyDigits(f.whatsapp)
    if (phone && !/^\d{10,13}$/.test(phone)) e.phone = 'Telefone inválido.'
    if (whats && !/^\d{10,13}$/.test(whats)) e.whatsapp = 'WhatsApp inválido.'
    if (f.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) e.email = 'E-mail inválido.'
    if (!phone && !f.email) e.phone = 'Informe telefone ou e-mail.'
    if (!isAdmin && !brokerId) e.broker_id = 'Seu usuário não está vinculado a um corretor.'
    setErrors(e)
    if (Object.keys(e).length) return
    setBusy(true)
    try {
      const payload: Partial<Lead> = {
        full_name: f.full_name.trim(), phone: phone || null, whatsapp: whats || phone || null, email: f.email.trim().toLowerCase() || null,
        source: f.source, broker_id: isAdmin ? f.broker_id || null : brokerId, stage: f.stage,
        next_action: f.next_action.trim() || null, next_action_at: fromLocalInput(f.next_action_at), notes: f.notes.trim() || null,
        lost_reason: f.stage === 'lost' ? f.lost_reason.trim() || null : null,
      }
      if (!lead) {
        payload.consent = f.consent
        payload.consent_at = f.consent ? new Date().toISOString() : null
      }
      const saved = lead ? await backend.update('leads', lead.id, payload) : await backend.insert('leads', payload)
      if (!lead && f.lot_id) await backend.insert('lead_lot_interests', { lead_id: saved.id, lot_id: f.lot_id })
      toast(lead ? 'Lead atualizado.' : 'Lead cadastrado.')
      onSaved(saved)
      onClose()
    } catch (err) {
      toast(toAppError(err).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const sortedLots = useMemo(() => sortLots(lots, blocks), [lots, blocks])

  return (
    <Modal open={open} onClose={onClose} title={lead ? 'Editar lead' : 'Novo lead'} size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={() => void save()}>Salvar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome completo" required error={errors.full_name} className="sm:col-span-2">
          <Input value={f.full_name} onChange={(e) => set('full_name', e.target.value)} />
        </Field>
        <Field label="Telefone" error={errors.phone}><Input type="tel" value={f.phone} onChange={(e) => set('phone', maskPhone(e.target.value))} placeholder="(00) 00000-0000" /></Field>
        <Field label="WhatsApp" error={errors.whatsapp} hint="Se vazio, usa o telefone"><Input type="tel" value={f.whatsapp} onChange={(e) => set('whatsapp', maskPhone(e.target.value))} /></Field>
        <Field label="E-mail" error={errors.email}><Input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label="Origem do contato">
          <Select value={f.source} onChange={(e) => set('source', e.target.value as LeadSource)}>
            {(Object.keys(LEAD_SOURCE_LABEL) as LeadSource[]).map((s) => <option key={s} value={s}>{LEAD_SOURCE_LABEL[s]}</option>)}
          </Select>
        </Field>
        <Field label="Corretor responsável" error={errors.broker_id}>
          <Select value={f.broker_id} onChange={(e) => set('broker_id', e.target.value)} disabled={!isAdmin}>
            <option value="">Sem corretor</option>
            {brokers.filter((b) => b.active || b.id === f.broker_id).map((b) => <option key={b.id} value={b.id}>{b.full_name}</option>)}
          </Select>
        </Field>
        <Field label="Etapa">
          <Select value={f.stage} onChange={(e) => set('stage', e.target.value as LeadStage)}>
            {LEAD_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </Select>
        </Field>
        {f.stage === 'lost' && (
          <Field label="Motivo da perda" className="sm:col-span-2"><Input value={f.lost_reason} onChange={(e) => set('lost_reason', e.target.value)} /></Field>
        )}
        {!lead && (
          <Field label="Lote de interesse" className="sm:col-span-2">
            <Select value={f.lot_id} onChange={(e) => set('lot_id', e.target.value)}>
              <option value="">Nenhum por enquanto</option>
              {sortedLots.map((l) => <option key={l.id} value={l.id}>{lotOptionLabel(l, blocks)}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Próxima ação comercial"><Input value={f.next_action} onChange={(e) => set('next_action', e.target.value)} placeholder="Ex.: enviar planta, ligar" /></Field>
        <Field label="Data da próxima ação"><Input type="datetime-local" value={f.next_action_at} onChange={(e) => set('next_action_at', e.target.value)} /></Field>
        <Field label="Observações internas" className="sm:col-span-2"><Textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} rows={3} /></Field>
        {!lead && (
          <Checkbox className="sm:col-span-2" checked={f.consent} onChange={(e) => set('consent', e.target.checked)}
            label="O cliente autorizou o contato comercial e o tratamento dos dados (LGPD)." />
        )}
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Visita
// ---------------------------------------------------------------------------
export function VisitModal({ open, onClose, visit, leads, lots, blocks, brokers, defaultLeadId, defaultDate, onSaved }: {
  open: boolean; onClose: () => void; visit?: Visit | null; leads: Lead[]; lots: Lot[]; blocks: Block[]; brokers: Broker[]
  defaultLeadId?: string; defaultDate?: string; onSaved: () => void
}) {
  const { isAdmin, brokerId } = useAuth()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const initial = () => {
    const dt = visit ? toLocalInput(visit.scheduled_at) : defaultDate ? `${defaultDate}T10:00` : ''
    return {
      lead_id: visit?.lead_id ?? defaultLeadId ?? '', lot_id: visit?.lot_id ?? '', date: dt.slice(0, 10), time: dt.slice(11, 16) || '10:00',
      duration_min: String(visit?.duration_min ?? 60), broker_id: visit?.broker_id ?? '', status: (visit?.status ?? 'scheduled') as VisitStatus, notes: visit?.notes ?? '',
    }
  }
  const [f, setF] = useState(initial)
  useEffect(() => {
    if (open) {
      setF(initial())
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, visit, defaultLeadId, defaultDate])
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }))

  // Ao escolher o lead, sugere o corretor e o lote de interesse
  const lead = leads.find((l) => l.id === f.lead_id)
  useEffect(() => {
    if (!visit && lead) setF((p) => ({ ...p, broker_id: p.broker_id || lead.broker_id || (isAdmin ? '' : brokerId ?? '') }))
  }, [lead, visit, isAdmin, brokerId])

  const save = async () => {
    if (!f.lead_id) return setError('Selecione o cliente.')
    if (!f.date || !f.time) return setError('Informe data e horário.')
    const scheduled = new Date(`${f.date}T${f.time}`)
    if (Number.isNaN(scheduled.getTime())) return setError('Data inválida.')
    const duration = Number(f.duration_min)
    if (!(duration >= 15 && duration <= 480)) return setError('Duração entre 15 e 480 minutos.')
    setBusy(true)
    try {
      const payload: Partial<Visit> = {
        lead_id: f.lead_id, lot_id: f.lot_id || null, scheduled_at: scheduled.toISOString(), duration_min: duration,
        broker_id: f.broker_id || null, status: f.status, notes: f.notes.trim() || null,
      }
      if (visit) {
        await backend.update('visits', visit.id, payload)
        if (visit.status !== f.status) {
          await backend.insert('lead_activities', { lead_id: f.lead_id, type: 'visit', description: `Visita ${VISIT_STATUS[f.status].label.toLowerCase()}`, metadata: { visit_id: visit.id } })
        }
      } else {
        const v = await backend.insert('visits', payload)
        await backend.insert('lead_activities', { lead_id: f.lead_id, type: 'visit', description: `Visita agendada para ${scheduled.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`, metadata: { visit_id: v.id, lot_id: f.lot_id || null } })
        await advanceStage(lead, 'visit_scheduled')
      }
      toast(visit ? 'Visita atualizada.' : 'Visita agendada.')
      onSaved()
      onClose()
    } catch (err) {
      setError(toAppError(err).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={visit ? 'Editar visita' : 'Agendar visita'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={() => void save()}>Salvar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cliente" required className="sm:col-span-2">
          <Select value={f.lead_id} onChange={(e) => set('lead_id', e.target.value)} disabled={!!visit}>
            <option value="">Selecione…</option>
            {leads.map((l) => <option key={l.id} value={l.id}>{l.full_name}</option>)}
          </Select>
        </Field>
        <Field label="Lote de interesse" className="sm:col-span-2">
          <Select value={f.lot_id} onChange={(e) => set('lot_id', e.target.value)}>
            <option value="">Visita geral ao empreendimento</option>
            {sortLots(lots, blocks).map((l) => <option key={l.id} value={l.id}>{lotOptionLabel(l, blocks)}</option>)}
          </Select>
        </Field>
        <Field label="Data" required><Input type="date" value={f.date} onChange={(e) => set('date', e.target.value)} /></Field>
        <Field label="Horário" required><Input type="time" value={f.time} onChange={(e) => set('time', e.target.value)} /></Field>
        <Field label="Duração (min)"><Input type="number" min={15} max={480} step={15} value={f.duration_min} onChange={(e) => set('duration_min', e.target.value)} /></Field>
        <Field label="Status">
          <Select value={f.status} onChange={(e) => set('status', e.target.value as VisitStatus)}>
            {(Object.keys(VISIT_STATUS) as VisitStatus[]).map((s) => <option key={s} value={s}>{VISIT_STATUS[s].label}</option>)}
          </Select>
        </Field>
        <Field label="Corretor" className="sm:col-span-2">
          <Select value={f.broker_id} onChange={(e) => set('broker_id', e.target.value)}>
            <option value="">A definir</option>
            {brokers.filter((b) => b.active || b.id === f.broker_id).map((b) => <option key={b.id} value={b.id}>{b.full_name}</option>)}
          </Select>
        </Field>
        <Field label="Observações" className="sm:col-span-2"><Textarea rows={3} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Proposta
// ---------------------------------------------------------------------------
const parseMoney = (v: string) => {
  const n = Number(v.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

export function ProposalModal({ open, onClose, proposal, leads, lots, blocks, defaultLeadId, onSaved }: {
  open: boolean; onClose: () => void; proposal?: Proposal | null; leads: Lead[]; lots: Lot[]; blocks: Block[]; defaultLeadId?: string; onSaved: () => void
}) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const initial = () => ({
    lead_id: proposal?.lead_id ?? defaultLeadId ?? '', lot_id: proposal?.lot_id ?? '',
    amount: proposal ? String(proposal.amount).replace('.', ',') : '', down_payment: proposal?.down_payment != null ? String(proposal.down_payment).replace('.', ',') : '',
    installments: proposal?.installments != null ? String(proposal.installments) : '', conditions: proposal?.conditions ?? '',
    valid_until: proposal?.valid_until ?? '', status: (proposal?.status ?? 'draft') as ProposalStatus,
  })
  const [f, setF] = useState(initial)
  useEffect(() => {
    if (open) {
      setF(initial())
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, proposal, defaultLeadId])
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }))

  const lead = leads.find((l) => l.id === f.lead_id)

  const save = async () => {
    if (!f.lead_id) return setError('Selecione o cliente.')
    if (!f.lot_id) return setError('Selecione o lote.')
    const amount = parseMoney(f.amount)
    const down = f.down_payment ? parseMoney(f.down_payment) : null
    const inst = f.installments ? Number(f.installments) : null
    if (!(amount > 0)) return setError('Informe o valor da proposta.')
    if (down != null && (Number.isNaN(down) || down < 0 || down > amount)) return setError('Entrada inválida (deve ser menor ou igual ao valor).')
    if (inst != null && !(Number.isInteger(inst) && inst >= 0 && inst <= 480)) return setError('Parcelas entre 0 e 480.')
    setBusy(true)
    try {
      const payload: Partial<Proposal> = {
        lead_id: f.lead_id, lot_id: f.lot_id, amount, down_payment: down, installments: inst, conditions: f.conditions.trim() || null,
        valid_until: f.valid_until || null, status: f.status, broker_id: lead?.broker_id ?? null,
      }
      if (f.status === 'sent' && proposal?.status !== 'sent') payload.sent_at = new Date().toISOString()
      const saved = proposal ? await backend.update('proposals', proposal.id, payload) : await backend.insert('proposals', payload)
      if (!proposal || proposal.status !== f.status) {
        await backend.insert('lead_activities', {
          lead_id: f.lead_id, type: 'proposal',
          description: `Proposta ${PROPOSAL_STATUS[f.status].label.toLowerCase()} — ${formatCurrency(amount)}`,
          metadata: { proposal_id: saved.id, lot_id: f.lot_id, status: f.status },
        })
      }
      if (f.status === 'sent') await advanceStage(lead, 'proposal_sent')
      if (f.status === 'accepted') await advanceStage(lead, 'negotiation')
      toast(proposal ? 'Proposta atualizada.' : 'Proposta criada.')
      onSaved()
      onClose()
    } catch (err) {
      setError(toAppError(err).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={proposal ? 'Editar proposta' : 'Nova proposta'} size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={() => void save()}>Salvar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cliente" required>
          <Select value={f.lead_id} onChange={(e) => set('lead_id', e.target.value)} disabled={!!proposal}>
            <option value="">Selecione…</option>
            {leads.map((l) => <option key={l.id} value={l.id}>{l.full_name}</option>)}
          </Select>
        </Field>
        <Field label="Lote" required>
          <Select value={f.lot_id} onChange={(e) => set('lot_id', e.target.value)}>
            <option value="">Selecione…</option>
            {sortLots(lots, blocks).map((l) => <option key={l.id} value={l.id}>{lotOptionLabel(l, blocks)}</option>)}
          </Select>
        </Field>
        <Field label="Valor total (R$)" required><Input inputMode="decimal" value={f.amount} onChange={(e) => set('amount', e.target.value)} placeholder="250000,00" /></Field>
        <Field label="Entrada (R$)"><Input inputMode="decimal" value={f.down_payment} onChange={(e) => set('down_payment', e.target.value)} /></Field>
        <Field label="Parcelas"><Input type="number" min={0} max={480} value={f.installments} onChange={(e) => set('installments', e.target.value)} /></Field>
        <Field label="Válida até"><Input type="date" value={f.valid_until} min={todayIso()} onChange={(e) => set('valid_until', e.target.value)} /></Field>
        <Field label="Status" className="sm:col-span-2">
          <Select value={f.status} onChange={(e) => set('status', e.target.value as ProposalStatus)}>
            {(Object.keys(PROPOSAL_STATUS) as ProposalStatus[]).map((s) => <option key={s} value={s}>{PROPOSAL_STATUS[s].label}</option>)}
          </Select>
        </Field>
        <Field label="Condições" className="sm:col-span-2"><Textarea rows={3} value={f.conditions} onChange={(e) => set('conditions', e.target.value)} placeholder="Forma de pagamento, correção, observações…" /></Field>
        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Reserva e venda
// ---------------------------------------------------------------------------
export function ReserveModal({ open, onClose, lot, leads, lots, blocks, defaultLeadId, onSaved }: {
  open: boolean; onClose: () => void; lot?: Lot | null; leads: Lead[]; lots: Lot[]; blocks: Block[]; defaultLeadId?: string; onSaved: () => void
}) {
  const toast = useToast()
  const plus7 = () => {
    const d = new Date(Date.now() + 7 * 86_400_000)
    return d.toISOString().slice(0, 10)
  }
  const [f, setF] = useState({ lot_id: '', lead_id: '', expires: plus7(), notes: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (open) {
      setF({ lot_id: lot?.id ?? '', lead_id: defaultLeadId ?? '', expires: plus7(), notes: '' })
      setError(null)
    }
  }, [open, lot, defaultLeadId])

  const available = sortLots(lots.filter((l) => l.status === 'available'), blocks)
  const save = async () => {
    if (!f.lot_id || !f.lead_id) return setError('Selecione o lote e o cliente.')
    const expires = new Date(`${f.expires}T23:59:00`)
    if (expires.getTime() <= Date.now()) return setError('A validade deve ser uma data futura.')
    setBusy(true)
    try {
      await backend.reserveLot(f.lot_id, f.lead_id, expires.toISOString(), f.notes.trim() || undefined)
      await advanceStage(leads.find((l) => l.id === f.lead_id), 'negotiation')
      toast('Lote reservado. O mapa público já mostra a reserva.')
      onSaved()
      onClose()
    } catch (err) {
      setError(toAppError(err).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open={open} onClose={onClose} title="Reservar lote"
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={() => void save()}>Confirmar reserva</Button></>}>
      <div className="space-y-4">
        <Field label="Lote" required>
          <Select value={f.lot_id} onChange={(e) => setF({ ...f, lot_id: e.target.value })} disabled={!!lot}>
            <option value="">Selecione um lote disponível…</option>
            {(lot ? [lot] : available).map((l) => <option key={l.id} value={l.id}>{lotOptionLabel(l, blocks)}</option>)}
          </Select>
        </Field>
        <Field label="Cliente" required>
          <Select value={f.lead_id} onChange={(e) => setF({ ...f, lead_id: e.target.value })}>
            <option value="">Selecione…</option>
            {leads.filter((l) => l.stage !== 'lost').map((l) => <option key={l.id} value={l.id}>{l.full_name}</option>)}
          </Select>
        </Field>
        <Field label="Reserva válida até" required hint="Após esta data a reserva expira e o lote volta a ficar disponível.">
          <Input type="date" min={todayIso()} value={f.expires} onChange={(e) => setF({ ...f, expires: e.target.value })} />
        </Field>
        <Field label="Observações"><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  )
}

export function SaleModal({ open, onClose, lot, leads, lots, blocks, defaultLeadId, defaultAmount, onSaved }: {
  open: boolean; onClose: () => void; lot?: Lot | null; leads: Lead[]; lots: Lot[]; blocks: Block[]; defaultLeadId?: string; defaultAmount?: number | null; onSaved: () => void
}) {
  const toast = useToast()
  const [f, setF] = useState({ lot_id: '', lead_id: '', amount: '', sold_at: todayIso(), notes: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (open) {
      setF({ lot_id: lot?.id ?? '', lead_id: defaultLeadId ?? '', amount: defaultAmount ? String(defaultAmount).replace('.', ',') : lot?.price ? String(lot.price).replace('.', ',') : '', sold_at: todayIso(), notes: '' })
      setError(null)
    }
  }, [open, lot, defaultLeadId, defaultAmount])

  const options = sortLots(lots.filter((l) => l.status === 'available' || l.status === 'reserved'), blocks)
  const save = async () => {
    if (!f.lot_id || !f.lead_id) return setError('Selecione o lote e o comprador.')
    const amount = parseMoney(f.amount)
    if (!(amount > 0)) return setError('Informe o valor da venda.')
    setBusy(true)
    try {
      await backend.registerSale(f.lot_id, f.lead_id, amount, f.sold_at, f.notes.trim() || undefined)
      toast('Venda registrada. O lote aparece como vendido no mapa.')
      onSaved()
      onClose()
    } catch (err) {
      setError(toAppError(err).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open={open} onClose={onClose} title="Registrar venda"
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={() => void save()}>Registrar venda</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Lote" required className="sm:col-span-2">
          <Select value={f.lot_id} onChange={(e) => setF({ ...f, lot_id: e.target.value })} disabled={!!lot}>
            <option value="">Selecione…</option>
            {(lot ? [lot] : options).map((l) => <option key={l.id} value={l.id}>{lotOptionLabel(l, blocks)}</option>)}
          </Select>
        </Field>
        <Field label="Comprador" required className="sm:col-span-2" hint="Se o lote estiver reservado, deve ser o mesmo cliente da reserva.">
          <Select value={f.lead_id} onChange={(e) => setF({ ...f, lead_id: e.target.value })}>
            <option value="">Selecione…</option>
            {leads.map((l) => <option key={l.id} value={l.id}>{l.full_name}</option>)}
          </Select>
        </Field>
        <Field label="Valor (R$)" required><Input inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
        <Field label="Data da venda" required><Input type="date" value={f.sold_at} onChange={(e) => setF({ ...f, sold_at: e.target.value })} /></Field>
        <Field label="Observações" className="sm:col-span-2"><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      </div>
    </Modal>
  )
}
