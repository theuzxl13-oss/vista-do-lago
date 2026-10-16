import {
  forwardRef, useEffect, useId, type ButtonHTMLAttributes, type ComponentProps, type InputHTMLAttributes, type ReactNode,
  type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Loader2, X, Inbox } from 'lucide-react'
import { cn } from '@/lib/format'

// ---------------------------------------------------------------------------
// Botão
// ---------------------------------------------------------------------------
type Variant = 'primary' | 'gold' | 'outline' | 'ghost' | 'danger' | 'light'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-forest text-white hover:bg-forest-600 focus-visible:ring-forest',
  gold: 'bg-gold text-forest-900 hover:bg-gold-300 focus-visible:ring-gold',
  outline: 'border border-forest/25 text-forest hover:bg-forest hover:text-white focus-visible:ring-forest',
  ghost: 'text-forest hover:bg-forest/5 focus-visible:ring-forest',
  danger: 'bg-red-700 text-white hover:bg-red-800 focus-visible:ring-red-700',
  light: 'border border-white/60 text-white hover:bg-white hover:text-forest focus-visible:ring-white',
}
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-sm gap-2 tracking-wide',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center rounded-full font-semibold transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant], sizes[size], className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  )
})

// ---------------------------------------------------------------------------
// Campos de formulário
// ---------------------------------------------------------------------------
const fieldBase =
  'rounded-lg border border-sand-300 bg-white px-3.5 text-sm text-graphite placeholder:text-graphite-400/70 ' +
  'transition focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15 disabled:bg-sand/60 aria-[invalid=true]:border-red-500'

/** Largura total por padrão, exceto quando a classe informada já define a largura. */
const widthOf = (className?: string) => (/(^|\s)w-/.test(className ?? '') ? '' : 'w-full')

export function Field({ label, error, hint, children, required, htmlFor, className }: {
  label?: string; error?: string; hint?: string; children: ReactNode; required?: boolean; htmlFor?: string; className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-xs font-semibold uppercase tracking-wider text-graphite-500">
          {label}
          {required && <span className="ml-0.5 text-gold-700">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-red-600" role="alert">{error}</p>
      ) : hint ? (
        <p className="text-xs text-graphite-400">{hint}</p>
      ) : null}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cn(fieldBase, 'h-11', widthOf(className), className)} {...p} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} className={cn(fieldBase, 'min-h-[96px] w-full py-3', className)} {...p} />
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...p }, ref) {
  return (
    <select ref={ref} className={cn(fieldBase, widthOf(className), 'h-11 appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9', className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23687B55' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
      {...p}>
      {children}
    </select>
  )
})

export function Checkbox({ label, className, ...p }: ComponentProps<'input'> & { label: ReactNode }) {
  const id = useId()
  return (
    <label htmlFor={p.id ?? id} className={cn('flex cursor-pointer items-start gap-2.5 text-sm text-graphite-500', className)}>
      <input id={p.id ?? id} type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 rounded border-sand-300 accent-forest" {...p} />
      <span>{label}</span>
    </label>
  )
}

// ---------------------------------------------------------------------------
// Exibição
// ---------------------------------------------------------------------------
export function Badge({ children, color, className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold', className)}
      style={color ? { backgroundColor: `${color}1F`, color } : undefined}
    >
      {color && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />}
      {children}
    </span>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-xl border border-sand-300/70 bg-white shadow-card', className)}>{children}</div>
}

export function Spinner({ className, label = 'Carregando…' }: { className?: string; label?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-2 py-10 text-sm text-graphite-400', className)} role="status">
      <Loader2 className="h-5 w-5 animate-spin text-olive" />
      <span>{label}</span>
    </div>
  )
}

export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-sand-300 bg-sand/40 px-6 py-12 text-center">
      <div className="mb-3 text-olive">{icon ?? <Inbox className="h-8 w-8" />}</div>
      <p className="font-semibold text-forest">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-graphite-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
      <p>{message}</p>
      {onRetry && <button onClick={onRetry} className="mt-1 font-semibold underline">Tentar novamente</button>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Modal e painel lateral
// ---------------------------------------------------------------------------
function useLockScroll(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }: {
  open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  useLockScroll(open, onClose)
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-forest-900/50 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div
            role="dialog" aria-modal="true"
            className={cn('relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl', widths[size])}
            initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            <div className="flex items-center justify-between gap-4 border-b border-sand-200 px-5 py-4">
              <h2 className="font-display text-2xl font-semibold text-forest">{title}</h2>
              <button onClick={onClose} className="rounded-full p-1.5 text-graphite-400 hover:bg-sand hover:text-graphite" aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
            {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-sand-200 bg-sand/40 px-5 py-3">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function Drawer({ open, onClose, title, children, footer, width = 'max-w-lg' }: {
  open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; width?: string
}) {
  useLockScroll(open, onClose)
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-forest-900/45 backdrop-blur-[2px]" onClick={onClose} />
          <motion.aside
            role="dialog" aria-modal="true"
            className={cn('absolute bottom-0 right-0 top-0 flex w-full flex-col bg-white shadow-2xl', width)}
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 300 }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-sand-200 px-5 py-4">
              <div className="min-w-0 flex-1">{typeof title === 'string' ? <h2 className="font-display text-2xl font-semibold text-forest">{title}</h2> : title}</div>
              <button onClick={onClose} className="rounded-full p-1.5 text-graphite-400 hover:bg-sand hover:text-graphite" aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
            {footer && <div className="border-t border-sand-200 bg-sand/40 px-5 py-4">{footer}</div>}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmar', danger, loading, onConfirm, onClose, children }: {
  open: boolean; title: string; message: ReactNode; confirmLabel?: string; danger?: boolean; loading?: boolean
  onConfirm: () => void; onClose: () => void; children?: ReactNode
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
      </>}>
      <div className="space-y-4 text-sm text-graphite-500">
        <div>{message}</div>
        {children}
      </div>
    </Modal>
  )
}

export function Tabs<T extends string>({ value, onChange, items, className }: {
  value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode }[]; className?: string
}) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto rounded-full bg-sand p-1', className)} role="tablist">
      {items.map((it) => (
        <button key={it.value} role="tab" aria-selected={value === it.value} onClick={() => onChange(it.value)}
          className={cn('whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition',
            value === it.value ? 'bg-white text-forest shadow-sm' : 'text-graphite-500 hover:text-forest')}>
          {it.label}
        </button>
      ))}
    </div>
  )
}
