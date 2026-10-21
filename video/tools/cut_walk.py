"""Режет листы ходьбы 4×2 на 8 кадров 480×640 с общей опорой y=600.

Фигуры в листе иногда касаются друг друга (подошва верхнего ряда и голова нижнего),
поэтому компоненты, занявшие оба ряда, разделяются по самой узкой строке у границы рядов.
По горизонтали кадры выравниваются по центру головы и корпуса (верхние 45% фигуры):
так разлёт ног не сдвигает героя туда-сюда.
Запуск: python3 -I tools/cut_walk.py <project_root>
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

root = Path(sys.argv[1])
src = root / "assets/paper-collage/style-revision-2026-10-19"
out = root / "video/sprites"
FW, FH, GROUND = 480, 640, 600

for who in ["boy", "girl"]:
    im = np.array(Image.open(src / f"{who}-walk-8.png").convert("RGBA"))
    H, W = im.shape[:2]
    a = im[:, :, 3]
    lab, n = ndimage.label(a > 128)
    # разделяем двухрядные компоненты по самой узкой строке
    nxt = n
    for k, sl in enumerate(ndimage.find_objects(lab), start=1):
        if sl is None or sl[0].stop - sl[0].start < H * 0.7:
            continue
        sub = lab[sl]
        m = sub == k
        y0 = sl[0].start
        lo, hi = int(H * 0.4) - y0, int(H * 0.6) - y0
        cut = lo + int(np.argmin(m[lo:hi].sum(axis=1)))
        nxt += 1
        lower = m.copy()
        lower[:cut] = False
        sub[lower] = nxt
    big = []
    for k, sl in enumerate(ndimage.find_objects(lab), start=1):
        if sl is None:
            continue
        if (lab[sl] == k).sum() > 20000:
            cy, cx = (sl[0].start + sl[0].stop) / 2, (sl[1].start + sl[1].stop) / 2
            big.append((int(cy > H / 2), int(cx // (W / 4)), k, sl))
    big.sort()
    assert len(big) == 8, (who, len(big))
    bigk = {b[2] for b in big}
    al = np.clip((a.astype(np.float32) - 20) / 220, 0, 1) * 255
    frames = []
    for row, col, k, sl in big:
        mask = lab == k
        # мелкие детали рядом (заколка, шнурки) присоединяем к ближайшей фигуре
        y0, y1 = max(sl[0].start - 20, 0), min(sl[0].stop + 20, H)
        x0, x1 = max(sl[1].start - 20, 0), min(sl[1].stop + 20, W)
        for kk in np.unique(lab[y0:y1, x0:x1]):
            if kk and kk not in bigk:
                mask |= lab == kk
        # мягкий край: немного полупрозрачных пикселей вокруг, но не чужая фигура
        others = np.isin(lab, list(bigk - {k}))
        mask = ndimage.binary_dilation(mask, iterations=2) & ~ndimage.binary_dilation(others, iterations=1)
        ys, xs = np.where(mask & (a > 128))
        top, bot = ys.min(), ys.max()
        cx = xs[ys < top + (bot - top) * 0.45].mean()
        rgba = im.copy()
        aa = al.copy()
        aa[~mask] = 0
        rgba[:, :, 3] = aa.astype(np.uint8)
        t0 = max(top - 4, 0)
        frames.append((rgba[t0:bot + 5], top - t0, bot - top, cx))
    s = 540 / max(f[2] for f in frames)
    for i, (crop, off, hgt, cx) in enumerate(frames):
        h, w = crop.shape[:2]
        sm = Image.fromarray(crop).resize((round(w * s), round(h * s)), Image.LANCZOS)
        frame = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
        frame.alpha_composite(sm, (round(FW / 2 - cx * s), round(GROUND - (off + hgt) * s)))
        frame.save(out / f"walk-{who}-{i + 1}.png")
    print(who, "scale", round(s, 3))
