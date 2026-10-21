import kit from './kit.json'

// Иллюстрации сайта из assets/site-kit (через scripts/sync-assets.mjs): фоны секций и прозрачные вырезки
export interface KitEntry {
  width: number
  height: number
  widths: number[]
}

const entries = kit as Record<string, KitEntry>

export const kitImage = (name: string) => {
  const entry = entries[name]
  if (!entry) throw new Error(`Нет картинки site-kit «${name}». Проверьте assets/site-kit и npm run sync.`)
  const largest = Math.max(...entry.widths)
  return {
    ...entry,
    src: `/kit/${name}-${largest}.webp`,
    srcset: entry.widths.map((width) => `/kit/${name}-${width}.webp ${width}w`).join(', '),
  }
}
