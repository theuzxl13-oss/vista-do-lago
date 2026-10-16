/**
 * Dados FICTÍCIOS para o MODO DEMONSTRAÇÃO do painel (sem Supabase).
 * Ficam apenas na memória do navegador e somem ao recarregar a página.
 * Nunca são enviados ao banco de produção.
 */
import type {
  Block, Broker, Development, Lead, LeadActivity, LeadLotInterest, LeadSource, LeadStage,
  Lot, MediaItem, Profile, Proposal, Reservation, Sale, Visit,
} from '@/types'
import { buildDemoPlan } from './plan'
import { DEMO_DEVELOPMENT_ID, DEMO_MEDIA } from './defaults'

export const DEMO_ADMIN_ID = 'demo-admin'
export const DEMO_BROKER_USER_ID = 'demo-corretor'

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

const FIRST = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fábio', 'Gabriela', 'Henrique', 'Isabela', 'João', 'Larissa', 'Marcos', 'Natália', 'Otávio', 'Paula', 'Rafael', 'Sabrina', 'Tiago', 'Vanessa', 'Wagner', 'Yasmin', 'Lucas', 'Mariana', 'Pedro', 'Renata', 'Sérgio', 'Teresa', 'Vitor']
const LAST = ['Almeida', 'Barbosa', 'Cardoso', 'Duarte', 'Ferreira', 'Gomes', 'Lima', 'Martins', 'Nogueira', 'Oliveira', 'Pereira', 'Queiroz', 'Ribeiro', 'Santos', 'Teixeira', 'Vieira']

export interface DemoDb {
  developments: Development[]
  blocks: Block[]
  lots: Lot[]
  media: MediaItem[]
  brokers: Broker[]
  profiles: Profile[]
  leads: Lead[]
  lead_lot_interests: LeadLotInterest[]
  lead_activities: LeadActivity[]
  visits: Visit[]
  proposals: Proposal[]
  reservations: Reservation[]
  sales: Sale[]
  audit_log: never[]
}

