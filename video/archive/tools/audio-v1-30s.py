"""Музыка и звуки бумаги для ролика 0–30 с. Синтез без внешних сэмплов.

Две музыкальные версии на одной сетке 120 BPM (такт = 2 с), общие SFX:
  A — укулеле и маримба, C–Am–F–G, мягкая;
  B — «бумажный марш»: пиццикато, колокольчики, хлопки, деревянная коробочка, F–Dm–B♭–C.
События совпадают с таймлайном film.html.
Запуск: python3 -I tools/audio.py A build/audio-A.wav
"""
import sys
import wave

import numpy as np

VARIANT = sys.argv[1].upper()
OUT = sys.argv[2]
SR = 48000
DUR = 30.0
N = int(SR * DUR)
rs = np.random.default_rng(7)
L = np.zeros(N)
R = np.zeros(N)
MUS_L = np.zeros(N)
MUS_R = np.zeros(N)


def add(sig, t, gain=1.0, pan=0.0, music=False):
    i = int(t * SR)
    if i >= N or i < 0:
        return
    sig = sig[: N - i] * gain
    bl, br = (MUS_L, MUS_R) if music else (L, R)
    bl[i : i + len(sig)] += sig * np.sqrt((1 - pan) / 2) * 1.414
    br[i : i + len(sig)] += sig * np.sqrt((1 + pan) / 2) * 1.414


def env(n, a=0.004, d=0.3):
    t = np.arange(n) / SR
    return np.minimum(t / a, 1) * np.exp(-t / d)


def hz(note):
    return 440 * 2 ** ((note - 69) / 12)


def pluck(note, dur=0.9, bright=0.5, decay=0.996):
    """Karplus–Strong."""
    f = hz(note)
    n = int(dur * SR)
    p = max(2, int(SR / f))
    buf = np.convolve(rs.uniform(-1, 1, p), np.ones(3) / 3, "same")
    out = np.zeros(n)
    for i in range(n):
        j = i % p
        out[i] = buf[j]
        buf[j] = (bright * buf[j] + (1 - bright) * buf[(j + 1) % p]) * decay
    return out * env(n, 0.002, dur * 0.6)


def marimba(note, dur=0.6):
    f = hz(note)
    t = np.arange(int(dur * SR)) / SR
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t / 0.05)
    return s * env(len(t), 0.003, 0.22)


def glock(note, dur=1.0):
    f = hz(note)
    t = np.arange(int(dur * SR)) / SR
    s = (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.12)
         + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / 0.05))
    return s * env(len(t), 0.001, 0.35)


def pizz(note, dur=0.35):
    f = hz(note)
    t = np.arange(int(dur * SR)) / SR
    s = (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.04)
         + 0.2 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t / 0.02))
    return s * env(len(t), 0.004, 0.09)


def noise(n):
    return rs.uniform(-1, 1, n)


def bandpass(x, lo, hi):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))


def kick():
    t = np.arange(int(0.25 * SR)) / SR
    f = 50 + 70 * np.exp(-t / 0.03)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.09)


def shaker():
    n = int(0.06 * SR)
    return bandpass(noise(n), 5000, 12000) * env(n, 0.005, 0.02)


def clap():
    n = int(0.12 * SR)
    s = bandpass(noise(n), 900, 4000)
    e = np.zeros(n)
    for k in range(3):
        i = int(k * 0.011 * SR)
        e[i:] += env(n - i, 0.001, 0.012 if k < 2 else 0.04)
    return s * e


def woodblock(note=84):
    t = np.arange(int(0.08 * SR)) / SR
    f = hz(note)
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.3 * t)) * env(len(t), 0.0005, 0.015)


def paper_tap(bright=1.0):
    n = int(0.07 * SR)
    s = bandpass(noise(n), 1500 * bright, 5000 * bright) * env(n, 0.001, 0.015)
    t = np.arange(n) / SR
    return s + 0.5 * np.sin(2 * np.pi * 140 * t) * np.exp(-t / 0.02)


