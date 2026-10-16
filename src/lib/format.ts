const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
const dateTimeFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
})
const timeFmt = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

export const formatCurrency = (v: number | null | undefined) => (v == null ? '—' : currency.format(v))
export const formatNumber = (v: number | null | undefined) => (v == null ? '—' : number.format(v))
export const formatArea = (v: number | null | undefined) => (v == null ? '—' : `${number.format(v)} m²`)
export const formatDate = (v: string | null | undefined) => (v ? dateFmt.format(parseDate(v)) : '—')
export const formatDateTime = (v: string | null | undefined) => (v ? dateTimeFmt.format(new Date(v)) : '—')
export const formatTime = (v: string | null | undefined) => (v ? timeFmt.format(new Date(v)) : '—')

/** Datas "AAAA-MM-DD" são interpretadas no fuso local (evita voltar um dia). */
export function parseDate(v: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T12:00:00`) : new Date(v)
}

export const onlyDigits = (v: string | null | undefined) => (v ?? '').replace(/\D/g, '')

export function formatPhone(v: string | null | undefined): string {
  let d = onlyDigits(v)
  if (!d) return '—'
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2)
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return d
}

/** Máscara progressiva para campos de telefone brasileiros. */
export function maskPhone(v: string): string {
  const d = onlyDigits(v).slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** Número no formato internacional para links wa.me (assume Brasil quando sem DDI). */
export function toWhatsAppNumber(v: string | null | undefined): string {
  const d = onlyDigits(v)
  if (!d) return ''
  return d.length <= 11 ? `55${d}` : d
}

export function whatsappLink(number: string | null | undefined, message: string): string {
  const n = toWhatsAppNumber(number)
  return `https://wa.me/${n}?text=${encodeURIComponent(message)}`
}

export function lotLabel(blockCode: string | undefined, number: string): string {
  return `Lote ${number}${blockCode ? ` · Quadra ${blockCode}` : ''}`
}

export function lotDimensions(l: { front_m: number | null; back_m: number | null; left_m: number | null; right_m: number | null }): string {
  if (l.front_m == null) return '—'
  const f = number.format(l.front_m)
  const side = l.left_m ?? l.right_m
  if (side == null) return `${f} m de frente`
  const sameBack = l.back_m == null || l.back_m === l.front_m
  const sameSide = l.left_m == null || l.right_m == null || l.left_m === l.right_m
  if (sameBack && sameSide) return `${f} × ${number.format(side)} m`
  return `Frente ${f} m · Fundos ${number.format(l.back_m ?? l.front_m)} m · Laterais ${number.format(l.left_m ?? 0)} / ${number.format(l.right_m ?? 0)} m`
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.replace(/[^\p{L}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

/** Resolve URLs relativas (imagens de demonstração empacotadas no site) contra o caminho base. */
export function assetUrl(url: string | null | undefined): string {
  if (!url) return ''
  if (/^(https?:|data:|blob:)/.test(url)) return url
  return `${import.meta.env.BASE_URL}${url.replace(/^\//, '')}`
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}
