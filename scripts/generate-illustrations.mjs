// Gera ilustrações vetoriais (SVG) usadas como IMAGENS ILUSTRATIVAS de demonstração.
// Não são fotos do empreendimento. Substitua-as por fotos reais pelo painel (Galeria).
// Uso: node scripts/generate-illustrations.mjs
import { mkdirSync, writeFileSync } from 'node:fs'

const OUT = new URL('../public/demo/gallery/', import.meta.url)
mkdirSync(OUT, { recursive: true })

function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function ridge(rand, y, amp, w, h, steps = 14) {
  let d = `M0 ${h} L0 ${y}`
  for (let i = 1; i <= steps; i++) {
    const x = (w / steps) * i
    const cx = x - w / steps / 2
    const cy = y - amp * (0.4 + rand())
    d += ` Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x.toFixed(1)} ${(y + (rand() - 0.5) * amp * 0.5).toFixed(1)}`
  }
  return d + ` L${w} ${h} Z`
}

function tree(x, y, s, color) {
  return `<g fill="${color}"><path d="M${x} ${y - 60 * s} L${x - 16 * s} ${y - 18 * s} L${x - 7 * s} ${y - 20 * s} L${x - 20 * s} ${y + 2 * s} L${x + 20 * s} ${y + 2 * s} L${x + 7 * s} ${y - 20 * s} L${x + 16 * s} ${y - 18 * s} Z"/><rect x="${x - 2 * s}" y="${y}" width="${4 * s}" height="${10 * s}"/></g>`
}

function roundTree(x, y, s, color) {
  return `<g fill="${color}"><circle cx="${x}" cy="${y - 26 * s}" r="${18 * s}"/><circle cx="${x - 12 * s}" cy="${y - 16 * s}" r="${12 * s}"/><circle cx="${x + 13 * s}" cy="${y - 15 * s}" r="${13 * s}"/><rect x="${x - 2 * s}" y="${y - 6 * s}" width="${4 * s}" height="${12 * s}"/></g>`
}

const PALETTES = {
  dawn: { sky: ['#F6E7C8', '#E9C9A0', '#C9A88A'], sun: '#FFF4D6', far: '#9DA88E', mid: '#687B55', near: '#3E5A44', water: ['#C9B79A', '#7F9488'], trees: '#18392B' },
  day: { sky: ['#DCE8E4', '#B9D2CF', '#93B7B6'], sun: '#FFFDF4', far: '#A7B79B', mid: '#6E8A5E', near: '#3F6247', water: ['#9DBCC0', '#4F7D80'], trees: '#1E4634' },
  dusk: { sky: ['#F2D3A2', '#D9A26F', '#7E6A73'], sun: '#FFE7B0', far: '#8C8A78', mid: '#5B6B4C', near: '#2E4433', water: ['#D6A877', '#55606A'], trees: '#13291F' },
  mist: { sky: ['#EEF0EA', '#DFE4DC', '#C8D2C8'], sun: '#FFFFFF', far: '#C3CBBE', mid: '#93A28A', near: '#5D7560', water: ['#D3DCD6', '#9FB1AA'], trees: '#2F4A3A' },
}

