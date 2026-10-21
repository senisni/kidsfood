# Иллюстрации для сайта — список закрыт

Все 15 обязательных иллюстраций из списка и 3 дополнительных фона готовы. Просмотр: `assets/site-kit/paper-adventure-v1/index.html`; реальные размеры и проверка прозрачности — в `manifest.json`, запросы — в `remaining-prompts.json`. Размеры в таблицах ниже — исходное задание; генератор выдал близкие размеры, исходники сохранены без увеличения. Осенний и зимний фоны: `backgrounds/garden-autumn.png` и `backgrounds/garden-winter.png`.

Генерация завершена; подключение иллюстраций к конкретным секциям и обновление внутренних страниц — отдельная работа. `npm run sync` готовит файлы и каталог, но не заменяет изображения в компонентах автоматически.

Главная собрана из `assets/site-kit/paper-adventure-v1`. Ниже — чего не хватает для остальных страниц и деталей. Каждый файл класть **точно по указанному пути**: `npm run sync` сам переведёт его в WebP и подключит, а имя уже используется в коде или будет подключено одной строкой.

Общий блок стиля — тот же, что `style` в `assets/site-kit/paper-adventure-v1/prompts.json`. Прикладывать референсы: выбранный макет (`reference-selected.png`), листы героев и фон. Вставлять его перед каждым запросом:

> Project «Три друга на тарелке», children's food website, ages 8–12. Match the selected reference: flat matte cut-paper collage, gentle scissor edges, depth from overlap and short soft contact shadows, quiet sparse paper fibers, no noise, embossing or 3D. Boy: brown messy hair, cream T-shirt with a small sun, green shorts. Girl: slightly taller, pale pink bob, daisy clip, light-yellow dress. European picture-book faces, small kind eyes, no anime, no toddlers. Food as simple flat paper cutouts. No text, letters, digits, logos, UI or watermarks. Palette: mint-blue sky, forest and sage greens, ivory, mustard, terracotta, peach wood; navy-teal for evening.

## Важно в первую очередь

| Файл | Где нужен | Запрос |
|---|---|---|
| `cutouts/logo-mark.png` (прозрачный, 1024×1024) | шапка, подвал, иконка вкладки | ONE round logo mark on true transparency: small ivory paper plate seen from above, split into half green vegetables (broccoli, cucumber), quarter mustard grains with toast, quarter terracotta fish and egg; one leaf peeking from the rim. Bold simple shapes readable at 32 px, thick clean rim, centered, 12% margin. No text. |
| `backgrounds/social-cover.png` (1200×630) | превью ссылки в мессенджерах и поиске | Wide card: boy and girl at a small paper table with the three-part plate, sunny paper garden behind. Characters on the RIGHT 50%; LEFT 50% calm mint sky and hills for an HTML title. No text. |
| `backgrounds/poster-film.png`, `poster-fiber.png`, `poster-dinner.png` (1920×1080) | экран кинотеатра, страницы мультфильмов, видео в поиске | Three 16:9 cover frames WITHOUT text, lower third kept calm for an overlaid title: (1) boy holding a lonely toast, girl offering broccoli and an egg, kitchen window; (2) friendly paper garden inside a round tummy window with tiny smiling microbes and a little paper train; (3) evening family table, girl with hand on tummy smiling «I'm full», warm lamp. |

## Внутренние страницы

| Файл | Где нужен | Запрос |
|---|---|---|
| `backgrounds/page-cinema.png` (2400×700) | шапка «Мультфильмы» | Low wide evening strip: navy-teal sky, fairy-light string, foliage at the left and right 15%, calm centre for a title. No screens, no people. |
| `backgrounds/page-kitchen.png` (2400×700) | шапка «Семейное меню» и рецептов | Low wide warm kitchen strip: peach wall, short wooden counter at the bottom, small shelf with jug at the far right. Calm centre and left 60%. No food, no people. |
| `backgrounds/page-reading.png` (2400×700) | шапка памятки «Родителям» и «О проекте» | Cozy reading corner strip: cream wall, low bookshelf and potted plant at the far right, a rug edge at the bottom. Calm left 65%. No people. |
| `cutouts/family-reading.png` (1400×1000, прозрачный) | памятка для родителей | Waist-up adult (neutral parent, soft cardigan) sitting with the boy and girl, all looking at an open picture book with a plate drawing. Friendly, not posed. Transparent around. |

## Герои и мелочи

| Файл | Где нужен | Запрос |
|---|---|---|
| `cutouts/girl-waving.png` (прозрачный) | страница 404, пустые состояния | Exact girl, waist-up, waving with one hand, other hand holding an apple, cheerful. |
| `cutouts/boy-pointing.png` (прозрачный) | рядом с кнопками «Играть», игры | Exact boy, waist-up, pointing to image right with a big smile, holding a small paper map. |
| `cutouts/friend-veg.png`, `friend-grain.png`, `friend-protein.png` (по 512×512, прозрачные) | ярлыки трёх друзей у тарелки и в меню | Three round icon cutouts on sage, mustard and terracotta paper discs: (1) broccoli + apple, (2) toast + a few grains, (3) fish + half egg + bean. Same size, centered, simple. |
| `cutouts/path-dots.png` (2400×600, прозрачный) | карта игр: тропинка между карточками | One long gently winding dotted path of small cream paper ovals across the canvas, with 3–4 tiny flowers along it. Nothing else. |

## Необязательно

- `backgrounds/hero-garden-portrait.png` (1080×1600) — тот же сад, но вертикально, для телефонов: сейчас на узком экране видна только середина широкого фона. Небо сверху на 45 %, тропинка снизу.
- Ещё два пейзажа для чередования внутренних страниц: зимний и осенний сад, тот же материал.

Готовые файлы подключаются так: положить по пути, `cd site && npm run sync`, затем указать имя в компоненте или данных (`KitImage name="…"`, `Scene background="…"`).
