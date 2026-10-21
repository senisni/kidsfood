# Сайт «Три друга на тарелке» — правила

Открытый сайт проекта: лендинг, мультфильмы, игры, семейное меню. Общие правила проекта — `../AGENTS.md`, стиль — `../STYLE.md`.

## Стек

- Astro (статическая сборка), TypeScript strict.
- Tailwind CSS 4 через `@tailwindcss/vite` — основной способ стилизации. Токены (цвета, шрифты) — в `@theme` в `src/styles/global.css`.
- `tailwind-merge` для слияния классов в компонентах.
- Новых зависимостей не добавлять ради того, что пишется десятком строк.

## Публикация

https://kidsfood.insines.ru. Push в `main` собирает и выкладывает сайт сам (`../.github/workflows/deploy.yml`), подробно — в `../README.md`. Перед push: `npm run build` и `npx astro check` без ошибок.

Видео для сайта — веб-версии в `../video/out/web/` (1280 px, 30 fps, CRF 26, `+faststart`) с постером `.jpg`:

```bash
ffmpeg -i ../video/out/film-v5.mp4 -vf "scale=1280:-2,fps=30" -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart ../video/out/web/three-friends.mp4
```

## Структура

```text
src/
  pages/              index.astro, menu/, multfilmy/, igry, roditelyam (памятка), o-proekte
  layouts/            BaseLayout.astro
  page-components/
    HomePage/         секции главной: Hero, Plate, Cinema, Games, Kitchen, Parents
    ParentsPage/      памятка «Как кормить ребёнка»: темы в data/guide.ts
  components/         общие компоненты (PaperCard, …)
  data/               общие данные
  styles/global.css   Tailwind + @theme
public/               генерируется скриптом sync — руками не править
scripts/sync-assets.mjs
```

- Страница импортирует секции напрямую, без компонентов-обёрток.
- Данные и ассеты конкретной секции — рядом с ней (`data/`, `assets/`), в `src/data/` — только общее.
- JS только конкретной секции — в `<script>` внутри её `.astro`.
- Повторяющиеся элементы и поведение выносить в общие компоненты; композицию оставлять в секциях. Для разных размеров и подачи добавлять небольшое число осмысленных вариантов, не копии карточек и не универсальный компонент с десятками переключателей.
- Единый источник блюд и адресов — `src/data/dishes.ts`; список видео — `src/data/videos.ts`, игр — `src/data/games.ts`. Главная, каталоги, отдельные страницы и разметка используют эти данные.
- После сборки запускать `npm run check:build`: ссылки, якоря, ресурсы, метаданные, JSON-LD и карта сайта должны проходить проверку.
- Публичный контент описывает проект и занятия, без упоминаний инструментов производства. Не добавлять выдуманных авторов, квалификаций, отзывов, рейтингов или обещаний поисковых позиций.
- Для новых индексируемых страниц нужны уникальные title/description, один h1, canonical, внутренние ссылки и включение в sitemap. JSON-LD должен соответствовать видимому содержимому. Страница 404 — noindex.

## Публичные ассеты

`public/` собирается из исходников проекта командой `npm run sync` (вызывается перед `dev` и `build`):

- игры — из `../interactive/` в `public/games/`;
- спрайты — из `../video/sprites/` в `public/video/sprites/` (PNG пережимаются);
- шрифты — из `../shared/fonts/`;
- видео — из `../video/out/web/` (веб-версии 720p и постеры);
- карточки меню — из `../docs/menu/img/` (в WebP);
- иллюстрации сайта — из `../assets/site-kit/paper-adventure-v1/backgrounds` и `cutouts` в `public/kit/` (по два размера WebP, размеры — в `src/data/kit.json`); вывод — `KitImage` и `Scene`;
- `llms.txt` — карта сайта для ИИ-поиска, из тех же данных видео и игр.

Чего не хватает из иллюстраций и куда класть — `../docs/SITE-ASSETS-NEEDED.md`.

Исходники правятся в своих папках, затем `npm run sync`.

## Правила кода (из общего гайда)

- Шрифты: заголовки — Nunito 900 (`font-display font-black`), текст — Nunito, реплики героев — Balsamiq (`font-hand`).
- Компоненты `.astro`; принимают `class`, прокидывают `...rest`, классы сливают через `twMerge`:

```astro
---
import { twMerge } from 'tailwind-merge'

interface Props {
  class?: string
  [key: string]: unknown
}

const { class: className, ...rest } = Astro.props
---

<div class:list={[twMerge('default-classes', className)]} {...rest}>
  <slot />
</div>
```

- Описывать `interface Props`, не использовать `any`, функции — стрелочные через `const`.
- Без inline-стилей, CSS-модулей и `<style>` без реальной необходимости. Вёрстка в rem, адаптивность — стандартными брейкпоинтами Tailwind.
- Root резиновый (`html` в `global.css`): до 640 px — 1rem = 16 px на 375 px, пропорционально; 640–1439 px — линейно 12→16 px; от 1440 px — 16 px. Поэтому размеры, отступы и шрифты — только в rem (`text-[1.1rem]`, `p-[1.2rem]`), не в px. Две вёрстки: базовая (мобильная) и `sm:`; `lg:` — для раскладки шире 1024 px.
- Шапка внутренней страницы — `PageHero` (фон из site-kit, крошки, h1, плашка под текстом). Колонка контента — утилита `shell`, декор секции — в слое `stage` (на очень широких экранах держится у контента). Широкие фоны — компонент `Scene` с цветом `fill`: картинка не шире 150rem, края уходят в цвет.
- Сначала нативная платформа: `<details>`, `<dialog>`, CSS scroll-snap, `loading="lazy"`, а не JS.
- Имена: `PascalCase` — компоненты и типы, `camelCase` — функции и переменные, `kebab-case` — файлы утилит. Не использовать имена `e`, `ev`, `el`, `i`, `val` — писать `event`, `element`, `index`, `value`.
- z-index: внутри секции — `z-0…z-50`; слои поверх страницы — токены `z-sticky`, `z-overlay`, `z-modal` из `@theme`.
- Не срезать: доступность (alt, фокус, семантика), SEO-мету.
- Осознанные упрощения помечать комментарием `// shortcut:` с потолком и условием апгрейда.

## Типографика

- В русском тексте — неразрывный пробел (символ U+00A0, не `&nbsp;`) после коротких предлогов и союзов: в, во, к, с, со, о, об, у, а, и, по, на, не, за, из, от, до, под, над, но, да, же, бы, ли, то, для, без, при, про.
- Числовые диапазоны — короткое тире: `8–12`.
