import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'

type Kind = 'success' | 'error' | 'info'
interface Toast { id: number; kind: Kind; message: string }
interface ToastCtx { toast: (message: string, kind?: Kind) => void }

const Ctx = createContext<ToastCtx | null>(null)
let seq = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const toast = useCallback((message: string, kind: Kind = 'success') => {
    const id = ++seq
    setToasts((t) => [...t, { id, kind, message }])
    setTimeout(() => dismiss(id), kind === 'error' ? 7000 : 4000)
  }, [dismiss])
  const value = useMemo(() => ({ toast }), [toast])
  const icons = { success: CheckCircle2, error: AlertTriangle, info: Info }
  const colors = { success: 'border-l-forest-400', error: 'border-l-red-500', info: 'border-l-gold' }
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = icons[t.kind]
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8 }}
                className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-lg border border-l-4 border-sand-300 bg-white px-4 py-3 text-sm text-graphite shadow-soft ${colors[t.kind]}`}
                role={t.kind === 'error' ? 'alert' : 'status'}
              >
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${t.kind === 'error' ? 'text-red-600' : 'text-forest'}`} />
                <p className="flex-1">{t.message}</p>
                <button onClick={() => dismiss(t.id)} aria-label="Fechar aviso" className="text-graphite-400 hover:text-graphite">
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast fora do ToastProvider')
  return ctx.toast
}
