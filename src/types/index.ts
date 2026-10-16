// Tipos de domínio — espelham as tabelas do Supabase (supabase/migrations)

export type Role = 'admin' | 'broker'
export type LotStatus = 'available' | 'reserved' | 'sold' | 'unavailable'
export type LeadStage =
  | 'new'
  | 'first_contact'
  | 'in_progress'
  | 'visit_scheduled'
  | 'proposal_sent'
  | 'negotiation'
  | 'won'
  | 'lost'
export type VisitStatus = 'scheduled' | 'confirmed' | 'done' | 'canceled' | 'no_show'
export type ProposalStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'canceled'
export type ReservationStatus = 'active' | 'released' | 'converted' | 'expired'
export type SaleStatus = 'completed' | 'canceled'
export type MediaCategory =
  | 'aerial'
  | 'lake'
  | 'landscape'
  | 'lots'
  | 'access'
  | 'green'
  | 'perspective'
  | 'drone'
export type LeadSource =
  | 'site_form'
  | 'lot_map'
  | 'whatsapp'
  | 'phone'
  | 'referral'
  | 'social'
  | 'event'
  | 'manual'
  | 'other'
export type ActivityType =
  | 'note'
  | 'call'
  | 'whatsapp'
  | 'email'
  | 'meeting'
  | 'visit'
  | 'proposal'
  | 'reservation'
  | 'sale'
  | 'stage_change'
  | 'assignment'
  | 'system'

interface Timestamps {
  created_at: string
  updated_at?: string
}

export interface Development extends Timestamps {
  id: string
  slug: string
  name: string
  description: string | null
  is_demo: boolean
}

export interface Block extends Timestamps {
  id: string
  development_id: string
  code: string
  name: string | null
  description: string | null
  is_demo: boolean
}

export interface Lot extends Timestamps {
  id: string
  block_id: string
  number: string
  area_m2: number | null
  front_m: number | null
  back_m: number | null
  left_m: number | null
  right_m: number | null
  price: number | null
  price_on_request: boolean
  description: string | null
  status: LotStatus
  svg_path: string | null
  label_x: number | null
  label_y: number | null
  images: string[]
  is_demo: boolean
}

export interface MediaItem extends Timestamps {
  id: string
  lot_id: string | null
  url: string
  storage_path: string | null
  title: string
  caption: string | null
  category: MediaCategory
  is_illustrative: boolean
  sort_order: number
  published: boolean
}

export interface Broker extends Timestamps {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  creci: string | null
  active: boolean
  user_id: string | null
}

export interface Profile extends Timestamps {
  id: string
  full_name: string | null
  email: string | null
  role: Role
  broker_id: string | null
  active: boolean
}

export interface Lead extends Timestamps {
  id: string
  full_name: string
  phone: string | null
  whatsapp: string | null
  email: string | null
  source: LeadSource
  source_detail: string | null
  utm: Record<string, string> | null
  stage: LeadStage
  broker_id: string | null
  message: string | null
  notes: string | null
  next_action: string | null
  next_action_at: string | null
  lost_reason: string | null
  consent: boolean
  consent_at: string | null
  stage_changed_at: string
  created_by: string | null
}

export interface LeadLotInterest {
  id: string
  lead_id: string
  lot_id: string
  created_at: string
}

export interface LeadActivity {
  id: string
  lead_id: string
  type: ActivityType
  description: string
  metadata: Record<string, unknown> | null
  created_by: string | null
  created_at: string
}

export interface Visit extends Timestamps {
  id: string
  lead_id: string
  lot_id: string | null
  broker_id: string | null
  scheduled_at: string
  duration_min: number
  status: VisitStatus
  notes: string | null
  created_by: string | null
}

export interface Proposal extends Timestamps {
  id: string
  lead_id: string
  lot_id: string
  broker_id: string | null
  amount: number
  down_payment: number | null
  installments: number | null
  conditions: string | null
  status: ProposalStatus
  valid_until: string | null
  sent_at: string | null
  created_by: string | null
}

export interface Reservation extends Timestamps {
  id: string
  lot_id: string
  lead_id: string
  broker_id: string | null
  expires_at: string
  status: ReservationStatus
  notes: string | null
  created_by: string | null
}

export interface Sale extends Timestamps {
  id: string
  lot_id: string
  lead_id: string
  broker_id: string | null
  amount: number
  sold_at: string
  status: SaleStatus
  notes: string | null
  created_by: string | null
}

export interface AuditEntry {
  id: number
  table_name: string
  record_id: string | null
  action: string
  actor: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Configurações editáveis do site (tabela site_settings, chave → JSON)
// ---------------------------------------------------------------------------
export interface ContactSettings {
  whatsapp_number: string
  whatsapp_message: string
  phone: string
  email: string
  instagram: string
  business_hours: string
}

export interface StatCard {
  key: string
  label: string
  value: string
  hint: string
  visible: boolean
}

export interface PointOfInterest {
  name: string
  distance: string
}

export interface LocationSettings {
  address: string
  city: string
  state: string
  latitude: number | null
  longitude: number | null
  zoom: number
  access_roads: string[]
  highways: string[]
  points_of_interest: PointOfInterest[]
}

export interface Differential {
  icon: string
  title: string
  description: string
  visible: boolean
}

export interface PlanSettings {
  is_demo: boolean
  view_box: string
  image_url: string
  notice: string
}

export interface PrivacySettings {
  controller_name: string
  controller_document: string
  dpo_email: string
  retention: string
}

export interface AboutSettings {
  title: string
  paragraphs: string[]
}

export interface SiteSettings {
  contact: ContactSettings
  stats: StatCard[]
  location: LocationSettings
  differentials: Differential[]
  plan: PlanSettings
  privacy: PrivacySettings
  about: AboutSettings
}

export type SettingKey = keyof SiteSettings

// Entrada do formulário público
export interface LeadSubmission {
  full_name: string
  phone: string
  email?: string
  message?: string
  lot_id?: string | null
  source: 'site_form' | 'lot_map' | 'whatsapp'
  consent: boolean
  website?: string
  utm?: Record<string, string> | null
  page?: string
}

export type TableName =
  | 'developments'
  | 'blocks'
  | 'lots'
  | 'media'
  | 'brokers'
  | 'profiles'
  | 'leads'
  | 'lead_lot_interests'
  | 'lead_activities'
  | 'visits'
  | 'proposals'
  | 'reservations'
  | 'sales'
  | 'audit_log'

export interface TableRowMap {
  developments: Development
  blocks: Block
  lots: Lot
  media: MediaItem
  brokers: Broker
  profiles: Profile
  leads: Lead
  lead_lot_interests: LeadLotInterest
  lead_activities: LeadActivity
  visits: Visit
  proposals: Proposal
  reservations: Reservation
  sales: Sale
  audit_log: AuditEntry
}
