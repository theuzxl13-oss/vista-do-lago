import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Field, Input } from '@/components/ui'
import { backend, toAppError } from '@/services/backend'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pw.length < 8) return setError('Use pelo menos 8 caracteres.')
    if (pw !== pw2) return setError('As senhas não conferem.')
    setBusy(true)
    try {
      await backend.auth.updatePassword(pw)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(toAppError(err).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand px-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-8 shadow-soft">
        <h1 className="font-display text-3xl text-forest">Definir nova senha</h1>
        <Field label="Nova senha" htmlFor="pw"><Input id="pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
        <Field label="Confirmar senha" htmlFor="pw2"><Input id="pw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" loading={busy}>Salvar senha</Button>
      </form>
    </div>
  )
}
