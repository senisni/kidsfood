// Проверяет результат сборки: ссылки, ресурсы, метаданные и структурированные данные.
import { readdir, readFile, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '../dist')
const siteUrl = 'https://kidsfood.insines.ru'
const errors = []
const walk = async (directory) => {
  const files = await readdir(directory, { withFileTypes: true })
  return (await Promise.all(files.map((file) => file.isDirectory() ? walk(join(directory, file.name)) : join(directory, file.name)))).flat()
}
const htmlFiles = (await walk(dist)).filter((file) => file.endsWith('.html'))
const documents = new Map()
const attributes = (tag) => Object.fromEntries([...tag.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)].map((match) => [match[1], match[2] ?? match[3] ?? match[4] ?? '']))
const exists = async (path) => { try { return (await stat(path)).isFile() } catch { return false } }
const fileFor = async (url) => {
  const path = join(dist, decodeURIComponent(url.pathname))
  return await exists(path) ? path : join(path, 'index.html')
}
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8')
  const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
  const tags = [...markup.matchAll(/<(?:[a-z][\w:-]*)\b[^>]*>/gi)].map((match) => attributes(match[0]))
  documents.set(file, { html, tags, ids: new Set(tags.map((tag) => tag.id).filter(Boolean)) })
}
for (const [file, document] of documents) {
  const relative = file.slice(dist.length)
  const pageUrl = new URL(relative.replace(/index\.html$/, ''), siteUrl)
  const fail = (message) => errors.push(`${relative}: ${message}`)
  if (!/<title>[^<]+<\/title>/.test(document.html)) fail('нет title')
  if (!document.tags.some((tag) => tag.name === 'description' && tag.content)) fail('нет description')
  const canonical = document.tags.filter((tag) => tag.rel === 'canonical')
  if (canonical.length !== 1 || !canonical[0].href?.startsWith(siteUrl)) fail('некорректный canonical')
  if (!document.tags.some((tag) => tag.property === 'og:image')) fail('нет social image')
  if (!relative.startsWith('/games/') && (document.html.match(/<h1\b/gi) ?? []).length !== 1) fail('нужен один h1')
  if (/\b(?:chatgpt|openai|codex|claude|AI)\b|(?<!\p{L})ИИ(?!\p{L})|нейросет|искусственн.{0,30}интеллект/iu.test(document.html)) fail('упоминание инструмента в публичном HTML')
  for (const match of document.html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const schema = JSON.parse(match[1])
      if (!schema['@context']) fail('JSON-LD без context')
      for (const node of schema['@graph'] ?? [schema]) {
        const required = node['@type'] === 'VideoObject' ? ['name', 'description', 'thumbnailUrl', 'uploadDate', 'contentUrl', 'duration'] : node['@type'] === 'Recipe' ? ['name', 'image', 'recipeIngredient', 'recipeInstructions'] : []
        for (const key of required) if (!node[key] || (Array.isArray(node[key]) && !node[key].length)) fail(`${node['@type']}: нет ${key}`)
      }
    } catch { fail('невалидный JSON-LD') }
  }
  for (const tag of document.tags) {
    for (const attribute of ['href', 'src', 'poster']) {
      const value = tag[attribute]
      if (!value || /^(?:data:|mailto:|tel:|javascript:)/.test(value)) continue
      const url = new URL(value.replace(/&amp;/g, '&'), pageUrl)
      if (url.origin !== siteUrl) continue
      const target = await fileFor(url)
      if (!await exists(target)) { fail(`нет ресурса ${value}`); continue }
      if (attribute === 'href' && url.hash && documents.has(target) && !documents.get(target).ids.has(decodeURIComponent(url.hash.slice(1)))) fail(`нет якоря ${value}`)
    }
  }
}
const sitemap = await readFile(join(dist, 'sitemap.xml'), 'utf8')
const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
for (const location of locations) if (!await exists(await fileFor(new URL(location)))) errors.push(`Sitemap: нет ${location}`)
if (new Set(locations).size !== locations.length) errors.push('Sitemap: повторяющиеся URL')
for (const [file, document] of documents) {
  if (document.tags.some((tag) => tag.name === 'robots' && tag.content?.includes('noindex'))) continue
  const canonical = document.tags.find((tag) => tag.rel === 'canonical')?.href
  if (canonical && !locations.includes(canonical)) errors.push(`Sitemap: нет canonical страницы ${file.slice(dist.length)}`)
}
const robots = await readFile(join(dist, 'robots.txt'), 'utf8')
if (!robots.includes(`${siteUrl}/sitemap.xml`) || !robots.includes(`${siteUrl}/video-sitemap.xml`)) errors.push('robots.txt: нет ссылок на обе карты сайта')
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1 }
else console.log(`Проверено ${htmlFiles.length} HTML-страниц: ссылки, якоря, ресурсы, метаданные и JSON-LD. Sitemap: ${locations.length} URL.`)
