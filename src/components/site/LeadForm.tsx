import { useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'motion/react'
import { CheckCircle2, Send } from 'lucide-react'
import { Button, Checkbox, Field, Input, Select, Textarea } from '@/components/ui'
import { WhatsAppIcon } from '@/components/ui/icons'
import { backend, isDemoMode, toAppError } from '@/services/backend'
import { useSettings } from '@/context/SettingsContext'
import { getUtm } from '@/lib/tracking'
import { maskPhone, onlyDigits, whatsappLink } from '@/lib/format'
import { LOT_STATUS } from '@/lib/constants'
import type { LotWithBlock } from '@/hooks/useLots'

export const leadSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(3, { message: 'Informe seu nome completo.' })
    .max(120, { message: 'Nome muito longo.' })
    .refine((v) => v.split(/\s+/).length >= 2, { message: 'Informe nome e sobrenome.' }),
  phone: z.string().refine((v) => /^\d{10,11}$/.test(onlyDigits(v)), { message: 'Informe um telefone válido com DDD.' }),
  email: z.union([z.literal(''), z.string().trim().email({ message: 'Informe um e-mail válido.' })]),
  lot_id: z.string(),
  message: z.string().max(2000, { message: 'Mensagem muito longa (máx. 2000 caracteres).' }),
  consent: z.boolean().refine((v) => v, { message: 'É necessário autorizar o contato para continuar.' }),
  website: z.string(), // campo isca anti-robô (oculto)
})
export type LeadFormValues = z.infer<typeof leadSchema>

interface Props {
  lots: LotWithBlock[]
  defaultLotId?: string | null
  defaultMessage?: string
  source?: 'site_form' | 'lot_map'
  submitLabel?: string
  dark?: boolean
  onSuccess?: () => void
}

