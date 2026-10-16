import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Lock, ShieldCheck, UserRound } from 'lucide-react'
import { Button, Field, Input } from '@/components/ui'
import { LogoMark } from '@/components/ui/icons'
import { useAuth } from '@/context/AuthContext'
import { backend, isDemoMode, toAppError } from '@/services/backend'
import { DEMO_ACCOUNTS } from '@/services/backend/memory'
import { assetUrl } from '@/lib/format'

const schema = z.object({
  email: z.string().trim().email({ message: 'Informe um e-mail válido.' }),
  password: z.string().min(6, { message: 'A senha tem pelo menos 6 caracteres.' }),
})
type Values = z.infer<typeof schema>

export default function LoginPage() {
  const { user, loading, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/admin'
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema), defaultValues: { email: '', password: '' },
  })

  if (!loading && user) return <Navigate to={from} replace />

  const onSubmit = async (v: Values) => {
    setError(null)
    try {
      await signIn(v.email, v.password)
      navigate(from, { replace: true })
    } catch (e) {
      setError(toAppError(e).message)
    }
  }

  const demoLogin = async (email: string) => {
    setError(null)
    try {
      await signIn(email, 'demo')
      navigate('/admin', { replace: true })
    } catch (e) {
      setError(toAppError(e).message)
    }
  }

  const forgot = async () => {
    const email = getValues('email')
    if (!email) return setError('Informe seu e-mail para receber o link de redefinição.')
    try {
      await backend.auth.resetPassword(email)
      setInfo('Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.')
    } catch (e) {
      setError(toAppError(e).message)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-forest lg:block">
        <img src={assetUrl('demo/gallery/lago-amanhecer.svg')} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-900 via-forest-900/40 to-transparent" />
        <div className="absolute inset-x-12 bottom-14 text-white">
          <LogoMark className="h-12 w-12 text-gold" />
          <p className="mt-6 font-display text-5xl leading-tight">Gestão comercial<br />Vista do Lago</p>
          <p className="mt-3 max-w-sm text-sm text-white/70">Leads, funil de vendas, lotes, visitas, propostas e relatórios em um só lugar.</p>
        </div>
      </div>
      <div className="flex items-center justify-center bg-sand px-6 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-10 inline-flex items-center gap-1.5 text-sm text-graphite-400 hover:text-forest"><ArrowLeft className="h-4 w-4" /> Voltar ao site</Link>
          <h1 className="font-display text-4xl text-forest">Acesso restrito</h1>
          <p className="mt-2 text-sm text-graphite-500">Entre com o e-mail e a senha cadastrados pelo administrador.</p>

          {isDemoMode ? (
            <div className="mt-8 space-y-3">
              <div className="rounded-xl border border-gold/40 bg-gold-100 p-4 text-xs leading-relaxed text-gold-700">
                <strong>Modo demonstração.</strong> O Supabase ainda não está configurado neste site, então o painel usa dados fictícios em memória.
                Escolha um perfil para explorar:
              </div>
              <Button size="lg" className="w-full" icon={<ShieldCheck className="h-4 w-4" />} onClick={() => void demoLogin(DEMO_ACCOUNTS.admin.email)}>
                Entrar como administrador (demo)
              </Button>
              <Button size="lg" variant="outline" className="w-full" icon={<UserRound className="h-4 w-4" />} onClick={() => void demoLogin(DEMO_ACCOUNTS.broker.email)}>
                Entrar como corretor (demo)
              </Button>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
              <Field label="E-mail" htmlFor="email" error={errors.email?.message}>
                <Input id="email" type="email" autoComplete="username" {...register('email')} aria-invalid={!!errors.email} />
              </Field>
              <Field label="Senha" htmlFor="password" error={errors.password?.message}>
                <Input id="password" type="password" autoComplete="current-password" {...register('password')} aria-invalid={!!errors.password} />
              </Field>
              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
              {info && <p className="rounded-lg bg-forest-50 px-3 py-2 text-sm text-forest" role="status">{info}</p>}
              <Button type="submit" size="lg" className="w-full" loading={isSubmitting} icon={<Lock className="h-4 w-4" />}>Entrar</Button>
              <button type="button" onClick={() => void forgot()} className="w-full text-center text-sm text-graphite-400 hover:text-forest">Esqueci minha senha</button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
