#!/usr/bin/env python3
"""Собирает works.json из папки works/.

works/
  T2X2/            группа (проект или заказчик)
    heart.tgs      анимации: .tgs .json .webm .mp4
    smile.webm
    logo.svg       вектор: .svg
  YAMAKASI/
  TRUDI/

Одна папка = одна группа. Внутри группы сайт сам делит работы на «Анимации» и «Вектор»
по типу файла, раскладывать по папкам не нужно. Вложенные папки читаются тоже.
Название группы на сайте = имя папки как есть (T2X2 -> T2X2).
Цифры в начале ("1_T2X2") задают порядок групп и не показываются.
Имя файла = название работы. Файлы идут по порядку имён.

Запуск:  python build.py
"""
import json
import os
import re

# необязательно: красивое название вместо имени папки (ключ в нижнем регистре)
NAMES = {
    # "yamakasi": "Ямакаси",
}

ROOT = os.path.dirname(os.path.abspath(__file__))
WORKS = os.path.join(ROOT, "works")
OUT = os.path.join(ROOT, "works.json")

KINDS = {
    ".json": "lottie", ".tgs": "lottie",
    ".mp4": "video", ".webm": "video",
    ".svg": "img", ".png": "img", ".webp": "img", ".gif": "img", ".jpg": "img", ".jpeg": "img",
}


def natural(s):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", s)]


def clean(name):
    """'01_my-sticker' -> 'my-sticker'"""
    return re.sub(r"^\d+[\s._-]+", "", name).replace("_", " ").strip()


def label(folder):
    c = clean(folder)
    return NAMES.get(c.lower(), c or folder)


def scan(path, rel):
    """Файлы папки, затем файлы вложенных папок."""
    items = []
    names = sorted(os.listdir(path), key=natural)
    for f in names:
        full = os.path.join(path, f)
        stem, ext = os.path.splitext(f)
        kind = KINDS.get(ext.lower())
        if f.startswith(".") or not kind or not os.path.isfile(full):
            continue
        items.append({"title": clean(stem) or stem, "file": rel + "/" + f, "kind": kind})
    for d in names:
        full = os.path.join(path, d)
        if not d.startswith(".") and os.path.isdir(full):
            items += scan(full, rel + "/" + d)
    return items


def main():
    if not os.path.isdir(WORKS):
        os.makedirs(WORKS)
    groups = []
    for g in sorted(os.listdir(WORKS), key=natural):
        gpath = os.path.join(WORKS, g)
        if g.startswith(".") or not os.path.isdir(gpath):
            continue
        items = scan(gpath, "works/" + g)
        if items:
            groups.append({"id": clean(g).lower(), "name": label(g), "works": items})

    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump({"groups": groups}, fh, ensure_ascii=False, indent=1)

    print("works.json готов")
    total = 0
    for g in groups:
        motion = sum(1 for w in g["works"] if w["kind"] in ("lottie", "video"))
        vector = len(g["works"]) - motion
        total += len(g["works"])
        print("  %s: анимации %d, вектор %d" % (g["name"], motion, vector))
    print("Всего работ: %d" % total)


if __name__ == "__main__":
    main()
