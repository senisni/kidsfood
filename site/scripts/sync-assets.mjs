// Собирает public/ из исходников проекта: игры, спрайты, шрифты, видео, карточки меню.
// Исходники не трогает. Пережатые файлы кэшируются по времени изменения.
import { copyFile, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { games } from '../src/data/games.ts'
import { videos } from '../src/data/videos.ts'
import { metrikaSnippet } from '../src/data/metrika.ts'
import { execFileSync } from 'node:child_process'

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
// Метаданные публикации формируются из того же списка, что и карточки сайта.
const escapeHtml = (value) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
const siteUrl = 'https://kidsfood.insines.ru'
await mkdir(join(pub, 'games'), { recursive: true })
for (const name of await readdir(join(root, 'interactive'))) {
  const source = join(root, 'interactive', name)
  if (!['.html', '.css', '.js'].includes(extname(name))) continue
  if (!(await stat(source)).isFile()) continue
  const target = join(pub, 'games', name)
  if (!name.endsWith('.html')) { await copyFile(source, target); continue }
  const game = games.find((item) => item.href === `/games/${name}`)
  const title = game ? `${game.title} — игра о еде для детей` : 'Семь игр о еде — Три друга на тарелке'
  const description = game ? `${game.text} Бесплатная игра для детей 8–12 лет с подсказками, без регистрации.` : 'Семь игр о еде для детей 8–12 лет: тарелка, ланч-бокс, клетчатка, сытость и перекус.'
  const canonical = `${siteUrl}${game?.href ?? '/igry/'}`
  const schema = game ? { '@context': 'https://schema.org', '@type': 'VideoGame', name: game.title, description, url: canonical, inLanguage: 'ru', genre: 'Обучающая игра', gamePlatform: 'Веб-браузер', isAccessibleForFree: true, image: `${siteUrl}/video/sprites/${game.sprites[0]}.png` } : null
  let html = await readFile(source, 'utf8')
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
  html = html.replace('</head>', `<meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${canonical}"><meta name="robots" content="index,follow,max-image-preview:large"><meta property="og:type" content="website"><meta property="og:locale" content="ru_RU"><meta property="og:site_name" content="Три друга на тарелке"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${siteUrl}/img/social.jpg"><meta name="twitter:card" content="summary_large_image">${schema ? `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>` : ''}${metrikaSnippet}</head>`)
  html = html.replace('</body>', '<noscript><p>Для игры нужен JavaScript. Можно <a href="/multfilmy/">посмотреть мультфильм</a> или открыть <a href="/menu/">семейное меню</a>.</p></noscript></body>')
  await writeFile(target, html)
}
console.log('public/games: страницы и метаданные обновлены')

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

// иллюстрации сайта — из ../assets/site-kit/paper-adventure-v1 (фоны и вырезки) в public/kit,
// по два размера WebP; размеры пишутся в src/data/kit.json для width/height и srcset
const kitRoot = join(root, 'assets/site-kit/paper-adventure-v1')
const kitSets = [
  { folder: 'backgrounds', widths: [1280, 2400], quality: 78 },
  { folder: 'cutouts', widths: [640, 1280], quality: 84 },
]
const kit = {}
await mkdir(join(pub, 'kit'), { recursive: true })
let kitCount = 0
for (const set of kitSets) {
  for (const file of await readdir(join(kitRoot, set.folder))) {
    if (extname(file) !== '.png') continue
    const source = join(kitRoot, set.folder, file)
    const name = file.replace(/\.png$/, '')
    const { width, height } = await sharp(source).metadata()
    const widths = [...new Set(set.widths.map((size) => Math.min(size, width)))]
    for (const size of widths) {
      const target = join(pub, 'kit', `${name}-${size}.webp`)
      if (await isFresh(source, target)) continue
      await sharp(source).resize({ width: size }).webp({ quality: set.quality, alphaQuality: 90, effort: 5 }).toFile(target)
      kitCount++
    }
    kit[name] = { width, height, widths }
  }
}
await writeFile(join(site, 'src/data/kit.json'), JSON.stringify(kit, null, 1))
console.log(`public/kit: обновлено ${kitCount}, всего ${Object.keys(kit).length} картинок`)

// векторный заголовок первого экрана — из ../assets/branding
await mkdir(join(pub, 'img'), { recursive: true })
await copyFile(join(root, 'assets/branding/three-friends-v1/title.svg'), join(pub, 'img/title.svg'))

// фон первого экрана — сад без солнца
const heroSource = join(root, 'video/sprites/garden-nosun.jpg')
const heroTarget = join(pub, 'img/garden.webp')
await mkdir(dirname(heroTarget), { recursive: true })
if (!(await isFresh(heroSource, heroTarget))) await sharp(heroSource).resize({ width: 2400 }).webp({ quality: 80 }).toFile(heroTarget)

// robots.txt — сайт открыт для поиска
await writeFile(join(pub, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\nSitemap: ${siteUrl}/video-sitemap.xml\n`)
// llms.txt — краткая карта сайта для ИИ-поиска (формат llmstxt.org); те же данные, что у карточек
const llms = `# Три друга на тарелке

> Бесплатные мультфильмы и игры о еде для детей 8–12 лет, семейное меню на 45 блюд и памятка для родителей. Главная идея: на тарелке три группы — овощи и фрукты (половина), крупы и хлеб, белок; без деления еды на «хорошую» и «плохую», без подсчёта калорий и требования доедать.

## Для родителей и учителей
- [Как кормить ребёнка 8–12 лет и объяснить пользу еды](${siteUrl}/roditelyam/): 11 тем для разговора — тарелка, завтрак, школа, клетчатка, вода, сладкое, сытость, перекус.
- [О проекте и источники](${siteUrl}/o-proekte/): принципы и рекомендации, на которые опираемся (Роспотребнадзор: МР 2.4.0179-20 и проект «Здоровое питание», Canada’s Food Guide, Harvard Healthy Eating Plate, ВОЗ, AAP, Эллин Саттер).
- [Семейное меню](${siteUrl}/menu/): 15 завтраков, 15 обедов и 15 ужинов с рецептами и планом заготовок.

## Мультфильмы
${videos.map((video) => `- [${video.title}](${siteUrl}/multfilmy/${video.id}/): ${video.length}. ${video.text}`).join('\n')}

## Игры
${games.map((game) => `- [${game.title}](${siteUrl}${game.href}): ${game.text}`).join('\n')}
`
await writeFile(join(pub, 'llms.txt'), llms)

const revision = process.env.GITHUB_SHA ?? execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
await writeFile(join(pub, 'version.json'), JSON.stringify({ revision }) + '\n')

// обложка ссылок, иконки вкладки и постеры мультфильмов — из site-kit
const kitFile = (folder, name) => join(kitRoot, folder, `${name}.png`)
const derived = [
  { source: kitFile('backgrounds', 'social-cover'), target: 'img/social.jpg', make: (image) => image.resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 86, mozjpeg: true }) },
  { source: kitFile('cutouts', 'logo-mark'), target: 'favicon.png', make: (image) => image.trim().resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png() },
  { source: kitFile('cutouts', 'logo-mark'), target: 'apple-touch-icon.png', make: (image) => image.trim().resize(160, 160, { fit: 'contain', background: '#fffcf4' }).extend({ top: 10, bottom: 10, left: 10, right: 10, background: '#fffcf4' }).flatten({ background: '#fffcf4' }).png() },
  ...videos.map((video) => ({ source: kitFile('backgrounds', `poster-${video.id}`), target: `media/poster-${video.id}.jpg`, make: (image) => image.resize(1280, 720, { fit: 'cover' }).jpeg({ quality: 84, mozjpeg: true }) })),
]
for (const item of derived) {
  const target = join(pub, item.target)
  await mkdir(dirname(target), { recursive: true })
  if (!(await isFresh(item.source, target))) await item.make(sharp(item.source)).toFile(target)
}
console.log(`обложка, иконки и постеры: ${derived.length}`)

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
