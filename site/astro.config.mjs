import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://kidsfood.insines.ru',
  trailingSlash: 'ignore',
  vite: { plugins: [tailwindcss()] },
})
