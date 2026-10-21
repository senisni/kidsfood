// Проверка уже опубликованного сайта; используется также GitHub Actions.
import { games } from '../src/data/games.ts'
import { videos } from '../src/data/videos.ts'
const siteUrl = process.env.SITE_URL ?? 'https://kidsfood.insines.ru'
const expectedRevision = process.env.GITHUB_SHA
const request = async (path, options = {}) => {
  let lastError
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(new URL(path, siteUrl), { ...options, signal: AbortSignal.timeout(15000) })
      if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`)
      return response
    } catch (error) { lastError = error }
  }
  throw lastError
}
const paths = ['/', '/menu/', '/menu/b01/', '/menu/l05/', '/menu/d01/', '/igry/', '/multfilmy/', '/roditelyam/', '/o-proekte/', '/sitemap.xml', '/video-sitemap.xml', '/robots.txt', ...videos.map((video) => `/multfilmy/${video.id}/`), ...games.map((game) => game.href)]
for (const path of paths) {
  const response = await request(path)
  const content = await response.text()
  if (!content.trim()) throw new Error(`${path}: пустой ответ`)
  if (path.endsWith('/') || path.endsWith('.html')) {
    if (!response.headers.get('content-type')?.includes('text/html') || !content.includes('rel="canonical"')) throw new Error(`${path}: нет HTML или canonical`)
  }
  console.log(`200 ${path}`)
}
for (const video of videos) {
  const response = await request(video.src, { headers: { Range: 'bytes=0-1023' } })
  if (response.status !== 206 || !response.headers.get('content-range')?.startsWith('bytes 0-1023/')) { await response.body?.cancel(); throw new Error(`${video.src}: нет частичной загрузки видео`) }
  if ((await response.arrayBuffer()).byteLength !== 1024) throw new Error(`${video.src}: неверный размер фрагмента`)
  console.log(`206 ${video.src}`)
}
const version = await (await request('/version.json')).json()
if (expectedRevision && version.revision !== expectedRevision) throw new Error(`Опубликован другой коммит: ${version.revision}`)
console.log(`Проверка пройдена. Ревизия: ${version.revision}`)
