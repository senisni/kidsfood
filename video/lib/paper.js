// Общий движок бумажных роликов: рисование, облачка, ярлыки, тарелка, монтаж, запуск.
// Ролик задаёт window.FILM = { T, end, segments: [{a,b,draw,slide?}], buildSfx() } до подключения boot().
"use strict";
const W = 1920, H = 1080, FPS = 60;
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
const RENDER = new URLSearchParams(location.search).has("render");

const C = {
  cream: "#f3ead3", paper: "#fbf6e8", ink: "#2c3a33",
  veg: "#4f8f4f", grain: "#c98f1f", prot: "#c9603f", water: "#3f8f86",
  boyBack: "#9cc9b4", girlBack: "#f0b9b0",
};
const FRIENDS = [
  { name: "Овощи и фрукты", sub: "половина тарелки", color: C.veg, icon: "el50-10" },
  { name: "Крупы и хлеб", sub: "чтобы бегать и думать", color: C.grain, icon: "el10-5" },
  { name: "Белок", sub: "чтобы расти", color: C.prot, icon: "el10-2" },
];
const TITLE_COLORS = [C.prot, C.grain, "#2f6b4a", C.water];

// ---------- утилиты ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const easeInOut = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const easeOut = x => 1 - Math.pow(1 - x, 3);
const easeIn = x => x * x * x;
const smooth = x => x * x * (3 - 2 * x);
const backOut = (x, s = 1.7) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
const step12 = t => Math.floor(t * 12) / 12;
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let r = Math.imul(seed ^ seed >>> 15, 1 | seed); r = r + Math.imul(r ^ r >>> 7, 61 | r) ^ r; return ((r ^ r >>> 14) >>> 0) / 4294967296; }; }
const hash = n => rng(n * 7919 + 13)();
// «Бумажная» дрожь только у движущихся вырезок; удерживаемые позы её не получают.
const jitter = (id, t, amp) => (hash(id * 977 + Math.floor(t * 8)) - .5) * 2 * amp;
// мягкое «дыхание» удерживаемой позы
const breathe = (id, t) => Math.sin(t * 2.1 + id) * .006;
const walkFrame = (who, t, fps = 8) => SPR[`walk-${who}-${Math.floor(t * fps) % 8 + 1}`];

// ---------- звук: события для tools/audio.py ----------
const SFX = [];
const sfx = (t, kind, p = 0, pan = 0) => SFX.push([+t.toFixed(3), kind, p, pan]);
window.SFX = SFX;

// ---------- ассеты ----------
const SPR = {};
const NAMES = ["garden-nosun.jpg", "kitchen.jpg", "kitchen-table-fg.png", "canteen-warm.jpg", "evening-kitchen.jpg", "evening-table-fg.png", "evening-path.jpg", "belly-garden.jpg", "table-cloth.jpg"];
const add = (k, n) => { for (let i = 1; i <= n; i++) NAMES.push(`${k}-${i}.png`); };
["boy", "girl", "boyact", "girlact"].forEach(k => add(k, 6));
["el10", "el20", "el30", "el40", "el50"].forEach(k => add(k, 10));
add("el60", 9); add("plate3", 1); add("sunmoon", 2); add("pfood", 10); add("toast", 6); add("heads", 8); add("snack", 10); add("lbox", 1); add("mic", 5); ["classboy", "classgirl", "cook", "dad"].forEach(k => add(k, 4));
add("walk-boy", 8); add("walk-girl", 8);
function loadAll(extra = []) {
  return Promise.all(NAMES.concat(extra).map(n => new Promise((res, rej) => {
    const im = new Image(); im.onload = () => { SPR[n.replace(/\.(png|jpg)$/, "")] = im; res(); }; im.onerror = () => rej(n); im.src = "sprites/" + n;
  })));
}
function makePaper(w, h, base, seed, fibers = 900) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d"); const r = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  const id = g.getImageData(0, 0, w, h);
  for (let i = 0; i < id.data.length; i += 4) { const n = (r() - .5) * 12; id.data[i] += n; id.data[i + 1] += n; id.data[i + 2] += n; }
  g.putImageData(id, 0, 0);
  for (let i = 0; i < fibers; i++) {
    g.strokeStyle = r() < .5 ? "rgba(255,255,255,0.10)" : "rgba(90,70,40,0.06)";
    g.lineWidth = .6 + r(); const x = r() * w, y = r() * h, a = r() * 6.28, l = 6 + r() * 24;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 1) * l * .5, y + Math.sin(a + 1) * l * .5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  return c;
}
let TABLE, NIGHT, GRAIN;

