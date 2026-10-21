// Собирает public/ из исходников проекта: игры, спрайты, шрифты, видео, карточки меню.
// Исходники не трогает. Пережатые файлы кэшируются по времени изменения.
import { copyFile, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const site = join(dirname(fileURLToPath(import.meta.url)), '..')
const root = join(site, '..')
const pub = join(site, 'public')

const isFresh = async (source, target) => {
  try {
    return (await stat(target)).mtimeMs >= (await stat(source)).mtimeMs
  } catch {
    return false
  }
}

const syncDir = async (from, to, transform) => {
  await mkdir(to, { recursive: true })
  let count = 0
  for (const name of await readdir(from)) {
    const source = join(from, name)
    if ((await stat(source)).isDirectory()) continue
    const target = join(to, transform?.rename?.(name) ?? name)
    if (await isFresh(source, target)) continue
    if (transform?.write) await transform.write(source, target)
    else await copyFile(source, target)
    count++
  }
  console.log(`${to.replace(site + '/', '')}: обновлено ${count}`)
}

// игры: пути к спрайтам и шрифтам остаются относительными (../video/sprites, ../shared/fonts)
await syncDir(join(root, 'interactive'), join(pub, 'games'))

// спрайты: PNG с палитрой — в 3–4 раза легче, прозрачность сохраняется
await syncDir(join(root, 'video/sprites'), join(pub, 'video/sprites'), {
  write: async (source, target) => {
    const ext = extname(source)
    const image = sharp(source).resize({ width: 900, height: 900, fit: 'inside', withoutEnlargement: true })
    if (ext === '.png') await image.png({ palette: true, quality: 90, effort: 8 }).toFile(target)
    else if (ext === '.jpg') await image.jpeg({ quality: 82, mozjpeg: true }).toFile(target)
    else await copyFile(source, target)
  },
})

await syncDir(join(root, 'shared/fonts'), join(pub, 'shared/fonts'))
await syncDir(join(root, 'video/out/web'), join(pub, 'media'))

// карточки меню — WebP
await syncDir(join(root, 'docs/menu/img'), join(pub, 'menu'), {
  rename: (name) => name.replace(/\.png$/, '.webp'),
  write: (source, target) => sharp(source).resize({ width: 1200 }).webp({ quality: 82 }).toFile(target),
})

// фон первого экрана — сад без солнца
const heroSource = join(root, 'video/sprites/garden-nosun.jpg')
const heroTarget = join(pub, 'img/garden.webp')
await mkdir(dirname(heroTarget), { recursive: true })
if (!(await isFresh(heroSource, heroTarget))) await sharp(heroSource).resize({ width: 2400 }).webp({ quality: 80 }).toFile(heroTarget)

// robots.txt — сайт открыт для поиска
await writeFile(join(pub, 'robots.txt'), 'User-agent: *\nAllow: /\n')

// данные меню для страницы /menu: берём из docs/menu/menu.html (массив D), чтобы не дублировать
const menuHtml = await readFile(join(root, 'docs/menu/menu.html'), 'utf8')
const block = menuHtml.slice(menuHtml.indexOf('const D = ['), menuHtml.indexOf('];', menuHtml.indexOf('const D = [')) + 2)
const dishes = new Function(`${block}; return D`)()
const counters = { B: 0, L: 0, D: 0 }
const menu = dishes.map((dish) => {
  const no = ++counters[dish.m]
  return { id: `${dish.m}${String(no).padStart(2, '0')}`, meal: dish.m, title: dish.t, veg: dish.o, grain: dish.k, protein: dish.b, tags: dish.tags, time: dish.time, how: dish.how, sprite: dish.dish ? `/video/sprites/${dish.dish}.png` : null, img: `/menu/${dish.m}${String(no).padStart(2, "0")}.webp` }
})
await mkdir(join(site, 'src/data'), { recursive: true })
await writeFile(join(site, 'src/data/menu.json'), JSON.stringify(menu, null, 1))
console.log(`menu.json: ${menu.length} блюд`)
