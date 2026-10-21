"""Подготовка фонов для глав 10–30 с. Исходники не меняются.

- kitchen-table-fg.png — передний край кухонного стола отдельным слоем, чтобы герои стояли за столом;
- canteen-warm.jpg — столовая в тёплой палитре (new-2026-10/world-03-canteen-warm.png);
- evening-kitchen.jpg — вечерняя кухня в тёплой палитре (new-2026-10/world-05-kitchen-evening-warm.png);
- table-cloth.jpg — бумажная скатерть сверху для сцен с тарелкой (new-2026-10/table-top-cloth.png).
Запуск: python3 -I tools/prep_scenes.py <project_root>
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

root = Path(sys.argv[1])
src = root / "assets/paper-collage"
out = root / "video/sprites"

kitchen = Image.open(src / "world-02-kitchen.png").convert("RGBA")
mask = Image.new("L", kitchen.size, 0)
ImageDraw.Draw(mask).polygon(
    [(0, 800), (60, 752), (180, 700), (250, 686), (1490, 686), (1560, 702), (1672, 772), (1672, 941), (0, 941)], fill=255
)
mask = mask.filter(ImageFilter.GaussianBlur(1.2))
fg = kitchen.copy()
fg.putalpha(mask)
fg.save(out / "kitchen-table-fg.png")

REV = src / "style-revision-2026-10-19"
# вечерняя кухня: передний край стола отдельным слоем (дети сидят за столом)
NEW = src / "new-2026-10"
# композиция та же, что у style-revision/world-05, поэтому маска стола не меняется
ev = Image.open(NEW / "world-05-kitchen-evening-warm.png").convert("RGBA")
m2 = Image.new("L", ev.size, 0)
ImageDraw.Draw(m2).polygon([(0, 712), (120, 690), (790, 598), (1672, 705), (1672, 941), (0, 941)], fill=255)
fg2 = ev.copy()
fg2.putalpha(m2.filter(ImageFilter.GaussianBlur(1.2)))
fg2.save(out / "evening-table-fg.png")
ev.convert("RGB").save(out / "evening-kitchen.jpg", quality=92)


def soften(img, sat=0.85, warm=(1.03, 1.0, 0.94), haze=0.08):
    """Чуть приглушить яркие плоские фоны к палитре бумажного коллажа."""
    a = np.asarray(img.convert("RGB")).astype(np.float32) / 255
    grey = a.mean(axis=2, keepdims=True)
    a = grey + (a - grey) * sat
    a = a * np.array(warm)
    a = a * (1 - haze) + np.array([0.95, 0.91, 0.81]) * haze
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))


Image.open(NEW / "world-03-canteen-warm.png").convert("RGB").save(out / "canteen-warm.jpg", quality=92)
Image.open(NEW / "table-top-cloth.png").convert("RGB").save(out / "table-cloth.jpg", quality=92)
soften(Image.open(REV / "world-04-evening-path.png"), sat=0.92, haze=0.04).save(out / "evening-path.jpg", quality=92)
Image.open(REV / "scene-05-belly-garden.png").convert("RGB").save(out / "belly-garden.jpg", quality=92)
print("ok")
