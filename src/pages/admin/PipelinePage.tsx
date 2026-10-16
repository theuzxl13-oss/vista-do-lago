import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { Clock, GripVertical, Plus, Search } from 'lucide-react'
import { Button, ErrorBox, Field, Input, Modal, Select, Spinner, Textarea } from '@/components/ui'
import { PageHeader } from '@/components/admin/common'
import { LeadEditorModal } from '@/components/admin/modals'
import { useCrmData } from '@/hooks/useCrmData'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { backend, toAppError } from '@/services/backend'
import { LEAD_STAGES, STAGE_LABEL } from '@/lib/constants'
import { cn, formatDate, formatPhone, initials } from '@/lib/format'
import type { Lead, LeadStage } from '@/types'

export default function PipelinePage() {
  const { data, loading, error, reload, setData, brokerById, lotName } = useCrmData()
  const { isAdmin } = useAuth()
  const toast = useToast()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [broker, setBroker] = useState('all')
  const [lost, setLost] = useState<{ lead: Lead; reason: string } | null>(null)
  const [creating, setCreating] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  )

  const firstInterest = useMemo(() => {
    const m = new Map<string, string>()
    for (const i of data.interests) if (!m.has(i.lead_id)) m.set(i.lead_id, i.lot_id)
    return m
  }, [data.interests])

  const visible = data.leads.filter((l) =>
    (broker === 'all' || l.broker_id === broker || (broker === 'none' && !l.broker_id)) &&
    (!q || l.full_name.toLowerCase().includes(q.toLowerCase())))

  const move = async (lead: Lead, stage: LeadStage, reason?: string) => {
    if (lead.stage === stage) return
    const prev = data.leads
    // Atualização otimista com reversão em caso de erro
    setData((d) => ({ ...d!, leads: d!.leads.map((l) => (l.id === lead.id ? { ...l, stage, lost_reason: stage === 'lost' ? reason ?? null : l.lost_reason } : l)) }))
    try {
      await backend.update('leads', lead.id, { stage, ...(stage === 'lost' ? { lost_reason: reason || null } : {}) })
      toast(`${lead.full_name.split(' ')[0]} → ${STAGE_LABEL[stage]}`)
    } catch (e) {
      setData((d) => ({ ...d!, leads: prev }))
      toast(toAppError(e).message, 'error')
    }
  }

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const lead = data.leads.find((l) => l.id === e.active.id)
    const stage = e.over?.id as LeadStage | undefined
    if (!lead || !stage || stage === lead.stage) return
    if (stage === 'lost') return setLost({ lead, reason: '' })
    if (stage === 'won') {
      toast('Para concluir a venda, registre-a no perfil do lead ou em Lotes (isso atualiza o mapa).', 'info')
    }
    void move(lead, stage)
  }

  const active = activeId ? data.leads.find((l) => l.id === activeId) : null

  return (
    <>
      <PageHeader title="Funil comercial" description="Arraste os cartões entre as etapas. Todas as mudanças são salvas e registradas no histórico."
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>Novo lead</Button>} />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar por nome" className="h-10 pl-9" aria-label="Filtrar por nome" />
        </div>
        {isAdmin && (
          <Select value={broker} onChange={(e) => setBroker(e.target.value)} className="h-10 sm:w-60" aria-label="Corretor">
            <option value="all">Todos os corretores</option>
            <option value="none">Sem corretor</option>
            {data.brokers.map((b) => <option key={b.id} value={b.id}>{b.full_name}</option>)}
          </Select>
        )}
      </div>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data.leads.length ? <Spinner /> : (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4 sm:-mx-8 sm:px-8">
            {LEAD_STAGES.map((s) => {
              const items = visible.filter((l) => l.stage === s.key)
              return (
                <Column key={s.key} id={s.key} label={s.label} color={s.color} count={items.length}>
                  {items.map((l) => (
                    <LeadCard key={l.id} lead={l} brokerName={l.broker_id ? brokerById.get(l.broker_id)?.full_name : undefined}
                      lot={firstInterest.has(l.id) ? lotName(firstInterest.get(l.id)) : undefined}
                      onMove={(stage) => (stage === 'lost' ? setLost({ lead: l, reason: '' }) : void move(l, stage))} />
                  ))}
                </Column>
              )
            })}
          </div>
          <DragOverlay>{active ? <CardBody lead={active} dragging /> : null}</DragOverlay>
        </DndContext>
      )}

      <Modal open={!!lost} onClose={() => setLost(null)} title="Marcar como perdido" size="sm"
        footer={<><Button variant="ghost" onClick={() => setLost(null)}>Cancelar</Button><Button variant="danger" onClick={() => { if (lost) void move(lost.lead, 'lost', lost.reason); setLost(null) }}>Confirmar</Button></>}>
        <Field label={`Motivo da perda — ${lost?.lead.full_name ?? ''}`}>
          <Textarea rows={3} value={lost?.reason ?? ''} onChange={(e) => setLost((p) => (p ? { ...p, reason: e.target.value } : p))} />
        </Field>
      </Modal>
      <LeadEditorModal open={creating} onClose={() => setCreating(false)} brokers={data.brokers} lots={data.lots} blocks={data.blocks} onSaved={() => void reload()} />
    </>
  )
}

