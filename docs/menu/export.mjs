// Выгрузка карточек меню в PNG: node docs/menu/export.mjs (нужен сервер из корня проекта на :8765)
import { chromium } from "../../video/node_modules/playwright-core/index.mjs";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const exe = homedir() + "/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1000, height: 800 }, deviceScaleFactor: 2 });
const errs = []; p.on("pageerror", e => errs.push(String(e))); p.on("requestfailed", r => errs.push(r.url()));
await p.goto("http://localhost:8765/docs/menu/menu.html");
await p.evaluate(() => document.fonts.ready);
await p.waitForLoadState("networkidle");
const cards = await p.evaluate(() => window.CARDS);
for (const c of cards) await p.locator("#" + c.id).screenshot({ path: join(here, "img", `${c.id}.png`) });
console.log(cards.length, "cards; errors:", errs.length ? errs : "none");
await b.close();
