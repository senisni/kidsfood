// Общая основа игр (подключается в GameLayout как обычный скрипт: игры используют её функции): масштаб сцены, звук, прогресс, перетаскивание, полка, полоса подсказок.
"use strict";
const S = n => `/video/sprites/${n}.png`;
const $ = s => document.querySelector(s);
const stage = document.getElementById("stage");
let scale = 1;
function fit() { scale = Math.min(innerWidth / 1600, innerHeight / 900) * .98; stage.style.transform = `translate(-50%, -50%) scale(${scale})`; }
addEventListener("resize", fit); fit();
function toStage(e) { const r = stage.getBoundingClientRect(); return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale }; }
const cap = s => s[0].toUpperCase() + s.slice(1);

// ---------- друзья тарелки ----------
const FRIENDS = [
  { name: "Овощи и фрукты", short: "овощи и фрукты", color: "#4f8f4f", fill: "rgba(79,143,79,.34)", icon: "el50-10",
    ex: "огурец, морковь, капуста, брокколи, яблоко, ягоды", why: "витамины и клетчатка", imgs: ["pfood-1", "pfood-10", "pfood-2"] },
  { name: "Крупы и хлеб", short: "крупы и хлеб", color: "#c98f1f", fill: "rgba(201,143,31,.34)", icon: "el10-5",
    ex: "рис, гречка, овсянка, макароны, лапша, хлеб, картошка, блины", why: "энергия: бегать и думать", imgs: ["pfood-3", "pfood-6", "el20-9"] },
  { name: "Белок", short: "белок", color: "#c9603f", fill: "rgba(201,96,63,.34)", icon: "el10-2",
    ex: "яйцо, творог, сыр, йогурт, мясо, курица, рыба, фасоль", why: "расти и крепнуть", imgs: ["pfood-4", "pfood-5", "pfood-7"] },
];
// Окно «Кто есть кто?»: три друга с примерами. Про углеводы — честно: они есть и во фруктах,
// но крупы, хлеб, макароны и картошка — главный сытный источник.
function friendsGuide(onClose) {
  let w = document.getElementById("guide");
  if (!w) {
    w = document.createElement("div"); w.id = "guide"; w.className = "win";
    w.innerHTML = `<div class="card guide" style="--back:#e6c27a"><h2>Кто есть кто?</h2>${FRIENDS.map(f => `
      <div class="gf" style="--c:${f.color}"><div class="gi">${f.imgs.map(i => `<img src="${S(i)}">`).join("")}</div>
      <div><b>${f.name}</b> — ${f.why}<small>${f.ex}</small></div></div>`).join("")}
      <p class="carb"><b>Крупы и хлеб</b> — учёные называют их <b>углеводами</b>. Углеводы — это топливо: тело превращает их в энергию. Немного углеводов есть и во фруктах, и в молоке, но крупы, хлеб, макароны и картошка — главный сытный источник.</p>
      <p style="text-align:center"><button class="btn green" id="guideOk">Понятно!</button></p></div>`;
    stage.appendChild(w);
  }
  w.classList.add("on");
  w.querySelector("#guideOk").onclick = () => { audio(); w.classList.remove("on"); onClose && onClose(); };
}

// ---------- звук: маленькие бумажные щелчки ----------
let AC = null;
function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} return AC; }
function tone(f0, f1, dur, type = "sine", vol = .25, delay = 0) {
  const ac = audio(); if (!ac) return;
  const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .005); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + .02);
}
function rustle(vol = .15) {
  const ac = audio(); if (!ac) return;
  const n = ac.sampleRate * .06, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (n * .2));
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  f.type = "bandpass"; f.frequency.value = 2800; g.gain.value = vol; s.buffer = b; s.connect(f).connect(g).connect(ac.destination); s.start();
}
const sfx = {
  pick: () => rustle(.12),
  plop: (k = 1) => { tone(620 * k, 300 * k, .14, "sine", .3); rustle(.08); },
  nope: () => { tone(300, 220, .18, "triangle", .2); tone(260, 190, .2, "triangle", .15, .12); },
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, f * 1.01, .5, "triangle", .18, i * .11)),
  ding: () => tone(1320, 1320, .4, "sine", .1),
  check: () => tone(880, 1320, .2, "triangle", .15),
  flip: () => { rustle(.2); tone(500, 700, .1, "sine", .1); },
};

