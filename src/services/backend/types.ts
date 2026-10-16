import type {
  LeadSubmission,
  Profile,
  SettingKey,
  SiteSettings,
  TableName,
  TableRowMap,
} from '@/types'

export type Row<K extends TableName> = TableRowMap[K]

export interface ListOptions {
  order?: { column: string; ascending?: boolean }
  eq?: Record<string, string | number | boolean | null>
  limit?: number
}

export interface SessionUser {
  id: string
  email: string
}

export interface AuthApi {
  getSession(): Promise<SessionUser | null>
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  resetPassword(email: string): Promise<void>
  updatePassword(password: string): Promise<void>
  onChange(cb: (user: SessionUser | null) => void): () => void
  getProfile(userId: string): Promise<Profile | null>
}

export interface InviteInput {
  email: string
  full_name: string
  role: 'admin' | 'broker'
  broker_id?: string | null
}

export interface Backend {
  mode: 'supabase' | 'demo'
  list<K extends TableName>(table: K, opts?: ListOptions): Promise<Row<K>[]>
  get<K extends TableName>(table: K, id: string): Promise<Row<K> | null>
  insert<K extends TableName>(table: K, row: Partial<Row<K>>): Promise<Row<K>>
  update<K extends TableName>(table: K, id: string, patch: Partial<Row<K>>): Promise<Row<K>>
  remove(table: TableName, id: string): Promise<void>

  getSettings(): Promise<Partial<SiteSettings>>
  saveSetting<K extends SettingKey>(key: K, value: SiteSettings[K]): Promise<void>

  submitLead(input: LeadSubmission): Promise<void>
  reserveLot(lotId: string, leadId: string, expiresAt: string, notes?: string): Promise<string>
  releaseReservation(reservationId: string, reason?: string): Promise<void>
  registerSale(lotId: string, leadId: string, amount: number, soldAt: string, notes?: string): Promise<string>
  cancelSale(saleId: string, reason?: string): Promise<void>
  expireReservations(): Promise<number>

  uploadFile(file: File, folder: string): Promise<{ url: string; path: string }>
  deleteFile(path: string): Promise<void>

  /** Notifica alterações nos lotes (Realtime) — o mapa público se atualiza sozinho. */
  subscribeLots(cb: () => void): () => void

  /** Convida usuário (Edge Function com service role — nunca no navegador). */
  inviteUser(input: InviteInput): Promise<void>

  auth: AuthApi
}

/** Erro com mensagem amigável em português. */
export class AppError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

const MESSAGES: Record<string, string> = {
  consent_required: 'É necessário aceitar a política de privacidade.',
  invalid_name: 'Informe seu nome completo.',
  invalid_phone: 'Informe um telefone válido com DDD.',
  invalid_email: 'Informe um e-mail válido.',
  invalid_message: 'A mensagem é muito longa.',
  rate_limited: 'Recebemos vários envios seguidos. Aguarde alguns minutos e tente novamente.',
  not_authorized: 'Você não tem permissão para esta operação.',
  lead_not_accessible: 'Você não tem acesso a este lead.',
  lead_not_found: 'Lead não encontrado.',
  lot_not_found: 'Lote não encontrado.',
  lot_not_available: 'Este lote não está disponível. Atualize a página para ver a situação atual.',
  lot_reserved_for_other_lead: 'Este lote está reservado para outro cliente. Libere a reserva antes de registrar a venda.',
  invalid_expiration: 'A validade da reserva deve ser uma data futura.',
  invalid_amount: 'Informe um valor válido.',
  reservation_not_found: 'Reserva não encontrada.',
  reservation_not_active: 'Esta reserva não está mais ativa.',
  sale_not_active: 'Esta venda não está ativa.',
  lot_workflow_required: 'Use as ações de reserva/venda para alterar a situação deste lote.',
  invalid_credentials: 'E-mail ou senha incorretos.',
  inactive_profile: 'Seu usuário ainda não foi liberado por um administrador.',
}

export function toAppError(e: unknown): AppError {
  if (e instanceof AppError) return e
  const raw =
    typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e)
  const hint = typeof e === 'object' && e && 'hint' in e ? String((e as { hint: unknown }).hint ?? '') : ''
  for (const code of Object.keys(MESSAGES)) {
    if (raw.includes(code) || hint === code) return new AppError(code, MESSAGES[code])
  }
  if (/Invalid login credentials/i.test(raw)) return new AppError('invalid_credentials', MESSAGES.invalid_credentials)
  if (/row-level security|permission denied|42501/i.test(raw))
    return new AppError('not_authorized', MESSAGES.not_authorized)
  if (/duplicate key/i.test(raw)) return new AppError('duplicate', 'Já existe um registro com estes dados.')
  if (/violates foreign key/i.test(raw))
    return new AppError('in_use', 'Este registro está vinculado a outros dados e não pode ser removido.')
  if (/violates check constraint/i.test(raw)) return new AppError('invalid', 'Verifique os dados informados.')
  if (/Failed to fetch|NetworkError|fetch failed/i.test(raw))
    return new AppError('network', 'Falha de conexão. Verifique sua internet e tente novamente.')
  return new AppError('unknown', raw || 'Ocorreu um erro inesperado.')
}
