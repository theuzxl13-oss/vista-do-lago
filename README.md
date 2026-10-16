# Vista do Lago — Plataforma imobiliária e CRM

> *"O lugar onde seus sonhos encontram a natureza."*

Site institucional do loteamento **Vista do Lago**, com mapa interativo de lotes, captação de leads e
painel administrativo (CRM) com funil de vendas, gestão de lotes, agenda de visitas, propostas, corretores
e relatórios.

- **Frontend:** React 19 · TypeScript · Vite · Tailwind CSS · GSAP + ScrollTrigger · Motion · React Router · React Hook Form · Zod · Recharts · Leaflet/OpenStreetMap · dnd-kit
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime, Edge Functions) com Row Level Security
- **Hospedagem:** GitHub Pages (deploy automático via GitHub Actions)

## Dois modos de funcionamento

| | **Modo Supabase** (produção) | **Modo demonstração** |
|---|---|---|
| Quando | `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` definidos | variáveis ausentes |
| Dados | PostgreSQL com RLS, persistentes | fictícios, **em memória** (somem ao recarregar) |
| Login `/admin` | e-mail e senha (Supabase Auth) | botões "administrador (demo)" e "corretor (demo)" |
| Formulários | gravam leads no banco | gravam apenas na sessão do navegador |

O modo demonstração existe para avaliar o produto no navegador antes de conectar o banco. Ele é sinalizado
em todas as telas e nunca usa `localStorage` como banco.

## Estrutura

```
src/
  components/  ui (design system) · site (seções públicas) · map (planta SVG) · admin (CRM)
  pages/       site/ e admin/ (rotas carregadas sob demanda)
  services/    backend/ — supabase.ts (real) · memory.ts (demonstração) · types.ts
  hooks/ context/ lib/ (gsap, formatação, exportação PDF/Excel, períodos) · types/
  demo/        planta fictícia, conteúdo padrão e dados de demonstração
supabase/
  migrations/  esquema, RLS, gatilhos de histórico/auditoria, RPCs de reserva/venda, Storage
  seed.sql     planta DEMONSTRATIVA + galeria ilustrativa + conteúdo padrão (sem leads fictícios)
  functions/invite-user  convite de usuários (usa service role somente no servidor)
tests/         testes do banco (PGlite) e das regras de negócio
```

## Desenvolvimento

```bash
npm install
npm run dev          # http://localhost:5173
npm run lint && npm test && npm run build
```

## Configurar o Supabase (uso real)

1. Crie um projeto em <https://supabase.com>.
2. **SQL Editor** → execute, na ordem, `supabase/migrations/20261016000001_schema.sql`,
   `supabase/migrations/20261016000002_storage.sql` e `supabase/seed.sql`
   (ou `supabase link` + `supabase db push` com a CLI).
3. **Authentication → Providers → Email:** mantenha ativo e **desative "Allow new users to sign up"**
   (os acessos são criados por convite).
4. **Authentication → URL Configuration:** *Site URL* = `https://theuzxl13-oss.github.io/vista-do-lago/`
   e adicione `https://theuzxl13-oss.github.io/vista-do-lago/admin/redefinir-senha` em *Redirect URLs*.
5. Crie o primeiro administrador em **Authentication → Users → Add user** e depois, no SQL Editor:
   ```sql
   update public.profiles set role = 'admin', active = true where email = 'seu-email@dominio.com';
   ```
6. (Opcional) Convites pelo painel: `supabase functions deploy invite-user` e
   `supabase secrets set SITE_URL=https://theuzxl13-oss.github.io/vista-do-lago`.
7. (Opcional) Expirar reservas automaticamente com **pg_cron**:
   ```sql
   select cron.schedule('expirar-reservas', '*/30 * * * *', $$select public.expire_reservations()$$);
   ```
   (o painel também executa a expiração ao ser aberto).
8. Informe `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (chave *anon/publishable*, pública por natureza)
   conforme o modo de publicação descrito abaixo. **Nunca** use a `service_role` no frontend.

## Segurança e permissões

- **RLS em todas as tabelas.** Visitantes leem apenas lotes, quadras, galeria publicada e configurações.
- **Administrador:** acesso completo. **Corretor:** apenas leads atribuídos a ele (e visitas, propostas,
  reservas e histórico desses leads); não reatribui leads, não altera estoque nem conteúdo, não registra vendas.
- **Leads públicos** entram só pela função `submit_lead` (validação, consentimento LGPD obrigatório,
  campo-isca anti-robô, limite de 3 envios/10 min por telefone, e-mail e IP, deduplicação).
- **Reservas e vendas** só por RPC com bloqueio de linha (`reserve_lot`, `release_reservation`,
  `register_sale`, `cancel_sale`): impossível reservar/vender o mesmo lote duas vezes; o status de um lote
  sustentado por reserva/venda não pode ser alterado manualmente.
- **Histórico auditável:** mudanças de etapa e de corretor geram registros automáticos; o histórico de
  atendimento é somente-inclusão; tabela `audit_log` registra alterações relevantes (visível ao admin).
- Novos usuários nascem **inativos** até liberação por um administrador.

## Substituir os dados demonstrativos

- **Planta:** Configurações → Planta (viewBox e imagem de fundo da planta oficial) e Lotes → cadastrar cada
  lote com o caminho SVG (`d`) do polígono. Exclua os lotes "demonstração" e desmarque "planta fictícia".
- **Galeria:** envie fotos reais em Galeria e marque se são reais ou ilustrativas.
- **Topo do site:** Configurações → Empreendimento → *Foto panorâmica do topo*.
- **Textos, cartões, localização, diferenciais, WhatsApp e LGPD:** Configurações.
  Campos não confirmados aparecem como "A confirmar".

## Publicação (GitHub Pages)

Configuração atual do repositório: **Settings → Pages → Deploy from a branch → `claude/loving-einstein-yz7kky` / `docs`**.
O site compilado fica versionado na pasta `docs/`:

```bash
npm run build:pages     # gera docs/ (com 404.html para as rotas /admin e /privacidade, e .nojekyll)
git add docs && git commit -m "Atualiza site publicado" && git push
```

As variáveis do Supabase são incorporadas no momento do build: para publicar no modo real por esse caminho,
crie `.env.production.local` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` antes de `npm run build:pages`.

**Alternativa automática:** em Settings → Pages escolha *Source: GitHub Actions* e crie a variável de
repositório `PAGES_SOURCE = actions` (junto com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`). A cada
push, o workflow `.github/workflows/deploy.yml` roda lint, testes, build e publica sozinho.

Endereço: **https://theuzxl13-oss.github.io/vista-do-lago/**

## Animações (site público)

GSAP + ScrollTrigger com `gsap.context()`/`gsap.matchMedia()` (`src/lib/gsap.ts`), animando apenas
`transform` e `opacity`: hero em camadas com parallax e aproximação, título revelado letra a letra,
transição para a seção seguinte, faixas panorâmicas, revelação da galeria, nuvens e névoa. Em telas
pequenas os efeitos são mais leves (sem *pin*) e, com `prefers-reduced-motion`, ficam desativados.
O painel administrativo não usa animações cinematográficas.
