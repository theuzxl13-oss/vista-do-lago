import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Save, Trash2, UserPlus } from 'lucide-react'
import { Badge, Button, Checkbox, ErrorBox, Field, Input, Modal, Select, Spinner, Tabs, Textarea } from '@/components/ui'
import { PageHeader } from '@/components/admin/common'
import { DIFFERENTIAL_ICONS, resolveIcon } from '@/components/site/Differentials'
import { useSettings } from '@/context/SettingsContext'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { useAsync } from '@/hooks/useAsync'
import { backend, isDemoMode, toAppError } from '@/services/backend'
import { formatDateTime, maskPhone, onlyDigits } from '@/lib/format'
import type { Profile, SettingKey, SiteSettings } from '@/types'

type TabKey = 'contact' | 'about' | 'location' | 'differentials' | 'plan' | 'privacy' | 'users' | 'audit'

export default function SettingsPage() {
  const [tab, setTab] = useState<TabKey>('contact')
  return (
    <>
      <PageHeader title="Configurações" description="Conteúdo do site, contato, localização, planta, privacidade e usuários." />
      <Tabs value={tab} onChange={setTab} className="mb-6" items={[
        { value: 'contact', label: 'Contato e WhatsApp' }, { value: 'about', label: 'Empreendimento' }, { value: 'location', label: 'Localização' },
        { value: 'differentials', label: 'Diferenciais' }, { value: 'plan', label: 'Planta' }, { value: 'privacy', label: 'Privacidade' },
        { value: 'users', label: 'Usuários' }, { value: 'audit', label: 'Auditoria' },
      ]} />
      {tab === 'users' ? <UsersTab /> : tab === 'audit' ? <AuditTab /> : <SettingEditor key={tab} k={tab} />}
    </>
  )
}

