import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BadgeDollarSign, History, ImagePlus, Lock, MoreHorizontal, Pencil, Plus, Trash2, Undo2, Unlock, X,
} from 'lucide-react'
import {
  Badge, Button, Checkbox, ConfirmDialog, Drawer, EmptyState, ErrorBox, Field, Input, Modal, Select, Spinner, Tabs, Textarea,
} from '@/components/ui'
import { PageHeader } from '@/components/admin/common'
import { ReserveModal, SaleModal } from '@/components/admin/modals'
import { LotLegend, LotPlan } from '@/components/map/LotPlan'
import { useCrmData } from '@/hooks/useCrmData'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/context/AuthContext'
import { useSettings } from '@/context/SettingsContext'
import { useToast } from '@/context/ToastContext'
import { backend, toAppError } from '@/services/backend'
import { LOT_STATUS, PROPOSAL_STATUS, RESERVATION_STATUS } from '@/lib/constants'
import { assetUrl, formatArea, formatCurrency, formatDate, formatDateTime, lotDimensions } from '@/lib/format'
import type { Block, Lot, LotStatus } from '@/types'
import type { LotWithBlock } from '@/hooks/useLots'

export default function LotsPage() {
  const crm = useCrmData()
  const { data } = crm
  const { isAdmin } = useAuth()
  const { settings } = useSettings()
  const toast = useToast()
  const [tab, setTab] = useState<'list' | 'plan' | 'blocks'>('list')
  const [status, setStatus] = useState<LotStatus | 'all'>('all')
  const [blockFilter, setBlockFilter] = useState('all')
  const [editor, setEditor] = useState<{ lot?: Lot | null } | null>(null)
  const [reserveLot, setReserveLot] = useState<Lot | null>(null)
  const [saleLot, setSaleLot] = useState<Lot | null>(null)
  const [historyLot, setHistoryLot] = useState<Lot | null>(null)
  const [confirm, setConfirm] = useState<{ kind: 'release' | 'cancel' | 'delete'; lot: Lot } | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [menu, setMenu] = useState<string | null>(null)

  const lots: LotWithBlock[] = useMemo(() => data.lots.map((l) => ({ ...l, block: crm.blockById.get(l.block_id) }))
    .sort((a, b) => (a.block?.code ?? '').localeCompare(b.block?.code ?? '') || a.number.localeCompare(b.number, 'pt-BR', { numeric: true })), [data.lots, crm.blockById])
  const blocks = useMemo(() => [...data.blocks].sort((a, b) => a.code.localeCompare(b.code)), [data.blocks])
  const filtered = lots.filter((l) => (status === 'all' || l.status === status) && (blockFilter === 'all' || l.block_id === blockFilter))
  const counts = useMemo(() => lots.reduce<Partial<Record<LotStatus, number>>>((acc, l) => ({ ...acc, [l.status]: (acc[l.status] ?? 0) + 1 }), {}), [lots])
  const interestCount = useMemo(() => {
    const m = new Map<string, number>()
    for (const i of data.interests) m.set(i.lot_id, (m.get(i.lot_id) ?? 0) + 1)
    return m
  }, [data.interests])
  const activeRes = (lotId: string) => data.reservations.find((r) => r.lot_id === lotId && r.status === 'active')
  const activeSale = (lotId: string) => data.sales.find((s) => s.lot_id === lotId && s.status === 'completed')

  const runConfirm = async () => {
    if (!confirm) return
    setBusy(true)
    try {
      if (confirm.kind === 'release') {
        const r = activeRes(confirm.lot.id)
        if (!r) throw new Error('Reserva ativa não encontrada (o lote pode ser demonstrativo — edite-o e altere a situação).')
        await backend.releaseReservation(r.id, reason || undefined)
        toast('Reserva liberada.')
      } else if (confirm.kind === 'cancel') {
        const s = activeSale(confirm.lot.id)
        if (!s) throw new Error('Venda concluída não encontrada (o lote pode ser demonstrativo — edite-o e altere a situação).')
        await backend.cancelSale(s.id, reason || undefined)
        toast('Venda cancelada; lote disponível novamente.')
      } else {
        await backend.remove('lots', confirm.lot.id)
        toast('Lote excluído.')
      }
      setConfirm(null)
      setReason('')
      await crm.reload()
    } catch (e) {
      toast(toAppError(e).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const actionsFor = (l: Lot) => {
    const items: { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }[] = []
    if (isAdmin) items.push({ label: 'Editar', icon: <Pencil className="h-4 w-4" />, onClick: () => setEditor({ lot: l }) })
    if (l.status === 'available') items.push({ label: 'Reservar', icon: <Lock className="h-4 w-4" />, onClick: () => setReserveLot(l) })
    if (l.status === 'reserved' && activeRes(l.id)) items.push({ label: 'Liberar reserva', icon: <Unlock className="h-4 w-4" />, onClick: () => setConfirm({ kind: 'release', lot: l }) })
    if (isAdmin && (l.status === 'available' || l.status === 'reserved')) items.push({ label: 'Registrar venda', icon: <BadgeDollarSign className="h-4 w-4" />, onClick: () => setSaleLot(l) })
    if (isAdmin && l.status === 'sold' && activeSale(l.id)) items.push({ label: 'Cancelar venda', icon: <Undo2 className="h-4 w-4" />, onClick: () => setConfirm({ kind: 'cancel', lot: l }), danger: true })
    items.push({ label: 'Histórico comercial', icon: <History className="h-4 w-4" />, onClick: () => setHistoryLot(l) })
    if (isAdmin && (l.status === 'available' || l.status === 'unavailable')) items.push({ label: 'Excluir', icon: <Trash2 className="h-4 w-4" />, onClick: () => setConfirm({ kind: 'delete', lot: l }), danger: true })
    return items
  }

  return (
    <>
      <PageHeader title="Gestão de lotes" description="Estoque, situação comercial, reservas e vendas. Alterações aparecem no mapa público em tempo real."
        actions={isAdmin && <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditor({})}>Novo lote</Button>} />
      {settings.plan.is_demo && (
        <p className="mb-4 rounded-lg border border-gold/40 bg-gold-100 px-4 py-2 text-xs text-gold-700">
          Os lotes marcados como <strong>demonstração</strong> pertencem à planta fictícia. Substitua-os pelos lotes oficiais (com os caminhos SVG da planta aprovada) e desative a planta demonstrativa em Configurações → Planta.
        </p>
      )}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={tab} onChange={setTab} items={[{ value: 'list', label: 'Lista' }, { value: 'plan', label: 'Planta' }, ...(isAdmin ? [{ value: 'blocks' as const, label: 'Quadras' }] : [])]} />
        <LotLegend counts={counts} />
      </div>
      {crm.error && <ErrorBox message={crm.error} onRetry={crm.reload} />}

      {crm.loading && !data.lots.length ? <Spinner /> : tab === 'blocks' ? (
        <BlocksManager blocks={blocks} lots={data.lots} onChange={crm.reload} />
      ) : tab === 'plan' ? (
        <LotPlan lots={lots} blocks={blocks} plan={settings.plan} onSelect={(l) => setHistoryLot(l)} className="bg-white" />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <Select value={status} onChange={(e) => setStatus(e.target.value as LotStatus | 'all')} className="h-10 w-48" aria-label="Situação">
              <option value="all">Todas as situações</option>
              {(Object.keys(LOT_STATUS) as LotStatus[]).map((s) => <option key={s} value={s}>{LOT_STATUS[s].label}</option>)}
            </Select>
            <Select value={blockFilter} onChange={(e) => setBlockFilter(e.target.value)} className="h-10 w-44" aria-label="Quadra">
              <option value="all">Todas as quadras</option>
              {blocks.map((b) => <option key={b.id} value={b.id}>Quadra {b.code}</option>)}
            </Select>
          </div>
          {filtered.length === 0 ? <EmptyState title="Nenhum lote" description={isAdmin ? 'Cadastre quadras e lotes para montar o mapa.' : undefined} /> : (
            <div className="overflow-x-auto rounded-xl border border-sand-300/70 bg-white shadow-card">
              <table className="table-luxe">
                <thead><tr><th>Lote</th><th>Situação</th><th>Área</th><th className="hidden md:table-cell">Dimensões</th><th>Valor</th><th className="hidden lg:table-cell">Interessados</th><th className="hidden lg:table-cell">Cliente</th><th /></tr></thead>
                <tbody>
                  {filtered.map((l) => {
                    const res = activeRes(l.id)
                    const sale = activeSale(l.id)
                    const client = sale ? crm.leadById.get(sale.lead_id) : res ? crm.leadById.get(res.lead_id) : undefined
                    return (
                      <tr key={l.id}>
                        <td className="whitespace-nowrap">
                          <p className="font-semibold text-forest">Q{l.block?.code} · Lote {l.number}</p>
                          {l.is_demo && <p className="text-[10px] uppercase tracking-wider text-gold-700">demonstração</p>}
                        </td>
                        <td><Badge color={LOT_STATUS[l.status].color}>{LOT_STATUS[l.status].label}</Badge>{res && <p className="mt-0.5 text-[11px] text-graphite-400">até {formatDate(res.expires_at)}</p>}</td>
                        <td className="whitespace-nowrap">{formatArea(l.area_m2)}</td>
                        <td className="hidden whitespace-nowrap text-graphite-500 md:table-cell">{lotDimensions(l)}</td>
                        <td className="whitespace-nowrap">{l.price_on_request || l.price == null ? <span className="text-graphite-400">Sob consulta</span> : formatCurrency(l.price)}</td>
                        <td className="hidden lg:table-cell">{interestCount.get(l.id) ?? 0}</td>
                        <td className="hidden lg:table-cell">{client ? <Link to={`/admin/leads/${client.id}`} className="text-forest hover:underline">{client.full_name}</Link> : '—'}</td>
                        <td className="relative text-right">
                          <button onClick={() => setMenu(menu === l.id ? null : l.id)} className="rounded-full p-2 text-graphite-400 hover:bg-sand hover:text-forest" aria-label={`Ações do lote ${l.number}`} aria-expanded={menu === l.id}>
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {menu === l.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setMenu(null)} />
                              <div className="absolute right-4 top-10 z-20 w-52 overflow-hidden rounded-lg border border-sand-300 bg-white py-1 text-left shadow-soft">
                                {actionsFor(l).map((a) => (
                                  <button key={a.label} onClick={() => { setMenu(null); a.onClick() }}
                                    className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-sand ${a.danger ? 'text-red-700' : 'text-graphite'}`}>
                                    {a.icon}{a.label}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {isAdmin && <LotEditorModal open={!!editor} lot={editor?.lot} blocks={blocks} onClose={() => setEditor(null)} onSaved={() => void crm.reload()} />}
      <ReserveModal open={!!reserveLot} onClose={() => setReserveLot(null)} lot={reserveLot} leads={data.leads} lots={data.lots} blocks={data.blocks} onSaved={() => void crm.reload()} />
      <SaleModal open={!!saleLot} onClose={() => setSaleLot(null)} lot={saleLot} leads={data.leads} lots={data.lots} blocks={data.blocks}
        defaultLeadId={saleLot ? activeRes(saleLot.id)?.lead_id : undefined}
        defaultAmount={saleLot ? data.proposals.find((p) => p.lot_id === saleLot.id && p.status === 'accepted')?.amount : undefined}
        onSaved={() => void crm.reload()} />
      <LotHistoryDrawer lot={historyLot} onClose={() => setHistoryLot(null)} crm={crm} actions={historyLot ? actionsFor(historyLot).filter((a) => a.label !== 'Histórico comercial') : []} />
      <ConfirmDialog open={!!confirm} danger={confirm?.kind !== 'release'} loading={busy}
        title={confirm?.kind === 'release' ? 'Liberar reserva' : confirm?.kind === 'cancel' ? 'Cancelar venda' : 'Excluir lote'}
        confirmLabel={confirm?.kind === 'delete' ? 'Excluir' : 'Confirmar'}
        message={confirm?.kind === 'delete' ? 'O lote será removido do mapa. Lotes com histórico comercial não podem ser excluídos — marque-os como indisponíveis.' : 'O lote voltará a ficar disponível no mapa público.'}
        onConfirm={() => void runConfirm()} onClose={() => { setConfirm(null); setReason('') }}>
        {confirm?.kind !== 'delete' && <Field label="Motivo (opcional)"><Input value={reason} onChange={(e) => setReason(e.target.value)} /></Field>}
      </ConfirmDialog>
    </>
  )
}

// ---------------------------------------------------------------------------
function LotEditorModal({ open, lot, blocks, onClose, onSaved }: { open: boolean; lot?: Lot | null; blocks: Block[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const blank = () => ({
    block_id: lot?.block_id ?? blocks[0]?.id ?? '', number: lot?.number ?? '', area_m2: num(lot?.area_m2), front_m: num(lot?.front_m), back_m: num(lot?.back_m),
    left_m: num(lot?.left_m), right_m: num(lot?.right_m), price: num(lot?.price), price_on_request: lot?.price_on_request ?? true,
    description: lot?.description ?? '', status: (lot?.status ?? 'available') as LotStatus, svg_path: lot?.svg_path ?? '',
    label_x: num(lot?.label_x), label_y: num(lot?.label_y), images: lot?.images ?? [], is_demo: lot?.is_demo ?? false,
  })
  const [f, setF] = useState(blank)
  const [key, setKey] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const k = `${open}-${lot?.id ?? 'new'}`
  if (k !== key) {
    setKey(k)
    setF(blank())
    setError(null)
  }
  const set = <K extends keyof ReturnType<typeof blank>>(name: K, v: ReturnType<typeof blank>[K]) => setF((p) => ({ ...p, [name]: v }))
  const locked = lot && (lot.status === 'reserved' || lot.status === 'sold')

  const save = async () => {
    if (!f.block_id) return setError('Cadastre e selecione uma quadra.')
    if (!/^[0-9A-Za-z-]{1,10}$/.test(f.number)) return setError('Número inválido (até 10 caracteres, letras/números).')
    const n = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')))
    const values = { area_m2: n(f.area_m2), front_m: n(f.front_m), back_m: n(f.back_m), left_m: n(f.left_m), right_m: n(f.right_m), price: n(f.price), label_x: n(f.label_x), label_y: n(f.label_y) }
    for (const [name, v] of Object.entries(values)) {
      if (v != null && (Number.isNaN(v) || (name !== 'label_x' && name !== 'label_y' && v < 0))) return setError(`Valor inválido em ${name}.`)
    }
    if (!f.price_on_request && values.price == null) return setError('Informe o valor ou marque “sob consulta”.')
    setBusy(true)
    setError(null)
    try {
      const payload: Partial<Lot> = {
        block_id: f.block_id, number: f.number.trim(), ...values, price_on_request: f.price_on_request, description: f.description.trim() || null,
        svg_path: f.svg_path.trim() || null, images: f.images, is_demo: f.is_demo,
      }
      if (!locked) payload.status = f.status
      if (lot) await backend.update('lots', lot.id, payload)
      else await backend.insert('lots', payload)
      toast(lot ? 'Lote atualizado.' : 'Lote cadastrado.')
      onSaved()
      onClose()
    } catch (e) {
      setError(toAppError(e).message)
    } finally {
      setBusy(false)
    }
  }

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    try {
      const urls: string[] = []
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue
        if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name}: máximo de 10 MB.`)
        urls.push((await backend.uploadFile(file, 'lots')).url)
      }
      set('images', [...f.images, ...urls])
    } catch (e) {
      toast(toAppError(e).message, 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={lot ? `Editar lote ${lot.number}` : 'Novo lote'} size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={() => void save()}>Salvar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Quadra" required className="sm:col-span-2">
          <Select value={f.block_id} onChange={(e) => set('block_id', e.target.value)}>
            {!blocks.length && <option value="">Cadastre uma quadra primeiro</option>}
            {blocks.map((b) => <option key={b.id} value={b.id}>Quadra {b.code}{b.name && b.name !== `Quadra ${b.code}` ? ` — ${b.name}` : ''}</option>)}
          </Select>
        </Field>
        <Field label="Número" required><Input value={f.number} onChange={(e) => set('number', e.target.value)} placeholder="025" /></Field>
        <Field label="Área (m²)"><Input inputMode="decimal" value={f.area_m2} onChange={(e) => set('area_m2', e.target.value)} /></Field>
        <Field label="Frente (m)"><Input inputMode="decimal" value={f.front_m} onChange={(e) => set('front_m', e.target.value)} /></Field>
        <Field label="Fundos (m)"><Input inputMode="decimal" value={f.back_m} onChange={(e) => set('back_m', e.target.value)} /></Field>
        <Field label="Lateral esq. (m)"><Input inputMode="decimal" value={f.left_m} onChange={(e) => set('left_m', e.target.value)} /></Field>
        <Field label="Lateral dir. (m)"><Input inputMode="decimal" value={f.right_m} onChange={(e) => set('right_m', e.target.value)} /></Field>
        <Field label="Valor (R$)" className="sm:col-span-2"><Input inputMode="decimal" value={f.price} disabled={f.price_on_request} onChange={(e) => set('price', e.target.value)} /></Field>
        <div className="flex items-end pb-3 sm:col-span-2"><Checkbox checked={f.price_on_request} onChange={(e) => set('price_on_request', e.target.checked)} label="Exibir “Sob consulta” no site" /></div>
        <Field label="Situação" className="sm:col-span-2" hint={locked ? 'Reservas e vendas são alteradas pelas ações do lote.' : 'Para reservar ou vender, use as ações do lote.'}>
          <Select value={f.status} onChange={(e) => set('status', e.target.value as LotStatus)} disabled={!!locked}>
            {(locked ? [f.status] : (['available', 'unavailable'] as LotStatus[])).map((s) => <option key={s} value={s}>{LOT_STATUS[s].label}</option>)}
          </Select>
        </Field>
        <div className="flex items-end pb-3 sm:col-span-2"><Checkbox checked={f.is_demo} onChange={(e) => set('is_demo', e.target.checked)} label="Dado demonstrativo" /></div>
        <Field label="Descrição" className="sm:col-span-4"><Textarea rows={2} value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
        <Field label="Localização na planta (caminho SVG)" className="sm:col-span-2" hint="Atributo “d” do polígono do lote na planta oficial (mesmo sistema de coordenadas do viewBox configurado).">
          <Textarea rows={3} className="font-mono text-xs" value={f.svg_path} onChange={(e) => set('svg_path', e.target.value)} placeholder="M100 100H140V175H100Z" />
        </Field>
        <Field label="Rótulo X"><Input inputMode="decimal" value={f.label_x} onChange={(e) => set('label_x', e.target.value)} /></Field>
        <Field label="Rótulo Y"><Input inputMode="decimal" value={f.label_y} onChange={(e) => set('label_y', e.target.value)} /></Field>
        <div className="sm:col-span-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-graphite-500">Fotos do lote</p>
          <div className="flex flex-wrap gap-2">
            {f.images.map((src, i) => (
              <div key={i} className="relative h-20 w-28 overflow-hidden rounded-lg border border-sand-300">
                <img src={assetUrl(src)} alt="" className="h-full w-full object-cover" />
                <button onClick={() => set('images', f.images.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white" aria-label="Remover foto"><X className="h-3 w-3" /></button>
              </div>
            ))}
            <label className="flex h-20 w-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-sand-300 text-xs text-graphite-400 hover:border-forest hover:text-forest">
              {uploading ? <Spinner className="py-0" label="" /> : <><ImagePlus className="h-5 w-5" />Adicionar</>}
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => void upload(e.target.files)} />
            </label>
          </div>
        </div>
        {error && <p className="text-sm text-red-600 sm:col-span-4">{error}</p>}
      </div>
    </Modal>
  )
}
const num = (v: number | null | undefined) => (v == null ? '' : String(v))

// ---------------------------------------------------------------------------
function BlocksManager({ blocks, lots, onChange }: { blocks: Block[]; lots: Lot[]; onChange: () => Promise<void> }) {
  const toast = useToast()
  const devs = useAsync(() => backend.list('developments'))
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const add = async () => {
    if (!/^[A-Za-z0-9-]{1,10}$/.test(code.trim())) return toast('Código da quadra inválido (ex.: A, B1).', 'error')
    const dev = devs.data?.[0]
    if (!dev) return toast('Nenhum empreendimento cadastrado. Execute o seed do banco.', 'error')
    setBusy(true)
    try {
      await backend.insert('blocks', { development_id: dev.id, code: code.trim().toUpperCase(), name: name.trim() || `Quadra ${code.trim().toUpperCase()}` })
      setCode('')
      setName('')
      await onChange()
      toast('Quadra cadastrada.')
    } catch (e) {
      toast(toAppError(e).message, 'error')
    } finally {
      setBusy(false)
    }
  }
  const remove = async (b: Block) => {
    try {
      await backend.remove('blocks', b.id)
      await onChange()
      toast('Quadra excluída.')
    } catch (e) {
      toast(toAppError(e).message, 'error')
    }
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
      <div className="rounded-xl border border-sand-300/70 bg-white p-5 shadow-card">
        <p className="font-semibold text-forest">Nova quadra</p>
        <div className="mt-4 space-y-3">
          <Field label="Código" required><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="A" maxLength={10} /></Field>
          <Field label="Nome"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Quadra A" /></Field>
          <Button loading={busy} onClick={() => void add()} icon={<Plus className="h-4 w-4" />}>Cadastrar quadra</Button>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-sand-300/70 bg-white shadow-card">
        <table className="table-luxe">
          <thead><tr><th>Quadra</th><th>Lotes</th><th>Disponíveis</th><th /></tr></thead>
          <tbody>
            {blocks.map((b) => {
              const bl = lots.filter((l) => l.block_id === b.id)
              return (
                <tr key={b.id}>
                  <td className="font-semibold text-forest">{b.code}{b.name ? ` — ${b.name}` : ''}{b.is_demo && <span className="ml-2 text-[10px] uppercase text-gold-700">demo</span>}</td>
                  <td>{bl.length}</td>
                  <td>{bl.filter((l) => l.status === 'available').length}</td>
                  <td className="text-right">
                    <button onClick={() => void remove(b)} disabled={bl.length > 0} title={bl.length ? 'Remova os lotes antes' : 'Excluir'} className="rounded p-1.5 text-graphite-400 hover:text-red-600 disabled:opacity-30" aria-label={`Excluir quadra ${b.code}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
function LotHistoryDrawer({ lot, onClose, crm, actions }: {
  lot: Lot | null; onClose: () => void; crm: ReturnType<typeof useCrmData>
  actions: { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }[]
}) {
  const { isAdmin } = useAuth()
  const audit = useAsync(async () => (lot && isAdmin ? backend.list('audit_log', { eq: { table_name: 'lots', record_id: lot.id }, order: { column: 'created_at', ascending: false }, limit: 30 }) : []), [lot?.id, isAdmin])
  if (!lot) return <Drawer open={false} onClose={onClose} title="">{null}</Drawer>
  const d = crm.data
  const leadName = (id: string) => crm.leadById.get(id)?.full_name ?? 'Cliente (sem acesso)'
  const interests = d.interests.filter((i) => i.lot_id === lot.id)
  return (
    <Drawer open={!!lot} onClose={onClose} title={`${crm.lotName(lot.id)}`}>
      <div className="space-y-6 text-sm">
        <div className="flex items-center gap-2"><Badge color={LOT_STATUS[lot.status].color}>{LOT_STATUS[lot.status].label}</Badge><span className="text-graphite-400">{formatArea(lot.area_m2)} · {lotDimensions(lot)}</span></div>
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {actions.map((a) => <Button key={a.label} size="sm" variant={a.danger ? 'ghost' : 'outline'} icon={a.icon} onClick={() => { onClose(); a.onClick() }}>{a.label}</Button>)}
          </div>
        )}
        <Block title={`Interessados (${interests.length})`}>
          {interests.map((i) => <li key={i.id}><Link to={`/admin/leads/${i.lead_id}`} className="text-forest hover:underline">{leadName(i.lead_id)}</Link> · {formatDate(i.created_at)}</li>)}
        </Block>
        <Block title="Reservas">
          {d.reservations.filter((r) => r.lot_id === lot.id).map((r) => <li key={r.id}>{leadName(r.lead_id)} · {RESERVATION_STATUS[r.status]} · até {formatDate(r.expires_at)}</li>)}
        </Block>
        <Block title="Propostas">
          {d.proposals.filter((p) => p.lot_id === lot.id).map((p) => <li key={p.id}>{leadName(p.lead_id)} · {formatCurrency(p.amount)} · {PROPOSAL_STATUS[p.status].label}</li>)}
        </Block>
        <Block title="Vendas">
          {d.sales.filter((s) => s.lot_id === lot.id).map((s) => <li key={s.id}>{leadName(s.lead_id)} · {formatCurrency(s.amount)} · {formatDate(s.sold_at)} · {s.status === 'completed' ? 'Concluída' : 'Cancelada'}</li>)}
        </Block>
        {isAdmin && (
          <Block title="Auditoria de alterações">
            {(audit.data ?? []).map((a) => {
              const from = a.old_data?.status as LotStatus | undefined
              const to = a.new_data?.status as LotStatus | undefined
              return <li key={a.id}>{formatDateTime(a.created_at)} · {a.action === 'insert' ? 'Cadastro' : a.action === 'delete' ? 'Exclusão' : from && to && from !== to ? `Situação: ${LOT_STATUS[from].label} → ${LOT_STATUS[to].label}` : 'Dados atualizados'}</li>
            })}
          </Block>
        )}
      </div>
    </Drawer>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children : [children]
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-graphite-400">{title}</p>
      {items.filter(Boolean).length ? <ul className="space-y-1.5 text-graphite-500">{children}</ul> : <p className="text-graphite-400">Nenhum registro.</p>}
    </div>
  )
}