def plop(f0):
    t = np.arange(int(0.16 * SR)) / SR
    f = f0 * (0.55 + 0.45 * np.exp(-t / 0.03))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.002, 0.05)


def whoosh(dur, lo=300, hi=3000):
    n = int(dur * SR)
    x = noise(n)
    out = np.zeros(n)
    seg = 2048
    for i in range(0, n, seg):
        k = i / n
        c = lo + (hi - lo) * k**1.5
        out[i : i + seg] = bandpass(x[i : i + seg], c * 0.6, c * 1.6)[: min(seg, n - i)]
    return out * np.sin(np.linspace(0, np.pi, n)) ** 2 * np.linspace(0.3, 1, n)


def paper_slide(dur=0.5):
    """Лист бумаги скользит по столу: шуршание с нарастанием и мягкой посадкой."""
    n = int(dur * SR)
    x = bandpass(noise(n), 600, 5000)
    return x * np.linspace(0, 1, n) ** 0.6 * np.exp(-np.linspace(0, 3, n)) * 1.6


def chime(note):
    t = np.arange(int(1.2 * SR)) / SR
    f = hz(note)
    s = np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.2)
    return s * env(len(t), 0.002, 0.45)


# ---------- музыка ----------
# Тишина-вопрос «Кого не хватает?»: музыка замолкает, зритель успевает ответить.
STOP = [(14.0, 15.0)]


def silent(t):
    return any(a <= t < b for a, b in STOP)


BARS = 15
if VARIANT == "A":
    CH = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]]
    BASS = [48, 45, 41, 43]
    for bar in range(BARS):
        t0 = bar * 2.0
        ch, b = CH[bar % 4], BASS[bar % 4]
        for i, k in enumerate([0, 1, 2, 1, 0, 2, 1, 2]):
            tt = t0 + i * 0.25
            if (bar == 0 and i < 2) or silent(tt) or tt >= 29.0:
                continue
            add(pluck(ch[k] + 12, 0.7, 0.55), tt, 0.26 if bar == 0 else 0.16, pan=-0.3 + 0.2 * (i % 2), music=True)
        if bar >= 1 and t0 < 29:
            for off, nt, gn in [(0, b, 0.5), (1.0, b + 7, 0.35)]:
                if not silent(t0 + off):
                    add(marimba(nt), t0 + off, gn, music=True)
            for beat in (0, 2):
                if not silent(t0 + beat * 0.5):
                    add(kick(), t0 + beat * 0.5, 0.42, music=True)
            for e in range(8):
                if not silent(t0 + e * 0.25):
                    add(shaker(), t0 + e * 0.25, 0.05 + 0.03 * (e % 2), pan=0.4, music=True)
    MEL = [(4.5, 72), (5.0, 76), (5.25, 79), (5.5, 76), (5.75, 74), (6.25, 72), (6.5, 74), (7.0, 79), (7.25, 77), (7.5, 76),
           (8.0, 72), (8.5, 76), (9.0, 79), (15.0, 74), (15.5, 79), (15.75, 81), (16.0, 84),
           (24.0, 72), (24.25, 76), (24.5, 79), (25.0, 77), (25.25, 76), (25.5, 74), (25.75, 72), (26.0, 79),
           (27.75, 72), (28.25, 76), (28.75, 79)]
    for t, n in MEL:
        add(marimba(n, 0.5), t, 0.28, pan=0.2, music=True)
    for n in [60, 64, 67, 72]:
        add(pluck(n + 12, 2.0, 0.5), 29.0, 0.16, music=True)
