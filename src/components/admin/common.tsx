import type { ReactNode } from 'react'
import { Badge } from '@/components/ui'
import { LEAD_STAGES, STAGE_COLOR, STAGE_LABEL } from '@/lib/constants'
import { cn } from '@/lib/format'
import type { LeadStage } from '@/types'

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="admin-h1">{title}</h1>
        {description && <p className="mt-1 text-sm text-graphite-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function KpiCard({ label, value, hint, icon, accent }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; accent?: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-sand-300/70 bg-white p-4 shadow-card sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-graphite-400">{label}</p>
        {icon && <span className="text-olive" style={accent ? { color: accent } : undefined}>{icon}</span>}
      </div>
      <p className="mt-2 font-display text-3xl font-semibold text-forest sm:text-4xl">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-graphite-400">{hint}</p>}
    </div>
  )
}

export function StageBadge({ stage }: { stage: LeadStage }) {
  return <Badge color={STAGE_COLOR[stage]}>{STAGE_LABEL[stage]}</Badge>
}

export function StageSelect({ value, onChange, className, disabled }: { value: LeadStage; onChange: (s: LeadStage) => void; className?: string; disabled?: boolean }) {
  return (
    <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as LeadStage)}
      className={cn('h-9 rounded-full border border-sand-300 bg-white px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-forest/20', className)}
      style={{ color: STAGE_COLOR[value] }} aria-label="Etapa do funil">
      {LEAD_STAGES.map((s) => <option key={s.key} value={s.key} style={{ color: s.color }}>{s.label}</option>)}
    </select>
  )
}

export function Section({ title, actions, children, className }: { title: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-xl border border-sand-300/70 bg-white shadow-card', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-sand-200 px-5 py-3.5">
        <h2 className="font-semibold text-forest">{title}</h2>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

/** Converte "AAAA-MM-DDTHH:mm" (input local) ↔ ISO. */
export const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
export const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null)
export const todayIso = () => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