function landscape({ seed, palette, lake = true, sunX = 0.7, sunY = 0.3, trees = 'pine', label }) {
  const W = 1600, H = 1000
  const rand = rng(seed)
  const p = PALETTES[palette]
  const horizon = H * 0.58
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">`
  svg += `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky[2]}"/><stop offset=".55" stop-color="${p.sky[1]}"/><stop offset="1" stop-color="${p.sky[0]}"/></linearGradient>`
  svg += `<linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.water[0]}"/><stop offset="1" stop-color="${p.water[1]}"/></linearGradient>`
  svg += `<radialGradient id="sun"><stop offset="0" stop-color="${p.sun}"/><stop offset=".35" stop-color="${p.sun}" stop-opacity=".7"/><stop offset="1" stop-color="${p.sun}" stop-opacity="0"/></radialGradient>`
  svg += `<linearGradient id="haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".35"/></linearGradient></defs>`
  svg += `<rect width="${W}" height="${H}" fill="url(#sky)"/>`
  svg += `<circle cx="${W * sunX}" cy="${H * sunY}" r="220" fill="url(#sun)"/><circle cx="${W * sunX}" cy="${H * sunY}" r="46" fill="${p.sun}"/>`
  // nuvens suaves
  for (let i = 0; i < 4; i++) {
    const cx = rand() * W, cy = 80 + rand() * 220, rx = 120 + rand() * 180
    svg += `<ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="${rx.toFixed(0)}" ry="${(rx / 7).toFixed(0)}" fill="#fff" opacity=".35"/>`
  }
  svg += `<path d="${ridge(rand, horizon - 170, 90, W, H)}" fill="${p.far}" opacity=".75"/>`
  svg += `<rect y="${horizon - 220}" width="${W}" height="220" fill="url(#haze)"/>`
  svg += `<path d="${ridge(rand, horizon - 70, 70, W, H, 10)}" fill="${p.mid}"/>`
  if (lake) {
    svg += `<rect y="${horizon}" width="${W}" height="${H - horizon}" fill="url(#water)"/>`
    svg += `<ellipse cx="${W * sunX}" cy="${horizon + 120}" rx="70" ry="260" fill="${p.sun}" opacity=".25"/>`
    for (let i = 0; i < 26; i++) {
      const y = horizon + 14 + rand() * (H - horizon - 40)
      const x = rand() * W, len = 40 + rand() * 160
      svg += `<path d="M${x.toFixed(0)} ${y.toFixed(0)} h${len.toFixed(0)}" stroke="#fff" stroke-opacity=".28" stroke-width="2" stroke-linecap="round"/>`
    }
    svg += `<path d="M0 ${H} L0 ${H - 140} Q ${W * 0.12} ${H - 210} ${W * 0.28} ${H - 160} Q ${W * 0.36} ${H - 120} ${W * 0.4} ${H} Z" fill="${p.near}"/>`
  } else {
    svg += `<path d="${ridge(rand, horizon + 60, 40, W, H, 8)}" fill="${p.near}"/>`
  }
  // árvores no primeiro plano
  const n = lake ? 9 : 16
  for (let i = 0; i < n; i++) {
    const x = lake ? 20 + rand() * W * 0.36 : rand() * W
    const y = lake ? H - 120 + rand() * 90 : horizon + 120 + rand() * (H - horizon - 140)
    const s = 1.2 + rand() * 1.6
    svg += trees === 'pine' ? tree(x, y, s, p.trees) : roundTree(x, y, s, p.trees)
  }
  if (label) {
    svg += `<text x="${W - 40}" y="${H - 36}" text-anchor="end" font-family="Georgia, serif" font-size="26" fill="#fff" opacity=".85">${label}</text>`
  }
  return svg + '</svg>'
}

