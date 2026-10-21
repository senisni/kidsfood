"""Звук для film.html (v2): временная музыка 100 BPM + звуки бумаги из build/sfx.json.

События SFX фильм отдаёт сам (window.SFX → tools/render.mjs → build/sfx.json),
поэтому при сдвиге сцен звук сдвигается вместе с ними.
Музыка — заглушка до трека пользователя (см. docs/MUSIC-PROMPTS.md). Если положить трек
в video/music/<имя ролика>.wav (или .mp3), например film.mp3,, он подмешается вместо синтеза.
Запуск: python3 -I tools/audio_film.py build/film-sfx.json build/film-audio.wav
"""
import json
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

SR = 48000
data = json.loads(Path(sys.argv[1]).read_text())
OUT = sys.argv[2]
T = data["T"]
DUR = data["duration"]
N = int(SR * DUR)
rs = np.random.default_rng(11)
MUS = np.zeros((N, 2))
FX = np.zeros((N, 2))
BEAT = 0.6


def put(buf, sig, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i < 0 or i >= N:
        return
    sig = sig[: N - i] * gain
    buf[i : i + len(sig), 0] += sig * np.sqrt((1 - pan) / 2) * 1.414
    buf[i : i + len(sig), 1] += sig * np.sqrt((1 + pan) / 2) * 1.414


def env(n, a=0.004, d=0.3):
    t = np.arange(n) / SR
    return np.minimum(t / a, 1) * np.exp(-t / d)


def hz(n):
    return 440 * 2 ** ((n - 69) / 12)


def tone(f, dur, parts, a=0.003, d=0.3):
    t = np.arange(int(dur * SR)) / SR
    s = sum(amp * np.sin(2 * np.pi * f * mult * t) * np.exp(-t / dec) for mult, amp, dec in parts)
    return s * env(len(t), a, d)


def pizz(n, dur=0.35):
    return tone(hz(n), dur, [(1, 1, 9), (2, .5, .04), (3, .2, .02)], .004, .09)


def glock(n, dur=1.0):
    return tone(hz(n), dur, [(1, 1, 9), (2.76, .5, .12), (5.4, .2, .05)], .001, .35)


def marimba(n, dur=0.6):
    return tone(hz(n), dur, [(1, 1, 9), (4, .25, .05)], .003, .22)


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


def clap():
    n = int(0.12 * SR)
    e = np.zeros(n)
    for k in range(3):
        i = int(k * 0.011 * SR)
        e[i:] += env(n - i, 0.001, 0.012 if k < 2 else 0.04)
    return bandpass(noise(n), 900, 4000) * e


def shaker():
    n = int(0.06 * SR)
    return bandpass(noise(n), 5000, 12000) * env(n, 0.005, 0.02)


def woodblock(n=84):
    return tone(hz(n), 0.08, [(1, 1, 9), (2.3, .4, 9)], .0005, .015)


def paper_tap(b=1.0):
    n = int(0.07 * SR)
    t = np.arange(n) / SR
    return bandpass(noise(n), 1500 * b, 5000 * b) * env(n, .001, .015) + .5 * np.sin(2 * np.pi * 140 * t) * np.exp(-t / .02)


def plop(f0):
    t = np.arange(int(0.16 * SR)) / SR
    f = f0 * (0.55 + 0.45 * np.exp(-t / 0.03))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), .002, .05)


def whoosh(dur, lo=300, hi=3000):
    n = int(dur * SR)
    x = noise(n)
    out = np.zeros(n)
    for i in range(0, n, 2048):
        c = lo + (hi - lo) * (i / n) ** 1.5
        out[i : i + 2048] = bandpass(x[i : i + 2048], c * .6, c * 1.6)[: min(2048, n - i)]
    return out * np.sin(np.linspace(0, np.pi, n)) ** 2 * np.linspace(.3, 1, n)


def slide(dur=0.5):
    n = int(dur * SR)
    return bandpass(noise(n), 600, 5000) * np.linspace(0, 1, n) ** .6 * np.exp(-np.linspace(0, 3, n)) * 1.6


def pop():
    g = glock(96, .4) * .25
    g[: int(.16 * SR)] += plop(900) * .6
    return g


def crunch():
    out = np.zeros(int(.35 * SR))
    for k in range(6):
        b = bandpass(noise(int(.05 * SR)), 1500, 7000) * env(int(.05 * SR), .001, .01)
        i = int(k * .05 * SR)
        out[i : i + len(b)] += b * (1 - k / 7)
    return out


