// GitHub Pages não tem reescrita de rotas: o 404.html recebe a mesma SPA,
// permitindo abrir diretamente /vista-do-lago/admin, /privacidade etc.
// .nojekyll impede o processamento Jekyll do GitHub Pages.
import { copyFileSync, writeFileSync } from 'node:fs'
const out = process.argv[2] || 'dist'
copyFileSync(`${out}/index.html`, `${out}/404.html`)
writeFileSync(`${out}/.nojekyll`, '')
console.log(`${out}/404.html e ${out}/.nojekyll gerados.`)
