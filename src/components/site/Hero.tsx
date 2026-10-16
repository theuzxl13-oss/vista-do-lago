import { motion, useScroll, useTransform } from 'motion/react'
import { ChevronDown, MapPinned, MessageCircle, Compass } from 'lucide-react'
import { assetUrl } from '@/lib/format'

const ease = [0.22, 1, 0.36, 1] as const

export function Hero() {
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 800], [0, 160])
  const fade = useTransform(scrollY, [0, 500], [1, 0])

  return (
    <section className="grain relative flex min-h-[100svh] items-center overflow-hidden bg-forest-900" aria-label="Apresentação">
      <motion.div style={{ y }} className="absolute inset-0">
        <img
          src={assetUrl('demo/gallery/hero.svg')}
          alt="Ilustração de um lago ao entardecer cercado por natureza"
          className="h-full w-full animate-kenburns object-cover"
          fetchPriority="high"
        />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-b from-forest-900/55 via-forest-900/25 to-forest-900/85" />
      <div className="absolute inset-0 bg-gradient-to-r from-forest-900/60 via-transparent to-transparent" />

      <motion.div style={{ opacity: fade }} className="container-luxe relative z-10 pb-24 pt-32 sm:pt-40">
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.2, ease }}
          className="eyebrow text-gold-300">
          O lugar onde seus sonhos encontram a natureza
        </motion.p>
        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, delay: 0.35, ease }}
          className="mt-6 font-display text-[3.4rem] font-medium leading-[0.95] tracking-[0.04em] text-white sm:text-7xl lg:text-[7.5rem]">
          VISTA<br className="sm:hidden" /> DO LAGO
        </motion.h1>
        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.2, delay: 0.8, ease }}
          className="mt-8 h-px w-28 origin-left bg-gold" />
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.9, ease }}
          className="mt-8 max-w-xl font-display text-2xl italic leading-snug text-white/95 sm:text-3xl">
          Mais do que um terreno. Um novo horizonte para sua vida.
        </motion.p>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 1.05, ease }}
          className="mt-5 max-w-lg text-[15px] leading-relaxed text-white/75">
          Descubra um empreendimento planejado para quem busca tranquilidade, contato com a natureza e a oportunidade de construir um futuro extraordinário.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 1.2, ease }}
          className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a href="#sobre" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gold px-7 text-sm font-semibold tracking-wide text-forest-900 transition hover:bg-gold-300">
            <Compass className="h-4 w-4" /> Conheça o empreendimento
          </a>
          <a href="#lotes" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/50 px-7 text-sm font-semibold tracking-wide text-white backdrop-blur-sm transition hover:bg-white hover:text-forest">
            <MapPinned className="h-4 w-4" /> Explore os lotes
          </a>
          <a href="#contato" className="inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold tracking-wide text-white/90 underline-offset-8 transition hover:text-gold-300 hover:underline">
            <MessageCircle className="h-4 w-4" /> Fale com um consultor
          </a>
        </motion.div>
      </motion.div>

      <a href="#sobre" aria-label="Rolar para o conteúdo" className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-white/70 transition hover:text-gold">
        <motion.span animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2.2 }} className="flex flex-col items-center gap-2 text-[10px] uppercase tracking-luxe">
          Role <ChevronDown className="h-4 w-4" />
        </motion.span>
      </a>
      <p className="absolute bottom-3 right-5 z-10 text-[10px] uppercase tracking-widest text-white/40">Imagem ilustrativa</p>
    </section>
  )
}