function Column({ id, label, color, count, children }: { id: string; label: string; color: string; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className={cn('flex w-[280px] shrink-0 snap-start flex-col rounded-xl border bg-sand/60 transition', isOver ? 'border-forest bg-forest-50' : 'border-sand-300/70')}>
      <div className="flex items-center justify-between gap-2 border-b-2 px-3 py-3" style={{ borderColor: color }}>
        <p className="text-sm font-semibold text-forest">{label}</p>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-graphite-500">{count}</span>
      </div>
      <div className="flex min-h-[120px] flex-1 flex-col gap-2 p-2">{children}</div>
    </div>
  )
}

function LeadCard({ lead, brokerName, lot, onMove }: { lead: Lead; brokerName?: string; lot?: string; onMove: (s: LeadStage) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id })
  return (
    <div ref={setNodeRef} className={cn(isDragging && 'opacity-40')}>
      <CardBody lead={lead} brokerName={brokerName} lot={lot} handleProps={{ ...attributes, ...listeners }} onMove={onMove} />
    </div>
  )
}

function CardBody({ lead, brokerName, lot, handleProps, dragging, onMove }: {
  lead: Lead; brokerName?: string; lot?: string; handleProps?: Record<string, unknown>; dragging?: boolean; onMove?: (s: LeadStage) => void
}) {
  const late = lead.next_action_at && new Date(lead.next_action_at) < new Date() && !['won', 'lost'].includes(lead.stage)
  return (
    <div className={cn('rounded-lg border border-sand-300/80 bg-white p-3 shadow-sm', dragging && 'rotate-2 shadow-xl')}>
      <div className="flex items-start gap-2">
        <button {...handleProps} className="mt-0.5 cursor-grab touch-none text-graphite-400 hover:text-forest active:cursor-grabbing" aria-label={`Arrastar ${lead.full_name}`}>
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <Link to={`/admin/leads/${lead.id}`} className="block truncate text-sm font-semibold text-forest hover:underline">{lead.full_name}</Link>
          <p className="text-xs text-graphite-400">{formatPhone(lead.phone)}</p>
          {lot && <p className="mt-1 text-xs font-medium text-olive">{lot}</p>}
          {lead.next_action && (
            <p className={cn('mt-1 flex items-center gap-1 text-xs', late ? 'font-semibold text-red-600' : 'text-graphite-500')}>
              <Clock className="h-3 w-3" />{lead.next_action}{lead.next_action_at && ` · ${formatDate(lead.next_action_at)}`}
            </p>
          )}
        </div>
        {brokerName && (
          <span title={brokerName} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest-50 text-[10px] font-bold text-forest">{initials(brokerName)}</span>
        )}
      </div>
      {onMove && (
        <select value={lead.stage} onChange={(e) => onMove(e.target.value as LeadStage)} className="mt-2 w-full rounded-md border border-sand-200 bg-sand/40 px-2 py-1 text-xs text-graphite-500" aria-label={`Mover ${lead.full_name} para`}>
          {LEAD_STAGES.map((s) => <option key={s.key} value={s.key}>Mover para: {s.label}</option>)}
        </select>
      )}
    </div>
  )
}
