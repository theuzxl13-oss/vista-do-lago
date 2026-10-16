// Gera as CAMADAS do hero (céu, montanhas, colinas, lago, primeiro plano, nuvens e névoa)
// para o parallax em profundidade. Todas usam o mesmo viewBox (1920×1080) e ficam
// alinhadas quando exibidas com object-fit: cover. Ilustrações — não são fotos do local.
// Uso: node scripts/generate-hero-layers.mjs
import { mkdirSync, writeFileSync } from 'node:fs'

const OUT = new URL('../public/hero/', import.meta.url)
mkdirSync(OUT, { recursive: true })
const W = 1920, H = 1080, HORIZON = 640

function rng(seed) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}
const svg = (body, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice"><defs>${defs}</defs>${body}</svg>`

function ridge(rand, base, amp, steps, smooth = 0.5) {
  let d = `M-40 ${H + 40} L-40 ${base}`
  const step = (W + 80) / steps
  for (let i = 1; i <= steps; i++) {
    const x = -40 + step * i
    const peak = base - amp * (0.35 + rand())
    d += ` C${(x - step * (1 - smooth * 0.5)).toFixed(0)} ${peak.toFixed(0)} ${(x - step * smooth * 0.5).toFixed(0)} ${peak.toFixed(0)} ${x.toFixed(0)} ${(base - amp * 0.2 * rand()).toFixed(0)}`
  }
  return d + ` L${W + 40} ${H + 40} Z`
}

function pine(x, y, s, c) {
  return `<path fill="${c}" d="M${x} ${y - 90 * s} L${x - 12 * s} ${y - 60 * s} L${x - 6 * s} ${y - 61 * s} L${x - 20 * s} ${y - 32 * s} L${x - 9 * s} ${y - 33 * s} L${x - 28 * s} ${y} L${x + 28 * s} ${y} L${x + 9 * s} ${y - 33 * s} L${x + 20 * s} ${y - 32 * s} L${x + 6 * s} ${y - 61 * s} L${x + 12 * s} ${y - 60 * s} Z"/><rect fill="${c}" x="${x - 2.5 * s}" y="${y - 2}" width="${5 * s}" height="${16 * s}"/>`
}
function canopy(x, y, s, c) {
  return `<g fill="${c}"><circle cx="${x}" cy="${y - 42 * s}" r="${30 * s}"/><circle cx="${x - 24 * s}" cy="${y - 24 * s}" r="${22 * s}"/><circle cx="${x + 26 * s}" cy="${y - 22 * s}" r="${24 * s}"/><circle cx="${x + 4 * s}" cy="${y - 14 * s}" r="${22 * s}"/></g>`
}

// 1. Céu com sol e brilho atmosférico
writeFileSync(new URL('sky.svg', OUT), svg(
  `<rect width="${W}" height="${H}" fill="url(#sky)"/>
   <circle cx="1240" cy="470" r="520" fill="url(#glow)"/>
   <circle cx="1240" cy="470" r="62" fill="#FFF3D1"/>
   <rect y="${HORIZON - 260}" width="${W}" height="420" fill="url(#haze)"/>`,
  `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
     <stop offset="0" stop-color="#2B3B3A"/><stop offset=".32" stop-color="#7C7268"/>
     <stop offset=".58" stop-color="#D9A877"/><stop offset=".72" stop-color="#F0CF9D"/><stop offset="1" stop-color="#F6E3C1"/>
   </linearGradient>
   <radialGradient id="glow"><stop offset="0" stop-color="#FFE9B8" stop-opacity=".95"/><stop offset=".25" stop-color="#FBD9A0" stop-opacity=".55"/><stop offset="1" stop-color="#F2C48A" stop-opacity="0"/></radialGradient>
   <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF4DE" stop-opacity="0"/><stop offset=".7" stop-color="#FFF1D8" stop-opacity=".55"/><stop offset="1" stop-color="#FFF1D8" stop-opacity="0"/></linearGradient>`,
))

// 2. Montanhas distantes (azuladas, atmosfera)
{
  const r = rng(11)
  writeFileSync(new URL('far.svg', OUT), svg(
    `<path d="${ridge(r, HORIZON - 150, 150, 7, 0.9)}" fill="#8E8C8A" opacity=".55"/>
     <path d="${ridge(r, HORIZON - 70, 120, 9, 0.8)}" fill="#6F7A6E" opacity=".75"/>`,
  ))
}

// 3. Colinas médias com linha de árvores
{
  const r = rng(29)
  let trees = ''
  for (let i = 0; i < 70; i++) {
    const x = r() * W, y = HORIZON + 4 + r() * 10
    trees += r() > 0.5 ? pine(x, y, 0.35 + r() * 0.25, '#34503D') : canopy(x, y, 0.35 + r() * 0.2, '#3A5742')
  }
  writeFileSync(new URL('mid.svg', OUT), svg(
    `<path d="${ridge(r, HORIZON - 10, 70, 6, 1)}" fill="#556B4C"/>${trees}
     <rect x="0" y="${HORIZON}" width="${W}" height="14" fill="#3B5442"/>`,
  ))
}

// 4. Lago com reflexos
{
  const r = rng(43)
  let ripples = ''
  for (let i = 0; i < 70; i++) {
    const y = HORIZON + 20 + Math.pow(r(), 1.6) * (H - HORIZON - 20)
    const x = r() * W, len = 30 + r() * 200 * ((y - HORIZON) / (H - HORIZON) + 0.3)
    ripples += `<path d="M${x.toFixed(0)} ${y.toFixed(0)} h${len.toFixed(0)}" stroke="#FFF6E2" stroke-opacity="${(0.15 + r() * 0.25).toFixed(2)}" stroke-width="${(1 + (y - HORIZON) / 180).toFixed(1)}" stroke-linecap="round"/>`
  }
  writeFileSync(new URL('lake.svg', OUT), svg(
    `<rect y="${HORIZON + 10}" width="${W}" height="${H - HORIZON}" fill="url(#water)"/>
     <path d="M1240 ${HORIZON + 14} L1180 ${H} L1300 ${H} Z" fill="url(#path)" opacity=".75"/>
     <rect y="${HORIZON + 10}" width="${W}" height="60" fill="url(#shore)"/>${ripples}`,
    `<linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C9A783"/><stop offset=".35" stop-color="#8A8A7E"/><stop offset="1" stop-color="#3F5652"/></linearGradient>
     <linearGradient id="path" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE7B5" stop-opacity=".9"/><stop offset="1" stop-color="#FFE7B5" stop-opacity="0"/></linearGradient>
     <linearGradient id="shore" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2F4537" stop-opacity=".55"/><stop offset="1" stop-color="#2F4537" stop-opacity="0"/></linearGradient>`,
  ))
}

// 5. Primeiro plano: margens com pinheiros (moldura escura)
{
  const r = rng(71)
  let left = '', right = ''
  for (let i = 0; i < 14; i++) left += pine(20 + r() * 520, H - 120 + r() * 80, 1.4 + r() * 1.4, '#0F2219')
  for (let i = 0; i < 10; i++) right += pine(W - 30 - r() * 380, H - 100 + r() * 70, 1.3 + r() * 1.3, '#0F2219')
  writeFileSync(new URL('front.svg', OUT), svg(
    `<path d="M-40 ${H + 40} L-40 ${H - 210} C 200 ${H - 260} 420 ${H - 190} 640 ${H - 120} C 760 ${H - 80} 820 ${H - 30} 860 ${H + 40} Z" fill="#132A1F"/>
     <path d="M${W + 40} ${H + 40} L${W + 40} ${H - 190} C ${W - 180} ${H - 230} ${W - 360} ${H - 160} ${W - 520} ${H - 90} C ${W - 600} ${H - 50} ${W - 640} ${H} ${W - 660} ${H + 40} Z" fill="#132A1F"/>
     ${left}${right}`,
  ))
}

// 6. Nuvem e névoa (elementos flutuantes)
writeFileSync(new URL('cloud.svg', OUT),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 160"><defs><filter id="b" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="10"/></filter></defs>
   <g filter="url(#b)" fill="#FFF6E6" opacity=".85"><ellipse cx="300" cy="96" rx="250" ry="34"/><ellipse cx="220" cy="78" rx="110" ry="36"/><ellipse cx="360" cy="72" rx="130" ry="40"/></g></svg>`)
writeFileSync(new URL('mist.svg', OUT),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 300" preserveAspectRatio="none"><defs><filter id="b" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="22"/></filter></defs>
   <g filter="url(#b)" fill="#FFF8EC"><ellipse cx="400" cy="160" rx="520" ry="46" opacity=".55"/><ellipse cx="1150" cy="140" rx="620" ry="40" opacity=".45"/><ellipse cx="1750" cy="170" rx="380" ry="38" opacity=".5"/></g></svg>`)

console.log('Camadas do hero geradas em public/hero/')