function aerial({ seed, palette = 'day', label }) {
  const W = 1600, H = 1000
  const rand = rng(seed)
  const p = PALETTES[palette]
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">`
  svg += `<defs><linearGradient id="w" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.water[0]}"/><stop offset="1" stop-color="${p.water[1]}"/></linearGradient></defs>`
  svg += `<rect width="${W}" height="${H}" fill="#7F9468"/>`
  for (let i = 0; i < 60; i++) {
    svg += `<circle cx="${(rand() * W).toFixed(0)}" cy="${(rand() * H).toFixed(0)}" r="${(30 + rand() * 90).toFixed(0)}" fill="${rand() > 0.5 ? '#6E8A5E' : '#8FA176'}" opacity=".5"/>`
  }
  svg += `<path d="M900 520 C 1000 420, 1250 400, 1420 470 C 1580 540, 1620 720, 1520 860 C 1420 990, 1150 1010, 980 930 C 820 860, 800 640, 900 520 Z" fill="url(#w)"/>`
  svg += `<path d="M0 300 C 400 280, 700 330, 1600 260" stroke="#E8E1D0" stroke-width="26" fill="none"/>`
  svg += `<path d="M560 0 C 600 300, 560 600, 640 1000" stroke="#E8E1D0" stroke-width="20" fill="none"/>`
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 9; c++) {
      const x = 80 + c * 52, y = 360 + r * 120 + (r % 2) * 50
      if (y > 900) continue
      svg += `<rect x="${x}" y="${y}" width="46" height="${r % 2 ? 66 : 64}" fill="${rand() > 0.8 ? '#C9BC97' : '#A9B98C'}" stroke="#F5F2EA" stroke-width="2"/>`
    }
  }
  for (let i = 0; i < 40; i++) {
    const x = 700 + rand() * 900, y = rand() * 380
    svg += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(10 + rand() * 18).toFixed(0)}" fill="#2F5A3E"/>`
  }
  if (label) svg += `<text x="${W - 40}" y="${H - 36}" text-anchor="end" font-family="Georgia, serif" font-size="26" fill="#fff" opacity=".9">${label}</text>`
  return svg + '</svg>'
}

function road({ seed, palette = 'day', label }) {
  const W = 1600, H = 1000
  const rand = rng(seed)
  const p = PALETTES[palette]
  let svg = landscape({ seed, palette, lake: false, trees: 'round' }).replace('</svg>', '')
  svg += `<path d="M640 ${H} C 720 820, 780 700, 790 600 L 810 600 C 830 700, 940 820, 1060 ${H} Z" fill="#CFC6B2"/>`
  svg += `<path d="M850 ${H} C 820 860, 805 720, 800 600" stroke="#fff" stroke-width="5" stroke-dasharray="26 22" fill="none"/>`
  for (let i = 0; i < 6; i++) svg += roundTree(560 - i * 60 + rand() * 20, 900 - i * 50, 2.2 - i * 0.2, p.trees)
  for (let i = 0; i < 6; i++) svg += roundTree(1140 + i * 60 + rand() * 20, 900 - i * 50, 2.2 - i * 0.2, p.trees)
  if (label) svg += `<text x="${W - 40}" y="${H - 36}" text-anchor="end" font-family="Georgia, serif" font-size="26" fill="#fff" opacity=".85">${label}</text>`
  return svg + '</svg>'
}

const files = {
  'hero.svg': landscape({ seed: 7, palette: 'dusk', sunX: 0.68, sunY: 0.34 }),
  'lago-amanhecer.svg': landscape({ seed: 11, palette: 'dawn', sunX: 0.3, sunY: 0.36, label: 'Ilustração' }),
  'lago-entardecer.svg': landscape({ seed: 23, palette: 'dusk', sunX: 0.55, sunY: 0.4, label: 'Ilustração' }),
  'paisagem-neblina.svg': landscape({ seed: 31, palette: 'mist', lake: false, trees: 'pine', label: 'Ilustração' }),
  'paisagem-dia.svg': landscape({ seed: 41, palette: 'day', sunX: 0.2, sunY: 0.22, trees: 'round', label: 'Ilustração' }),
  'areas-verdes.svg': landscape({ seed: 53, palette: 'day', lake: false, trees: 'round', label: 'Ilustração' }),
  'vista-aerea.svg': aerial({ seed: 61, label: 'Ilustração' }),
  'drone-lago.svg': aerial({ seed: 67, palette: 'dawn', label: 'Ilustração' }),
  'acesso.svg': road({ seed: 71, label: 'Ilustração' }),
  'perspectiva.svg': landscape({ seed: 83, palette: 'dawn', sunX: 0.8, sunY: 0.3, trees: 'round', label: 'Ilustração' }),
  'terrenos.svg': aerial({ seed: 97, palette: 'mist', label: 'Ilustração' }),
}

for (const [name, svg] of Object.entries(files)) {
  writeFileSync(new URL(name, OUT), svg)
}
console.log(`Geradas ${Object.keys(files).length} ilustrações em public/demo/gallery/`)
