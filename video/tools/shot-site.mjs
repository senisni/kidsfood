// Полностраничные снимки сайта на нескольких ширинах: node video/tools/shot-site.mjs <url> <outDir> [ширины…]
import { chromium } from 'playwright-core'
import { homedir } from 'node:os'
import { join } from 'node:path'
const [url = 'http://localhost:4321/', out = '.', ...list] = process.argv.slice(2)
const widths = list.length ? list.map(Number) : [375, 640, 1024, 1440, 2560]
const exe = join(homedir(), 'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
const browser = await chromium.launch({ executablePath: exe })
for (const width of widths) {
  const page = await browser.newPage({ viewport: { width, height: 900 } })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(async () => { document.querySelectorAll('img[loading=lazy]').forEach((image) => { image.loading = 'eager' }); await Promise.all([...document.images].map((image) => image.decode().catch(() => {}))) })
  await page.waitForTimeout(400)
  const scroll = await page.evaluate(() => [document.documentElement.scrollWidth, getComputedStyle(document.documentElement).fontSize])
  console.log(width, 'scrollWidth', scroll[0], 'rem', scroll[1])
  await page.screenshot({ path: join(out, `site-${width}.png`), fullPage: true })
  await page.close()
}
await browser.close()