// ---------- рисование ----------
function sprite(g, im, x, y, s, rot = 0, o = {}) {
  const ax = o.ax ?? .5, ay = o.ay ?? .5, w = im.width * s, h = im.height * s;
  g.save(); g.translate(x, y); g.rotate(rot); if (o.flip) g.scale(-1, 1);
  g.globalAlpha = o.alpha ?? 1;
  if (o.shadow !== false) {
    const sd = o.sd ?? 1;
    g.save(); g.filter = `blur(${(o.sblur ?? 5) * sd}px) brightness(0)`; g.globalAlpha = (o.alpha ?? 1) * (o.sa ?? .28);
    g.drawImage(im, -ax * w + 6 * sd, -ay * h + 9 * sd, w, h); g.restore();
  }
  if (o.blur) g.filter = `blur(${o.blur}px)`;
  g.drawImage(im, -ax * w, -ay * h, w, h);
  g.restore();
}
// Герой по высоте, ноги в (x, footY)
function hero(g, im, x, footY, height, rot = 0, o = {}) { sprite(g, im, x, footY, height / im.height, rot, { ay: 1, shadow: false, ...o }); }
function walker(g, who, t, x, footY, height, fps = 8, o = {}) {
  sprite(g, walkFrame(who, t, fps), x, footY, height / 540, 0, { ay: 600 / 640, shadow: false, flip: o.flip, blur: o.blur });
}
function contactShadow(g, x, y, w, a = .18) {
  g.save(); g.fillStyle = `rgba(50,40,20,${a})`; g.filter = "blur(8px)";
  g.beginPath(); g.ellipse(x, y, w, w * .13, 0, 0, Math.PI * 2); g.fill(); g.restore();
}
function camImage(g, cx, cy, z, base, roll = 0) { g.translate(W / 2, H / 2); g.rotate(roll); g.scale(base * z, base * z); g.translate(-cx, -cy); }

