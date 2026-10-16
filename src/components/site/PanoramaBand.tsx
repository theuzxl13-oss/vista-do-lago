import { useRef } from 'react'
import { assetUrl } from '@/lib/format'
import { gsap, useGsap } from '@/lib/gsap'

/**
 * Faixa panorâmica de largura total entre seções claras: a imagem desliza mais
 * devagar que a página (parallax) e aproxima levemente; a frase surge em seguida.
 */
export function PanoramaBand({ image, eyebrow, quote, caption = 'Imagem ilustrativa', align = 'left' }: {
  image: string; eyebrow: string; quote: string; caption?: string; align?: 'left' | 'right'
}) {
  const ref = useRef<HTMLElement>(null)
  useGsap(ref, ({ reduce, mobile }, el) => {
    if (reduce) return
    const q = gsap.utils.selector(el)
    gsap.fromTo(q('[data-pano]'), { yPercent: mobile ? -6 : -12, scale: 1.18 }, {
      yPercent: mobile ? 6 : 12, scale: 1.04, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
    })
    gsap.fromTo(q('[data-quote] > *'), { y: 40, opacity: 0 }, {
      y: 0, opacity: 1, duration: 1.2, stagger: 0.15,
      scrollTrigger: { trigger: el, start: 'top 65%', once: true },
    })
  })
  return (
    <section ref={ref} className="relative h-[72svh] min-h-[420px] overflow-hidden bg-forest-900" aria-label={eyebrow}>
      <img data-pano src={assetUrl(image)} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover will-change-transform" />
      <div className={`absolute inset-0 ${align === 'left' ? 'bg-gradient-to-r' : 'bg-gradient-to-l'} from-forest-900/75 via-forest-900/25 to-transparent`} />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-forest-900/50 to-transparent" />
      <div className={`container-luxe relative flex h-full items-center ${align === 'right' ? 'justify-end text-right' : ''}`}>
        <div data-quote className="max-w-xl text-white">
          <p className="eyebrow text-gold-300">{eyebrow}</p>
          <p className="mt-5 font-display text-4xl italic leading-tight sm:text-5xl lg:text-6xl">{quote}</p>
          <div className={`mt-8 h-px w-20 bg-gold ${align === 'right' ? 'ml-auto' : ''}`} />
        </div>
      </div>
      <p className="absolute bottom-3 right-5 text-[10px] uppercase tracking-widest text-white/45">{caption}</p>
    </section>
  )
}
