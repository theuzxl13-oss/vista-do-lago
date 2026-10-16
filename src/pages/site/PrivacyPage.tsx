import { useEffect } from 'react'
import { useSettings } from '@/context/SettingsContext'

export default function PrivacyPage() {
  const { settings } = useSettings()
  const p = settings.privacy
  const contact = p.dpo_email || settings.contact.email
  useEffect(() => {
    document.title = 'Política de Privacidade — Vista do Lago'
    return () => { document.title = 'Vista do Lago — O lugar onde seus sonhos encontram a natureza' }
  }, [])
  return (
    <div className="bg-sand pb-24 pt-32">
      <article className="container-luxe max-w-3xl space-y-6 text-[15px] leading-relaxed text-graphite-500">
        <p className="eyebrow">LGPD · Lei nº 13.709/2018</p>
        <h1 className="heading-xl">Política de Privacidade</h1>
        <p>
          Esta política explica como <strong>{p.controller_name || 'Vista do Lago'}</strong>
          {p.controller_document && <> (CNPJ/CPF {p.controller_document})</>}, na qualidade de controlador, trata os dados pessoais
          coletados por este site.
        </p>
        <Section title="1. Dados coletados">
          Nome, telefone/WhatsApp, e-mail, lote de interesse e mensagem informados voluntariamente nos formulários, além da data e
          horário do envio e da origem da visita (por exemplo, campanhas e parâmetros UTM).
        </Section>
        <Section title="2. Finalidade e base legal">
          Os dados são usados para responder ao seu contato, enviar informações e propostas comerciais sobre o empreendimento e agendar
          visitas. A base legal é o seu consentimento (art. 7º, I) e procedimentos preliminares a contrato a seu pedido (art. 7º, V).
        </Section>
        <Section title="3. Compartilhamento">
          Os dados são acessados apenas pela equipe comercial autorizada (administradores e corretores responsáveis pelo atendimento) e
          armazenados em provedor de infraestrutura em nuvem com controles de acesso. Não vendemos dados pessoais.
        </Section>
        <Section title="4. Armazenamento e segurança">
          {p.retention} Adotamos autenticação, controle de permissões por perfil e registro de alterações para proteger as informações.
        </Section>
        <Section title="5. Seus direitos">
          Você pode solicitar confirmação de tratamento, acesso, correção, anonimização, portabilidade, eliminação dos dados e revogação do
          consentimento a qualquer momento{contact ? <> pelo e-mail <a className="font-semibold text-forest underline" href={`mailto:${contact}`}>{contact}</a></> : ' pelos canais de atendimento informados no site'}.
        </Section>
        <Section title="6. Cookies e armazenamento local">
          O site não utiliza cookies de publicidade. Usamos apenas armazenamento técnico da sessão (origem da visita e autenticação da área
          administrativa).
        </Section>
        <p className="text-xs text-graphite-400">Este texto é um modelo e deve ser revisado pela assessoria jurídica do empreendimento.</p>
      </article>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-2xl text-forest">{title}</h2>
      <p className="mt-2">{children}</p>
    </section>
  )
}
