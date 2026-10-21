// Покадровый рендер film.html → PNG-поток в FFmpeg.
// node tools/render.mjs stills 0.5,2,4.4,5,8   — отдельные кадры в build/stills
// node tools/render.mjs video                  — все кадры → build/video-only.mp4
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// сервер отдаёт корень проекта: фильму нужны ../shared/fonts
const SERVE = join(ROOT, "..");
const PAGE = process.env.FILM || "film.html";
// у каждого ролика свои промежуточные файлы: build/<имя>-video.mp4, build/<имя>-sfx.json
const NAME = PAGE.replace(/\.html$/, "");
const TYPES = { ".html": "text/html", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".wav": "audio/wav", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".mp4": "video/mp4" };
const server = createServer(async (req, res) => {
  try {
    const p = join(SERVE, decodeURIComponent(new URL(req.url, "http://x").pathname));
    const body = await readFile(p);
    res.writeHead(200, { "content-type": TYPES[extname(p)] || "application/octet-stream" });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
}).listen(0);
const port = server.address().port;

const exe = join(homedir(), "Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
const browser = await chromium.launch({ executablePath: exe, args: ["--force-color-profile=srgb"] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on("pageerror", e => console.error("pageerror", e));
await page.goto(`http://localhost:${port}/video/${PAGE}?render`);
await page.evaluate(() => window.ready);
// события звука фильма — для tools/audio.py
await mkdir(join(ROOT, "build"), { recursive: true });
await writeFile(join(ROOT, `build/${NAME}-sfx.json`), JSON.stringify(await page.evaluate(() => ({ sfx: window.SFX || [], T: window.T || {}, duration: window.DURATION })), null, 0));

const grab = async (t) => {
  const b64 = await page.evaluate((t) => { window.renderAt(t); return document.getElementById("c").toDataURL("image/png").split(",")[1]; }, t);
  return Buffer.from(b64, "base64");
};

const mode = process.argv[2];
await mkdir(join(ROOT, "build/stills"), { recursive: true });
if (mode === "stills") {
  for (const t of process.argv[3].split(",").map(Number)) {
    await writeFile(join(ROOT, `build/stills/t${t.toFixed(2)}.png`), await grab(t));
  }
} else {
  const { fps, dur } = await page.evaluate(() => ({ fps: window.FPS, dur: window.DURATION }));
  const n = Math.round(fps * dur);
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "png", "-i", "-",
    "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-r", String(fps), join(ROOT, `build/${NAME}-video.mp4`)], { stdio: ["pipe", "inherit", "inherit"] });
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const buf = await grab(i / fps);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once("drain", r));
    if (i % 60 === 0) console.log(`frame ${i}/${n} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on("close", r));
  console.log("frames", n);
}
await browser.close();
server.close();