// Неровный вырезанный контур: почти прямоугольник со скруглёнными углами и «ножничным» краем.
function cutRect(w, h, seed) {
  const p = new Path2D(), rr = rng(seed), pts = [], N = 32;
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
    const ex = Math.sign(ca) * Math.pow(Math.abs(ca), .25) * w / 2, ey = Math.sign(sa) * Math.pow(Math.abs(sa), .25) * h / 2;
    pts.push([ex + (rr() - .5) * 5, ey + (rr() - .5) * 5]);
  }
  p.moveTo(pts[0][0], pts[0][1]); pts.forEach(q => p.lineTo(q[0], q[1])); p.closePath();
  return p;
}
// перенос по ширине; «\n» в тексте — ручной перенос
function wrapText(g, text, maxW) {
  const lines = [];
  for (const para of text.split("\n")) {
    let cur = "";
    for (const w of para.split(" ")) { const t = cur ? cur + " " + w : w; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
    lines.push(cur);
  }
  return lines;
}
// Облачко реплики по образцу new-2026-10/speech-bubbles-08.png: кремовый овал из бумаги
// лежит на чуть большей цветной подложке (мята — мальчик, розовый — девочка), хвостик плавный.
const BUB_BACK = { boy: "#74b998", girl: "#ee8088", "": "#dcb56c" };
function bubbleShape(w, h, tail, seed) {
  const body = new Path2D(), rr = rng(seed), N = 40;
  for (let i = 0; i <= N; i++) {
    const a = i / N * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
    const ex = Math.sign(ca) * Math.pow(Math.abs(ca), .42) * w / 2, ey = Math.sign(sa) * Math.pow(Math.abs(sa), .55) * h / 2;
    const j = i % N ? (rr() - .5) * 3 : 0;
    i ? body.lineTo(ex + j, ey + j) : body.moveTo(ex, ey);
  }
  body.closePath();
  const [tx, ty] = tail, down = ty > 0, side = Math.sign(tx) || 1;
  const bx = clamp(tx * .45, -w / 2 + 70, w / 2 - 70), by = down ? h / 2 - 14 : -h / 2 + 14;
  const tp = new Path2D(), bw = Math.min(34, w * .12);
  tp.moveTo(bx - bw, by);
  tp.quadraticCurveTo(bx - bw * .2 * side, (by + ty) / 2, tx, ty);
  tp.quadraticCurveTo(bx + bw * .6, (by * 2 + ty) / 3, bx + bw, by);
  tp.closePath();
  return { body, tp };
}
function bubble(g, x, y, text, k, who, tail, t, o = {}) {
  if (k <= 0) return;
  const s = backOut(clamp(k), 1.8) * (o.out ? 1 - easeIn(o.out) : 1);
  if (s <= 0.01) return;
  g.save(); g.translate(x, y); g.rotate(o.rot ?? -.015); g.scale(s, s);
  const size = o.size || 56;
  g.font = `700 ${size}px Balsamiq`;
  const lines = wrapText(g, text, o.maxW || 760);
  const tw = Math.max(...lines.map(l => g.measureText(l).width));
  const w = tw + 120, h = lines.length * size * 1.18 + 70;
  const { body, tp } = bubbleShape(w, h, tail, text.length * 13 + (who === "girl" ? 7 : 3));
  const back = BUB_BACK[who] ?? BUB_BACK[""], rim = 15;
  g.lineJoin = "round";
  // тень под обоими слоями
  g.save(); g.filter = "blur(9px)"; g.translate(6, 13); g.fillStyle = "rgba(40,30,15,.3)"; g.strokeStyle = g.fillStyle; g.lineWidth = rim * 2;
  g.stroke(body); g.fill(body); g.stroke(tp); g.fill(tp); g.restore();
  // цветная подложка: тот же контур, шире на ободок и чуть ниже
  g.save(); g.translate(2, 5); g.fillStyle = back; g.strokeStyle = back; g.lineWidth = rim * 2;
  g.stroke(body); g.fill(body); g.stroke(tp); g.fill(tp);
  g.clip(body); g.globalAlpha = .22; g.drawImage(GRAIN, -w / 2 - rim, -h / 2 - rim, w + rim * 2, h + rim * 2); g.restore();
  // мягкая тень кремового листа на подложке
  g.save(); g.filter = "blur(3px)"; g.translate(1, 4); g.fillStyle = "rgba(40,30,15,.22)"; g.fill(body); g.fill(tp); g.restore();
  g.fillStyle = C.paper; g.fill(body); g.fill(tp);
  g.save(); g.clip(body); g.globalAlpha = .2; g.drawImage(GRAIN, -w / 2, -h / 2, w, h); g.restore();
  g.fillStyle = C.ink; g.textBaseline = "middle"; g.textAlign = "left";
  // появление по словам: читается спокойнее, чем по буквам
  const shown = o.words !== undefined ? o.words : 1e9;
  let count = 0;
  lines.forEach((ln, i) => {
    const vis = ln.split(" ").filter(() => count++ < shown).join(" ");
    if (!vis) return;
    g.fillText(vis, -g.measureText(ln).width / 2, (i - (lines.length - 1) / 2) * size * 1.18 + 3);
  });
  g.restore();
}
const wordsAt = (t, t0, rate = 6) => Math.floor(Math.max(0, t - t0) * rate) + 1;

// Ярлык друга: иконка еды + название + «зачем».
function friendTag(g, x, y, fi, k, o = {}) {
  if (k <= 0) return;
  const f = FRIENDS[fi], s = backOut(clamp(k), 2) * (o.scale || 1);
  g.save(); g.translate(x, y); g.rotate(o.rot ?? 0); g.scale(s, s); g.globalAlpha = o.alpha ?? 1;
  g.font = "700 50px Balsamiq"; const w1 = g.measureText(f.name).width;
  g.font = "800 32px Nunito"; const w2 = o.noSub ? 0 : g.measureText(f.sub).width;
  const w = Math.max(w1, w2) + 170, h = o.noSub ? 96 : 136;
  const p = cutRect(w, h, fi * 31 + 5);
  g.save(); g.filter = "blur(7px)"; g.fillStyle = "rgba(40,30,15,.28)"; g.translate(7, 10); g.fill(p); g.restore();
  g.save(); g.translate(-12, 10); g.rotate(-.015); g.fillStyle = f.color; g.fill(p); g.restore();
  g.fillStyle = C.paper; g.fill(p);
  g.save(); g.clip(p); g.globalAlpha = .18; g.drawImage(GRAIN, -w / 2, -h / 2, w, h); g.restore();
  const icon = SPR[f.icon];
  sprite(g, icon, -w / 2 + 70, 0, 92 / Math.max(icon.width, icon.height), 0, { sd: .4 });
  g.textAlign = "left"; g.textBaseline = "middle";
  g.fillStyle = f.color; g.font = "700 50px Balsamiq"; g.fillText(f.name, -w / 2 + 132, o.noSub ? 2 : -20);
  if (!o.noSub) { g.fillStyle = C.ink; g.font = "800 32px Nunito"; g.fillText(f.sub, -w / 2 + 134, 30); }
  g.restore();
}
// Подпись-вывод (не реплика): бумажная лента.
function caption(g, x, y, text, k, o = {}) {
  if (k <= 0) return;
  const s = backOut(clamp(k), 1.6) * (o.out ? 1 - easeIn(o.out) : 1);
  if (s <= .01) return;
  g.save(); g.translate(x, y); g.rotate(o.rot ?? .01); g.scale(s, s);
  const size = o.size || 60;
  g.font = `700 ${size}px Balsamiq`;
  const lines = wrapText(g, text, o.maxW || 1300);
  const tw = Math.max(...lines.map(l => g.measureText(l).width));
  const w = tw + 110, h = lines.length * size * 1.2 + 50;
  const p = cutRect(w, h, text.length * 7);
  g.save(); g.filter = "blur(8px)"; g.fillStyle = "rgba(40,30,15,.3)"; g.translate(8, 12); g.fill(p); g.restore();
  g.save(); g.translate(-14, 11); g.rotate(-.012); g.fillStyle = o.back || "#e6c27a"; g.fill(p); g.restore();
  g.fillStyle = C.paper; g.fill(p);
  g.save(); g.clip(p); g.globalAlpha = .18; g.drawImage(GRAIN, -w / 2, -h / 2, w, h); g.restore();
  g.fillStyle = o.color || C.ink; g.textAlign = "center"; g.textBaseline = "middle";
  lines.forEach((ln, i) => g.fillText(ln, 0, (i - (lines.length - 1) / 2) * size * 1.2 + 3));
  g.restore();
}
// Бумажные буквы
const GLYPHS = new Map();
function glyphCanvas(ch, size, color) {
  const key = ch + size + color; if (GLYPHS.has(key)) return GLYPHS.get(key);
  const c = document.createElement("canvas"); c.width = size * 1.3; c.height = size * 1.45;
  const g = c.getContext("2d");
  g.font = `700 ${size}px Balsamiq`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  g.strokeStyle = C.paper; g.lineWidth = size * .17; g.strokeText(ch, c.width / 2, c.height / 2);
  g.fillStyle = color; g.fillText(ch, c.width / 2, c.height / 2);
  g.globalCompositeOperation = "source-atop"; g.globalAlpha = .14; g.drawImage(GRAIN, 0, 0, c.width, c.height);
  GLYPHS.set(key, c); return c;
}
function paperLine(g, text, cx, y, size, t0, step, t, o = {}) {
  g.save(); g.font = `700 ${size}px Balsamiq`; const ws = [...text].map(ch => g.measureText(ch).width); g.restore();
  const total = ws.reduce((a, b) => a + b, 0) + (text.length - 1) * 3;
  let x = cx - total / 2, li = 0;
  const cols = o.colors || TITLE_COLORS;
  [...text].forEach((ch, i) => {
    if (ch !== " ") {
      const tt = t0 + li * step, d = prog(t, tt, tt + .4);
      const out = o.out ? easeIn(prog(t, o.out + li * .02, o.out + .45 + li * .02)) : 0;
      if (d > 0 && out < 1) {
        const yy = lerp(y - 240, y, backOut(d, 1.5)) - out * 520;
        const r = (1 - d) * (hash(i + 70) - .5) * 1.2 + (hash(i + 200) - .5) * .06;
        sprite(g, glyphCanvas(ch, size, cols[li % cols.length]), x + ws[i] / 2, yy, 1, r, { sa: .32, sblur: 4 });
      }
      li++;
    }
    x += ws[i] + 3;
  });
}
function chapterTag(g, t, t0, text, icon) {
  const k = prog(t, t0, t0 + .35); if (k <= 0) return;
  const s = backOut(k, 2);
  g.save(); g.translate(190, 110); g.rotate(-.04); g.scale(s, s);
  g.font = "700 54px Balsamiq"; const w = g.measureText(text).width + 160, h = 96;
  const p = cutRect(w, h, text.length * 17);
  g.save(); g.filter = "blur(6px)"; g.fillStyle = "rgba(40,30,15,.3)"; g.translate(6, 9); g.fill(p); g.restore();
  g.save(); g.translate(-8, 6); g.fillStyle = "#e6c27a"; g.fill(p); g.restore();
  g.fillStyle = C.paper; g.fill(p);
  sprite(g, SPR[icon], -w / 2 + 62, 0, 70 / Math.max(SPR[icon].width, SPR[icon].height), 0, { sd: .4 });
  g.fillStyle = C.ink; g.textBaseline = "middle"; g.textAlign = "left"; g.fillText(text, -w / 2 + 110, 3);
  g.restore();
}
// Падение продукта и посадка с отскоком
function dropItem(g, im, x, y, s, r0, t, tl, id) {
  const d = prog(t, tl - .34, tl); if (d <= 0) return;
  const fall = easeIn(d), settle = prog(t, tl, tl + .32);
  const bounce = Math.sin(settle * Math.PI) * (1 - settle) * .07;
  const sc = s * (1 + (1 - fall) * .8 + bounce);
  const r = r0 + (1 - fall) * (hash(id + 3) - .5) * 1.4;
  sprite(g, im, x, y - (1 - fall) * 60, sc, r, { sd: 1 + (1 - fall) * 5, sblur: 4 + (1 - fall) * 12, sa: .3, alpha: clamp(d * 3) });
}

// ---------- тарелка сверху ----------
const PLATE_W = 382, PLATE_H = 370;
function sectorPath(i, R) {
  const p = new Path2D();
  if (i === 0) { p.moveTo(-10, -R); p.arc(-10, 0, R, -Math.PI / 2, Math.PI / 2, true); p.closePath(); } // половина: овощи и фрукты
  if (i === 1) { p.moveTo(10, -10); p.arc(10, -10, R, -Math.PI / 2, 0); p.closePath(); }              // крупы и хлеб
  if (i === 2) { p.moveTo(10, 10); p.arc(10, 10, R, 0, Math.PI / 2); p.closePath(); }                 // белок
  return p;
}
// st: { fill: [k0,k1,k2], want: [...], glow: [...], items: [{n,u,v,s,r,t?}] }
function plate(g, t, PW, rot, st) {
  const ps = PW / PLATE_W, R = PW * .47 * .86;
  g.save(); g.rotate(rot);
  sprite(g, SPR["plate3-1"], 0, 0, PW / SPR["plate3-1"].width, 0, { sd: 1.4, sblur: 8 });
  for (let i = 0; i < 3; i++) {
    const p = sectorPath(i, R);
    if (st.want && st.want[i] > 0) {
      const pulse = .4 + .35 * Math.sin(t * Math.PI * 3.33);
      g.save(); g.setLineDash([24, 18]); g.lineDashOffset = -t * 40; g.lineWidth = 8;
      g.strokeStyle = `rgba(201,96,63,${pulse * st.want[i]})`; g.stroke(p); g.restore();
    }
    const k = st.fill ? st.fill[i] : 0;
    if (k > 0) { g.save(); g.globalAlpha = .34 * k; g.fillStyle = FRIENDS[i].color; g.fill(p); g.restore(); }
    if (st.glow && st.glow[i] > 0) {
      g.save(); g.globalAlpha = st.glow[i] * .8; g.lineWidth = 12; g.strokeStyle = FRIENDS[i].color; g.filter = "blur(2px)"; g.stroke(p); g.restore();
    }
  }
  (st.items || []).forEach((f, i) => {
    const x = (f.u - .5) * PLATE_W * ps, y = (f.v - .5) * PLATE_H * ps;
    if (f.t === undefined) sprite(g, SPR[f.n], x, y, f.s * ps, f.r, { sd: 1 });
    else dropItem(g, SPR[f.n], x, y, f.s * ps, f.r, t, f.t, 400 + i);
  });
  g.restore();
}


// Бумажный паровозик: паровоз и два вагончика с едой едут слева направо по волне.
function paperTrain(g, t, t0, t1) {
  const k = prog(t, t0, t1); if (k <= 0 || k >= 1) return;
  const x0 = lerp(-60, W + 700, k), cars = [["#c9603f", null], ["#e9c46a", "pfood-2"], ["#8fb08a", "pfood-10"]];
  cars.forEach(([col, load], i) => {
    const x = x0 - i * 290, y = 600 + Math.sin(x / 220) * 34, rot = Math.cos(x / 160) * .12;
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(1.55, 1.55);
    g.save(); g.filter = "blur(6px)"; g.fillStyle = "rgba(40,30,15,.3)"; g.fillRect(-78, -38, 168, 86); g.restore();
    if (load) sprite(g, SPR[load], 0, -62, 105 / Math.max(SPR[load].width, SPR[load].height), Math.sin(t * 9 + i) * .08, { sd: .5 });
    g.fillStyle = col; g.beginPath(); g.roundRect(-80, -44, 160, 76, 14); g.fill();
    if (!load) { // паровоз: кабина и труба
      g.fillRect(-70, -96, 64, 56); g.fillStyle = "#2c3a33"; g.fillRect(34, -84, 26, 42);
      g.fillStyle = "#fbf6e8"; g.beginPath(); g.roundRect(-58, -84, 40, 30, 6); g.fill();
      for (let p = 0; p < 3; p++) { const d = ((t * 2 + p / 3) % 1); g.globalAlpha = 1 - d; g.beginPath(); g.arc(47 - d * 60, -100 - d * 70, 14 + d * 18, 0, 7); g.fill(); g.globalAlpha = 1; }
    }
    g.fillStyle = "#2c3a33"; [-48, 48].forEach(wx => { g.beginPath(); g.arc(wx, 36, 20, 0, 7); g.fill(); g.fillStyle = "#e9dcbc"; g.beginPath(); g.arc(wx, 36, 7, 0, 7); g.fill(); g.fillStyle = "#2c3a33"; });
    if (i) { g.fillStyle = "#7a5a3a"; g.fillRect(80, -6, 34, 10); }
    g.restore();
  });
}


// ---------- монтаж ----------
let SEGMENTS = [], T = {}, DURATION = 0;
const segIndex = t => { for (let i = SEGMENTS.length - 1; i >= 0; i--) if (t >= SEGMENTS[i].a) return i; return 0; };
const trc = document.createElement("canvas"); trc.width = W; trc.height = H; const trx = trc.getContext("2d");
function drawScene(g, t, si) {
  const seg = SEGMENTS[si];
  g.save(); g.fillStyle = C.cream; g.fillRect(0, 0, W, H);
  const k = seg.slide ? prog(t, seg.a, seg.a + seg.slide) : 1;
  if (k < 1) {
    SEGMENTS[si - 1].draw(g, t);
    trx.setTransform(1, 0, 0, 1, 0, 0); trx.fillStyle = C.cream; trx.fillRect(0, 0, W, H);
    seg.draw(trx, t);
    const e = easeInOut(k), x = (1 - e) * (W + 80);
    g.save(); g.translate(x, 0); g.rotate((1 - e) * .03);
    g.save(); g.filter = "blur(18px)"; g.fillStyle = "rgba(40,30,15,.35)"; g.fillRect(-30, -40, 60, H + 80); g.restore();
    g.drawImage(trc, 0, 0); g.restore();
  } else seg.draw(g, t);
  const fo = prog(t, DURATION - .5, DURATION);
  if (fo > 0) { g.fillStyle = `rgba(243,234,211,${fo})`; g.fillRect(0, 0, W, H); }
  g.restore();
}
const acc = document.createElement("canvas"); acc.width = W; acc.height = H; const actx = acc.getContext("2d");
const sub = document.createElement("canvas"); sub.width = W; sub.height = H; const sctx = sub.getContext("2d");
const SAMPLES = RENDER ? 4 : 1;
function renderAt(t) {
  const shutter = .5 / FPS, si = segIndex(t), seg = SEGMENTS[si];
  // въезд бумажной карточки — чёткий, без размазывания на полосы
  const n = seg.slide && t < seg.a + seg.slide ? 1 : SAMPLES;
  actx.clearRect(0, 0, W, H);
  for (let i = 0; i < n; i++) {
    let ts = t + (n > 1 ? (i / (n - 1) - .5) * shutter : 0);
    ts = Math.min(Math.max(ts, seg.a), seg.b - 1e-4);
    sctx.setTransform(1, 0, 0, 1, 0, 0); drawScene(sctx, ts, si);
    actx.globalAlpha = 1 / (i + 1); actx.drawImage(sub, 0, 0);
  }
  ctx.globalAlpha = 1; ctx.drawImage(acc, 0, 0);
  ctx.save(); ctx.globalAlpha = .05; ctx.globalCompositeOperation = "multiply"; ctx.drawImage(GRAIN, 0, 0, W, H); ctx.restore();
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, H * 1.05);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(40,25,10,0.2)");
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
}


