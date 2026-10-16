import { motion } from 'motion/react'
import { WhatsAppIcon } from '@/components/ui/icons'
import { useSettings } from '@/context/SettingsContext'
import { whatsappLink } from '@/lib/format'

export function WhatsAppFloat() {
  const { settings } = useSettings()
  const { whatsapp_number, whatsapp_message } = settings.contact
  return (
    <motion.a
      href={whatsappLink(whatsapp_number, whatsapp_message)}
      target="_blank" rel="noopener noreferrer"
      aria-label="Conversar pelo WhatsApp"
      initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1.2, type: 'spring' }}
      className="group fixed bottom-5 right-5 z-40 flex items-center gap-3 rounded-full bg-[#25D366] p-3.5 text-white shadow-xl shadow-black/20 transition hover:pr-5 sm:bottom-7 sm:right-7"
    >
      <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#25D366]/40 [animation-duration:2.5s]" />
      <WhatsAppIcon className="h-7 w-7" />
      <span className="hidden max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold transition-all duration-300 group-hover:max-w-[160px] sm:inline">
        Fale conosco
      </span>
    </motion.a>
  )
}