# ---------- SFX из фильма ----------
for t, kind, p, pan in data["sfx"]:
    if kind == "step":
        put(FX, paper_tap(p), t, .12, pan)
    elif kind == "tap":
        put(FX, paper_tap(.8 + .3 * rs.random()), t, .26 * p, pan)
    elif kind == "plop":
        put(FX, plop(p), t, .45, pan)
        put(FX, paper_tap(), t, .22, pan)
    elif kind == "pop":
        put(FX, pop(), t, .32, pan)
    elif kind == "whoosh":
        put(FX, whoosh(.5 + p * .5, 300, 3500), t, .2, pan)
    elif kind == "snap":
        put(FX, paper_tap(.6), t, .7, pan)
        put(FX, kick(), t, .2)
    elif kind == "slide":
        put(FX, slide(.55), t, .4, pan)
    elif kind == "wood":
        put(FX, woodblock(72 if p else 76), t, .22, pan)
    elif kind == "chime":
        put(FX, glock(84 + p, 1.2), t, .16, pan)
    elif kind == "chord":
        for n in (84, 88, 91):
            put(FX, glock(n, 1.4), t, .1)
    elif kind == "crunch":
        put(FX, crunch(), t, .4, pan)

# ---------- музыка ----------
track = None
for ext in ("wav", "mp3", "m4a"):
    name = Path(sys.argv[1]).name.replace("-sfx.json", "")
    pth = Path(__file__).resolve().parent.parent / "music" / f"{name}.{ext}"
    if pth.exists():
        raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(pth), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True).stdout
        track = np.frombuffer(raw, dtype="<f4").reshape(-1, 2)[:N]
        MUS[: len(track)] = track
        print("music:", pth.name)
        break

if track is None:
    # секции: (начало, конец, плотность) — 0 тишина, 1 тихо, 2 полно
    # секции музыки задаёт ролик (T.sections), иначе — разметка основного фильма
    SECTIONS = [tuple(x) for x in T["sections"]] if "sections" in T else [
        (0, T["silenceA"], 2), (T["silenceA"], T["silenceB"], 0), (T["silenceB"], T["garden"], 2),
        (T["garden"], T["dinner"], 1), (T["dinner"], T["finale"], 1), (T["finale"], DUR, 2)]

    def density(t):
        for a, b, d in SECTIONS:
            if a <= t < b:
                return d
        return 0

    CH = [[65, 69, 72], [62, 65, 69], [58, 62, 65], [60, 64, 67]]
    BASS = [41, 38, 46, 36]
    bar = 0
    t0 = 0.0
    final = DUR - 1.8
    while t0 < final:
        ch, b = CH[bar % 4], BASS[bar % 4]
        for beat in range(4):
            tt = t0 + beat * BEAT
            d = density(tt)
            if d == 0 or tt >= final:
                continue
            if beat % 2 == 0:
                put(MUS, pizz(b + (7 if beat == 2 else 0)), tt, .5 if d == 2 else .3)
            else:
                for n in ch:
                    put(MUS, pizz(n, .25), tt, .12 if d == 2 else .07, .25)
                if d == 2 and bar > 0:
                    put(MUS, clap(), tt, .2, -.15)
            if d == 2 and bar > 0 and beat in (0, 2):
                put(MUS, kick(), tt, .3)
            for e in (0, 1):
                te = tt + e * BEAT / 2
                if d == 2 and bar > 0 and e == 1:
                    put(MUS, woodblock(84 if beat % 2 else 79), te, .08, .5)
                if d == 1:
                    put(MUS, shaker(), te, .03, .4)
        # мотив колокольчиков раз в два такта; в тихих частях — маримба
        if bar % 2 == 0:
            for dt, deg in [(0, 0), (.3, 2), (.6, 4), (1.2, 2), (1.8, 7)]:
                tt = t0 + dt
                d = density(tt)
                if d == 0 or tt >= final:
                    continue
                note = [77, 79, 81, 82, 84, 86, 88, 89][(deg + bar // 2 % 3) % 8]
                put(MUS, glock(note) if d == 2 else marimba(note - 12, .7), tt, .12 if d == 2 else .2, -.25)
        bar += 1
        t0 += 4 * BEAT
    for n in (65, 69, 72, 77):
        put(MUS, glock(n + 12, 2.2), final, .12)
        put(MUS, pizz(n - 12, .6), final, .3)
    print("music: synth placeholder")

# ---------- сведение ----------
def norm(x):
    return x / max(np.abs(x).max(), 1e-9)


mix = norm(MUS) * (.55 if track is not None else .6) + norm(FX) * .55
fade = int(.5 * SR)
mix[-fade:] *= (np.linspace(1, 0, fade) ** 1.5)[:, None]
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix = mix / np.abs(mix).max() * .89
with wave.open(OUT, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print(OUT, round(DUR, 2), "s")
