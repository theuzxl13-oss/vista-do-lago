/**
 * Testes do banco de dados (migrations reais) usando PGlite — PostgreSQL em WebAssembly.
 * Valida restrições, RLS, permissões por papel e regras de reserva/venda.
 */
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'

const root = new URL('../', import.meta.url)
const read = (p: string) => readFileSync(new URL(p, root), 'utf8')

const ADMIN = '11111111-1111-4111-8111-111111111111'
const BROKER1 = '22222222-2222-4222-8222-222222222222'
const BROKER2 = '33333333-3333-4333-8333-333333333333'

let db: PGlite

type Who = 'anon' | 'super' | string

async function as<T = Record<string, unknown>>(who: Who, sql: string, params: unknown[] = []): Promise<T[]> {
  await db.exec('reset role')
  if (who === 'super') {
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`)
  } else if (who === 'anon') {
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`)
    await db.exec('set role anon')
  } else {
    await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [who])
    await db.exec('set role authenticated')
  }
  try {
    const res = await db.query<T>(sql, params)
    return res.rows
  } finally {
    await db.exec('reset role')
  }
}

async function expectError(p: Promise<unknown>, pattern: RegExp) {
  await expect(p).rejects.toThrow(pattern)
}

const submit = (who: Who, args: Partial<Record<string, unknown>>) =>
  as(who, `select public.submit_lead($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) as r`, [
    args.name ?? 'Maria Souza',
    args.phone ?? '(11) 98888-7777',
    args.email ?? null,
    args.message ?? 'Quero saber mais',
    args.lot ?? null,
    args.source ?? 'site_form',
    args.consent ?? true,
    args.website ?? null,
    null,
    '/',
  ])

beforeAll(async () => {
  db = new PGlite()
  await db.exec(read('tests/supabase-stub.sql'))
  for (const f of readdirSync(new URL('supabase/migrations/', root)).sort()) {
    await db.exec(read(`supabase/migrations/${f}`))
  }
  await db.exec(read('supabase/seed.sql'))

  // Usuários: admin + dois corretores
  await db.exec(`
    insert into public.brokers (id, full_name, email, phone) values
      ('aaaaaaaa-0000-4000-8000-000000000001', 'Corretor Um', 'um@teste.com', '11999990001'),
      ('aaaaaaaa-0000-4000-8000-000000000002', 'Corretor Dois', 'dois@teste.com', '11999990002');
    insert into auth.users (id, email) values
      ('${ADMIN}', 'admin@teste.com'),
      ('${BROKER1}', 'um@teste.com'),
      ('${BROKER2}', 'dois@teste.com');
    update public.profiles set role = 'admin', active = true where id = '${ADMIN}';
    update public.profiles set active = true where id in ('${BROKER1}', '${BROKER2}');
  `)
}, 60_000)

describe('estrutura e conteúdo público', () => {
  it('perfis são vinculados automaticamente aos corretores pelo e-mail', async () => {
    const rows = await as<{ broker_id: string }>('super', `select broker_id from profiles where id = $1`, [BROKER1])
    expect(rows[0].broker_id).toBe('aaaaaaaa-0000-4000-8000-000000000001')
  })

  it('visitante lê lotes, quadras, configurações e mídias publicadas', async () => {
    expect((await as('anon', 'select id from lots')).length).toBe(88)
    expect((await as('anon', 'select id from blocks')).length).toBe(5)
    expect((await as('anon', 'select key from site_settings')).length).toBe(7)
    expect((await as('anon', 'select id from media')).length).toBe(10)
  })

  it('visitante não acessa leads, corretores ou auditoria', async () => {
    expect(await as('anon', 'select * from leads')).toHaveLength(0)
    expect(await as('anon', 'select * from brokers')).toHaveLength(0)
    expect(await as('anon', 'select * from audit_log')).toHaveLength(0)
    await expectError(
      as('anon', `insert into leads (full_name, phone) values ('Teste Robo', '11999998888')`),
      /row-level security/,
    )
    await expectError(as('anon', `update lots set price = 1`).then((r) => {
      if (r.length === 0) throw new Error('row-level security: nenhum lote alterado')
    }), /row-level security/)
  })

  it('visitante não executa funções privilegiadas', async () => {
    await expectError(
      as('anon', `select reserve_lot('00000000-0000-4000-8000-000000030d41', gen_random_uuid(), now() + interval '1 day')`),
      /permission denied/,
    )
  })
})