export function buildDemoDb(withCrm: boolean): DemoDb {
  const now = Date.now()
  const day = 86_400_000
  const iso = (t: number) => new Date(t).toISOString()
  const created = iso(now - 120 * day)
  const { blocks, lots } = buildDemoPlan()

  const db: DemoDb = {
    developments: [{ id: DEMO_DEVELOPMENT_ID, slug: 'vista-do-lago', name: 'Vista do Lago', description: null, is_demo: true, created_at: created }],
    blocks: blocks.map((b) => ({ ...b, development_id: DEMO_DEVELOPMENT_ID, description: null, is_demo: true, created_at: created })),
    lots: lots.map((l) => ({
      ...l, price: null, price_on_request: true, images: [], is_demo: true, created_at: created, updated_at: created,
    })),
    media: DEMO_MEDIA.map((m, i) => ({
      id: `demo-media-${i}`, lot_id: null, url: `demo/gallery/${m.file}`, storage_path: null, title: m.title,
      caption: m.caption, category: m.category, is_illustrative: true, sort_order: i, published: true, created_at: created,
    })),
    brokers: [], profiles: [], leads: [], lead_lot_interests: [], lead_activities: [], visits: [],
    proposals: [], reservations: [], sales: [], audit_log: [],
  }
  if (!withCrm) return db

  const r = rng(2026)
  const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)]

  db.brokers = [
    { id: 'demo-b1', full_name: 'Corretora Demonstração', phone: '11900000001', email: 'corretor@demo.local', creci: 'Demo 00001', active: true, user_id: DEMO_BROKER_USER_ID, created_at: created },
    { id: 'demo-b2', full_name: 'Corretor Exemplo', phone: '11900000002', email: 'exemplo@demo.local', creci: 'Demo 00002', active: true, user_id: null, created_at: created },
    { id: 'demo-b3', full_name: 'Consultor Fictício', phone: '11900000003', email: 'ficticio@demo.local', creci: null, active: true, user_id: null, created_at: created },
  ]
  db.profiles = [
    { id: DEMO_ADMIN_ID, full_name: 'Administrador (demo)', email: 'admin@demo.local', role: 'admin', broker_id: null, active: true, created_at: created },
    { id: DEMO_BROKER_USER_ID, full_name: 'Corretora Demonstração', email: 'corretor@demo.local', role: 'broker', broker_id: 'demo-b1', active: true, created_at: created },
  ]

  const sources: LeadSource[] = ['site_form', 'lot_map', 'whatsapp', 'referral', 'social', 'phone', 'event']
  let leadSeq = 0
  const makeLead = (stage: LeadStage, daysAgo: number): Lead => {
    leadSeq++
    const name = `${pick(FIRST)} ${pick(LAST)}`
    const phone = `119${String(70000000 + Math.floor(r() * 29999999)).slice(0, 8)}`
    const createdAt = iso(now - daysAgo * day - Math.floor(r() * 8) * 3600_000)
    const broker = stage === 'new' && r() < 0.6 ? null : pick(db.brokers).id
    return {
      id: `demo-lead-${leadSeq}`, full_name: name, phone, whatsapp: phone,
      email: r() < 0.75 ? `${name.split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}.${leadSeq}@exemplo.com` : null,
      source: pick(sources), source_detail: null, utm: null, stage, broker_id: broker,
      message: r() < 0.5 ? 'Gostaria de saber condições de pagamento.' : null, notes: null,
      next_action: ['first_contact', 'in_progress', 'negotiation'].includes(stage) ? pick(['Retornar ligação', 'Enviar planta', 'Enviar proposta', 'Confirmar visita']) : null,
      next_action_at: ['first_contact', 'in_progress', 'negotiation'].includes(stage) ? iso(now + Math.floor(r() * 6 + 1) * day) : null,
      lost_reason: stage === 'lost' ? pick(['Orçamento', 'Optou por outro empreendimento', 'Sem retorno']) : null,
      consent: true, consent_at: createdAt, stage_changed_at: iso(now - Math.max(0, daysAgo - 3) * day),
      created_by: null, created_at: createdAt, updated_at: createdAt,
    }
  }

  const addActivity = (lead: Lead, type: LeadActivity['type'], description: string, at: string, metadata: Record<string, unknown> | null = null) => {
    db.lead_activities.push({ id: `demo-act-${db.lead_activities.length + 1}`, lead_id: lead.id, type, description, metadata, created_by: null, created_at: at })
  }

  // Leads vinculados a lotes reservados e vendidos (mantém o estoque coerente)
  for (const lot of db.lots) {
    if (lot.status === 'reserved') {
      const lead = makeLead('negotiation', Math.floor(10 + r() * 60))
      lead.broker_id = lead.broker_id ?? 'demo-b1'
      db.leads.push(lead)
      db.reservations.push({ id: `demo-res-${lot.id}`, lot_id: lot.id, lead_id: lead.id, broker_id: lead.broker_id, expires_at: iso(now + Math.floor(2 + r() * 12) * day), status: 'active', notes: null, created_by: null, created_at: iso(now - 4 * day) })
      db.lead_lot_interests.push({ id: `demo-int-${lead.id}`, lead_id: lead.id, lot_id: lot.id, created_at: lead.created_at })
      addActivity(lead, 'reservation', 'Lote reservado', iso(now - 4 * day), { lot_id: lot.id })
    } else if (lot.status === 'sold') {
      const lead = makeLead('won', Math.floor(20 + r() * 95))
      lead.broker_id = lead.broker_id ?? 'demo-b2'
      db.leads.push(lead)
      const amount = 180000 + Math.round(r() * 12) * 10000
      const soldAt = new Date(new Date(lead.created_at).getTime() + Math.floor(5 + r() * 15) * day)
      db.sales.push({ id: `demo-sale-${lot.id}`, lot_id: lot.id, lead_id: lead.id, broker_id: lead.broker_id, amount, sold_at: soldAt.toISOString().slice(0, 10), status: 'completed', notes: null, created_by: null, created_at: soldAt.toISOString() })
      db.lead_lot_interests.push({ id: `demo-int-${lead.id}`, lead_id: lead.id, lot_id: lot.id, created_at: lead.created_at })
      addActivity(lead, 'sale', 'Venda registrada', soldAt.toISOString(), { lot_id: lot.id, amount })
    }
  }

  const otherStages: LeadStage[] = ['new', 'new', 'new', 'first_contact', 'first_contact', 'in_progress', 'in_progress', 'visit_scheduled', 'visit_scheduled', 'proposal_sent', 'lost', 'lost']
  for (let i = 0; i < 26; i++) {
    const stage = otherStages[i % otherStages.length]
    const lead = makeLead(stage, Math.floor(r() * 85))
    db.leads.push(lead)
    const available = db.lots.filter((l) => l.status === 'available')
    if (r() < 0.8) {
      db.lead_lot_interests.push({ id: `demo-int-${lead.id}`, lead_id: lead.id, lot_id: pick(available).id, created_at: lead.created_at })
    }
  }

  for (const lead of db.leads) {
    addActivity(lead, 'system', 'Lead cadastrado', lead.created_at, { source: lead.source })
    if (lead.stage !== 'new') addActivity(lead, pick(['call', 'whatsapp', 'email'] as const), 'Primeiro contato realizado', iso(new Date(lead.created_at).getTime() + day))
    const interest = db.lead_lot_interests.find((x) => x.lead_id === lead.id)
    if (['visit_scheduled', 'proposal_sent', 'negotiation', 'won'].includes(lead.stage)) {
      const upcoming = lead.stage === 'visit_scheduled'
      const at = upcoming ? now + Math.floor(1 + r() * 10) * day : new Date(lead.created_at).getTime() + 3 * day
      const d = new Date(at)
      d.setHours(9 + Math.floor(r() * 8), r() < 0.5 ? 0 : 30, 0, 0)
      db.visits.push({ id: `demo-visit-${lead.id}`, lead_id: lead.id, lot_id: interest?.lot_id ?? null, broker_id: lead.broker_id, scheduled_at: d.toISOString(), duration_min: 60, status: upcoming ? (r() < 0.5 ? 'confirmed' : 'scheduled') : 'done', notes: null, created_by: null, created_at: lead.created_at })
    }
    if (['proposal_sent', 'negotiation', 'won'].includes(lead.stage) && interest) {
      const amount = 180000 + Math.round(r() * 12) * 10000
      db.proposals.push({ id: `demo-prop-${lead.id}`, lead_id: lead.id, lot_id: interest.lot_id, broker_id: lead.broker_id, amount, down_payment: Math.round(amount * 0.2), installments: 60, conditions: 'Condição ilustrativa (demonstração).', status: lead.stage === 'won' ? 'accepted' : 'sent', valid_until: iso(now + 15 * day).slice(0, 10), sent_at: iso(now - 5 * day), created_by: null, created_at: iso(now - 6 * day) })
    }
  }
  db.lead_activities.sort((a, b) => a.created_at.localeCompare(b.created_at))
  return db
}
