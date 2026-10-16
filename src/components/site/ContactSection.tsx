import { Clock, Mail, Phone } from 'lucide-react'
import { WhatsAppIcon } from '@/components/ui/icons'
import { useSettings } from '@/context/SettingsContext'
import type { LotWithBlock } from '@/hooks/useLots'
import { formatPhone, whatsappLink } from '@/lib/format'
import { LeadForm } from './LeadForm'
import { Reveal, SectionHeading } from './Reveal'

export function ContactSection({ lots }: { lots: LotWithBlock[] }) {
  const { settings } = useSettings()
  const c = settings.contact
  return (
    <section id="contato" className="relative overflow-hidden bg-forest py-24 text-white sm:py-32">
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-gold/10 blur-3xl" />
      <div className="container-luxe relative grid gap-14 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <SectionHeading light eyebrow="Fale com um consultor" title={<>Seu novo horizonte <em className="text-gold">começa aqui.</em></>}
            description="Receba a disponibilidade atualizada, condições comerciais e agende uma visita ao empreendimento." />
          <Reveal delay={0.1} className="mt-10 space-y-5 text-sm text-white/80">
            <a href={whatsappLink(c.whatsapp_number, c.whatsapp_message)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 hover:text-gold">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366]"><WhatsAppIcon className="h-5 w-5 text-white" /></span>
              {c.whatsapp_number ? formatPhone(c.whatsapp_number) : 'Conversar pelo WhatsApp'}
            </a>
            {c.phone && <p className="flex items-center gap-4"><span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20"><Phone className="h-4 w-4" /></span><a href={`tel:${c.phone}`}>{formatPhone(c.phone)}</a></p>}
            {c.email && <p className="flex items-center gap-4"><span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20"><Mail className="h-4 w-4" /></span><a href={`mailto:${c.email}`}>{c.email}</a></p>}
            {c.business_hours && <p className="flex items-center gap-4"><span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20"><Clock className="h-4 w-4" /></span>{c.business_hours}</p>}
          </Reveal>
        </div>
        <Reveal delay={0.15}>
          <div className="rounded-[1.75rem] bg-white p-6 text-graphite shadow-2xl sm:p-10">
            <p className="font-display text-3xl text-forest">Receba uma proposta</p>
            <p className="mb-6 mt-1 text-sm text-graphite-400">Preencha seus dados — respondemos o mais breve possível.</p>
            <LeadForm lots={lots} />
          </div>
        </Reveal>
      </div>
    </section>
  )
}
