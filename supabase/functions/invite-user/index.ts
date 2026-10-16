// Supabase Edge Function: convida um usuário para o painel (operação privilegiada).
// A service_role key existe APENAS aqui, no servidor — nunca no frontend.
// Deploy: supabase functions deploy invite-user
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const siteUrl = Deno.env.get('SITE_URL') ?? ''

  // 1) Identifica quem chama e confirma que é administrador ativo
  const caller = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
  const { data: isAdmin, error: roleErr } = await caller.rpc('is_admin')
  if (roleErr || !isAdmin) return json({ error: 'Apenas administradores podem convidar usuários.' }, 403)

  // 2) Valida a entrada
  let body: { email?: string; full_name?: string; role?: string; broker_id?: string | null }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'JSON inválido' }, 400)
  }
  const email = String(body.email ?? '').trim().toLowerCase()
  const role = body.role === 'admin' ? 'admin' : 'broker'
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'E-mail inválido.' }, 400)
  if (role === 'broker' && !body.broker_id) return json({ error: 'Selecione o cadastro de corretor.' }, 400)

  // 3) Convida e ativa o perfil com o papel escolhido (service role, ignora RLS)
  const admin = createClient(url, service, { auth: { persistSession: false } })
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: body.full_name ?? email },
    redirectTo: siteUrl ? `${siteUrl.replace(/\/$/, '')}/admin/redefinir-senha` : undefined,
  })
  if (error) return json({ error: error.message }, 400)

  const userId = data.user.id
  const { error: pErr } = await admin.from('profiles')
    .update({ role, active: true, broker_id: role === 'broker' ? body.broker_id : null, full_name: body.full_name ?? null })
    .eq('id', userId)
  if (pErr) return json({ error: pErr.message }, 400)
  if (role === 'broker' && body.broker_id) {
    await admin.from('brokers').update({ user_id: userId }).eq('id', body.broker_id)
  }
  return json({ ok: true, user_id: userId })
})
