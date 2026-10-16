import { useEffect, useMemo } from 'react'
import { backend } from '@/services/backend'
import type { Block, Lot } from '@/types'
import { useAsync } from './useAsync'

export interface LotWithBlock extends Lot {
  block?: Block
}

function sortLots(a: LotWithBlock, b: LotWithBlock) {
  const ba = a.block?.code ?? ''
  const bb = b.block?.code ?? ''
  if (ba !== bb) return ba.localeCompare(bb)
  return a.number.localeCompare(b.number, 'pt-BR', { numeric: true })
}

/** Quadras e lotes com atualização em tempo real (Supabase Realtime). */
export function useLots() {
  const state = useAsync(async () => {
    const [blocks, lots] = await Promise.all([backend.list('blocks'), backend.list('lots')])
    return { blocks, lots }
  })
  const { reload } = state

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined
    const off = backend.subscribeLots(() => {
      clearTimeout(t)
      t = setTimeout(() => void reload(), 250)
    })
    return () => {
      clearTimeout(t)
      off()
    }
  }, [reload])

  const value = useMemo(() => {
    const blocks = [...(state.data?.blocks ?? [])].sort((a, b) => a.code.localeCompare(b.code, 'pt-BR', { numeric: true }))
    const byId = new Map(blocks.map((b) => [b.id, b]))
    const lots: LotWithBlock[] = (state.data?.lots ?? []).map((l) => ({ ...l, block: byId.get(l.block_id) })).sort(sortLots)
    return { blocks, lots, blockById: byId }
  }, [state.data])

  return { ...value, loading: state.loading, error: state.error, reload }
}
