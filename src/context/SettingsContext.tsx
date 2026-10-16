import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { backend } from '@/services/backend'
import { DEFAULT_SETTINGS } from '@/demo/defaults'
import type { SiteSettings } from '@/types'

interface SettingsCtx {
  settings: SiteSettings
  loading: boolean
  reload: () => Promise<void>
}

const Ctx = createContext<SettingsCtx | null>(null)

function merge(partial: Partial<SiteSettings>): SiteSettings {
  const out = structuredClone(DEFAULT_SETTINGS)
  for (const key of Object.keys(partial) as (keyof SiteSettings)[]) {
    const v = partial[key]
    if (v == null) continue
    if (Array.isArray(v)) (out as unknown as Record<string, unknown>)[key] = v
    else (out as unknown as Record<string, unknown>)[key] = { ...(out[key] as object), ...(v as object) }
  }
  return out
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    try {
      setSettings(merge(await backend.getSettings()))
    } catch (e) {
      console.error('Falha ao carregar configurações', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const value = useMemo(() => ({ settings, loading, reload }), [settings, loading, reload])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSettings() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSettings fora do SettingsProvider')
  return ctx
}
