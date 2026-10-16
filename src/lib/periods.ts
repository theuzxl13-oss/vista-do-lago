export type PeriodKey = '7d' | '30d' | '90d' | '12m' | 'ytd' | 'all'

export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: '7d', label: 'Últimos 7 dias' },
  { key: '30d', label: 'Últimos 30 dias' },
  { key: '90d', label: 'Últimos 90 dias' },
  { key: '12m', label: 'Últimos 12 meses' },
  { key: 'ytd', label: 'Este ano' },
  { key: 'all', label: 'Todo o período' },
]

export function periodStart(p: PeriodKey, now = new Date()): Date | null {
  const d = new Date(now)
  switch (p) {
    case '7d': d.setDate(d.getDate() - 7); return d
    case '30d': d.setDate(d.getDate() - 30); return d
    case '90d': d.setDate(d.getDate() - 90); return d
    case '12m': d.setFullYear(d.getFullYear() - 1); return d
    case 'ytd': return new Date(now.getFullYear(), 0, 1)
    default: return null
  }
}

export function inPeriod(date: string | null | undefined, p: PeriodKey, custom?: { from?: string; to?: string }): boolean {
  if (!date) return false
  const t = new Date(/^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T12:00:00` : date).getTime()
  if (custom && (custom.from || custom.to)) {
    if (custom.from && t < new Date(`${custom.from}T00:00:00`).getTime()) return false
    if (custom.to && t > new Date(`${custom.to}T23:59:59`).getTime()) return false
    return true
  }
  const start = periodStart(p)
  return !start || t >= start.getTime()
}

/** Agrupa datas em dias (períodos curtos), semanas ou meses. */
export function buildPeriodBuckets(p: PeriodKey, dates: string[]): { label: string; value: number }[] {
  const now = new Date()
  let start = periodStart(p, now)
  if (!start) {
    const min = dates.reduce((acc, d) => Math.min(acc, new Date(d).getTime()), now.getTime())
    start = new Date(min)
  }
  const spanDays = (now.getTime() - start.getTime()) / 86_400_000
  const unit: 'day' | 'week' | 'month' = spanDays <= 31 ? 'day' : spanDays <= 120 ? 'week' : 'month'
  const keyOf = (d: Date) => {
    if (unit === 'day') return d.toISOString().slice(0, 10)
    if (unit === 'month') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const monday = new Date(d)
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    return monday.toISOString().slice(0, 10)
  }
  const buckets = new Map<string, number>()
  const cursor = new Date(start)
  cursor.setHours(12, 0, 0, 0)
  while (cursor <= now) {
    buckets.set(keyOf(cursor), 0)
    if (unit === 'day') cursor.setDate(cursor.getDate() + 1)
    else if (unit === 'week') cursor.setDate(cursor.getDate() + 7)
    else cursor.setMonth(cursor.getMonth() + 1)
  }
  buckets.set(keyOf(now), buckets.get(keyOf(now)) ?? 0)
  for (const d of dates) {
    const dt = new Date(d)
    if (dt < start) continue
    const k = keyOf(dt)
    if (buckets.has(k)) buckets.set(k, buckets.get(k)! + 1)
  }
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  return [...buckets.entries()].map(([k, value]) => {
    const [y, m, d] = k.split('-')
    const label = unit === 'month' ? `${months[Number(m) - 1]}/${y.slice(2)}` : `${d}/${m}`
    return { label, value }
  })
}
