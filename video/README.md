# Ролики: сборка

- `film.html` — основной фильм «Три друга на тарелке» (≈68 с).
- `ep-fiber.html`, `ep-dinner.html` — короткие эпизоды на общем движке `lib/paper.js`.
- Таймкоды каждого ролика — в объекте `T` / `TT` в начале скрипта: под новую музыку сдвигаются там.
- Открыть с превью и звуком: локальный сервер из корня проекта и клик по кадру.

```bash
python3 -m http.server 8765
```

Затем `http://localhost:8765/video/film.html`.

## Пайплайн (из папки `video/`)

Нужны Node, FFmpeg и Python с numpy, scipy, pillow (в системном `python3` их нет — нужен venv: `python3 -m venv venv && venv/bin/pip install numpy scipy pillow`).

1. Нарезать спрайты из листов (`assets/…`), циклы ходьбы и фоны:

```bash
python3 -I tools/cut_sprites.py ..
```

```bash
python3 -I tools/cut_walk.py ..
```

```bash
python3 -I tools/garden_nosun.py ..
```

```bash
python3 -I tools/prep_scenes.py ..
```

2. Отрендерить кадры (ролик выбирается переменной `FILM`, по умолчанию `film.html`):

```bash
FILM=film.html node tools/render.mjs video
```

3. Собрать звук. События звуков бумаги ролик отдаёт сам (`build/<имя>-sfx.json`). Если в `music/` лежит `<имя>.mp3` или `.wav`, он заменяет временную синтезированную музыку:

```bash
python3 -I tools/audio_film.py build/film-sfx.json build/film-audio.wav
```

4. Свести:

```bash
ffmpeg -y -i build/film-video.mp4 -i build/film-audio.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -movflags +faststart out/film-v2.mp4
```

Отдельные кадры для проверки:

```bash
FILM=film.html node tools/render.mjs stills 1,7.2,15
```

## Заметки

- Выход: 1920×1080, 60 fps, H.264 yuv420p, AAC.
- Motion blur — 4 субкадра; на въездах «бумажной карточки» выключен, чтобы не было полос.
- Листы `new-2026-10/` режутся по сетке (`GRID` в `cut_sprites.py`): меню `menuB/L/D`, облачка `bub`, тарелка `plate3`, солнце/луна `sunmoon`, еда `pfood`, позы `toast`, головы `heads`, перекус `snack`, ланч-бокс `lbox`.
- Шаг героев — 8 фаз из `assets/…/style-revision-2026-10-19/*-walk-8.png`, нарезка `tools/cut_walk.py`.
- Рендер использует Chromium из кэша Playwright (`~/Library/Caches/ms-playwright/chromium-1243`).
- `archive/` — версия на 30 с со старой подачей «Цвет / Энергия / Строители»; с новыми спрайтами она не пересобирается один в один.