function SettingEditor({ k }: { k: Exclude<TabKey, 'users' | 'audit'> }) {
  const { settings, reload } = useSettings()
  const toast = useToast()
  const [value, setValue] = useState(() => structuredClone(settings[k]))
  const [busy, setBusy] = useState(false)
  const save = async () => {
    setBusy(true)
    try {
      await backend.saveSetting(k as SettingKey, value as SiteSettings[SettingKey])
      await reload()
      toast('Configurações salvas. O site já reflete as alterações.')
    } catch (e) {
      toast(toAppError(e).message, 'error')
    } finally {
      setBusy(false)
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props: any = { value, onChange: setValue }
  return (
    <div className="max-w-4xl rounded-xl border border-sand-300/70 bg-white p-5 shadow-card sm:p-6">
      {k === 'contact' && <ContactForm {...props} />}
      {k === 'about' && <AboutForm {...props} />}
      {k === 'location' && <LocationForm {...props} />}
      {k === 'differentials' && <DifferentialsForm {...props} />}
      {k === 'plan' && <PlanForm {...props} />}
      {k === 'privacy' && <PrivacyForm {...props} />}
      <div className="mt-6 flex justify-end border-t border-sand-200 pt-4">
        <Button loading={busy} icon={<Save className="h-4 w-4" />} onClick={() => void save()}>Salvar alterações</Button>
      </div>
    </div>
  )
}

interface FormProps<K extends SettingKey> { value: SiteSettings[K]; onChange: (v: SiteSettings[K]) => void }

function ContactForm({ value: v, onChange }: FormProps<'contact'>) {
  const set = (p: Partial<typeof v>) => onChange({ ...v, ...p })
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Número do WhatsApp" hint="Com DDD. Usado no botão flutuante e nas mensagens dos lotes." className="sm:col-span-2">
        <Input type="tel" value={maskPhone(v.whatsapp_number)} onChange={(e) => set({ whatsapp_number: onlyDigits(e.target.value) })} placeholder="(00) 00000-0000" />
      </Field>
      <Field label="Mensagem padrão do WhatsApp" className="sm:col-span-2"><Textarea rows={2} value={v.whatsapp_message} onChange={(e) => set({ whatsapp_message: e.target.value })} /></Field>
      <Field label="Telefone"><Input value={maskPhone(v.phone)} onChange={(e) => set({ phone: onlyDigits(e.target.value) })} /></Field>
      <Field label="E-mail comercial"><Input type="email" value={v.email} onChange={(e) => set({ email: e.target.value })} /></Field>
      <Field label="Horário de atendimento"><Input value={v.business_hours} onChange={(e) => set({ business_hours: e.target.value })} placeholder="Seg. a sáb., 9h às 18h" /></Field>
      <Field label="Instagram (URL)"><Input value={v.instagram} onChange={(e) => set({ instagram: e.target.value })} placeholder="https://instagram.com/…" /></Field>
    </div>
  )
}

function AboutForm({ value: v, onChange }: FormProps<'about'> ) {
  return <AboutAndStats about={v} onChange={onChange} />
}

/** Edita o texto institucional e os cartões informativos (salvos em chaves separadas). */
function AboutAndStats({ about, onChange }: { about: SiteSettings['about']; onChange: (v: SiteSettings['about']) => void }) {
  const { settings, reload } = useSettings()
  const toast = useToast()
  const [stats, setStats] = useState(() => structuredClone(settings.stats))
  const [busy, setBusy] = useState(false)
  const saveStats = async () => {
    setBusy(true)
    try {
      await backend.saveSetting('stats', stats)
      await reload()
      toast('Cartões informativos salvos.')
    } catch (e) {
      toast(toAppError(e).message, 'error')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="space-y-6">
      <Field label="Título da seção"><Input value={about.title} onChange={(e) => onChange({ ...about, title: e.target.value })} /></Field>
      <Field label="Texto (um parágrafo por linha em branco)">
        <Textarea rows={7} value={about.paragraphs.join('\n\n')} onChange={(e) => onChange({ ...about, paragraphs: e.target.value.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) })} />
      </Field>
      <div className="rounded-xl border border-sand-300 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-semibold text-forest">Cartões informativos</p>
          <Button size="sm" variant="outline" loading={busy} icon={<Save className="h-3.5 w-3.5" />} onClick={() => void saveStats()}>Salvar cartões</Button>
        </div>
        <p className="mb-3 text-xs text-graphite-400">Deixe o valor em branco para exibir o texto auxiliar (ex.: “A confirmar”). Não publique dados não confirmados.</p>
        <div className="space-y-3">
          {stats.map((s, i) => (
            <div key={s.key} className="grid gap-2 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-center">
              <Input value={s.label} onChange={(e) => setStats(stats.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} aria-label="Rótulo" />
              <Input value={s.value} placeholder="Valor (ex.: 120.000 m²)" onChange={(e) => setStats(stats.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} aria-label="Valor" />
              <Input value={s.hint} placeholder="Texto auxiliar" onChange={(e) => setStats(stats.map((x, j) => (j === i ? { ...x, hint: e.target.value } : x)))} aria-label="Texto auxiliar" />
              <Checkbox checked={s.visible} onChange={(e) => setStats(stats.map((x, j) => (j === i ? { ...x, visible: e.target.checked } : x)))} label="Visível" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ListEditor({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  return (
    <Field label={label}>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex gap-2">
            <Input value={it} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="rounded p-2 text-graphite-400 hover:text-red-600" aria-label="Remover"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        <Button size="sm" variant="ghost" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => onChange([...items, ''])}>{placeholder ?? 'Adicionar'}</Button>
      </div>
    </Field>
  )
}

function LocationForm({ value: v, onChange }: FormProps<'location'>) {
  const set = (p: Partial<typeof v>) => onChange({ ...v, ...p })
  const coord = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')))
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Endereço" className="sm:col-span-2"><Input value={v.address} onChange={(e) => set({ address: e.target.value })} /></Field>
      <Field label="Cidade"><Input value={v.city} onChange={(e) => set({ city: e.target.value })} /></Field>
      <Field label="Estado (UF)"><Input value={v.state} maxLength={2} onChange={(e) => set({ state: e.target.value.toUpperCase() })} /></Field>
      <Field label="Latitude" hint="Ex.: -23.550520 (copie do Google Maps)"><Input inputMode="decimal" defaultValue={v.latitude ?? ''} onBlur={(e) => set({ latitude: coord(e.target.value) })} /></Field>
      <Field label="Longitude" hint="Ex.: -46.633308"><Input inputMode="decimal" defaultValue={v.longitude ?? ''} onBlur={(e) => set({ longitude: coord(e.target.value) })} /></Field>
      <Field label="Zoom do mapa (1–18)"><Input type="number" min={1} max={18} value={v.zoom} onChange={(e) => set({ zoom: Number(e.target.value) || 14 })} /></Field>
      <div />
      <ListEditor label="Vias de acesso" items={v.access_roads} onChange={(access_roads) => set({ access_roads })} placeholder="Adicionar via" />
      <ListEditor label="Rodovias próximas" items={v.highways} onChange={(highways) => set({ highways })} placeholder="Adicionar rodovia" />
      <Field label="Pontos de interesse e distâncias" className="sm:col-span-2">
        <div className="space-y-2">
          {v.points_of_interest.map((p, i) => (
            <div key={i} className="flex gap-2">
              <Input value={p.name} placeholder="Local" onChange={(e) => set({ points_of_interest: v.points_of_interest.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
              <Input value={p.distance} placeholder="Distância (ex.: 5 km)" className="w-44" onChange={(e) => set({ points_of_interest: v.points_of_interest.map((x, j) => (j === i ? { ...x, distance: e.target.value } : x)) })} />
              <button onClick={() => set({ points_of_interest: v.points_of_interest.filter((_, j) => j !== i) })} className="rounded p-2 text-graphite-400 hover:text-red-600" aria-label="Remover"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <Button size="sm" variant="ghost" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => set({ points_of_interest: [...v.points_of_interest, { name: '', distance: '' }] })}>Adicionar ponto</Button>
        </div>
      </Field>
    </div>
  )
}

const ICON_CHOICES = Object.keys(DIFFERENTIAL_ICONS)

function DifferentialsForm({ value: v, onChange }: FormProps<'differentials'>) {
  const upd = (i: number, p: Partial<(typeof v)[number]>) => onChange(v.map((x, j) => (j === i ? { ...x, ...p } : x)))
  const move = (i: number, d: -1 | 1) => {
    const a = [...v]
    ;[a[i], a[i + d]] = [a[i + d], a[i]]
    onChange(a)
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-graphite-400">Publique apenas características confirmadas. Infraestrutura, segurança e lazer podem ser adicionados quando definidos.</p>
      {v.map((d, i) => {
        const Icon = resolveIcon(d.icon)
        return (
          <div key={i} className="grid gap-2 rounded-lg border border-sand-300 p-3 sm:grid-cols-[auto_160px_1fr] sm:items-start">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-forest text-gold"><Icon className="h-5 w-5" /></div>
            <Select value={d.icon} onChange={(e) => upd(i, { icon: e.target.value })} aria-label="Ícone">
              {ICON_CHOICES.map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
            <div className="space-y-2">
              <Input value={d.title} onChange={(e) => upd(i, { title: e.target.value })} aria-label="Título" />
              <Textarea rows={2} value={d.description} onChange={(e) => upd(i, { description: e.target.value })} aria-label="Descrição" />
              <div className="flex flex-wrap items-center gap-3">
                <Checkbox checked={d.visible} onChange={(e) => upd(i, { visible: e.target.checked })} label="Visível" />
                <button onClick={() => move(i, -1)} disabled={i === 0} className="text-graphite-400 hover:text-forest disabled:opacity-30" aria-label="Subir"><ArrowUp className="h-4 w-4" /></button>
                <button onClick={() => move(i, 1)} disabled={i === v.length - 1} className="text-graphite-400 hover:text-forest disabled:opacity-30" aria-label="Descer"><ArrowDown className="h-4 w-4" /></button>
                <button onClick={() => onChange(v.filter((_, j) => j !== i))} className="ml-auto text-graphite-400 hover:text-red-600" aria-label="Remover"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        )
      })}
      <Button variant="outline" icon={<Plus className="h-4 w-4" />} onClick={() => onChange([...v, { icon: 'Sparkles', title: 'Novo diferencial', description: '', visible: false }])}>Adicionar diferencial</Button>
    </div>
  )
}

function PlanForm({ value: v, onChange }: FormProps<'plan'>) {
  const toast = useToast()
  const [uploading, setUploading] = useState(false)
  const set = (p: Partial<typeof v>) => onChange({ ...v, ...p })
  const upload = async (file?: File) => {
    if (!file) return
    setUploading(true)
    try {
      set({ image_url: (await backend.uploadFile(file, 'plan')).url })
    } catch (e) {
      toast(toAppError(e).message, 'error')
    } finally {
      setUploading(false)
    }
  }
  return (
    <div className="space-y-4">
      <Checkbox checked={v.is_demo} onChange={(e) => set({ is_demo: e.target.checked })} label="Exibir como planta fictícia/demonstrativa (mostra aviso no site e a ambientação ilustrativa)" />
      <Field label="Aviso exibido no site"><Textarea rows={2} value={v.notice} onChange={(e) => set({ notice: e.target.value })} /></Field>
      <Field label="Sistema de coordenadas (viewBox)" hint="Largura e altura da planta oficial em unidades SVG, ex.: 0 0 1200 800. Os caminhos dos lotes usam esse sistema.">
        <Input value={v.view_box} onChange={(e) => set({ view_box: e.target.value })} className="font-mono" />
      </Field>
      <Field label="Imagem da planta oficial (fundo)" hint="Opcional. Os lotes são desenhados por cima com cores semitransparentes.">
        <div className="flex flex-wrap items-center gap-2">
          <Input value={v.image_url} onChange={(e) => set({ image_url: e.target.value })} placeholder="https://…" />
          <label className="inline-flex h-11 cursor-pointer items-center rounded-full border border-forest/25 px-4 text-sm font-semibold text-forest hover:bg-forest/5">
            {uploading ? 'Enviando…' : 'Enviar imagem'}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => void upload(e.target.files?.[0])} />
          </label>
        </div>
      </Field>
      <div className="rounded-lg bg-sand/60 p-4 text-xs leading-relaxed text-graphite-500">
        <strong className="text-forest">Como substituir pela planta oficial:</strong> (1) exporte a planta aprovada em SVG; (2) informe aqui o viewBox do arquivo e, se quiser, a imagem de fundo;
        (3) em Lotes, cadastre cada lote com o caminho SVG (atributo <code>d</code>) do polígono correspondente e as medidas oficiais; (4) exclua os lotes de demonstração e desmarque a opção de planta fictícia.
      </div>
    </div>
  )
}

function PrivacyForm({ value: v, onChange }: FormProps<'privacy'>) {
  const set = (p: Partial<typeof v>) => onChange({ ...v, ...p })
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Controlador dos dados (razão social)"><Input value={v.controller_name} onChange={(e) => set({ controller_name: e.target.value })} /></Field>
      <Field label="CNPJ/CPF"><Input value={v.controller_document} onChange={(e) => set({ controller_document: e.target.value })} /></Field>
      <Field label="E-mail do encarregado (DPO)" className="sm:col-span-2"><Input type="email" value={v.dpo_email} onChange={(e) => set({ dpo_email: e.target.value })} /></Field>
      <Field label="Política de retenção" className="sm:col-span-2"><Textarea rows={3} value={v.retention} onChange={(e) => set({ retention: e.target.value })} /></Field>
    </div>
  )
}

// ---------------------------------------------------------------------------
function UsersTab() {
  const toast = useToast()
  const { user } = useAuth()
  const profiles = useAsync(() => backend.list('profiles', { order: { column: 'created_at' } }))
  const brokers = useAsync(() => backend.list('brokers', { order: { column: 'full_name' } }))
  const [invite, setInvite] = useState(false)
  const [form, setForm] = useState({ email: '', full_name: '', role: 'broker' as 'admin' | 'broker', broker_id: '' })
  const [busy, setBusy] = useState(false)

  const patch = async (p: Profile, change: Partial<Profile>) => {
    if (p.id === user?.id && (change.role === 'broker' || change.active === false)) return toast('Você não pode remover seu próprio acesso de administrador.', 'error')
    try {
      await backend.update('profiles', p.id, change)
      if (change.broker_id) await backend.update('brokers', change.broker_id, { user_id: p.id }).catch(() => undefined)
      await profiles.reload()
      toast('Usuário atualizado.')
    } catch (e) {
      toast(toAppError(e).message, 'error')
    }
  }

  const send = async () => {
    setBusy(true)
    try {
      await backend.inviteUser({ email: form.email.trim(), full_name: form.full_name.trim(), role: form.role, broker_id: form.broker_id || null })
      toast('Convite enviado.')
      setInvite(false)
      await profiles.reload()
    } catch (e) {
      toast(toAppError(e).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  if (profiles.loading && !profiles.data) return <Spinner />
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-graphite-400">
          Novos usuários ficam <strong>inativos</strong> até serem liberados aqui. Corretores precisam estar vinculados a um cadastro de corretor para ver seus leads.
        </p>
        <Button icon={<UserPlus className="h-4 w-4" />} onClick={() => setInvite(true)} disabled={isDemoMode}>Convidar usuário</Button>
      </div>
      {profiles.error && <ErrorBox message={profiles.error} onRetry={profiles.reload} />}
      <div className="overflow-x-auto rounded-xl border border-sand-300/70 bg-white shadow-card">
        <table className="table-luxe">
          <thead><tr><th>Usuário</th><th>Papel</th><th>Corretor vinculado</th><th>Status</th></tr></thead>
          <tbody>
            {(profiles.data ?? []).map((p) => (
              <tr key={p.id}>
                <td><p className="font-semibold text-forest">{p.full_name ?? '—'}</p><p className="text-xs text-graphite-400">{p.email}</p></td>
                <td>
                  <Select value={p.role} onChange={(e) => void patch(p, { role: e.target.value as Profile['role'] })} className="h-9 w-40" aria-label="Papel">
                    <option value="admin">Administrador</option>
                    <option value="broker">Corretor</option>
                  </Select>
                </td>
                <td>
                  <Select value={p.broker_id ?? ''} onChange={(e) => void patch(p, { broker_id: e.target.value || null })} className="h-9 w-56" aria-label="Corretor vinculado">
                    <option value="">Nenhum</option>
                    {(brokers.data ?? []).map((b) => <option key={b.id} value={b.id}>{b.full_name}</option>)}
                  </Select>
                </td>
                <td>
                  <button onClick={() => void patch(p, { active: !p.active })} aria-label={p.active ? 'Desativar' : 'Ativar'}>
                    <Badge color={p.active ? '#2F8A4E' : '#A3473E'}>{p.active ? 'Ativo' : 'Inativo — clique para liberar'}</Badge>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={invite} onClose={() => setInvite(false)} title="Convidar usuário"
        footer={<><Button variant="ghost" onClick={() => setInvite(false)}>Cancelar</Button><Button loading={busy} disabled={!form.email} onClick={() => void send()}>Enviar convite</Button></>}>
        <div className="space-y-4">
          <Field label="Nome"><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
          <Field label="E-mail" required><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Papel">
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'admin' | 'broker' })}>
              <option value="broker">Corretor</option><option value="admin">Administrador</option>
            </Select>
          </Field>
          {form.role === 'broker' && (
            <Field label="Cadastro de corretor">
              <Select value={form.broker_id} onChange={(e) => setForm({ ...form, broker_id: e.target.value })}>
                <option value="">Selecione…</option>
                {(brokers.data ?? []).filter((b) => !b.user_id).map((b) => <option key={b.id} value={b.id}>{b.full_name}</option>)}
              </Select>
            </Field>
          )}
        </div>
      </Modal>
    </div>
  )
}

const TABLE_LABEL: Record<string, string> = {
  lots: 'Lote', leads: 'Lead', visits: 'Visita', proposals: 'Proposta', reservations: 'Reserva', sales: 'Venda',
  brokers: 'Corretor', profiles: 'Usuário', blocks: 'Quadra', site_settings: 'Configuração', media: 'Imagem',
}

function AuditTab() {
  const audit = useAsync(() => backend.list('audit_log', { order: { column: 'created_at', ascending: false }, limit: 200 }))
  const [table, setTable] = useState('all')
  const rows = (audit.data ?? []).filter((a) => table === 'all' || a.table_name === table)
  const describe = (a: NonNullable<typeof audit.data>[number]) => {
    const o = a.old_data ?? {}, n = a.new_data ?? {}
    if (a.action !== 'update') return a.action === 'insert' ? 'Criado' : 'Excluído'
    const changed = Object.keys(n).filter((k) => !['updated_at', 'stage_changed_at'].includes(k) && JSON.stringify(o[k]) !== JSON.stringify(n[k]))
    return changed.length ? `Alterado: ${changed.slice(0, 5).join(', ')}` : 'Atualizado'
  }
  return (
    <div>
      <Select value={table} onChange={(e) => setTable(e.target.value)} className="mb-4 h-10 w-56" aria-label="Filtrar">
        <option value="all">Todos os registros</option>
        {Object.entries(TABLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </Select>
      {audit.loading && !audit.data ? <Spinner /> : (
        <div className="overflow-x-auto rounded-xl border border-sand-300/70 bg-white shadow-card">
          <table className="table-luxe">
            <thead><tr><th>Data</th><th>Registro</th><th>Ação</th><th>Usuário</th></tr></thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap">{formatDateTime(a.created_at)}</td>
                  <td>{TABLE_LABEL[a.table_name] ?? a.table_name} <span className="text-xs text-graphite-400">{String((a.new_data ?? a.old_data)?.full_name ?? (a.new_data ?? a.old_data)?.number ?? a.record_id ?? '').slice(0, 40)}</span></td>
                  <td>{describe(a)}</td>
                  <td className="text-xs text-graphite-400">{a.actor ? a.actor.slice(0, 8) : 'sistema / site'}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={4} className="py-8 text-center text-graphite-400">Sem registros.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