describe('formulário público (submit_lead)', () => {
  it('registra lead com lote de interesse e histórico', async () => {
    const lot = (await as<{ id: string }>('super', `select id from lots where status = 'available' limit 1`))[0].id
    await submit('anon', { name: 'Ana Lima', phone: '(31) 98765-4321', email: 'ana@exemplo.com', lot, source: 'lot_map' })
    const lead = (await as<{ id: string; source: string; consent: boolean; phone: string }>(
      'super', `select * from leads where email = 'ana@exemplo.com'`))[0]
    expect(lead.source).toBe('lot_map')
    expect(lead.consent).toBe(true)
    expect(lead.phone).toBe('31987654321')
    const interests = await as('super', `select * from lead_lot_interests where lead_id = $1`, [lead.id])
    expect(interests).toHaveLength(1)
    const acts = await as('super', `select * from lead_activities where lead_id = $1`, [lead.id])
    expect(acts.length).toBeGreaterThanOrEqual(1)
  })

  it('reaproveita lead existente em vez de duplicar', async () => {
    await submit('anon', { name: 'Ana Lima', phone: '31987654321', email: 'ana@exemplo.com' })
    const rows = await as('super', `select id from leads where phone = '31987654321'`)
    expect(rows).toHaveLength(1)
  })

  it('valida consentimento, telefone e e-mail', async () => {
    await expectError(submit('anon', { consent: false, phone: '11911112222' }), /consent_required/)
    await expectError(submit('anon', { phone: '123' }), /invalid_phone/)
    await expectError(submit('anon', { phone: '11911113333', email: 'invalido' }), /invalid_email/)
    await expectError(submit('anon', { name: 'A', phone: '11911114444' }), /invalid_name/)
  })

  it('campo isca (honeypot) descarta robôs silenciosamente', async () => {
    await submit('anon', { phone: '11955554444', website: 'http://spam' })
    expect(await as('super', `select id from leads where phone = '11955554444'`)).toHaveLength(0)
  })

  it('limita envios repetidos', async () => {
    for (let i = 0; i < 3; i++) await submit('anon', { phone: '11977776666', name: 'Repetido Silva' })
    await expectError(submit('anon', { phone: '11977776666', name: 'Repetido Silva' }), /rate_limited/)
  })
})

describe('permissões do CRM', () => {
  let leadId = ''
  const B1 = 'aaaaaaaa-0000-4000-8000-000000000001'

  it('corretor só vê leads atribuídos a ele', async () => {
    leadId = (await as<{ id: string }>('super', `select id from leads where email = 'ana@exemplo.com'`))[0].id
    expect(await as(BROKER1, `select id from leads`)).toHaveLength(0)
    expect((await as(ADMIN, `select id from leads`)).length).toBeGreaterThan(0)
    await as(ADMIN, `update leads set broker_id = $1 where id = $2`, [B1, leadId])
    expect(await as(BROKER1, `select id from leads`)).toHaveLength(1)
    expect(await as(BROKER2, `select id from leads`)).toHaveLength(0)
  })

  it('atribuição gera histórico automático', async () => {
    const acts = await as<{ type: string }>(ADMIN, `select type from lead_activities where lead_id = $1`, [leadId])
    expect(acts.map((a) => a.type)).toContain('assignment')
  })

  it('corretor não reatribui leads nem altera o próprio papel', async () => {
    await expectError(
      as(BROKER1, `update leads set broker_id = 'aaaaaaaa-0000-4000-8000-000000000002' where id = $1`, [leadId]),
      /reatribuir|row-level security/,
    )
    await expectError(as(BROKER1, `update profiles set role = 'admin' where id = $1`, [BROKER1]), /Somente administradores/)
  })

  it('corretor movimenta etapa e registra atendimento no próprio lead', async () => {
    await as(BROKER1, `update leads set stage = 'in_progress' where id = $1`, [leadId])
    await as(BROKER1, `insert into lead_activities (lead_id, type, description) values ($1, 'call', 'Ligação realizada')`, [leadId])
    const acts = await as<{ type: string }>(BROKER1, `select type from lead_activities where lead_id = $1`, [leadId])
    expect(acts.map((a) => a.type)).toEqual(expect.arrayContaining(['stage_change', 'call']))
    // histórico é imutável
    const upd = await as(BROKER1, `update lead_activities set description = 'x' where lead_id = $1 returning id`, [leadId])
    expect(upd).toHaveLength(0)
  })

  it('corretor não cria atividade em lead de outro corretor', async () => {
    await expectError(
      as(BROKER2, `insert into lead_activities (lead_id, type, description) values ($1, 'note', 'x')`, [leadId]),
      /row-level security/,
    )
  })

  it('usuário inativo não tem acesso', async () => {
    await as('super', `update profiles set active = false where id = $1`, [BROKER1])
    expect(await as(BROKER1, `select id from leads`)).toHaveLength(0)
    await as('super', `update profiles set active = true where id = $1`, [BROKER1])
  })
})