else:
    CH = [[65, 69, 72], [62, 65, 69], [58, 62, 65], [60, 64, 67]]
    BASS = [41, 38, 46, 36]
    for bar in range(BARS):
        t0 = bar * 2.0
        ch, b = CH[bar % 4], BASS[bar % 4]
        if t0 >= 29:
            continue
        for beat in range(4):
            tt = t0 + beat * 0.5
            if silent(tt):
                continue
            # пиццикато «ум-па»: бас на 1 и 3, аккорд на 2 и 4
            if beat % 2 == 0:
                add(pizz(b + (7 if beat == 2 else 0)), tt, 0.55, music=True)
            else:
                for n in ch:
                    add(pizz(n, 0.25), tt, 0.13, pan=0.25, music=True)
                if bar >= 1:
                    add(clap(), tt, 0.22, pan=-0.15, music=True)
            if bar >= 1 and beat in (0, 2):
                add(kick(), tt, 0.32, music=True)
        if bar >= 1:
            for e in range(1, 8, 2):
                tt = t0 + e * 0.25
                if not silent(tt):
                    add(woodblock(84 if e % 4 == 1 else 79), tt, 0.10, pan=0.5, music=True)
    # колокольчики: озорной мотив на каждой тарелке
    MOTIF = [(0, 0), (0.25, 2), (0.5, 4), (1.0, 2), (1.5, 7)]
    SCALE = [77, 79, 81, 82, 84, 86, 88, 89]
    for k, p0 in enumerate([0.5, 2.5, 4.5, 6.5, 8.5, 15.0, 18.0, 24.0, 26.0, 27.75]):
        for dt, deg in MOTIF:
            tt = p0 + dt
            if silent(tt) or tt >= 29:
                continue
            add(glock(SCALE[(deg + (k % 3)) % len(SCALE)]), tt, 0.13, pan=-0.25, music=True)
    for n in [65, 69, 72, 77]:
        add(glock(n + 12, 2.2), 29.0, 0.12, music=True)
        add(pizz(n - 12, 0.6), 29.0, 0.3, music=True)

# ---------- SFX ----------
# Пролог
for k in range(17):
    add(paper_tap(0.8 + 0.4 * ((k * 7) % 5) / 5), 0.5 + 0.125 * k, 0.35, pan=-0.6 + 1.2 * k / 16)
for k in range(8):  # шаги: контакт стопы на фазах 1 и 5 при 6 фазах в секунду
    add(paper_tap(0.5), k * 4 / 6, 0.10, pan=-0.5)
add(whoosh(0.8, 800, 4000), 3.0, 0.12, pan=0.3)
add(whoosh(1.6, 200, 2500), 2.8, 0.30)
add(paper_tap(0.6), 4.5, 0.9)
add(kick(), 4.5, 0.35)
add(whoosh(0.4, 1500, 6000), 4.45, 0.15)
for t, f0, pan in [(5.0, 520, -0.3), (5.25, 600, -0.3), (5.5, 560, -0.3), (5.75, 680, -0.3), (6.25, 420, 0.3), (6.5, 470, 0.3), (7.0, 360, 0.3), (7.25, 400, 0.3)]:
    add(plop(f0), t, 0.45, pan)
    add(paper_tap(), t, 0.25, pan)
for t, pan in [(5.15, -0.6), (6.4, 0.6), (7.15, 0.6)]:
    add(plop(900), t, 0.2, pan)
add(whoosh(0.5, 300, 1500), 7.5, 0.15)
add(chime(84), 8.1, 0.18)

# Утро: кухня
add(paper_slide(0.55), 9.98, 0.35, pan=0.4)
add(plop(950), 10.55, 0.2, pan=-0.7)
add(paper_tap(0.7), 10.9, 0.3)
for k in range(7):  # шаги девочки: 8 фаз в секунду, контакт каждые 0.5 с, но бумажный «топ» каждые 0.25 с тише
    add(paper_tap(0.6), 10.25 + k * 0.25, 0.08 if k % 2 else 0.12, pan=0.6)
