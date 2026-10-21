"""Вариант сада без нарисованного солнца: солнце в ролике — отдельный подвижный слой.

Закрывает солнце куском чистого неба с мягким краем. Исходник не меняет.
Запуск: python3 -I video/tools/garden_nosun.py <project_root>
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

root = Path(sys.argv[1])
im = Image.open(root / "assets/paper-collage/world-01-garden.png").convert("RGB")
box = (2120, 0, 2510, 380)
w, h = box[2] - box[0], box[3] - box[1]
patch = im.crop((1480, 0, 1480 + w, h))
mask = Image.new("L", (w, h), 0)
ImageDraw.Draw(mask).ellipse((22, 0, w - 22, h - 22), fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(14))
im.paste(patch, box[:2], mask)
out = root / "video/sprites/garden-nosun.jpg"
im.save(out, quality=92)
print(out)
