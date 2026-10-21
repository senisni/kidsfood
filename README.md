# Foodkids — «Три друга на тарелке»

Наглядная история о еде для детей 8–12 лет в стиле бумажного коллажа: мультфильм, короткие эпизоды и игры.

**Главная мысль:** позови на тарелку трёх друзей — овощи и фрукты (половина), крупы и хлеб, белок. Подробно — [docs/CONCEPT-V2.md](docs/CONCEPT-V2.md).

## Что готово

| Что | Где | Как открыть |
|---|---|---|
| Мультфильм ≈68 с | `video/out/film-v5.mp4` | любой плеер |
| Эпизод «Сад в животе» ≈27 с | `video/out/ep-fiber-v4.mp4` | любой плеер |
| Эпизод «Ужин: слушай живот» ≈26 с | `video/out/ep-dinner-v3.mp4` |
| Семейное меню: 45 блюд с картинками | `docs/menu/menu.html`, `docs/menu/img/` | браузер |
| 7 игр: тарелка, клетчатка, ланч-бокс, что в блюде, правда или миф, что говорит живот, перекус | `interactive/index.html` | двойной клик |

## Сайт

`site/` — открытый сайт на Astro + Tailwind 4: лендинг, мультфильмы, все игры, семейное меню. Правила — `site/AGENTS.md`.

```bash
cd site && npm install && npm run dev
```

`npm run build` → готовый статический сайт в `site/dist/` (≈30 МБ).

**Публикация:** https://kidsfood.insines.ru — сервер `coopertino`, Caddy из репозитория `senisni/caddy-config`. Push в `main` собирает сайт в GitHub Actions (`.github/workflows/deploy.yml`) и атомарно публикует в `/home/insines/kidsfood/web/current` (симлинк на релиз, хранятся три последних). Деплой включается переменной репозитория `DEPLOY_ENABLED=true`.

## Папки

```
AGENTS.md, STYLE.md   правила проекта и стиль (читать первыми)
docs/                 смыслы, концепция, сценарии, статус работ
  KEY-MESSAGES.md     что доносим и источники
  FACT-CHECK.md       проверка каждого тезиса
  CONCEPT-V2.md       подача «Три друга», сценарий фильма, правки игр
  MUSIC-PROMPTS.md    три промпта для генерации музыки
  GENERATION-NEEDS.md что ещё сгенерировать
  STATUS.md           что сделано и что дальше
  fonts/              образцы шрифтов (выбраны Balsamiq Sans + Nunito)
  archive/            прежние версии документов
assets/paper-collage/ картинки (исходники не перезаписываем)
  style-revision-2026-10-19/  актуальные исправленные листы и фоны
video/                мультфильм и эпизоды
  film.html           основной фильм (канвас, кадр = renderAt(t))
  ep-*.html           короткие эпизоды
  lib/                общий движок роликов и шрифты
  tools/              нарезка спрайтов, рендер, звук
  sprites/            нарезанные спрайты (производные, можно пересоздать)
  music/              сюда класть трек: film.mp3, ep-fiber.mp3 …
  out/                готовые MP4 (out/archive — прежние версии)
  build/              промежуточные файлы, можно удалять
interactive/          игры: index.html (меню), 6 страниц игр, common.css/js
shared/fonts/         шрифты для видео, игр и сайта
site/                 сайт (Astro + Tailwind): src/ — компоненты и данные, public/ генерируется
tools/                скилл анимации (zip)
references/, archive/ присланные примеры и исходные генерации
```

Сборка видео — [video/README.md](video/README.md).
