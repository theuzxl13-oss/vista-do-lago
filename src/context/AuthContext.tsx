import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { backend, type SessionUser } from '@/services/backend'
import type { Profile } from '@/types'

interface AuthCtx {
  user: SessionUser | null
  profile: Profile | null
  loading: boolean
  isAdmin: boolean
  brokerId: string | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (u: SessionUser | null) => {
    setUser(u)
    if (!u) {
      setProfile(null)
      return
    }
    try {
      setProfile(await backend.auth.getProfile(u.id))
    } catch {
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    let alive = true
    backend.auth
      .getSession()
      .then((u) => (alive ? loadProfile(u) : undefined))
      .finally(() => alive && setLoading(false))
    const off = backend.auth.onChange((u) => {
      // evita chamadas ao banco dentro do callback de autenticação
      setTimeout(() => void loadProfile(u), 0)
    })
    return () => {
      alive = false
      off()
    }
  }, [loadProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    await backend.auth.signIn(email, password)
    await loadProfile(await backend.auth.getSession())
  }, [loadProfile])

  const signOut = useCallback(async () => {
    await backend.auth.signOut()
    setUser(null)
    setProfile(null)
  }, [])

  const refreshProfile = useCallback(() => loadProfile(user), [loadProfile, user])

  const value = useMemo<AuthCtx>(
    () => ({
      user, profile, loading,
      isAdmin: profile?.role === 'admin' && profile.active,
      brokerId: profile?.active ? profile.broker_id : null,
      signIn, signOut, refreshProfile,
    }),
    [user, profile, loading, signIn, signOut, refreshProfile],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth fora do AuthProvider')
  return ctx
}
