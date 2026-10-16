import { useRef, type ReactNode } from 'react'
import { gsap, useGsap } from '@/lib/gsap'

/** Revelação suave (fade in up) ao entrar na tela — GSAP + ScrollTrigger. */
export function Reveal({ children, delay = 0, className, y = 32 }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  useGsap(ref, ({ reduce, mobile }, el) => {
    if (reduce) return
    gsap.fromTo(el, { y: mobile ? y * 0.6 : y, opacity: 0 }, {
      y: 0, opacity: 1, duration: 1.1, delay, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    })
  })
  return <div ref={ref} className={className}>{children}</div>
}

/** Título de seção com revelação por máscara (o texto sobe de dentro de uma janela). */
export function SectionHeading({ eyebrow, title, description, align = 'left', light }: {
  eyebrow: string; title: ReactNode; description?: ReactNode; align?: 'left' | 'center'; light?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  useGsap(ref, ({ reduce }, el) => {
    if (reduce) return
    const q = gsap.utils.selector(el)
    gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 85%', once: true } })
      .fromTo(q('[data-eyebrow]'), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 })
      .fromTo(q('[data-title]'), { yPercent: 105 }, { yPercent: 0, duration: 1.3, ease: 'expo.out' }, 0.1)
      .fromTo(q('[data-rule]'), { scaleX: 0 }, { scaleX: 1, duration: 1, ease: 'power3.inOut' }, 0.5)
      .fromTo(q('[data-desc]'), { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 1 }, 0.6)
  })
  return (
    <div ref={ref} className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <p data-eyebrow className={`eyebrow ${light ? 'text-gold-300' : ''}`}>{eyebrow}</p>
      <div className="mt-4 overflow-hidden pb-[0.12em]">
        <h2 data-title className={`heading-xl will-change-transform ${light ? 'text-white' : ''}`}>{title}</h2>
      </div>
      <div data-rule className={`mt-6 h-px w-16 bg-gradient-to-r from-gold to-transparent ${align === 'center' ? 'mx-auto origin-center' : 'origin-left'}`} />
      {description && <p data-desc className={`mt-6 text-base leading-relaxed ${light ? 'text-white/75' : 'text-graphite-500'}`}>{description}</p>}
    </div>
  )
}
