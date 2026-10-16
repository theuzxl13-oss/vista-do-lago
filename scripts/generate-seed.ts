// Gera supabase/seed.sql com a planta DEMONSTRATIVA, galeria ilustrativa e configurações padrão.
// Não cria leads, corretores ou vendas fictícias — o CRM começa vazio em produção.
// Uso: npm run seed:generate
import { writeFileSync } from 'node:fs'
import { buildDemoPlan } from '../src/demo/plan'
import { DEFAULT_SETTINGS, DEMO_DEVELOPMENT_ID, DEMO_MEDIA } from '../src/demo/defaults'

const q = (v: string | null) => (v == null ? 'null' : `'${v.replace(/'/g, "''")}'`)
const { blocks, lots } = buildDemoPlan()

const sql = `-- ARQUIVO GERADO por scripts/generate-seed.ts — não edite manualmente.
-- Dados DEMONSTRATIVOS (is_demo = true): planta fictícia e imagens ilustrativas.
-- Substitua pelos dados oficiais no painel administrativo.

insert into public.developments (id, slug, name, description, is_demo) values
  (${q(DEMO_DEVELOPMENT_ID)}, 'vista-do-lago', 'Vista do Lago', ${q(DEFAULT_SETTINGS.about.paragraphs[0])}, true)
on conflict (id) do nothing;

insert into public.blocks (id, development_id, code, name, is_demo) values
${blocks.map((b) => `  (${q(b.id)}, ${q(DEMO_DEVELOPMENT_ID)}, ${q(b.code)}, ${q(b.name)}, true)`).join(',\n')}
on conflict (id) do nothing;

insert into public.lots (id, block_id, number, area_m2, front_m, back_m, left_m, right_m, price_on_request, description, status, svg_path, label_x, label_y, is_demo) values
${lots
  .map(
    (l) =>
      `  (${q(l.id)}, ${q(l.block_id)}, ${q(l.number)}, ${l.area_m2}, ${l.front_m}, ${l.back_m}, ${l.left_m}, ${l.right_m}, true, ${q(l.description)}, '${l.status}', ${q(l.svg_path)}, ${l.label_x}, ${l.label_y}, true)`,
  )
  .join(',\n')}
on conflict (id) do nothing;

insert into public.media (url, title, caption, category, is_illustrative, sort_order) values
${DEMO_MEDIA.map((m, i) => `  (${q(`demo/gallery/${m.file}`)}, ${q(m.title)}, ${q(m.caption)}, '${m.category}', true, ${i})`).join(',\n')};

insert into public.site_settings (key, value) values
${Object.entries(DEFAULT_SETTINGS)
  .map(([k, v]) => `  (${q(k)}, ${q(JSON.stringify(v))}::jsonb)`)
  .join(',\n')}
on conflict (key) do nothing;
`

writeFileSync(new URL('../supabase/seed.sql', import.meta.url), sql)
console.log(`seed.sql gerado: ${blocks.length} quadras, ${lots.length} lotes, ${DEMO_MEDIA.length} imagens.`)
