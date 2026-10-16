import type {
  ActivityType,
  LeadSource,
  LeadStage,
  LotStatus,
  MediaCategory,
  ProposalStatus,
  ReservationStatus,
  VisitStatus,
} from '@/types'

export const LOT_STATUS: Record<LotStatus, { label: string; color: string; soft: string; text: string }> = {
  available: { label: 'Disponível', color: '#3E9B5F', soft: '#E3F2E8', text: '#1F6B3B' },
  reserved: { label: 'Reservado', color: '#E1B53B', soft: '#FBF2D6', text: '#7A5A08' },
  sold: { label: 'Vendido', color: '#C24A3F', soft: '#F7E1DE', text: '#8A2A21' },
  unavailable: { label: 'Indisponível', color: '#9A9A96', soft: '#ECECEA', text: '#555552' },
}

export const LEAD_STAGES: { key: LeadStage; label: string; color: string }[] = [
  { key: 'new', label: 'Novo lead', color: '#4C7A62' },
  { key: 'first_contact', label: 'Primeiro contato', color: '#687B55' },
  { key: 'in_progress', label: 'Em atendimento', color: '#3B7EA1' },
  { key: 'visit_scheduled', label: 'Visita agendada', color: '#7A64B0' },
  { key: 'proposal_sent', label: 'Proposta enviada', color: '#C6A76A' },
  { key: 'negotiation', label: 'Em negociação', color: '#D08A3E' },
  { key: 'won', label: 'Venda concluída', color: '#2F8A4E' },
  { key: 'lost', label: 'Perdido', color: '#A3473E' },
]
export const STAGE_LABEL = Object.fromEntries(LEAD_STAGES.map((s) => [s.key, s.label])) as Record<LeadStage, string>
export const STAGE_COLOR = Object.fromEntries(LEAD_STAGES.map((s) => [s.key, s.color])) as Record<LeadStage, string>

export const LEAD_SOURCE_LABEL: Record<LeadSource, string> = {
  site_form: 'Formulário do site',
  lot_map: 'Mapa de lotes',
  whatsapp: 'WhatsApp',
  phone: 'Telefone',
  referral: 'Indicação',
  social: 'Redes sociais',
  event: 'Evento / Stand',
  manual: 'Cadastro manual',
  other: 'Outro',
}

export const VISIT_STATUS: Record<VisitStatus, { label: string; color: string }> = {
  scheduled: { label: 'Agendada', color: '#3B7EA1' },
  confirmed: { label: 'Confirmada', color: '#2F8A4E' },
  done: { label: 'Realizada', color: '#18392B' },
  canceled: { label: 'Cancelada', color: '#9A9A96' },
  no_show: { label: 'Não compareceu', color: '#A3473E' },
}

export const PROPOSAL_STATUS: Record<ProposalStatus, { label: string; color: string }> = {
  draft: { label: 'Rascunho', color: '#9A9A96' },
  sent: { label: 'Enviada', color: '#C6A76A' },
  accepted: { label: 'Aceita', color: '#2F8A4E' },
  rejected: { label: 'Recusada', color: '#A3473E' },
  expired: { label: 'Expirada', color: '#6B6B6B' },
  canceled: { label: 'Cancelada', color: '#6B6B6B' },
}

export const RESERVATION_STATUS: Record<ReservationStatus, string> = {
  active: 'Ativa',
  released: 'Liberada',
  converted: 'Convertida em venda',
  expired: 'Expirada',
}

export const MEDIA_CATEGORY_LABEL: Record<MediaCategory, string> = {
  aerial: 'Fotos aéreas',
  lake: 'Lago',
  landscape: 'Paisagens',
  lots: 'Terrenos',
  access: 'Acessos',
  green: 'Áreas verdes',
  perspective: 'Perspectivas',
  drone: 'Drone',
}

export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  note: 'Observação',
  call: 'Ligação',
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  meeting: 'Reunião',
  visit: 'Visita',
  proposal: 'Proposta',
  reservation: 'Reserva',
  sale: 'Venda',
  stage_change: 'Mudança de etapa',
  assignment: 'Atribuição',
  system: 'Sistema',
}

export const BRAND = {
  name: 'Vista do Lago',
  slogan: 'O lugar onde seus sonhos encontram a natureza.',
}