export function LeadForm({ lots, defaultLotId, defaultMessage = '', source = 'site_form', submitLabel = 'QUERO RECEBER UMA PROPOSTA', dark, onSuccess }: Props) {
  const { settings } = useSettings()
  const [done, setDone] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const startedAt = useRef(Date.now())
  const uid = useId()
  const fid = (name: string) => `${uid}-${name}`
  const {
    register, handleSubmit, setValue, watch, reset,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: { full_name: '', phone: '', email: '', lot_id: defaultLotId ?? '', message: defaultMessage, consent: false, website: '' },
  })

  const selectableLots = lots.filter((l) => l.status === 'available' || l.status === 'reserved' || l.id === defaultLotId)
  const lotId = watch('lot_id')
  const selectedLot = lots.find((l) => l.id === lotId)

  const onSubmit = async (v: LeadFormValues) => {
    setServerError(null)
    // Envio rápido demais é típico de robôs
    if (Date.now() - startedAt.current < 2500) {
      setServerError('Por favor, revise seus dados e envie novamente.')
      startedAt.current = Date.now() - 1000
      return
    }
    try {
      await backend.submitLead({
        full_name: v.full_name,
        phone: onlyDigits(v.phone),
        email: v.email || undefined,
        message: v.message || undefined,
        lot_id: v.lot_id || null,
        source: v.lot_id && source === 'lot_map' ? 'lot_map' : source,
        consent: v.consent,
        website: v.website,
        utm: getUtm(),
        page: window.location.pathname,
      })
      setDone(true)
      reset()
      onSuccess?.()
    } catch (e) {
      setServerError(toAppError(e).message)
    }
  }

  const label = dark ? 'text-white/70' : ''
  const whatsMsg = selectedLot
    ? `Olá! Tenho interesse no lote ${selectedLot.number}, quadra ${selectedLot.block?.code ?? ''}, do empreendimento Vista do Lago. Gostaria de receber mais informações.`
    : settings.contact.whatsapp_message

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
        className={`rounded-2xl p-8 text-center ${dark ? 'bg-white/5 text-white' : 'bg-forest-50 text-forest'}`} role="status">
        <CheckCircle2 className="mx-auto h-12 w-12 text-gold" strokeWidth={1.4} />
        <p className="mt-4 font-display text-3xl">Recebemos seu contato!</p>
        <p className={`mx-auto mt-2 max-w-sm text-sm ${dark ? 'text-white/70' : 'text-graphite-500'}`}>
          Um consultor do Vista do Lago entrará em contato em breve.
          {isDemoMode && ' (Modo demonstração: o contato foi registrado apenas nesta sessão do navegador e pode ser visto no painel /admin.)'}
        </p>
        <Button variant={dark ? 'light' : 'outline'} className="mt-6" onClick={() => setDone(false)}>Enviar outro contato</Button>
      </motion.div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {/* Campo isca: invisível para pessoas, preenchido por robôs */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Website<input tabIndex={-1} autoComplete="off" {...register('website')} /></label>
      </div>

      <Field label="Nome completo" required error={errors.full_name?.message} htmlFor={fid('name')} className={label}>
        <Input id={fid('name')} autoComplete="name" placeholder="Como podemos te chamar?" aria-invalid={!!errors.full_name} {...register('full_name')} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Telefone / WhatsApp" required error={errors.phone?.message} htmlFor={fid('phone')} className={label}>
          <Input id={fid('phone')} type="tel" inputMode="tel" autoComplete="tel" placeholder="(00) 00000-0000" aria-invalid={!!errors.phone}
            {...register('phone', { onChange: (e) => setValue('phone', maskPhone(e.target.value)) })} />
        </Field>
        <Field label="E-mail" error={errors.email?.message} htmlFor={fid('email')} className={label}>
          <Input id={fid('email')} type="email" autoComplete="email" placeholder="voce@email.com" aria-invalid={!!errors.email} {...register('email')} />
        </Field>
      </div>
      <Field label="Lote de interesse" htmlFor={fid('lot')} className={label} hint={selectedLot ? `Situação: ${LOT_STATUS[selectedLot.status].label}` : undefined}>
        <Select id={fid('lot')} {...register('lot_id')}>
          <option value="">Ainda não escolhi / quero orientação</option>
          {selectableLots.map((l) => (
            <option key={l.id} value={l.id}>
              Quadra {l.block?.code} · Lote {l.number}{l.area_m2 ? ` · ${l.area_m2} m²` : ''}{l.status !== 'available' ? ` (${LOT_STATUS[l.status].label.toLowerCase()})` : ''}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Mensagem" error={errors.message?.message} htmlFor={fid('msg')} className={label}>
        <Textarea id={fid('msg')} rows={3} placeholder="Conte o que você procura: construir, investir, melhor horário para contato…" {...register('message')} />
      </Field>
      <Checkbox
        className={dark ? 'text-white/70' : ''}
        {...register('consent')}
        label={<>Autorizo o Vista do Lago a utilizar meus dados para contato comercial sobre o empreendimento, conforme a <Link to="/privacidade" target="_blank" className="font-semibold underline underline-offset-2">Política de Privacidade</Link> (LGPD).</>}
      />
      {errors.consent && <p className="text-xs text-red-500" role="alert">{errors.consent.message}</p>}
      {serverError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{serverError}</p>}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <Button type="submit" variant="gold" size="lg" loading={isSubmitting} icon={<Send className="h-4 w-4" />} className="flex-1">
          {submitLabel}
        </Button>
        <a href={whatsappLink(settings.contact.whatsapp_number, whatsMsg)} target="_blank" rel="noopener noreferrer"
          className={`inline-flex h-12 items-center justify-center gap-2 rounded-full border px-6 text-sm font-semibold transition ${dark ? 'border-white/30 text-white hover:bg-white/10' : 'border-forest/20 text-forest hover:bg-forest/5'}`}>
          <WhatsAppIcon className="h-5 w-5 text-[#25D366]" /> WhatsApp
        </a>
      </div>
    </form>
  )
}