// прогресс — только в этом браузере
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem("three-friends:" + k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem("three-friends:" + k, JSON.stringify(v)); } catch (e) {} },
};

// ---------- полоса подсказок ----------
// who: "boy" | "girl" | имя спрайта; mood: "good" | "bad" | ""
const FACES = { boy: "boy-1", girl: "girl-1", dad: "dad-1", cook: "cook-1", dasha: "classgirl-1", misha: "classboy-1", mic: "mic-2" };
const HEADS = { boy: { "": "heads-1", bad: "heads-2", good: "heads-3" }, girl: { "": "heads-5", bad: "heads-6", good: "heads-7" } };
function say(text, who = "boy", mood = "") {
  const el = $(".say"); if (!el) return;
  const face = el.querySelector(".face"), txt = el.querySelector(".txt");
  // у героев — головы с эмоцией (heads-*): обычно улыбка, ошибка — удивление, верно — «ммм»
  const head = HEADS[who]?.[mood];
  face.style.backgroundImage = `url(${S(head || FACES[who] || who)})`;
  face.classList.toggle("head", !!head);
  el.style.setProperty("--back", who === "girl" ? "#ee8088" : "#74b998");
  txt.textContent = text;
  el.className = "say " + mood;
  void el.offsetWidth; el.classList.add("pop");
}

// ---------- перетаскивание ----------
// opts: blocked() → не тащить сейчас, onStart(el), onMove(el, p), onDrop(el, p) → true, если принято; иначе предмет возвращается на полку.
function draggable(el, opts) {
  el.addEventListener("pointerdown", e => {
    if (el.dataset.lock || (opts.blocked && opts.blocked())) return;
    e.preventDefault(); audio(); sfx.pick();
    el.setPointerCapture(e.pointerId);
    const p0 = toStage(e), x0 = parseFloat(el.style.left), y0 = parseFloat(el.style.top);
    el.classList.add("drag"); el.classList.remove("back");
    opts.onStart && opts.onStart(el);
    const move = ev => { const p = toStage(ev); el.style.left = (x0 + p.x - p0.x) + "px"; el.style.top = (y0 + p.y - p0.y) + "px"; opts.onMove && opts.onMove(el, p); };
    const up = ev => {
      el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up);
      el.classList.remove("drag");
      const p = toStage(ev);
      const ok = opts.onDrop ? opts.onDrop(el, p) : false;
      if (!ok) home(el);
    };
    el.addEventListener("pointermove", move); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
  });
}
function home(el) { el.classList.add("back"); el.classList.remove("placed"); delete el.dataset.lock; el.style.left = el.dataset.hx + "px"; el.style.top = el.dataset.hy + "px"; }
// ошибка: предмет на миг ложится, качает «нет» и возвращается
function bounceBack(el) {
  el.classList.add("shake"); sfx.nope();
  setTimeout(() => { el.classList.remove("shake"); home(el); }, 450);
}
function makeItem(parent, it, x, y) {
  const el = document.createElement("div"); el.className = "item";
  el.innerHTML = `<img src="${S(it.img)}" alt=""><span>${it.name}</span>`;
  el.style.left = x + "px"; el.style.top = y + "px"; el.dataset.hx = x; el.dataset.hy = y;
  parent.appendChild(el); return el;
}
// разложить предметы по полке равномерно
function fillShelf(parent, items, onEach) {
  const n = items.length, w = 1600 - 60, step = Math.min(128, w / n), x0 = 30 + (w - step * n) / 2 + (step - 118) / 2;
  return items.map((it, i) => { const el = makeItem(parent, it, x0 + i * step, 704); onEach && onEach(el, it, i); return el; });
}
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function showWin(html) { const w = $(".win"); w.querySelector(".card").innerHTML = html; w.classList.add("on"); }
function hideWin() { $(".win").classList.remove("on"); }