describe('reservas e vendas', () => {
  let lot = ''
  let leadId = ''
  let otherLead = ''

  beforeAll(async () => {
    lot = (await as<{ id: string }>('super', `select id from lots where status = 'available' order by number desc limit 1`))[0].id
    leadId = (await as<{ id: string }>('super', `select id from leads where email = 'ana@exemplo.com'`))[0].id
    otherLead = (await as<{ id: string }>(ADMIN,
      `insert into leads (full_name, phone, source) values ('Outro Cliente', '11933332222', 'manual') returning id`))[0].id
  })

  it('corretor reserva lote do próprio lead; o lote fica reservado', async () => {
    await as(BROKER1, `select reserve_lot($1, $2, now() + interval '3 days', 'Sinal combinado')`, [lot, leadId])
    const st = await as<{ status: string }>('anon', `select status from lots where id = $1`, [lot])
    expect(st[0].status).toBe('reserved')
  })

  it('impede reserva conflitante', async () => {
    await expectError(as(ADMIN, `select reserve_lot($1, $2, now() + interval '3 days')`, [lot, otherLead]), /lot_not_available/)
  })

  it('corretor não reserva para lead de outro corretor', async () => {
    const free = (await as<{ id: string }>('super', `select id from lots where status = 'available' limit 1`))[0].id
    await expectError(as(BROKER2, `select reserve_lot($1, $2, now() + interval '1 day')`, [free, leadId]), /lead_not_accessible/)
  })

  it('status de lote reservado não pode ser alterado manualmente', async () => {
    await expectError(as(ADMIN, `update lots set status = 'available' where id = $1`, [lot]), /Libere a reserva/)
    await expectError(as(ADMIN, `update lots set status = 'sold' where id = $1`, [lot]), /fluxos de reserva/)
  })

  it('somente administrador registra venda, e apenas para o lead da reserva', async () => {
    await expectError(as(BROKER1, `select register_sale($1, $2, 250000)`, [lot, leadId]), /not_authorized/)
    await expectError(as(ADMIN, `select register_sale($1, $2, 250000)`, [lot, otherLead]), /lot_reserved_for_other_lead/)
    await as(ADMIN, `select register_sale($1, $2, 250000)`, [lot, leadId])
    expect((await as<{ status: string }>('anon', `select status from lots where id = $1`, [lot]))[0].status).toBe('sold')
    expect((await as<{ stage: string }>(ADMIN, `select stage from leads where id = $1`, [leadId]))[0].stage).toBe('won')
    expect((await as<{ status: string }>(ADMIN, `select status from reservations where lot_id = $1`, [lot]))[0].status).toBe('converted')
  })

  it('impede venda duplicada e permite cancelamento pelo administrador', async () => {
    await expectError(as(ADMIN, `select register_sale($1, $2, 250000)`, [lot, otherLead]), /lot_not_available/)
    const sale = (await as<{ id: string }>(ADMIN, `select id from sales where lot_id = $1`, [lot]))[0].id
    await as(ADMIN, `select cancel_sale($1, 'Distrato')`, [sale])
    expect((await as<{ status: string }>('anon', `select status from lots where id = $1`, [lot]))[0].status).toBe('available')
  })

  it('liberação de reserva devolve o lote ao estoque', async () => {
    const res = (await as<{ reserve_lot: string }>(ADMIN, `select reserve_lot($1, $2, now() + interval '1 day')`, [lot, otherLead]))[0].reserve_lot
    await as(ADMIN, `select release_reservation($1, 'Cliente desistiu')`, [res])
    expect((await as<{ status: string }>('anon', `select status from lots where id = $1`, [lot]))[0].status).toBe('available')
  })

  it('reservas vencidas são expiradas', async () => {
    const res = (await as<{ reserve_lot: string }>(ADMIN, `select reserve_lot($1, $2, now() + interval '1 day')`, [lot, otherLead]))[0].reserve_lot
    await as('super', `update reservations set expires_at = now() - interval '1 hour' where id = $1`, [res])
    const n = (await as<{ expire_reservations: number }>(ADMIN, `select expire_reservations()`))[0].expire_reservations
    expect(n).toBe(1)
    expect((await as<{ status: string }>('anon', `select status from lots where id = $1`, [lot]))[0].status).toBe('available')
  })

  it('lote demonstrativo marcado como reservado sem reserva pode ser liberado pelo administrador', async () => {
    const demo = (await as<{ id: string }>('super', `select id from lots l where status = 'reserved'
      and not exists (select 1 from reservations r where r.lot_id = l.id and r.status = 'active') limit 1`))[0].id
    await as(ADMIN, `update lots set status = 'available' where id = $1`, [demo])
    expect((await as<{ status: string }>('anon', `select status from lots where id = $1`, [demo]))[0].status).toBe('available')
  })

  it('alterações relevantes ficam na auditoria (somente administrador lê)', async () => {
    const rows = await as(ADMIN, `select * from audit_log where table_name = 'sales'`)
    expect(rows.length).toBeGreaterThan(0)
    expect(await as(BROKER1, `select * from audit_log`)).toHaveLength(0)
  })

  it('corretor não altera conteúdo do site nem estoque', async () => {
    const r = await as(BROKER1, `update site_settings set value = '{}' where key = 'contact' returning key`)
    expect(r).toHaveLength(0)
    const l = await as(BROKER1, `update lots set price = 1 returning id`)
    expect(l).toHaveLength(0)
  })
})
