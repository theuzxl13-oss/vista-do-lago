import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// GitHub Pages publica o site em https://USUARIO.github.io/vista-do-lago/
// O caminho base pode ser sobrescrito com VITE_BASE_PATH (ex.: "/" para domínio próprio).
export default defineConfig(({ command, mode, isPreview }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = command === 'build' || isPreview ? env.VITE_BASE_PATH || '/vista-do-lago/' : '/'
  return {
    base,
    plugins: [react()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    build: {
      chunkSizeWarningLimit: 900,
    },
  }
})
