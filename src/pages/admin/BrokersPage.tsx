import { useState } from 'react'
import { Mail, Pencil, Plus, Send, Trash2 } from 'lucide-react'
import { Badge, Button, Checkbox, ConfirmDialog, EmptyState, ErrorBox, Field, Input, Modal, Spinner } from '@/components/ui'
import { PageHeader } from '@/components/admin/common'
import { useCrmData } from '@/hooks/useCrmData'
import { useToast } from '@/context/ToastContext'
import { backend, isDemoMode, toAppError } from '@/services/backend'
import { formatCurrency, formatPhone, maskPhone, onlyDigits } from '@/lib/format'
import type { Broker } from '@/types'

export default function BrokersPage() {
  const { data, loading, error, reload } = useCrmData()
  const toast = useToast()
  const [modal, setModal] = useState<{ broker?: Broker | null } | null>(null)
  const [remove, setRemove] = useState<Broker | null>(null)
  const [invite, setInvite] = useState<Broker | null>(null)
  const [busy, setBusy] = useState(false)

  const stats = (b: Broker) => {
    const leads = data.leads.filter((l) => l.broker_id === b.id)
    const sales = data.sales.filter((s) => s.broker_id === b.id && s.status === 'completed')
    return {
      leads: leads.length,
      visits: data.visits.filter((v) => v.broker_id === b.id).length,
      negotiations: leads.filter((l) => ['proposal_sent', 'negotiation'].includes(l.stage)).length,
      sales: sales.length,
      volume: sales.reduce((a, s) => a + s.amount, 0),
    }
  }

  const doRemove = async () => {
    if (!remove) return
    setBusy(true)
    try {
      await backend.remove('brokers', remove.id)
      toast('Corretor removido. Os leads ficaram sem corretor responsável.')
      setRemove(null)
      await reload()
    } catch (e) {
      toast(toAppError(e).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const doInvite = async () => {
    if (!invite?.email) return
    setBusy(true)
    try {
      await backend.inviteUser({ email: invite.email, full_name: invite.full_name, role: 'broker', broker_id: invite.id })
      toast(`Convite enviado para ${invite.email}.`)
      setInvite(null)
      await reload()
    } catch (e) {
      toast(toAppError(e).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Corretores" description="Equipe comercial, acesso ao painel e desempenho."
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setModal({})}>Novo corretor</Button>} />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data.brokers.length ? <Spinner /> : data.brokers.length === 0 ? (
        <EmptyState title="Nenhum corretor cadastrado" description="Cadastre a equipe e envie convites de acesso ao painel." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-sand-300/70 bg-white shadow-card">
          <table className="table-luxe">
            <thead><tr><th>Corretor</th><th className="hidden md:table-cell">Contato</th><th>CRECI</th><th>Leads</th><th className="hidden sm:table-cell">Visitas</th><th className="hidden sm:table-cell">Negociações</th><th>Vendas</th><th className="hidden lg:table-cell">Acesso</th><th /></tr></thead>
            <tbody>
              {data.brokers.map((b) => {
                const s = stats(b)
                return (
                  <tr key={b.id}>
                    <td><p className="font-semibold text-forest">{b.full_name}</p>{!b.active && <Badge color="#9A9A96">Inativo</Badge>}</td>
                    <td className="hidden md:table-cell"><p>{formatPhone(b.phone)}</p><p className="text-xs text-graphite-400">{b.email ?? '—'}</p></td>
                    <td>{b.creci ?? '—'}</td>
                    <td>{s.leads}</td>
                    <td className="hidden sm:table-cell">{s.visits}</td>
                    <td className="hidden sm:table-cell">{s.negotiations}</td>
                    <td className="whitespace-nowrap">{s.sales}{s.volume > 0 && <p className="text-xs text-graphite-400">{formatCurrency(s.volume)}</p>}</td>
                    <td className="hidden lg:table-cell">{b.user_id ? <Badge color="#2F8A4E">Com acesso</Badge> : b.email ? (
                      <Button size="sm" variant="ghost" icon={<Send className="h-3.5 w-3.5" />} onClick={() => setInvite(b)}>Convidar</Button>
                    ) : <span className="text-xs text-graphite-400">Sem e-mail</span>}</td>
                    <td className="whitespace-nowrap text-right">
                      <button onClick={() => setModal({ broker: b })} className="rounded p-1.5 text-graphite-400 hover:text-forest" aria-label={`Editar ${b.full_name}`}><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setRemove(b)} className="rounded p-1.5 text-graphite-400 hover:text-red-600" aria-label={`Remover ${b.full_name}`}><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 text-xs text-graphite-400">
        Corretores acessam apenas os leads atribuídos a eles (regra aplicada no banco por Row Level Security). Para dar acesso ao painel, cadastre o e-mail e clique em “Convidar”
        {isDemoMode ? ' (requer Supabase configurado).' : ' — o corretor recebe um e-mail para definir a senha.'}
      </p>
      <BrokerModal open={!!modal} broker={modal?.broker} onClose={() => setModal(null)} onSaved={() => void reload()} />
      <ConfirmDialog open={!!remove} danger loading={busy} title="Remover corretor" confirmLabel="Remover"
        message={<>Remover <strong>{remove?.full_name}</strong>? Os leads atribuídos ficarão sem corretor. Para manter o histórico, prefira marcá-lo como inativo.</>}
        onConfirm={() => void doRemove()} onClose={() => setRemove(null)} />
      <ConfirmDialog open={!!invite} loading={busy} title="Convidar para o painel" confirmLabel="Enviar convite"
        message={<span className="flex items-center gap-2"><Mail className="h-4 w-4" /> Enviar convite de acesso para <strong>{invite?.email}</strong>?</span>}
        onConfirm={() => void doInvite()} onClose={() => setInvite(null)} />
    </>
  )
}

function BrokerModal({ open, broker, onClose, onSaved }: { open: boolean; broker?: Broker | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const init = () => ({ full_name: broker?.full_name ?? '', phone: broker?.phone ? maskPhone(broker.phone) : '', email: broker?.email ?? '', creci: broker?.creci ?? '', active: broker?.active ?? true })
  const [f, setF] = useState(init)
  const [key, setKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const k = `${open}-${broker?.id ?? 'new'}`
  if (k !== key) { setKey(k); setF(init()); setError(null) }

  const save = async () => {
    if (f.full_name.trim().length < 2) return setError('Informe o nome.')
    const phone = onlyDigits(f.phone)
    if (phone && !/^\d{10,13}$/.test(phone)) return setError('Telefone inválido.')
    if (f.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) return setError('E-mail inválido.')
    setBusy(true)
    try {
      const payload = { full_name: f.full_name.trim(), phone: phone || null, email: f.email.trim().toLowerCase() || null, creci: f.creci.trim() || null, active: f.active }
      if (broker) await backend.update('brokers', broker.id, payload)
      else await backend.insert('brokers', payload)
      toast('Corretor salvo.')
      onSaved()
      onClose()
    } catch (e) {
      setError(toAppError(e).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open={open} onClose={onClose} title={broker ? 'Editar corretor' : 'Novo corretor'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={() => void save()}>Salvar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" required className="sm:col-span-2"><Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></Field>
        <Field label="Telefone"><Input type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: maskPhone(e.target.value) })} /></Field>
        <Field label="E-mail" hint="Usado para o acesso ao painel"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="CRECI"><Input value={f.creci} onChange={(e) => setF({ ...f, creci: e.target.value })} placeholder="Quando aplicável" /></Field>
        <div className="flex items-end pb-3"><Checkbox checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} label="Ativo" /></div>
        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      </div>
    </Modal>
  )
}
