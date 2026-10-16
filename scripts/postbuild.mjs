// GitHub Pages não tem reescrita de rotas: o 404.html recebe a mesma SPA,
// permitindo abrir diretamente /vista-do-lago/admin, /privacidade etc.
import { copyFileSync, writeFileSync } from 'node:fs'
copyFileSync('dist/index.html', 'dist/404.html')
writeFileSync('dist/.nojekyll', '')
console.log('404.html e .nojekyll gerados.')
