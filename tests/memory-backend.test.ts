/** Regras de negócio do modo demonstração (espelham o banco) e utilitários de formatação. */
import { describe, expect, it } from 'vitest'
import { createMemoryBackend, DEMO_ACCOUNTS } from '@/services/backend/memory'
import { formatPhone, maskPhone, toWhatsAppNumber, whatsappLink } from '@/lib/format'

describe('formatação', () => {
  it('telefones e links de WhatsApp', () => {
    expect(maskPhone('11987654321')).toBe('(11) 98765-4321')
    expect(formatPhone('5511987654321')).toBe('(11) 98765-4321')
    expect(toWhatsAppNumber('(11) 98765-4321')).toBe('5511987654321')
    expect(whatsappLink('11987654321', 'Olá! Tenho interesse no lote 025, quadra B')).toBe(
      'https://wa.me/5511987654321?text=Ol%C3%A1!%20Tenho%20interesse%20no%20lote%20025%2C%20quadra%20B',
    )
  })
})

describe('backend de demonstração', () => {
  it('formulário público cria lead com lote associado e o CRM o recebe', async () => {
    const be = createMemoryBackend()
    const lot = (await be.list('lots', { eq: { status: 'available' } }))[0]
    await be.submitLead({ full_name: 'Maria Teste', phone: '11999990000', source: 'lot_map', consent: true, lot_id: lot.id })
    await be.auth.signIn(DEMO_ACCOUNTS.admin.email, 'x')
    const lead = (await be.list('leads')).find((l) => l.full_name === 'Maria Teste')!
    expect(lead.source).toBe('lot_map')
    expect((await be.list('lead_lot_interests', { eq: { lead_id: lead.id } }))[0].lot_id).toBe(lot.id)
  })

  it('exige consentimento e ignora robôs (honeypot)', async () => {
    const be = createMemoryBackend()
    await expect(be.submitLead({ full_name: 'Sem Consent', phone: '11999990001', source: 'site_form', consent: false })).rejects.toThrow()
    await be.submitLead({ full_name: 'Robo', phone: '11999990002', source: 'site_form', consent: true, website: 'spam' })
    await be.auth.signIn(DEMO_ACCOUNTS.admin.email, 'x')
    expect((await be.list('leads')).some((l) => l.full_name === 'Robo')).toBe(false)
  })

  it('impede reservas conflitantes e venda para outro cliente', async () => {
    const be = createMemoryBackend()
    await be.auth.signIn(DEMO_ACCOUNTS.admin.email, 'x')
    const lot = (await be.list('lots', { eq: { status: 'available' } }))[0]
    const [a, b] = await be.list('leads', { eq: { stage: 'new' } })
    const future = new Date(Date.now() + 86_400_000).toISOString()
    await be.reserveLot(lot.id, a.id, future)
    await expect(be.reserveLot(lot.id, b.id, future)).rejects.toThrow(/disponível/)
    await expect(be.registerSale(lot.id, b.id, 100000, '2026-10-16')).rejects.toThrow(/outro cliente/)
    await be.registerSale(lot.id, a.id, 100000, '2026-10-16')
    expect((await be.get('lots', lot.id))!.status).toBe('sold')
    await expect(be.update('lots', lot.id, { status: 'available' })).rejects.toThrow()
  })

  it('corretor vê apenas seus leads e não acessa configurações', async () => {
    const be = createMemoryBackend()
    await be.auth.signIn(DEMO_ACCOUNTS.broker.email, 'x')
    const leads = await be.list('leads')
    expect(leads.length).toBeGreaterThan(0)
    expect(leads.every((l) => l.broker_id === 'demo-b1')).toBe(true)
    await expect(be.saveSetting('contact', { whatsapp_number: '1', whatsapp_message: '', phone: '', email: '', instagram: '', business_hours: '' })).rejects.toThrow()
    await expect(be.registerSale('x', leads[0].id, 1, '2026-10-16')).rejects.toThrow()
  })
})
