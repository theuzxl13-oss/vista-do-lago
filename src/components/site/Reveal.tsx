import type { ReactNode } from 'react'
import { motion } from 'motion/react'

/** Animação de entrada suave ao rolar a página. */
export function Reveal({ children, delay = 0, className, y = 24 }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

export function SectionHeading({ eyebrow, title, description, align = 'left', light }: {
  eyebrow: string; title: ReactNode; description?: ReactNode; align?: 'left' | 'center'; light?: boolean
}) {
  return (
    <Reveal className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <p className={`eyebrow ${light ? 'text-gold-300' : ''}`}>{eyebrow}</p>
      <h2 className={`heading-xl mt-4 ${light ? 'text-white' : ''}`}>{title}</h2>
      <div className={`mt-6 h-px w-16 bg-gradient-to-r from-gold to-transparent ${align === 'center' ? 'mx-auto' : ''}`} />
      {description && <p className={`mt-6 text-base leading-relaxed ${light ? 'text-white/75' : 'text-graphite-500'}`}>{description}</p>}
    </Reveal>
  )
}
