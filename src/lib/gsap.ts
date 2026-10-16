import { useLayoutEffect, type DependencyList, type RefObject } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)
gsap.defaults({ ease: 'power3.out' })

export { gsap, ScrollTrigger }

export interface MotionEnv {
  /** Usuário pediu menos movimento (prefers-reduced-motion). */
  reduce: boolean
  /** Telas pequenas: efeitos mais leves e sem pin. */
  mobile: boolean
}

/**
 * Executa animações GSAP com escopo no componente (gsap.context) e
 * condições de mídia (gsap.matchMedia). Tudo é revertido ao desmontar,
 * inclusive ScrollTriggers e estilos inline.
 */
export function useGsap<T extends HTMLElement>(
  scope: RefObject<T | null>,
  setup: (env: MotionEnv, root: T) => void | (() => void),
  deps: DependencyList = [],
) {
  useLayoutEffect(() => {
    const root = scope.current
    if (!root) return
    const mm = gsap.matchMedia()
    const ctx = gsap.context(() => {
      mm.add(
        { reduce: '(prefers-reduced-motion: reduce)', mobile: '(max-width: 767px)', all: '(min-width: 0px)' },
        (c) => {
          const { reduce, mobile } = c.conditions as { reduce: boolean; mobile: boolean }
          return setup({ reduce, mobile }, root)
        },
      )
    }, root)
    return () => {
      mm.revert()
      ctx.revert()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