add(chime(88), 11.25, 0.12, pan=-0.2)
# Утро: тарелка, вопрос, пауза, ответ
add(paper_tap(0.6), 12.75, 0.7)
add(plop(900), 13.05, 0.2, pan=0.5)
for k in range(5):  # тарелка качается: деревянное «тик-так»
    add(woodblock(72 if k % 2 else 76), 13.25 + k * 0.5, 0.18, pan=(-0.3 if k % 2 else 0.3))
for k in range(14):
    add(paper_tap(0.9 + 0.3 * ((k * 5) % 4) / 4), 13.44 + k * 0.07, 0.28, pan=-0.5 + k / 14)
add(whoosh(0.5, 1200, 5000), 14.85, 0.14)
for t, f0, pan in [(15.0, 380, 0.3), (15.5, 560, -0.3), (15.75, 640, -0.3)]:
    add(plop(f0), t, 0.5, pan)
    add(paper_tap(), t, 0.25, pan)
for t, pan in [(15.1, 0.5), (15.6, -0.5)]:
    add(plop(900), t, 0.18, pan)
for n in [84, 88, 91]:
    add(chime(n), 16.0, 0.08)
add(whoosh(0.4, 300, 1500), 16.2, 0.12, pan=-0.5)
add(chime(91), 16.4, 0.1)
# Утро: убегают
add(paper_tap(0.6), 17.5, 0.5)
add(chime(86), 17.75, 0.1, pan=0.3)
for k in range(7):
    add(paper_tap(0.5), 17.75 + k * 0.25, 0.12, pan=-0.2 + k * 0.12)
# Школа: столовая
add(paper_slide(0.55), 19.98, 0.35, pan=0.4)
add(plop(950), 20.55, 0.2, pan=-0.7)
for k in range(5):
    add(paper_tap(0.55), 20.1 + k / 3, 0.12, pan=-0.6 + k * 0.15)
add(chime(88), 21.5, 0.12, pan=-0.2)
# Школа: поднос и ланч-бокс
add(paper_tap(0.6), 23.5, 0.7)
for i, t in enumerate([24.0, 24.25, 24.5]):
    add(chime(84 + [0, 4, 7][i]), t, 0.09, pan=-0.4)
    add(plop(900), t, 0.15, pan=-0.4)
for t, f0 in [(25.0, 420), (25.25, 380), (25.5, 560), (25.75, 620)]:
    add(plop(f0), t, 0.45, 0.4)
    add(paper_tap(), t, 0.22, 0.4)
add(plop(260), 26.0, 0.55)
add(plop(900), 26.1, 0.15, 0.2)
# Школа: на площадку и итог
add(paper_tap(0.6), 27.0, 0.5)
for k in range(7):
    add(paper_tap(0.5), 27.1 + k * 0.25, 0.10, pan=-0.3 + k * 0.15)
for k in range(11):
    add(paper_tap(0.8 + 0.3 * (k % 3) / 3), 27.74 + k * 0.05, 0.22, pan=-0.5 + k / 11)
for k in range(15):
    add(paper_tap(0.8 + 0.3 * (k % 3) / 3), 28.34 + k * 0.045, 0.2, pan=-0.5 + k / 15)

# ---------- сведение ----------
mus = np.stack([MUS_L, MUS_R], 1)
sfx = np.stack([L, R], 1)
mus /= max(np.abs(mus).max(), 1e-9)
sfx /= max(np.abs(sfx).max(), 1e-9)
mix = mus * 0.62 + sfx * 0.55
fade = int(0.5 * SR)
mix[-fade:] *= (np.linspace(1, 0, fade) ** 1.5)[:, None]
mix[: int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))[:, None]
mix = np.tanh(mix * 1.1) / np.tanh(1.1)  # мягкий лимитер
mix = mix / np.abs(mix).max() * 0.89
pcm = (mix * 32767).astype("<i2")
with wave.open(OUT, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(VARIANT, OUT)
