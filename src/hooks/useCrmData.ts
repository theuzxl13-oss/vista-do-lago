import { useMemo } from 'react'
import { backend } from '@/services/backend'
import { useAsync } from './useAsync'
import type { Block, Broker, Lead, LeadLotInterest, Lot, Proposal, Reservation, Sale, Visit } from '@/types'

export interface CrmData {
  leads: Lead[]
  brokers: Broker[]
  lots: Lot[]
  blocks: Block[]
  visits: Visit[]
  proposals: Proposal[]
  reservations: Reservation[]
  sales: Sale[]
  interests: LeadLotInterest[]
}

const EMPTY: CrmData = { leads: [], brokers: [], lots: [], blocks: [], visits: [], proposals: [], reservations: [], sales: [], interests: [] }

/** Carrega os dados comerciais visíveis ao usuário (as políticas RLS filtram por perfil). */
export function useCrmData() {
  const state = useAsync<CrmData>(async () => {
    const [leads, brokers, lots, blocks, visits, proposals, reservations, sales, interests] = await Promise.all([
      backend.list('leads', { order: { column: 'created_at', ascending: false } }),
      backend.list('brokers', { order: { column: 'full_name' } }),
      backend.list('lots'),
      backend.list('blocks'),
      backend.list('visits', { order: { column: 'scheduled_at' } }),
      backend.list('proposals', { order: { column: 'created_at', ascending: false } }),
      backend.list('reservations', { order: { column: 'created_at', ascending: false } }),
      backend.list('sales', { order: { column: 'sold_at', ascending: false } }),
      backend.list('lead_lot_interests'),
    ])
    return { leads, brokers, lots, blocks, visits, proposals, reservations, sales, interests }
  })

  const data = state.data ?? EMPTY
  const maps = useMemo(() => {
    const blockById = new Map(data.blocks.map((b) => [b.id, b]))
    return {
      leadById: new Map(data.leads.map((l) => [l.id, l])),
      brokerById: new Map(data.brokers.map((b) => [b.id, b])),
      lotById: new Map(data.lots.map((l) => [l.id, l])),
      blockById,
      lotName: (id: string | null | undefined) => {
        if (!id) return '—'
        const lot = data.lots.find((l) => l.id === id)
        if (!lot) return '—'
        return `Q${blockById.get(lot.block_id)?.code ?? '?'} · L${lot.number}`
      },
    }
  }, [data])

  return { ...state, data, ...maps }
}