function boot(film) {
  T = film.T; DURATION = film.end; SEGMENTS = film.segments;
  if (film.buildSfx) film.buildSfx();
  window.renderAt = renderAt; window.DURATION = DURATION; window.FPS = FPS; window.T = T;
  window.ready = (async () => {
    await loadAll(film.extra || []);
    await Promise.all(["700 60px Balsamiq", "800 30px Nunito"].map(f => document.fonts.load(f, "Три друга Ёё")));
    TABLE = SPR["table-cloth"]; // бумажная скатерть сверху (new-2026-10/table-top-cloth.png)
    NIGHT = makePaper(1024, 600, "#e4d3b0", 21, 2200);
    GRAIN = makePaper(512, 512, "#bdb4a0", 5, 600);
    renderAt(0);
    return true;
  })();
  if (!RENDER) {
    const ui = document.getElementById("ui"), audio = new Audio(film.audio || "build/audio-film.wav");
    let t0 = null;
    window.ready.then(() => {
      ui.textContent = "Клик — воспроизвести";
      canvas.onclick = () => { t0 = performance.now(); audio.currentTime = 0; audio.play().catch(() => {}); };
      const loop = now => {
        if (t0 !== null) { const t = (now - t0) / 1000; if (t <= DURATION) { renderAt(t); ui.textContent = t.toFixed(2) + " с"; } else t0 = null; }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    });
  }
}
