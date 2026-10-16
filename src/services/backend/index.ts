import { createMemoryBackend } from './memory'
import { createSupabaseBackend } from './supabase'
import type { Backend } from './types'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

/** Sem credenciais do Supabase o sistema roda em MODO DEMONSTRAÇÃO (dados em memória). */
export const isDemoMode = !(url && anonKey)

export const backend: Backend = isDemoMode ? createMemoryBackend() : createSupabaseBackend(url!, anonKey!)

export * from './types'
