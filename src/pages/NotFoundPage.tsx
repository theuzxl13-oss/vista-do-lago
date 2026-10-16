import { Link } from 'react-router-dom'
import { LogoMark } from '@/components/ui/icons'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-forest px-6 text-center text-white">
      <LogoMark className="h-14 w-14 text-gold" />
      <p className="mt-8 font-display text-7xl text-gold">404</p>
      <p className="mt-2 font-display text-3xl">Página não encontrada</p>
      <p className="mt-3 max-w-sm text-sm text-white/70">O endereço acessado não existe ou foi alterado.</p>
      <Link to="/" className="mt-8 rounded-full bg-gold px-7 py-3 text-sm font-semibold text-forest-900">Voltar ao início</Link>
    </div>
  )
}
