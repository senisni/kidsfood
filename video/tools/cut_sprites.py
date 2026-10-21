"""Режет листы персонажей и элементов на отдельные PNG с очищенной альфой.

Исходники не меняет. Результат: video/sprites/<sheet>-<n>.png + sprites.json.
Запуск: python3 -I video/tools/cut_sprites.py <project_root>
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

root = Path(sys.argv[1])
src = root / "assets" / "paper-collage"
out = root / "video" / "sprites"
out.mkdir(parents=True, exist_ok=True)

SHEETS = {
    # основные герои и первые листы элементов
    "boy": "boy-summer-poses.png",
    "girl": "girl-summer-pink-poses.png",
    "el10": "elements-10.png",
    "el20": "style-revision-2026-10-19/elements-20-food.png",
    "el30": "elements-30-world.png",
    "el40": "elements-40-routine.png",
    # исправленный стиль, 19.10.2026
    "boyact": "style-revision-2026-10-19/boy-actions-06.png",
    "girlact": "style-revision-2026-10-19/girl-actions-06.png",
    "el50": "style-revision-2026-10-19/elements-50-our-table.png",
    "el60": "style-revision-2026-10-19/elements-60-extra-food.png",
    "mic": "style-revision-2026-10-19/microbe-gardeners-05.png",
    "classboy": "style-revision-2026-10-19/classmate-boy-04.png",
    "classgirl": "style-revision-2026-10-19/classmate-girl-04.png",
    "cook": "style-revision-2026-10-19/canteen-cook-04.png",
    "dad": "style-revision-2026-10-19/home-adult-dad-04.png",
    # новые листы, октябрь 2026 (new-2026-10/): режутся по сетке
    "menuB": "new-2026-10/menu-breakfasts-15.png",
    "menuL": "new-2026-10/menu-lunches-15.png",
    "menuD": "new-2026-10/menu-dinners-15.png",
    "bub": "new-2026-10/speech-bubbles-08.png",
    "plate3": "new-2026-10/plate-three-parts-large.png",
    "sunmoon": "new-2026-10/sun-moon-large.png",
    "pfood": "new-2026-10/plate-food-large-10.png",
    "toast": "new-2026-10/boy-toast-girl-doubt.png",
    "heads": "new-2026-10/heads-expressions-08.png",
    "snack": "new-2026-10/snacks-drinks-10.png",
    "lbox": "new-2026-10/lunchbox-top-large.png",
}

# Листы-сетки (колонки, ряды): предметы стоят плотно и касаются, поэтому делим
# по самым пустым полосам около ровных линий сетки, а не по связным компонентам.
GRID = {"menuB": (5, 3), "menuL": (5, 3), "menuD": (5, 3), "bub": (4, 2), "plate3": (1, 1),
        "sunmoon": (2, 1), "pfood": (5, 2), "toast": (3, 2), "heads": (4, 2), "snack": (5, 2), "lbox": (1, 1)}


def grid_lines(solid, n, axis):
    """n+1 границ ячеек: около ровных долей ищем самую пустую полосу."""
    prof = solid.sum(axis=axis).astype(np.float32)
    L = len(prof)
    prof = np.convolve(prof, np.ones(9) / 9, mode="same")
    lines = [0]
    for k in range(1, n):
        c, w = int(L * k / n), int(L * 0.08)
        lines.append(c - w + int(np.argmin(prof[c - w:c + w])))
    return lines + [L]


def cut_grid(key, im):
    cols, rows = GRID[key]
    a = im[:, :, 3].astype(np.float32)
    solid = a > 128
    lab, n = ndimage.label(ndimage.binary_dilation(solid, iterations=2))
    # сначала ряды, затем колонки внутри каждого ряда: в рядах предметы стоят по-разному
    ys = grid_lines(solid, rows, 1)
    cell = np.zeros(im.shape[:2], np.int64)
    for r in range(rows):
        xs = grid_lines(solid[ys[r]:ys[r + 1]], cols, 0)
        cx = np.searchsorted(xs, np.arange(im.shape[1]), side="right") - 1
        cell[ys[r]:ys[r + 1]] = r * cols + cx[None, :]
    owner = np.full(im.shape[:2], -1, np.int32)
    split = np.zeros(im.shape[:2], bool)
    areas = ndimage.sum(np.ones_like(a), lab, range(1, n + 1))
    for i, sl in enumerate(ndimage.find_objects(lab), start=1):
        if areas[i - 1] < 300:  # шум альфы
            continue
        m = lab[sl] == i
        cs = cell[sl][m]
        cnt = np.bincount(cs, minlength=cols * rows)
        main = int(cnt.argmax())
        # предмет заметно заходит в соседнюю ячейку (касаются) — режем по линии сетки
        if cnt.max() < 0.8 * m.sum():
            # склеенные соседи: сжимаем, пока не распадутся на ядра в разных ячейках,
            # затем каждый пиксель отдаём ячейке ближайшего ядра
            core, sub = m & solid[sl], cs
            for _ in range(40):
                core = ndimage.binary_erosion(core, iterations=2)
                cl, cn = ndimage.label(core)
                if cn < 2:
                    continue
                ca_ = ndimage.sum(core, cl, range(1, cn + 1))
                big = [j + 1 for j in range(cn) if ca_[j] > 0.02 * ca_.max()]
                cells = {int(np.bincount(cell[sl][cl == j]).argmax()) for j in big}
                if cells >= {int(c) for c in np.nonzero(cnt > 0.2 * cnt.max())[0]}:
                    seeds = np.zeros_like(cl)
                    for j in big:
                        seeds[cl == j] = int(np.bincount(cell[sl][cl == j]).argmax()) + 1
                    _, (iy, ix) = ndimage.distance_transform_edt(seeds == 0, return_indices=True)
                    sub = (seeds[iy, ix] - 1)[m]
                    break
            owner[sl][m] = sub
            split[sl][m] = True
        else:
            owner[sl][m] = main
    res = []
    for c in range(cols * rows):
        mask = owner == c
        # обрезки соседа после разреза по линии сетки: мелкие куски разрезанного предмета
        pl, pn = ndimage.label(mask)
        if pn > 1:
            ar = ndimage.sum(mask, pl, range(1, pn + 1))
            for j in range(1, pn + 1):
                if ar[j - 1] < 0.15 * ar.max() and split[pl == j].any():
                    mask[pl == j] = False
        if mask.sum() < 2000:
            continue
        yy, xx = np.nonzero(mask)
        pad = 6
        y0, y1 = max(yy.min() - pad, 0), min(yy.max() + 1 + pad, im.shape[0])
        x0, x1 = max(xx.min() - pad, 0), min(xx.max() + 1 + pad, im.shape[1])
        res.append((y0, y1, x0, x1, ndimage.binary_dilation(mask, iterations=2)[y0:y1, x0:x1]))
    return res


SINGLE_ROW = {"mic"}  # листы в один ряд: высокие фигуры не делим
meta = {}
for key, name in SHEETS.items():
    im = np.array(Image.open(src / name).convert("RGBA"))
    if key in GRID:
        meta[key] = []
        for idx, (y0, y1, x0, x1, mask) in enumerate(cut_grid(key, im)):
            crop = im[y0:y1, x0:x1].copy()
            ca = np.clip((crop[:, :, 3].astype(np.float32) - 20) / (240 - 20), 0, 1) * 255
            ca[~mask] = 0
            crop[:, :, 3] = ca.astype(np.uint8)
            fn = f"{key}-{idx + 1}.png"
            Image.fromarray(crop).save(out / fn)
            meta[key].append({"file": fn, "w": int(x1 - x0), "h": int(y1 - y0), "x": int(x0), "y": int(y0)})
        print(key, len(meta[key]))
        continue
    a = im[:, :, 3].astype(np.float32)
    solid = a > 128
    # Склеиваем пряди волос и мелкие детали одного предмета.
    merged = ndimage.binary_dilation(solid, iterations=4)
    lab, n = ndimage.label(merged)
    # две позы из соседних рядов касаются: делим такой компонент по самой узкой строке
    H0 = im.shape[0]
    for k, sl in enumerate(ndimage.find_objects(lab), start=1):
        if key in SINGLE_ROW or sl is None or sl[0].stop - sl[0].start < H0 * 0.7:
            continue
        sub = lab[sl]
        m = sub == k
        lo, hi = int(H0 * 0.38) - sl[0].start, int(H0 * 0.62) - sl[0].start
        cut = lo + int(np.argmin((m & solid[sl])[lo:hi].sum(axis=1)))
        n += 1
        lower = m.copy()
        lower[:cut] = False
        sub[lower] = n
    boxes = []
    for i, sl in enumerate(ndimage.find_objects(lab), start=1):
        area = (lab[sl] == i).sum()
        if area < 8000:
            continue
        boxes.append((sl, i))
    # Сортировка: ряды сверху вниз, внутри ряда слева направо.
    h = im.shape[0]
    # ряды: группируем по центру по вертикали, разрыв больше 12% высоты — новый ряд
    boxes.sort(key=lambda b: (b[0][0].start + b[0][0].stop) / 2)
    row, last, keyed = 0, None, []
    for b in boxes:
        cy = (b[0][0].start + b[0][0].stop) / 2
        if last is not None and cy - last > h * 0.12:
            row += 1
        last = cy
        keyed.append((row, b[0][1].start, b))
    boxes = [b for _, _, b in sorted(keyed, key=lambda k: (k[0], k[1]))]
    meta[key] = []
    for idx, (sl, i) in enumerate(boxes):
        ys, xs = sl
        pad = 6
        y0, y1 = max(ys.start - pad, 0), min(ys.stop + pad, im.shape[0])
        x0, x1 = max(xs.start - pad, 0), min(xs.stop + pad, im.shape[1])
        crop = im[y0:y1, x0:x1].copy()
        mask = lab[y0:y1, x0:x1] == i
        ca = crop[:, :, 3].astype(np.float32)
        # Шум генератора (альфа 1–20) и ореол убираем, плотную часть доводим до 255.
        ca = np.clip((ca - 20) / (240 - 20), 0, 1) * 255
        ca[~mask] = 0
        # обрезки соседней позы у верхнего края (подошва над головой) убираем
        cl, cn = ndimage.label(ca > 60)
        if cn > 1:
            areas = ndimage.sum(np.ones_like(ca), cl, range(1, cn + 1))
            for j, slj in enumerate(ndimage.find_objects(cl), start=1):
                if areas[j - 1] < areas.max() * 0.05 and slj[0].stop < ca.shape[0] * 0.08:
                    ca[ndimage.binary_dilation(cl == j, iterations=3)] = 0
        crop[:, :, 3] = ca.astype(np.uint8)
        fn = f"{key}-{idx + 1}.png"
        Image.fromarray(crop).save(out / fn)
        meta[key].append({"file": fn, "w": int(x1 - x0), "h": int(y1 - y0), "x": int(x0), "y": int(y0)})
    print(key, len(boxes))

(out / "sprites.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1))
