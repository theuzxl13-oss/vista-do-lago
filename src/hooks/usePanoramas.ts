import { backend } from '@/services/backend'
import { useAsync } from './useAsync'

const FALLBACK = ['demo/gallery/lago-entardecer.svg', 'demo/gallery/paisagem-neblina.svg']

/** Imagens das faixas panorâmicas: prefere fotos reais publicadas na galeria; senão, ilustrações. */
export function usePanoramas() {
  const { data } = useAsync(() => backend.list('media', { eq: { published: true }, order: { column: 'sort_order' } }))
  const real = (data ?? []).filter((m) => !m.lot_id && !m.is_illustrative && ['lake', 'aerial', 'landscape', 'drone', 'green'].includes(m.category))
  return [0, 1].map((i) => (real[i] ? { url: real[i].url, caption: 'Foto do empreendimento' } : { url: FALLBACK[i], caption: 'Imagem ilustrativa' }))
}
