// Механическая нарезка готовых листов: без перерисовки и удаления фона.
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
const root = dirname(fileURLToPath(import.meta.url))
const require = createRequire(pathToFileURL(join(root, '../../../site/package.json')))
const sharp = require('sharp')
const specification = JSON.parse(await readFile(join(root, 'prompts.json'), 'utf8'))
const remaining = JSON.parse(await readFile(join(root, 'remaining-prompts.json'), 'utf8'))
specification.jobs.push(...remaining.jobs)
const output = []
const failures = []
const quietBoundary = (projection, expected, radius) => {
  let best = Math.round(expected)
  let score = Infinity
  for (let position = Math.max(1, Math.round(expected - radius)); position < Math.min(projection.length - 1, expected + radius); position++) {
    const candidate = projection[position] * 10000 + Math.abs(position - expected)
    if (candidate < score) { score = candidate; best = position }
  }
  return best
}
await mkdir(join(root, 'web'), { recursive: true })
const inspect = async (path) => {
  const metadata = await sharp(path).metadata()
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let transparent = 0
  let partial = 0
  for (let pixel = 3; pixel < data.length; pixel += 4) {
    if (data[pixel] === 0) transparent++
    else if (data[pixel] < 255) partial++
  }
  return { width: metadata.width, height: metadata.height, channels: metadata.channels, hasAlpha: metadata.hasAlpha, transparentFraction: Number((transparent / (info.width * info.height)).toFixed(4)), partialFraction: Number((partial / (info.width * info.height)).toFixed(4)) }
}
const addOutput = async (name, path, role, sheet = null, crop = null) => {
  const geometry = await inspect(path)
  const webPath = `web/${name}.webp`
  await sharp(path).webp({ quality: 92, alphaQuality: 100 }).toFile(join(root, webPath))
  output.push({ name, role, png: path.slice(root.length + 1), webp: webPath, ...geometry, ...(sheet ? { sourceSheet: sheet, crop } : {}) })
}
for (const job of specification.jobs) {
  const path = join(root, job.path)
  let geometry
  try { geometry = await inspect(path) } catch (error) { failures.push({ name: job.name, error: error.message }); continue }
  if (job.alpha && (!geometry.hasAlpha || geometry.transparentFraction < 0.05)) {
    failures.push({ name: job.name, error: 'В исходнике нет достаточной реальной прозрачности', geometry })
    continue
  }
  if (job.grid) {
    const [columns, rows] = job.grid
    const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const rowProjection = Array(geometry.height).fill(0)
    for (let top = 0; top < geometry.height; top++) for (let left = 0; left < geometry.width; left++) if (data[(top * info.width + left) * 4 + 3] > 32) rowProjection[top]++
    const rowEdges = [0, ...Array.from({ length: rows - 1 }, (_unused, index) => quietBoundary(rowProjection, (index + 1) * geometry.height / rows, geometry.height / rows * 0.2)), geometry.height]
    for (const [index, name] of job.names.entries()) {
      const column = index % columns
      const row = Math.floor(index / columns)
      const top = rowEdges[row]
      const height = rowEdges[row + 1] - top
      const projection = Array(geometry.width).fill(0)
      for (let x = 0; x < geometry.width; x++) for (let y = top; y < top + height; y++) if (data[(y * info.width + x) * 4 + 3] > 32) projection[x]++
      const columnEdges = [0, ...Array.from({ length: columns - 1 }, (_unused, edge) => quietBoundary(projection, (edge + 1) * geometry.width / columns, geometry.width / columns * 0.25)), geometry.width]
      const left = columnEdges[column]
      const width = columnEdges[column + 1] - left
      const target = join(root, `cutouts/${name}.png`)
      const crop = { left, top, width, height }
      if (name === 'game-plate') {
        await copyFile(join(root, 'cutouts/plate-three-friends.png'), target)
        await addOutput(name, target, 'transparent-cutout', 'cutouts/plate-three-friends.png')
      } else {
        const cell = await sharp(path).extract(crop).png().toBuffer()
        await sharp(cell).trim({ threshold: 5 }).png().toFile(target)
        await addOutput(name, target, 'transparent-cutout', job.path, crop)
      }
    }
  } else {
    await addOutput(job.name, path, job.name.startsWith('layout') ? 'design-reference' : job.alpha ? 'transparent-cutout' : 'background')
  }
}
const manifest = { selectedReference: 'reference-selected.png', layout: 'layout-airy-approved.png', sourceSpecification: 'prompts.json', generatedWith: 'built-in imagegen', assets: output, failures }
await writeFile(join(root, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
const cutouts = output.filter((asset) => asset.role === 'transparent-cutout')
if (cutouts.length) {
  const tileWidth = 300
  const tileHeight = 280
  const columns = 4
  const rows = Math.ceil(cutouts.length / columns)
  const layers = []
  for (const [index, asset] of cutouts.entries()) {
    const thumbnail = await sharp(join(root, asset.png)).resize(260, 220, { fit: 'inside' }).png().toBuffer()
    const metadata = await sharp(thumbnail).metadata()
    const left = (index % columns) * tileWidth
    const top = Math.floor(index / columns) * tileHeight
    layers.push({ input: thumbnail, left: left + Math.round((tileWidth - metadata.width) / 2), top: top + 8 })
    const label = Buffer.from(`<svg width="300" height="42"><text x="150" y="27" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#293e33">${asset.name}</text></svg>`)
    layers.push({ input: label, left, top: top + 234 })
  }
  await sharp({ create: { width: columns * tileWidth, height: rows * tileHeight, channels: 4, background: '#f8f3e7' } }).composite(layers).png().toFile(join(root, 'contact-sheet.png'))
}
console.log(JSON.stringify({ assets: output.length, cutouts: cutouts.length, failures }, null, 2))
if (failures.length) process.exitCode = 1
