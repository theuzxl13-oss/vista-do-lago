import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { LeadSubmission, Profile, SettingKey, SiteSettings, TableName } from '@/types'
import { AppError, toAppError, type Backend, type ListOptions, type Row, type SessionUser } from './types'

const BUCKET = 'media'

export function createSupabaseBackend(url: string, anonKey: string): Backend {
  const sb: SupabaseClient = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })

  async function run<T>(p: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
    const { data, error } = await p
    if (error) throw toAppError(error)
    return data
  }

  const toUser = (u: { id: string; email?: string | null } | null | undefined): SessionUser | null =>
    u ? { id: u.id, email: u.email ?? '' } : null

  return {
    mode: 'supabase',

    async list<K extends TableName>(table: K, opts: ListOptions = {}) {
      let q = sb.from(table).select('*')
      for (const [k, v] of Object.entries(opts.eq ?? {})) q = v === null ? q.is(k, null) : q.eq(k, v)
      if (opts.order) q = q.order(opts.order.column, { ascending: opts.order.ascending ?? true })
      if (opts.limit) q = q.limit(opts.limit)
      return (await run(q)) as Row<K>[]
    },

    async get<K extends TableName>(table: K, id: string) {
      return (await run(sb.from(table).select('*').eq('id', id).maybeSingle())) as Row<K> | null
    },

    async insert<K extends TableName>(table: K, row: Partial<Row<K>>) {
      return (await run(sb.from(table).insert(row as never).select('*').single())) as Row<K>
    },

    async update<K extends TableName>(table: K, id: string, patch: Partial<Row<K>>) {
      const data = await run(sb.from(table).update(patch as never).eq('id', id).select('*'))
      const rows = data as Row<K>[]
      if (!rows.length) throw new AppError('not_authorized', 'Registro não encontrado ou sem permissão para alterar.')
      return rows[0]
    },

    async remove(table, id) {
      const data = await run(sb.from(table).delete().eq('id', id).select('id'))
      if (!(data as unknown[]).length)
        throw new AppError('not_authorized', 'Registro não encontrado ou sem permissão para excluir.')
    },

    async getSettings() {
      const rows = (await run(sb.from('site_settings').select('key, value'))) as { key: SettingKey; value: unknown }[]
      const out: Partial<SiteSettings> = {}
      for (const r of rows) (out as Record<string, unknown>)[r.key] = r.value
      return out
    },

    async saveSetting(key, value) {
      await run(sb.from('site_settings').upsert({ key, value }).select('key'))
    },

    async submitLead(input: LeadSubmission) {
      await run(
        sb.rpc('submit_lead', {
          p_full_name: input.full_name,
          p_phone: input.phone,
          p_email: input.email || null,
          p_message: input.message || null,
          p_lot_id: input.lot_id || null,
          p_source: input.source,
          p_consent: input.consent,
          p_website: input.website || null,
          p_utm: input.utm ?? null,
          p_page: input.page ?? null,
        }),
      )
    },

    async reserveLot(lotId, leadId, expiresAt, notes) {
      return (await run(
        sb.rpc('reserve_lot', { p_lot_id: lotId, p_lead_id: leadId, p_expires_at: expiresAt, p_notes: notes ?? null }),
      )) as string
    },
    async releaseReservation(id, reason) {
      await run(sb.rpc('release_reservation', { p_reservation_id: id, p_reason: reason ?? null }))
    },
    async registerSale(lotId, leadId, amount, soldAt, notes) {
      return (await run(
        sb.rpc('register_sale', {
          p_lot_id: lotId, p_lead_id: leadId, p_amount: amount, p_sold_at: soldAt, p_notes: notes ?? null,
        }),
      )) as string
    },
    async cancelSale(id, reason) {
      await run(sb.rpc('cancel_sale', { p_sale_id: id, p_reason: reason ?? null }))
    },
    async expireReservations() {
      return (await run(sb.rpc('expire_reservations'))) as number
    },

    async uploadFile(file, folder) {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
      const path = `${folder}/${crypto.randomUUID()}.${ext}`
      const { error } = await sb.storage.from(BUCKET).upload(path, file, {
        cacheControl: '31536000',
        contentType: file.type,
        upsert: false,
      })
      if (error) throw toAppError(error)
      const { data } = sb.storage.from(BUCKET).getPublicUrl(path)
      return { url: data.publicUrl, path }
    },

    async deleteFile(path) {
      const { error } = await sb.storage.from(BUCKET).remove([path])
      if (error) throw toAppError(error)
    },

    subscribeLots(cb) {
      const channel = sb
        .channel('public:lots')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'lots' }, () => cb())
        .subscribe()
      return () => {
        void sb.removeChannel(channel)
      }
    },

    async inviteUser(input) {
      const { error } = await sb.functions.invoke('invite-user', { body: input })
      if (error) {
        let detail = ''
        try {
          const ctx = (error as { context?: Response }).context
          detail = ctx ? ((await ctx.json()) as { error?: string }).error ?? '' : ''
        } catch {
          /* corpo não-JSON */
        }
        throw new AppError('invite_failed', detail || 'Não foi possível enviar o convite. Verifique se a Edge Function "invite-user" foi publicada.')
      }
    },

    auth: {
      async getSession() {
        const { data } = await sb.auth.getSession()
        return toUser(data.session?.user)
      },
      async signIn(email, password) {
        const { error } = await sb.auth.signInWithPassword({ email, password })
        if (error) throw toAppError(error)
      },
      async signOut() {
        await sb.auth.signOut()
      },
      async resetPassword(email) {
        const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}admin/redefinir-senha`
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo })
        if (error) throw toAppError(error)
      },
      async updatePassword(password) {
        const { error } = await sb.auth.updateUser({ password })
        if (error) throw toAppError(error)
      },
      onChange(cb) {
        const { data } = sb.auth.onAuthStateChange((_evt, session) => cb(toUser(session?.user)))
        return () => data.subscription.unsubscribe()
      },
      async getProfile(userId) {
        return (await run(sb.from('profiles').select('*').eq('id', userId).maybeSingle())) as Profile | null
      },
    },
  }
}
