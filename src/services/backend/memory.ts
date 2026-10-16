/**
 * Backend em MEMÓRIA para o MODO DEMONSTRAÇÃO (quando o Supabase não está configurado).
 * Reproduz as regras do banco (permissões, reservas, vendas, histórico) para que
 * o site e o painel possam ser avaliados no navegador. Nada é persistido:
 * os dados existem apenas enquanto a aba estiver aberta.
 */
import type {
  AuditEntry, Lead, LeadActivity, Lot, Profile, SettingKey, SiteSettings, TableName,
} from '@/types'
import { buildDemoDb, DEMO_ADMIN_ID, DEMO_BROKER_USER_ID, type DemoDb } from '@/demo/crm'
import { DEFAULT_SETTINGS } from '@/demo/defaults'
import { onlyDigits } from '@/lib/format'
import { AppError, type Backend, type ListOptions, type Row, type SessionUser } from './types'

const ADMIN_TABLES: TableName[] = ['developments', 'blocks', 'lots', 'media', 'brokers']
const LEAD_LINKED: TableName[] = ['lead_lot_interests', 'lead_activities', 'visits', 'proposals', 'reservations', 'sales']
const AUDITED: TableName[] = ['lots', 'leads', 'visits', 'proposals', 'reservations', 'sales', 'brokers', 'blocks', 'media']

export const DEMO_ACCOUNTS = {
  admin: { email: 'admin@demo.local', userId: DEMO_ADMIN_ID },
  broker: { email: 'corretor@demo.local', userId: DEMO_BROKER_USER_ID },
}

