import { useRef } from 'react'
import { ArrowRight, ChevronDown, MapPinned, MessageCircle } from 'lucide-react'
import { useSettings } from '@/context/SettingsContext'
import { gsap, useGsap } from '@/lib/gsap'
import { assetUrl } from '@/lib/format'

const TITLE = 'VISTA DO LAGO'

/**
 * Hero cinematográfico: paisagem em camadas (céu, montanhas, colinas, lago e
 * primeiro plano) com parallax em profundidade, aproximação durante a rolagem,
 * nuvens e névoa flutuantes, e transição suave para a seção seguinte.
 */
export function Hero() {
  const root = useRef<HTMLElement>(null)
  const { settings } = useSettings()
  const photo = settings.about.hero_image_url?.trim()

  useGsap(root, ({ reduce, mobile }, el) => {
    const q = gsap.utils.selector(el)
    const letters = q('[data-letter]')

    if (reduce) {
      gsap.set([letters, q('[data-intro]')], { opacity: 1, yPercent: 0, y: 0 })
      return
    }

    // Entrada: título revelado letra a letra (fade in up com máscara), depois textos e botões
    const intro = gsap.timeline({ delay: 0.15 })
    intro
      .fromTo(q('[data-layer]'), { scale: 1.12 }, { scale: 1, duration: 2.4, ease: 'power2.out', stagger: 0.05 }, 0)
      .fromTo(letters, { yPercent: 115, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.3, stagger: 0.045, ease: 'expo.out' }, 0.35)
      .fromTo(q('[data-rule]'), { scaleX: 0 }, { scaleX: 1, duration: 1.2, ease: 'power3.inOut' }, 0.9)
      .fromTo(q('[data-intro]'), { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, stagger: 0.12 }, 1)

    // Elementos naturais flutuantes (movimento lento e contínuo)
    q('[data-cloud]').forEach((c, i) => {
      gsap.to(c, { xPercent: i % 2 ? -18 : 22, duration: 38 + i * 9, ease: 'sine.inOut', repeat: -1, yoyo: true })
    })
    gsap.to(q('[data-mist]'), { xPercent: -6, opacity: 0.75, duration: 14, ease: 'sine.inOut', repeat: -1, yoyo: true })

    // Parallax em camadas + aproximação da paisagem conforme a rolagem
    const depth = mobile ? 0.5 : 1
    const scroll = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: el,
        start: 'top top',
        end: mobile ? 'bottom top' : '+=85%',
        scrub: mobile ? 0.6 : 1,
        pin: !mobile,
        anticipatePin: 1,
      },
    })
    scroll
      .to(q('[data-depth="sky"]'), { yPercent: -4 * depth, scale: 1.04 }, 0)
      .to(q('[data-depth="far"]'), { yPercent: -7 * depth, scale: 1.08 }, 0)
      .to(q('[data-depth="mid"]'), { yPercent: -10 * depth, scale: 1.14 }, 0)
      .to(q('[data-depth="lake"]'), { yPercent: -6 * depth, scale: 1.22 }, 0)
      .to(q('[data-depth="photo"]'), { scale: 1.18, yPercent: -6 * depth }, 0)
      .to(q('[data-depth="front"]'), { yPercent: 14 * depth, scale: 1.35 }, 0)
      .to(q('[data-clouds]'), { yPercent: -30 * depth }, 0)
      .to(q('[data-content]'), { yPercent: -18, opacity: 0 }, 0)
      .to(q('[data-scroll-cue]'), { opacity: 0, duration: 0.2 }, 0)
      // transição cinematográfica: a paisagem se dissolve no tom areia da próxima seção
      .fromTo(q('[data-curtain]'), { opacity: 0 }, { opacity: 1, duration: 0.35 }, 0.65)
  }, [photo])

  return (
    <section ref={root} className="relative h-[100svh] min-h-[560px] overflow-hidden bg-forest-900" aria-label="Apresentação">
      <div className="absolute inset-0" aria-hidden="true">
        {photo ? (
          <img data-layer data-depth="photo" src={assetUrl(photo)} alt="" className="absolute inset-0 h-full w-full origin-[50%_70%] object-cover will-change-transform" fetchPriority="high" />
        ) : (
          <>
            <img data-layer data-depth="sky" src={assetUrl('hero/sky.svg')} alt="" className="absolute inset-0 h-full w-full object-cover will-change-transform" fetchPriority="high" />
            <div data-clouds className="absolute inset-x-0 top-[6%] h-[40%] will-change-transform">
              <img data-cloud src={assetUrl('hero/cloud.svg')} alt="" className="absolute left-[4%] top-[10%] w-[34vw] max-w-[560px] opacity-70" />
              <img data-cloud src={assetUrl('hero/cloud.svg')} alt="" className="absolute right-[2%] top-[34%] w-[26vw] max-w-[420px] opacity-50" />
              <img data-cloud src={assetUrl('hero/cloud.svg')} alt="" className="absolute left-[38%] top-[0%] w-[20vw] max-w-[320px] opacity-40" />
            </div>
            <img data-layer data-depth="far" src={assetUrl('hero/far.svg')} alt="" className="absolute inset-0 h-full w-full object-cover will-change-transform" />
            <img data-layer data-depth="mid" src={assetUrl('hero/mid.svg')} alt="" className="absolute inset-0 h-full w-full origin-[50%_60%] object-cover will-change-transform" />
            <img data-layer data-depth="lake" src={assetUrl('hero/lake.svg')} alt="" className="absolute inset-0 h-full w-full origin-[64%_62%] object-cover will-change-transform" />
          </>
        )}
        <img data-mist src={assetUrl('hero/mist.svg')} alt="" className="absolute inset-x-[-10%] top-[52%] h-[22%] w-[120%] opacity-60 will-change-transform" />
        {!photo && <img data-layer data-depth="front" src={assetUrl('hero/front.svg')} alt="" className="absolute inset-0 h-full w-full origin-bottom object-cover will-change-transform" />}
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-forest-900/55 via-transparent to-forest-900/70" />
      <div className="absolute inset-0 bg-gradient-to-r from-forest-900/55 via-forest-900/10 to-transparent" />

      <div data-content className="container-luxe relative z-10 flex h-full flex-col justify-center pb-16 pt-28 will-change-transform">
        <p data-intro className="eyebrow text-gold-300">O lugar onde seus sonhos encontram a natureza</p>
        <h1 className="mt-6 font-display text-[3.3rem] font-medium leading-[0.95] tracking-[0.04em] text-white sm:text-7xl lg:text-[7.6rem]" aria-label={TITLE}>
          {TITLE.split(' ').map((word, wi) => (
            <span key={wi} className="mr-[0.25em] inline-block overflow-hidden whitespace-nowrap pb-[0.08em] align-bottom" aria-hidden="true">
              {word.split('').map((ch, ci) => (
                <span key={ci} data-letter className="inline-block will-change-transform">{ch}</span>
              ))}
            </span>
          ))}
        </h1>
        <div data-rule className="mt-8 h-px w-28 origin-left bg-gold" />
        <p data-intro className="mt-8 max-w-xl font-display text-2xl italic leading-snug text-white/95 sm:text-3xl">
          Mais do que um terreno. Um novo horizonte para sua vida.
        </p>
        <p data-intro className="mt-5 max-w-lg text-[15px] leading-relaxed text-white/80">
          Descubra um empreendimento planejado para quem busca tranquilidade, contato com a natureza e a oportunidade de construir um futuro extraordinário.
        </p>
        <div data-intro className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a href="#sobre" className="btn-arrow group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gold px-7 text-sm font-semibold tracking-wide text-forest-900 transition duration-300 hover:bg-gold-300 hover:shadow-lg hover:shadow-gold/20">
            Conheça o empreendimento <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </a>
          <a href="#lotes" className="group inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/50 px-7 text-sm font-semibold tracking-wide text-white backdrop-blur-sm transition duration-300 hover:bg-white hover:text-forest">
            <MapPinned className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5" /> Explore os lotes
          </a>
          <a href="#contato" className="group inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold tracking-wide text-white/90 transition hover:text-gold-300">
            <MessageCircle className="h-4 w-4" /> Fale com um consultor
            <ArrowRight className="h-4 w-4 -translate-x-1 opacity-0 transition duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
          </a>
        </div>
      </div>

      <a data-scroll-cue href="#sobre" aria-label="Rolar para o conteúdo" className="group absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-[10px] uppercase tracking-luxe text-white/70 transition hover:text-gold">
        Role
        <span className="relative flex h-10 w-6 justify-center rounded-full border border-white/40">
          <span className="mt-2 h-2 w-0.5 animate-bounce rounded-full bg-current" />
        </span>
        <ChevronDown className="sr-only" />
      </a>
      <p className="absolute bottom-3 right-5 z-10 text-[10px] uppercase tracking-widest text-white/45">{photo ? 'Foto do empreendimento' : 'Imagem ilustrativa'}</p>
      <div data-curtain className="pointer-events-none absolute inset-0 z-20 bg-sand opacity-0" />
    </section>
  )
}
