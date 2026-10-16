import { memo, useLayoutEffect, useRef, useState } from 'react'
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch'
import { Minus, Plus, RotateCcw } from 'lucide-react'
import { DEMO_PLAN_DECOR } from '@/demo/plan'
import { LOT_STATUS } from '@/lib/constants'
import { assetUrl, cn } from '@/lib/format'
import type { LotWithBlock } from '@/hooks/useLots'
import type { Block, LotStatus, PlanSettings } from '@/types'

interface Props {
  lots: LotWithBlock[]
  blocks: Block[]
  plan: PlanSettings
  selectedId?: string | null
  onSelect?: (lot: LotWithBlock) => void
  isHighlighted?: (lot: LotWithBlock) => boolean
  className?: string
}

/**
 * Planta interativa do loteamento (SVG). Cada lote é um caminho SVG (`svg_path`)
 * cadastrado no painel. Suporta zoom, arraste e seleção por toque/teclado.
 */
export const LotPlan = memo(function LotPlan({ lots, blocks, plan, selectedId, onSelect, isHighlighted, className }: Props) {
  const [zoomed, setZoomed] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const [blockBoxes, setBlockBoxes] = useState<Record<string, DOMRect>>({})
  const [vbX, vbY, vbW, vbH] = (plan.view_box || '0 0 1200 800').split(/[\s,]+/).map(Number)

  // Calcula a área ocupada por cada quadra para posicionar seu rótulo
  useLayoutEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const boxes: Record<string, DOMRect> = {}
    svg.querySelectorAll<SVGPathElement>('path[data-block]').forEach((p) => {
      const id = p.dataset.block!
      try {
        const b = p.getBBox()
        const cur = boxes[id]
        if (!cur) boxes[id] = new DOMRect(b.x, b.y, b.width, b.height)
        else {
          const x = Math.min(cur.x, b.x), y = Math.min(cur.y, b.y)
          boxes[id] = new DOMRect(x, y, Math.max(cur.right, b.x + b.width) - x, Math.max(cur.bottom, b.y + b.height) - y)
        }
      } catch {
        /* getBBox indisponível (ex.: elemento oculto) */
      }
    })
    setBlockBoxes(boxes)
  }, [lots])

  const statusFill = (s: LotStatus) => LOT_STATUS[s].color

  return (
    <div className={cn('relative overflow-hidden rounded-2xl border border-sand-300 bg-[#EEF0E6]', className)}>
      <TransformWrapper
        minScale={1} maxScale={6} centerOnInit limitToBounds
        wheel={{ step: 0.15, activationKeys: ['Control', 'Meta'] }}
        trackPadPanning={{ disabled: true }}
        panning={{ disabled: !zoomed, velocityDisabled: true }}
        doubleClick={{ mode: 'zoomIn', step: 0.7 }}
        onTransform={(_ref, state) => setZoomed(state.scale > 1.01)}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="absolute right-3 top-3 z-10 flex flex-col overflow-hidden rounded-xl border border-sand-300 bg-white/95 shadow-card backdrop-blur">
              <button onClick={() => zoomIn(0.5)} className="p-2.5 text-forest hover:bg-sand" aria-label="Aproximar"><Plus className="h-4 w-4" /></button>
              <button onClick={() => zoomOut(0.5)} className="border-y border-sand-200 p-2.5 text-forest hover:bg-sand" aria-label="Afastar"><Minus className="h-4 w-4" /></button>
              <button onClick={() => resetTransform()} className="p-2.5 text-forest hover:bg-sand" aria-label="Restaurar visualização"><RotateCcw className="h-4 w-4" /></button>
            </div>
            <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full">
              <svg ref={svgRef} viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`} className="block h-auto w-full select-none" role="group" aria-label="Planta interativa dos lotes">
                <defs>
                  <pattern id="vdl-grass" width="14" height="14" patternUnits="userSpaceOnUse">
                    <rect width="14" height="14" fill="#DDE5CF" />
                    <circle cx="3" cy="4" r="1" fill="#C7D3B5" />
                    <circle cx="10" cy="10" r="1" fill="#C7D3B5" />
                  </pattern>
                  <linearGradient id="vdl-lake" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#A9CBD0" />
                    <stop offset="1" stopColor="#5F9198" />
                  </linearGradient>
                </defs>

                {plan.image_url ? (
                  <image href={assetUrl(plan.image_url)} x={vbX} y={vbY} width={vbW} height={vbH} preserveAspectRatio="xMidYMid meet" />
                ) : (
                  <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="url(#vdl-grass)" />
                )}

                {plan.is_demo && !plan.image_url && (
                  <g aria-hidden="true">
                    {DEMO_PLAN_DECOR.green.map((d, i) => <path key={i} d={d} fill="#B9CCA2" opacity={0.8} />)}
                    {DEMO_PLAN_DECOR.roads.map((r, i) => (
                      <g key={i}>
                        <path d={r.d} stroke="#D9D2C0" strokeWidth={r.w + 4} fill="none" strokeLinecap="round" />
                        <path d={r.d} stroke="#F4F0E6" strokeWidth={r.w} fill="none" strokeLinecap="round" />
                      </g>
                    ))}
                    <path d={DEMO_PLAN_DECOR.lake} fill="url(#vdl-lake)" stroke="#8DB3B8" strokeWidth="3" />
                    <text x="920" y="625" textAnchor="middle" className="font-display" fontSize="44" fontStyle="italic" fill="#fff" opacity=".9">Lago</text>
                    <text x="1000" y="330" textAnchor="middle" fontSize="12" letterSpacing="3" fill="#4B5A3D" opacity=".75">ÁREA VERDE</text>
                    <text x="295" y="715" textAnchor="middle" fontSize="12" letterSpacing="3" fill="#4B5A3D" opacity=".75">ÁREA VERDE</text>
                    <text x="560" y="68" textAnchor="middle" fontSize="11" letterSpacing="4" fill="#8B8473">AVENIDA PRINCIPAL (FICTÍCIA)</text>
                    <g transform="translate(60 740)">
                      <circle r="22" fill="#fff" opacity=".85" />
                      <path d="M0 -16 L5 0 L0 16 L-5 0 Z" fill="#18392B" />
                      <path d="M0 -16 L5 0 L-5 0 Z" fill="#C6A76A" />
                      <text y="-26" textAnchor="middle" fontSize="11" fontWeight="700" fill="#18392B">N</text>
                    </g>
                  </g>
                )}

                {lots.map((lot) => {
                  if (!lot.svg_path) return null
                  const selected = lot.id === selectedId
                  const dim = isHighlighted ? !isHighlighted(lot) : false
                  const label = `Lote ${lot.number}, quadra ${lot.block?.code ?? ''}: ${LOT_STATUS[lot.status].label}`
                  return (
                    <g key={lot.id} className="group" opacity={dim ? 0.25 : 1} style={{ transition: 'opacity .3s' }}>
                      <path
                        d={lot.svg_path}
                        data-block={lot.block_id}
                        fill={statusFill(lot.status)}
                        fillOpacity={plan.image_url ? 0.55 : selected ? 1 : 0.82}
                        stroke={selected ? '#C6A76A' : '#FFFFFF'}
                        strokeWidth={selected ? 4 : 1.5}
                        className={cn('outline-none transition-[fill-opacity] duration-200', onSelect && 'cursor-pointer hover:fill-opacity-100 focus-visible:stroke-[#C6A76A] focus-visible:[stroke-width:4]')}
                        tabIndex={onSelect ? 0 : -1}
                        role={onSelect ? 'button' : undefined}
                        aria-label={label}
                        aria-pressed={onSelect ? selected : undefined}
                        onClick={() => onSelect?.(lot)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            onSelect?.(lot)
                          }
                        }}
                      >
                        <title>{label}</title>
                      </path>
                      {lot.label_x != null && lot.label_y != null && (
                        <text x={lot.label_x} y={lot.label_y} textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="700" fill="#fff" pointerEvents="none" style={{ textShadow: '0 1px 2px rgba(0,0,0,.35)' }}>
                          {lot.number}
                        </text>
                      )}
                    </g>
                  )
                })}

                {blocks.map((b) => {
                  const box = blockBoxes[b.id]
                  if (!box) return null
                  return (
                    <text key={b.id} x={box.x - 10} y={box.y + box.height / 2} textAnchor="end" dominantBaseline="central" className="font-display" fontSize="26" fontWeight="600" fill="#18392B" pointerEvents="none">
                      {b.code}
                    </text>
                  )
                })}

                {plan.is_demo && (
                  <text x={vbX + vbW / 2} y={vbY + vbH - 14} textAnchor="middle" fontSize="13" letterSpacing="4" fill="#18392B" opacity=".55" pointerEvents="none">
                    PLANTA FICTÍCIA · DEMONSTRAÇÃO · SUJEITA À PLANTA OFICIAL
                  </text>
                )}
              </svg>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
      <p className="pointer-events-none absolute bottom-2 left-3 z-10 hidden rounded bg-white/80 px-2 py-0.5 text-[10px] text-graphite-400 sm:block">
        Use os botões ou Ctrl + rolagem para ampliar · arraste para mover quando ampliado
      </p>
    </div>
  )
})

export function LotLegend({ counts, className }: { counts?: Partial<Record<LotStatus, number>>; className?: string }) {
  return (
    <ul className={cn('flex flex-wrap gap-x-5 gap-y-2', className)}>
      {(Object.keys(LOT_STATUS) as LotStatus[]).map((s) => (
        <li key={s} className="flex items-center gap-2 text-sm text-graphite-500">
          <span className="h-3.5 w-3.5 rounded-[4px]" style={{ backgroundColor: LOT_STATUS[s].color }} />
          {LOT_STATUS[s].label}
          {counts && <span className="font-semibold text-forest">{counts[s] ?? 0}</span>}
        </li>
      ))}
    </ul>
  )
}