export function createMemoryBackend(): Backend {
  const db: DemoDb & { audit: AuditEntry[] } = { ...buildDemoDb(true), audit: [] }
  const settings: SiteSettings = structuredClone(DEFAULT_SETTINGS)
  let session: SessionUser | null = null
  const authListeners = new Set<(u: SessionUser | null) => void>()
  const lotListeners = new Set<() => void>()
  let auditSeq = 0

  const now = () => new Date().toISOString()
  const uid = () => crypto.randomUUID()
  const delay = <T,>(v: T) => new Promise<T>((res) => setTimeout(() => res(v), 120))
  const table = <K extends TableName>(t: K) =>
    (t === 'audit_log' ? db.audit : (db as unknown as Record<string, unknown[]>)[t]) as Row<K>[]

  const profile = (): Profile | null =>
    session ? db.profiles.find((p) => p.id === session!.id && p.active) ?? null : null
  const isAdmin = () => profile()?.role === 'admin'
  const brokerId = () => profile()?.broker_id ?? null
  const isStaff = () => !!profile() && (isAdmin() || !!brokerId())
  const canAccessLead = (leadId: string) => {
    if (isAdmin()) return true
    const b = brokerId()
    return !!b && db.leads.some((l) => l.id === leadId && l.broker_id === b)
  }
  const deny = (): never => {
    throw new AppError('not_authorized', 'Você não tem permissão para esta operação.')
  }

  function canRead(t: TableName, row: Record<string, unknown>): boolean {
    if (t === 'leads') return isAdmin() || (!!brokerId() && row.broker_id === brokerId())
    if (LEAD_LINKED.includes(t)) return canAccessLead(String(row.lead_id))
    if (t === 'brokers') return isStaff()
    if (t === 'profiles') return isAdmin() || row.id === session?.id
    if (t === 'audit_log') return isAdmin()
    if (t === 'media') return !!row.published || isStaff()
    return true
  }

  function audit(t: TableName, action: string, oldRow: unknown, newRow: unknown) {
    if (!AUDITED.includes(t)) return
    const rec = (newRow ?? oldRow) as { id?: string }
    db.audit.unshift({
      id: ++auditSeq, table_name: t, record_id: rec?.id ?? null, action, actor: session?.id ?? null,
      old_data: (oldRow as Record<string, unknown>) ?? null, new_data: (newRow as Record<string, unknown>) ?? null,
      created_at: now(),
    })
  }

  function activity(leadId: string, type: LeadActivity['type'], description: string, metadata: Record<string, unknown> | null = null, createdBy: string | null = session?.id ?? null) {
    db.lead_activities.push({ id: uid(), lead_id: leadId, type, description, metadata, created_by: createdBy, created_at: now() })
  }

  function setLotStatus(lotId: string, status: Lot['status']) {
    const lot = db.lots.find((l) => l.id === lotId)!
    const old = { ...lot }
    lot.status = status
    lot.updated_at = now()
    audit('lots', 'update', old, { ...lot })
    lotListeners.forEach((cb) => cb())
  }

  function checkWrite(t: TableName, op: 'insert' | 'update' | 'delete', row: Record<string, unknown>, patch?: Record<string, unknown>) {
    if (!session) deny()
    if (ADMIN_TABLES.includes(t) && !isAdmin()) deny()
    if (t === 'profiles') {
      if (op === 'insert') deny()
      if (!isAdmin()) {
        if (row.id !== session!.id) deny()
        if (patch && ['role', 'active', 'broker_id', 'email'].some((k) => k in patch && patch[k] !== row[k])) {
          throw new AppError('not_authorized', 'Somente administradores podem alterar papel, vínculo ou ativação.')
        }
      }
    }
    if (t === 'leads') {
      if (op === 'delete' && !isAdmin()) deny()
      if (op === 'insert' && !isAdmin() && (!isStaff() || row.broker_id !== brokerId())) deny()
      if (op === 'update') {
        if (!canAccessLead(String(row.id))) deny()
        if (patch && 'broker_id' in patch && patch.broker_id !== row.broker_id && !isAdmin()) {
          throw new AppError('not_authorized', 'Somente administradores podem reatribuir leads.')
        }
      }
    }
    if (LEAD_LINKED.includes(t)) {
      if (['reservations', 'sales'].includes(t)) deny() // apenas via fluxos
      if (t === 'lead_activities' && op !== 'insert') deny()
      if (op === 'delete' && t !== 'lead_lot_interests' && !isAdmin()) deny()
      if (!canAccessLead(String(row.lead_id))) deny()
    }
    if (t === 'audit_log') deny()
  }

  function guardLot(old: Lot, patch: Partial<Lot>) {
    if (patch.status && patch.status !== old.status) {
      if (patch.status === 'reserved' || patch.status === 'sold')
        throw new AppError('lot_workflow_required', 'Use as ações de reserva/venda para alterar a situação deste lote.')
      const backed =
        (old.status === 'reserved' && db.reservations.some((r) => r.lot_id === old.id && r.status === 'active')) ||
        (old.status === 'sold' && db.sales.some((s) => s.lot_id === old.id && s.status === 'completed'))
      if (backed) throw new AppError('lot_workflow_required', 'Libere a reserva ou cancele a venda antes de alterar este lote.')
    }
  }

  const backend: Backend = {
    mode: 'demo',

    async list<K extends TableName>(t: K, opts: ListOptions = {}) {
      let rows = table(t).filter((r) => canRead(t, r as unknown as Record<string, unknown>))
      for (const [k, v] of Object.entries(opts.eq ?? {})) {
        rows = rows.filter((r) => (r as unknown as Record<string, unknown>)[k] === v)
      }
      if (opts.order) {
        const { column, ascending = true } = opts.order
        rows = [...rows].sort((a, b) => {
          const av = (a as unknown as Record<string, unknown>)[column] as string | number
          const bv = (b as unknown as Record<string, unknown>)[column] as string | number
          if (av == null) return 1
          if (bv == null) return -1
          return (av < bv ? -1 : av > bv ? 1 : 0) * (ascending ? 1 : -1)
        })
      }
      if (opts.limit) rows = rows.slice(0, opts.limit)
      return delay(structuredClone(rows))
    },

    async get<K extends TableName>(t: K, id: string) {
      const row = table(t).find((r) => (r as { id: unknown }).id === id)
      return delay(row && canRead(t, row as unknown as Record<string, unknown>) ? structuredClone(row) : null)
    },

    async insert<K extends TableName>(t: K, input: Partial<Row<K>>) {
      const row = { id: uid(), created_at: now(), updated_at: now(), ...input } as Record<string, unknown>
      if (t === 'leads') {
        Object.assign(row, { stage: row.stage ?? 'new', source: row.source ?? 'manual', stage_changed_at: now(), created_by: session?.id ?? null })
        if (!row.phone && !row.email) throw new AppError('invalid', 'Informe telefone ou e-mail.')
      }
      if (t === 'lead_activities') row.created_by = session?.id ?? null
      checkWrite(t, 'insert', row)
      if (t === 'lead_lot_interests' && db.lead_lot_interests.some((x) => x.lead_id === row.lead_id && x.lot_id === row.lot_id)) {
        throw new AppError('duplicate', 'Este lote já está na lista de interesses.')
      }
      if (t === 'blocks' && db.blocks.some((b) => b.code.toLowerCase() === String(row.code).toLowerCase())) {
        throw new AppError('duplicate', 'Já existe uma quadra com este código.')
      }
      if (t === 'lots' && db.lots.some((l) => l.block_id === row.block_id && l.number === row.number)) {
        throw new AppError('duplicate', 'Já existe um lote com este número nesta quadra.')
      }
      if (t === 'lots' && row.status && ['reserved', 'sold'].includes(String(row.status))) {
        throw new AppError('lot_workflow_required', 'Use as ações de reserva/venda para alterar a situação deste lote.')
      }
      ;(table(t) as unknown[]).push(row)
      audit(t, 'insert', null, row)
      if (t === 'leads') activity(String(row.id), 'system', 'Lead cadastrado', { source: row.source })
      if (t === 'lots') lotListeners.forEach((cb) => cb())
      return delay(structuredClone(row) as unknown as Row<K>)
    },

    async update<K extends TableName>(t: K, id: string, patch: Partial<Row<K>>) {
      const row = table(t).find((r) => (r as { id: unknown }).id === id) as Record<string, unknown> | undefined
      if (!row || !canRead(t, row)) throw new AppError('not_authorized', 'Registro não encontrado ou sem permissão para alterar.')
      checkWrite(t, 'update', row, patch as Record<string, unknown>)
      if (t === 'lots') guardLot(row as unknown as Lot, patch as Partial<Lot>)
      const old = { ...row }
      Object.assign(row, patch, { updated_at: now() })
      if (t === 'leads') {
        const lead = row as unknown as Lead
        if (old.stage !== lead.stage) {
          lead.stage_changed_at = now()
          activity(id, 'stage_change', 'Etapa alterada', { from: old.stage, to: lead.stage })
        }
        if (old.broker_id !== lead.broker_id) activity(id, 'assignment', 'Corretor responsável alterado', { from: old.broker_id, to: lead.broker_id })
      }
      audit(t, 'update', old, { ...row })
      if (t === 'lots') lotListeners.forEach((cb) => cb())
      return delay(structuredClone(row) as unknown as Row<K>)
    },

    async remove(t, id) {
      const arr = table(t) as unknown as Record<string, unknown>[]
      const idx = arr.findIndex((r) => r.id === id)
      if (idx < 0 || !canRead(t, arr[idx])) throw new AppError('not_authorized', 'Registro não encontrado.')
      checkWrite(t, 'delete', arr[idx])
      if (t === 'lots') {
        const lot = arr[idx] as unknown as Lot
        if (lot.status === 'reserved' || lot.status === 'sold') throw new AppError('in_use', 'Não é possível excluir um lote reservado ou vendido.')
        if (db.proposals.some((p) => p.lot_id === id) || db.reservations.some((r) => r.lot_id === id) || db.sales.some((s) => s.lot_id === id))
          throw new AppError('in_use', 'Este lote possui histórico comercial. Marque-o como indisponível.')
      }
      if (t === 'blocks' && db.lots.some((l) => l.block_id === id)) throw new AppError('in_use', 'Remova os lotes desta quadra antes de excluí-la.')
      if (t === 'leads' && (db.reservations.some((r) => r.lead_id === id) || db.sales.some((s) => s.lead_id === id)))
        throw new AppError('in_use', 'Este lead possui reservas ou vendas e não pode ser excluído.')
      const [old] = arr.splice(idx, 1)
      if (t === 'leads') {
        for (const lt of LEAD_LINKED) {
          const list = table(lt) as unknown as Record<string, unknown>[]
          for (let i = list.length - 1; i >= 0; i--) if (list[i].lead_id === id) list.splice(i, 1)
        }
      }
      audit(t, 'delete', old, null)
      if (t === 'lots') lotListeners.forEach((cb) => cb())
      await delay(null)
    },

    async getSettings() {
      return delay(structuredClone(settings))
    },
    async saveSetting<K extends SettingKey>(key: K, value: SiteSettings[K]) {
      if (!isAdmin()) deny()
      settings[key] = structuredClone(value)
      await delay(null)
    },

    async submitLead(input) {
      if (input.website) return delay(undefined)
      if (!input.consent) throw new AppError('consent_required', 'É necessário aceitar a política de privacidade.')
      const phone = onlyDigits(input.phone)
      if (!/^[0-9]{10,13}$/.test(phone)) throw new AppError('invalid_phone', 'Informe um telefone válido com DDD.')
      const email = input.email?.trim().toLowerCase() || null
      const existing = db.leads.find((l) => (l.phone === phone || (email && l.email === email)) && !['won', 'lost'].includes(l.stage))
      let leadId: string
      if (existing) {
        leadId = existing.id
        activity(leadId, 'system', 'Novo contato recebido pelo site', { source: input.source, message: input.message || null, lot_id: input.lot_id ?? null }, null)
      } else {
        leadId = uid()
        db.leads.push({
          id: leadId, full_name: input.full_name.trim(), phone, whatsapp: phone, email, source: input.source,
          source_detail: input.page ?? null, utm: input.utm ?? null, stage: 'new', broker_id: null,
          message: input.message?.trim() || null, notes: null, next_action: null, next_action_at: null,
          lost_reason: null, consent: true, consent_at: now(), stage_changed_at: now(), created_by: null,
          created_at: now(), updated_at: now(),
        })
        activity(leadId, 'system', 'Lead cadastrado', { source: input.source }, null)
      }
      if (input.lot_id && db.lots.some((l) => l.id === input.lot_id) && !db.lead_lot_interests.some((x) => x.lead_id === leadId && x.lot_id === input.lot_id)) {
        db.lead_lot_interests.push({ id: uid(), lead_id: leadId, lot_id: input.lot_id, created_at: now() })
      }
      await delay(null)
    },

    async reserveLot(lotId, leadId, expiresAt, notes) {
      if (!isStaff()) deny()
      if (!canAccessLead(leadId)) throw new AppError('lead_not_accessible', 'Você não tem acesso a este lead.')
      if (new Date(expiresAt).getTime() <= Date.now()) throw new AppError('invalid_expiration', 'A validade da reserva deve ser uma data futura.')
      const lot = db.lots.find((l) => l.id === lotId)
      if (!lot) throw new AppError('lot_not_found', 'Lote não encontrado.')
      if (lot.status !== 'available') throw new AppError('lot_not_available', 'Este lote não está disponível.')
      const lead = db.leads.find((l) => l.id === leadId)!
      const id = uid()
      db.reservations.push({ id, lot_id: lotId, lead_id: leadId, broker_id: lead.broker_id ?? brokerId(), expires_at: expiresAt, status: 'active', notes: notes ?? null, created_by: session!.id, created_at: now(), updated_at: now() })
      audit('reservations', 'insert', null, { id, lot_id: lotId, lead_id: leadId })
      setLotStatus(lotId, 'reserved')
      if (!db.lead_lot_interests.some((x) => x.lead_id === leadId && x.lot_id === lotId)) db.lead_lot_interests.push({ id: uid(), lead_id: leadId, lot_id: lotId, created_at: now() })
      activity(leadId, 'reservation', 'Lote reservado', { lot_id: lotId, reservation_id: id, expires_at: expiresAt })
      return delay(id)
    },

    async releaseReservation(id, reason) {
      if (!isStaff()) deny()
      const r = db.reservations.find((x) => x.id === id)
      if (!r) throw new AppError('reservation_not_found', 'Reserva não encontrada.')
      if (!canAccessLead(r.lead_id)) throw new AppError('lead_not_accessible', 'Você não tem acesso a este lead.')
      if (r.status !== 'active') throw new AppError('reservation_not_active', 'Esta reserva não está mais ativa.')
      r.status = 'released'
      if (reason) r.notes = [r.notes, `Liberada: ${reason}`].filter(Boolean).join('\n')
      audit('reservations', 'update', null, { ...r })
      if (db.lots.find((l) => l.id === r.lot_id)?.status === 'reserved') setLotStatus(r.lot_id, 'available')
      activity(r.lead_id, 'reservation', 'Reserva liberada', { lot_id: r.lot_id, reservation_id: r.id, reason: reason ?? null })
      await delay(null)
    },

    async registerSale(lotId, leadId, amount, soldAt, notes) {
      if (!isAdmin()) deny()
      if (!(amount > 0)) throw new AppError('invalid_amount', 'Informe um valor válido.')
      const lead = db.leads.find((l) => l.id === leadId)
      if (!lead) throw new AppError('lead_not_found', 'Lead não encontrado.')
      const lot = db.lots.find((l) => l.id === lotId)
      if (!lot) throw new AppError('lot_not_found', 'Lote não encontrado.')
      if (lot.status === 'sold' || lot.status === 'unavailable') throw new AppError('lot_not_available', 'Este lote não está disponível.')
      const res = db.reservations.find((r) => r.lot_id === lotId && r.status === 'active')
      if (res) {
        if (res.lead_id !== leadId) throw new AppError('lot_reserved_for_other_lead', 'Este lote está reservado para outro cliente.')
        res.status = 'converted'
      }
      const id = uid()
      db.sales.push({ id, lot_id: lotId, lead_id: leadId, broker_id: lead.broker_id, amount, sold_at: soldAt, status: 'completed', notes: notes ?? null, created_by: session!.id, created_at: now(), updated_at: now() })
      audit('sales', 'insert', null, { id, lot_id: lotId, lead_id: leadId, amount })
      setLotStatus(lotId, 'sold')
      if (lead.stage !== 'won') {
        activity(leadId, 'stage_change', 'Etapa alterada', { from: lead.stage, to: 'won' })
        lead.stage = 'won'
        lead.stage_changed_at = now()
      }
      if (!db.lead_lot_interests.some((x) => x.lead_id === leadId && x.lot_id === lotId)) db.lead_lot_interests.push({ id: uid(), lead_id: leadId, lot_id: lotId, created_at: now() })
      activity(leadId, 'sale', 'Venda registrada', { lot_id: lotId, sale_id: id, amount })
      return delay(id)
    },

    async cancelSale(id, reason) {
      if (!isAdmin()) deny()
      const s = db.sales.find((x) => x.id === id)
      if (!s || s.status !== 'completed') throw new AppError('sale_not_active', 'Esta venda não está ativa.')
      s.status = 'canceled'
      if (reason) s.notes = [s.notes, `Cancelada: ${reason}`].filter(Boolean).join('\n')
      audit('sales', 'update', null, { ...s })
      if (db.lots.find((l) => l.id === s.lot_id)?.status === 'sold') setLotStatus(s.lot_id, 'available')
      activity(s.lead_id, 'sale', 'Venda cancelada', { lot_id: s.lot_id, sale_id: s.id, reason: reason ?? null })
      await delay(null)
    },

    async expireReservations() {
      let n = 0
      for (const r of db.reservations) {
        if (r.status === 'active' && new Date(r.expires_at).getTime() < Date.now()) {
          r.status = 'expired'
          if (db.lots.find((l) => l.id === r.lot_id)?.status === 'reserved') setLotStatus(r.lot_id, 'available')
          activity(r.lead_id, 'reservation', 'Reserva expirada automaticamente', { lot_id: r.lot_id }, null)
          n++
        }
      }
      return delay(n)
    },

    async uploadFile(file) {
      if (!isAdmin()) deny()
      // No modo demonstração a imagem fica apenas nesta aba (URL temporária do navegador).
      return delay({ url: URL.createObjectURL(file), path: '' })
    },
    async deleteFile() {
      await delay(null)
    },

    subscribeLots(cb) {
      lotListeners.add(cb)
      return () => lotListeners.delete(cb)
    },

    async inviteUser() {
      throw new AppError('demo', 'Convites por e-mail exigem o Supabase configurado (Edge Function "invite-user").')
    },

    auth: {
      async getSession() {
        return session
      },
      async signIn(email) {
        const acc = Object.values(DEMO_ACCOUNTS).find((a) => a.email === email.trim().toLowerCase())
        if (!acc) throw new AppError('invalid_credentials', 'No modo demonstração use os botões de acesso rápido.')
        session = { id: acc.userId, email: acc.email }
        authListeners.forEach((cb) => cb(session))
        await delay(null)
      },
      async signOut() {
        session = null
        authListeners.forEach((cb) => cb(null))
      },
      async resetPassword() {
        throw new AppError('demo', 'Recuperação de senha disponível apenas com o Supabase configurado.')
      },
      async updatePassword() {
        throw new AppError('demo', 'Disponível apenas com o Supabase configurado.')
      },
      onChange(cb) {
        authListeners.add(cb)
        return () => authListeners.delete(cb)
      },
      async getProfile(userId) {
        return structuredClone(db.profiles.find((p) => p.id === userId) ?? null)
      },
    },
  }
  return backend
}
