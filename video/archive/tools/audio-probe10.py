"""Музыка и звуки бумаги для пробы 0–10 с. Синтез без внешних сэмплов.

События совпадают с таймлайном film.html (120 BPM, склейка на 4.5 с).
Запуск: python3 -I tools/audio.py <out.wav>
"""
import sys
import wave

import numpy as np

SR = 48000
DUR = 10.0
N = int(SR * DUR)
rs = np.random.default_rng(7)
L = np.zeros(N)
R = np.zeros(N)
BEAT = 0.5


def add(sig, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N:
        return
    sig = sig[: N - i] * gain
    L[i : i + len(sig)] += sig * np.sqrt((1 - pan) / 2) * 1.414
    R[i : i + len(sig)] += sig * np.sqrt((1 + pan) / 2) * 1.414


def env(n, a=0.004, d=0.3):
    t = np.arange(n) / SR
    return np.minimum(t / a, 1) * np.exp(-t / d)


def hz(note):
    return 440 * 2 ** ((note - 69) / 12)


def pluck(note, dur=0.9, bright=0.5):
    """Karplus–Strong: укулеле/гитарный щипок."""
    f = hz(note)
    n = int(dur * SR)
    p = int(SR / f)
    buf = rs.uniform(-1, 1, p)
    # мягче атака — меньше «звона»
    buf = np.convolve(buf, np.ones(3) / 3, "same")
    out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = (bright * buf[i % p] + (1 - bright) * buf[(i + 1) % p]) * 0.996
    return out * env(n, 0.002, dur * 0.6)


def marimba(note, dur=0.6):
    f = hz(note)
    t = np.arange(int(dur * SR)) / SR
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t / 0.05)
    return s * env(len(t), 0.003, 0.22)


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


def paper_tap(bright=1.0):
    n = int(0.07 * SR)
    s = bandpass(noise(n), 1500 * bright, 5000 * bright) * env(n, 0.001, 0.015)
    t = np.arange(n) / SR
    s += 0.5 * np.sin(2 * np.pi * 140 * t) * np.exp(-t / 0.02)
    return s


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
    shape = np.sin(np.linspace(0, np.pi, n)) ** 2 * np.linspace(0.3, 1, n)
    return out * shape


def chime(note):
    t = np.arange(int(1.2 * SR)) / SR
    f = hz(note)
    s = np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.2)
    return s * env(len(t), 0.002, 0.45)


# ---------- музыка ----------
# Аккорды по тактам (2 с): C, Am, F, G, C
CHORDS = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62], [60, 64, 67]]
BASS = [48, 45, 41, 43, 48]
for bar, (ch, b) in enumerate(zip(CHORDS, BASS)):
    t0 = bar * 2.0
    # арпеджио укулеле восьмыми
    pattern = [0, 1, 2, 1, 0, 2, 1, 2]
    for i, k in enumerate(pattern):
        if bar == 0 and i < 2:
            continue
        add(pluck(ch[k] + 12, 0.7, 0.55), t0 + i * 0.25, 0.26 if bar == 0 else 0.16, pan=-0.3 + 0.2 * (i % 2))
    # бас маримбы на 1 и 3
    if bar >= 1:
        add(marimba(b), t0, 0.5)
        add(marimba(b + 7), t0 + 1.0, 0.35)
    # ударные: с 2-го такта
    if bar >= 1:
        for beat in range(4):
            if beat in (0, 2):
                add(kick(), t0 + beat * BEAT, 0.42)
        for e in range(8):
            add(shaker(), t0 + e * 0.25, 0.05 + 0.03 * (e % 2), pan=0.4)

# мелодия маримбы (пентатоника), с 3-го такта — когда начинается тарелка
MEL = [(4.5, 72), (5.0, 76), (5.25, 79), (5.5, 76), (5.75, 74), (6.25, 72), (6.5, 74), (7.0, 79), (7.25, 77), (7.5, 76), (8.0, 72), (8.5, 76), (9.0, 79)]
for t, n in MEL:
    add(marimba(n, 0.5), t, 0.28, pan=0.2)
# финальный аккорд
for n in CHORDS[4]:
    add(pluck(n + 12, 1.6, 0.5), 9.0, 0.16)

# ---------- SFX ----------
# буквы заголовка ложатся на шестнадцатые
for k in range(17):
    add(paper_tap(0.8 + 0.4 * ((k * 7) % 5) / 5), 0.5 + 0.125 * k, 0.35, pan=-0.6 + 1.2 * k / 16)
# шаги героев (ступенчато, мягко)
for k in range(10):
    add(paper_tap(0.5), (k + 1) / 3.6, 0.12, pan=-0.5)
# буквы сдувает, солнце летит к зрителю
add(whoosh(0.8, 800, 4000), 3.0, 0.12, pan=0.3)
add(whoosh(1.6, 200, 2500), 2.8, 0.30)
# склейка солнце → тарелка: бумажный хлопок
add(paper_tap(0.6) * 1.0, 4.5, 0.9)
add(kick(), 4.5, 0.35)
add(whoosh(0.4, 1500, 6000), 4.45, 0.15)
# еда ложится на тарелку
for t, f0, pan in [(5.0, 520, -0.3), (5.25, 600, -0.3), (5.5, 560, -0.3), (5.75, 680, -0.3), (6.25, 420, 0.3), (6.5, 470, 0.3), (7.0, 360, 0.3), (7.25, 400, 0.3)]:
    add(plop(f0), t, 0.45, pan)
    add(paper_tap(), t, 0.25, pan)
# ярлыки
for t, pan in [(5.15, -0.6), (6.4, 0.6), (7.15, 0.6)]:
    add(plop(900), t, 0.2, pan)
# герои заглядывают, реплика
add(whoosh(0.5, 300, 1500), 7.5, 0.15)
add(chime(84), 8.1, 0.18)

# ---------- сведение ----------
mix = np.stack([L, R], 1)
fade = int(0.25 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
mix[: int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))[:, None]
peak = np.abs(mix).max()
mix = mix / peak * 0.89  # ≈ −1 dBFS
print("peak before norm", round(peak, 3))
pcm = (mix * 32767).astype("<i2")
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
