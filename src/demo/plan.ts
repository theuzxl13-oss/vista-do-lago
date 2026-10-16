/**
 * PLANTA FICTÍCIA DE DEMONSTRAÇÃO
 * --------------------------------
 * Esta planta NÃO representa o loteamento real. Ela existe apenas para
 * demonstrar o mapa interativo e deve ser substituída pela planta oficial
 * (cadastrando os lotes com seus caminhos SVG no painel administrativo).
 *
 * Usada em dois lugares:
 *  - modo demonstração do site (sem Supabase configurado);
 *  - geração do arquivo supabase/seed.sql (npm run seed:generate).
 */
import type { LotStatus } from '@/types'

export const DEMO_VIEWBOX = '0 0 1200 800'

export interface DemoBlock {
  id: string
  code: string
  name: string
}

export interface DemoLot {
  id: string
  block_id: string
  number: string
  area_m2: number
  front_m: number
  back_m: number
  left_m: number
  right_m: number
  status: LotStatus
  svg_path: string
  label_x: number
  label_y: number
  description: string
}

// UUIDs determinísticos para que seed e modo demonstração coincidam
export function demoUuid(prefix: number, n: number): string {
  const hex = (prefix * 100000 + n).toString(16).padStart(12, '0')
  return `00000000-0000-4000-8000-${hex}`
}

interface BlockSpec {
  code: string
  x: number
  y: number
  cols: number
  rows: number
  w: number
  h: number
  front: number
  depth: number
  vertical?: boolean
}

const SPECS: BlockSpec[] = [
  { code: 'A', x: 90, y: 100, cols: 11, rows: 2, w: 40, h: 75, front: 12, depth: 25 },
  { code: 'B', x: 90, y: 300, cols: 11, rows: 2, w: 40, h: 75, front: 12, depth: 25 },
  { code: 'C', x: 90, y: 500, cols: 10, rows: 2, w: 40, h: 75, front: 12, depth: 25 },
  { code: 'D', x: 600, y: 100, cols: 2, rows: 6, w: 100, h: 40, front: 12, depth: 30, vertical: true },
  { code: 'E', x: 860, y: 100, cols: 6, rows: 2, w: 45, h: 90, front: 13, depth: 30 },
]

// Distribuição determinística de status para a demonstração
function demoStatus(seq: number): LotStatus {
  const r = (seq * 37 + 11) % 100
  if (r < 14) return 'sold'
  if (r < 26) return 'reserved'
  if (r < 31) return 'unavailable'
  return 'available'
}

function rectPath(x: number, y: number, w: number, h: number): string {
  const r = (n: number) => Math.round(n * 10) / 10
  return `M${r(x)} ${r(y)}H${r(x + w)}V${r(y + h)}H${r(x)}Z`
}

export function buildDemoPlan(): { blocks: DemoBlock[]; lots: DemoLot[] } {
  const blocks: DemoBlock[] = []
  const lots: DemoLot[] = []
  let seq = 0
  SPECS.forEach((spec, bi) => {
    const blockId = demoUuid(1, bi + 1)
    blocks.push({ id: blockId, code: spec.code, name: `Quadra ${spec.code}` })
    let n = 0
    for (let row = 0; row < spec.rows; row++) {
      for (let col = 0; col < spec.cols; col++) {
        n++
        seq++
        const x = spec.x + col * spec.w
        const y = spec.y + row * spec.h
        const area = spec.front * spec.depth
        lots.push({
          id: demoUuid(2, seq),
          block_id: blockId,
          number: String(n).padStart(2, '0'),
          area_m2: area,
          front_m: spec.front,
          back_m: spec.front,
          left_m: spec.depth,
          right_m: spec.depth,
          status: demoStatus(seq),
          svg_path: rectPath(x + 1.5, y + 1.5, spec.w - 3, spec.h - 3),
          label_x: x + spec.w / 2,
          label_y: y + spec.h / 2,
          description: 'Lote de demonstração — dados ilustrativos, sujeitos à planta oficial.',
        })
      }
    }
  })
  return { blocks, lots }
}

/** Elementos decorativos da planta fictícia (ruas, lago, áreas verdes). */
export const DEMO_PLAN_DECOR = {
  lake:
    'M690 520 C 760 455, 900 440, 1010 470 C 1110 495, 1170 560, 1160 640 C 1150 720, 1060 770, 940 765 C 820 760, 700 740, 660 670 C 630 615, 640 565, 690 520 Z',
  green: [
    'M620 430 C 700 410, 820 405, 900 425 L 1150 440 L 1150 470 C 1060 450, 940 430, 820 440 C 740 448, 680 470, 640 500 Z',
    'M520 470 L 600 470 L 600 720 L 520 720 Z',
    'M90 680 L 500 680 L 500 740 L 90 740 Z',
    'M860 300 L 1130 300 L 1130 350 L 860 350 Z',
  ],
  roads: [
    // avenida principal (horizontal) e ruas internas
    { d: 'M40 80 H1180', w: 22 },
    { d: 'M40 270 H560', w: 18 },
    { d: 'M40 470 H560', w: 18 },
    { d: 'M60 80 V700', w: 18 },
    { d: 'M560 80 V700', w: 22 },
    { d: 'M830 80 V420', w: 18 },
    { d: 'M560 400 C 640 380, 900 380, 1180 395', w: 18 },
  ],
}
