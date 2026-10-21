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

**Публикация:** https://kidsfood.insines.ru

- Сервер `coopertino`, Caddy из `senisni/caddy-config` (`sites/public/kidsfood.caddy`).
- **Push в `main` → прод обновляется сам.** GitHub Actions (`.github/workflows/deploy.yml`): `npm ci` → `npm run sync` → `astro check` → `astro build` → `npm run check:build` → rsync в `~/kidsfood/web/staging` → атомарное переключение симлинка `~/kidsfood/web/current` на новый релиз → smoke-проверка `https://kidsfood.insines.ru/`. Хранятся три последних релиза.
- Если сборка не изменилась, релиз не создаётся.
- Выключатель: переменная репозитория `DEPLOY_ENABLED` (сейчас `true`). Ключ деплоя — секрет `SSH_PRIVATE_KEY` (на сервере в `authorized_keys` с комментарием `kidsfood-deploy@github-actions`).
- Откат: на сервере `cd ~/kidsfood/web && ls releases` и `ln -sfn releases/<id> current.tmp && mv -Tf current.tmp current`.
- Что попадает на сайт: всё, что собирает `site/scripts/sync-assets.mjs` из `interactive/`, `video/sprites/`, `video/out/web/`, `docs/menu/`, `shared/fonts/`. Новые ролики для сайта — перекодировать в `video/out/web/` (см. `site/AGENTS.md`).

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
interactive/          игры: index.html (меню), 7 страниц игр, common.css/js
shared/fonts/         шрифты для видео, игр и сайта
site/                 сайт (Astro + Tailwind): src/ — компоненты и данные, public/ генерируется
tools/                скилл анимации (zip)
references/, archive/ присланные примеры и исходные генерации
```

Сборка видео — [video/README.md](video/README.md).

## Дизайн и поиск

- Разбор каждого блока и три варианта композиции — [docs/SITE-DESIGN-REVIEW.md](docs/SITE-DESIGN-REVIEW.md). На сайте реализовано направление «Бумажный альбом».
- `/multfilmy/` и три страницы просмотра, `/igry/`, `/menu/` и 45 страниц рецептов, `/o-proekte/` — статический HTML с отдельными заголовками, описаниями и каноническими адресами.
- Общий слой метаданных — `site/src/layouts/BaseLayout.astro`, JSON-LD — `site/src/lib/seo.ts`. Разметка описывает сайт, навигацию, видео, рецепты, игры и видимые вопросы с ответами. Рейтинги, квалификации авторов и неподтверждённые сведения не добавляются.
- `/sitemap.xml` содержит 60 адресов; `/video-sitemap.xml` — три мультфильма. Обе карты указаны в `robots.txt`. Внешние кабинеты Google Search Console и Яндекс Вебмастер подключаются владельцем отдельно; индексация и позиции не гарантируются разметкой.
- Проверка: в `site/` выполнить `npm run build`, `npx astro check`, `npm run check:build`. Последняя команда проверяет все HTML-страницы, локальные ссылки и якоря, ресурсы, основные метаданные, JSON-LD и полноту карты сайта. Эта проверка включена в CI и деплой.
- Для запуска сайта не нужны локальные исходники: опубликованная статика находится на сервере. Для восстановления и дальнейшей работы нужен Git-репозиторий. Актуальные исходники, изображения, шрифты и финальные MP4 отслеживаются Git. `video/out/old/` — прежние ролики, которые существуют только локально; они не входят в актуальный сайт. `site/public/`, `site/dist/`, `video/build/` и зависимости — производные файлы.
