import type { MediaCategory, SiteSettings } from '@/types'
import { DEMO_VIEWBOX } from './plan'

/**
 * Conteúdo padrão do site. Todos os campos são editáveis em
 * Painel → Configurações. Valores comerciais não confirmados ficam como
 * "A confirmar" — nada aqui deve ser apresentado como fato sem validação.
 */
export const DEFAULT_SETTINGS: SiteSettings = {
  contact: {
    whatsapp_number: '',
    whatsapp_message:
      'Olá! Conheci o empreendimento Vista do Lago pelo site e gostaria de receber informações sobre os terrenos disponíveis.',
    phone: '',
    email: '',
    instagram: '',
    business_hours: '',
  },
  about: {
    title: 'Um novo conceito de viver bem.',
    paragraphs: [
      'O Vista do Lago nasce para quem deseja desacelerar sem abrir mão do futuro. Um empreendimento pensado para unir a serenidade da natureza à liberdade de construir, do seu jeito, o lar que sempre imaginou.',
      'Seja para construir a casa da família, ter um refúgio para os fins de semana ou investir em um patrimônio sólido, cada terreno é um convite a uma nova relação com o tempo, com a paisagem e com as pessoas que importam.',
    ],
  },
  stats: [
    { key: 'total_area', label: 'Área total do empreendimento', value: '', hint: 'A confirmar', visible: true },
    { key: 'lots', label: 'Quantidade de lotes', value: '', hint: 'Conforme planta aprovada', visible: true },
    { key: 'sizes', label: 'Metragens disponíveis', value: '', hint: 'A confirmar', visible: true },
    { key: 'green', label: 'Áreas verdes', value: '', hint: 'A confirmar', visible: true },
    { key: 'location', label: 'Localização', value: '', hint: 'Em breve', visible: true },
    { key: 'infra', label: 'Infraestrutura', value: '', hint: 'Detalhes em breve', visible: true },
  ],
  location: {
    address: '',
    city: '',
    state: '',
    latitude: null,
    longitude: null,
    zoom: 14,
    access_roads: [],
    highways: [],
    points_of_interest: [],
  },
  differentials: [
    { icon: 'Trees', title: 'Contato com a natureza', description: 'Um ambiente cercado de verde, pensado para quem valoriza ar puro e silêncio.', visible: true },
    { icon: 'Mountain', title: 'Paisagens privilegiadas', description: 'Horizontes amplos e a presença do lago como protagonista do cotidiano.', visible: true },
    { icon: 'LayoutGrid', title: 'Planejamento do loteamento', description: 'Lotes organizados em quadras, com projeto pensado para a melhor ocupação do espaço.', visible: true },
    { icon: 'HeartPulse', title: 'Qualidade de vida', description: 'Mais tempo ao ar livre, mais tranquilidade e mais convivência.', visible: true },
    { icon: 'TrendingUp', title: 'Potencial de valorização', description: 'Terra é patrimônio. Uma escolha para construir agora ou investir no futuro.', visible: true },
    { icon: 'Route', title: 'Acesso facilitado', description: 'Informações de acesso e rotas serão detalhadas pela equipe comercial.', visible: true },
  ],
  plan: {
    is_demo: true,
    view_box: DEMO_VIEWBOX,
    image_url: '',
    notice:
      'Planta fictícia para demonstração. A distribuição, as medidas e a situação dos lotes serão atualizadas conforme a planta oficial aprovada.',
  },
  privacy: {
    controller_name: 'Vista do Lago',
    controller_document: '',
    dpo_email: '',
    retention:
      'Os dados serão mantidos enquanto houver relacionamento comercial ou pelo prazo necessário ao cumprimento de obrigações legais.',
  },
}

export interface DemoMedia {
  file: string
  title: string
  caption: string
  category: MediaCategory
}

export const DEMO_MEDIA: DemoMedia[] = [
  { file: 'lago-entardecer.svg', title: 'Entardecer no lago', caption: 'Ilustração conceitual', category: 'lake' },
  { file: 'vista-aerea.svg', title: 'Vista aérea do loteamento', caption: 'Ilustração conceitual', category: 'aerial' },
  { file: 'lago-amanhecer.svg', title: 'Amanhecer sobre a água', caption: 'Ilustração conceitual', category: 'lake' },
  { file: 'paisagem-neblina.svg', title: 'Manhã com neblina', caption: 'Ilustração conceitual', category: 'landscape' },
  { file: 'terrenos.svg', title: 'Quadras e terrenos', caption: 'Ilustração conceitual', category: 'lots' },
  { file: 'acesso.svg', title: 'Via de acesso', caption: 'Ilustração conceitual', category: 'access' },
  { file: 'areas-verdes.svg', title: 'Áreas verdes', caption: 'Ilustração conceitual', category: 'green' },
  { file: 'perspectiva.svg', title: 'Perspectiva do empreendimento', caption: 'Ilustração conceitual', category: 'perspective' },
  { file: 'drone-lago.svg', title: 'Sobrevoo do lago', caption: 'Ilustração conceitual', category: 'drone' },
  { file: 'paisagem-dia.svg', title: 'Paisagem ao redor', caption: 'Ilustração conceitual', category: 'landscape' },
]

export const DEMO_DEVELOPMENT_ID = '00000000-0000-4000-8000-000000000001'
