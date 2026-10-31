#!/usr/bin/env python3
"""Собирает works.json из папки works/.

works/
  emoji/               категория (первая папка) -> «Эмодзи и стикеры»
    T2X2/              подгруппа (вторая папка) -> «/ T2X2»
      heart.tgs        .tgs .json .webm .mp4 .svg .png .webp .gif .jpg
    YAMAKASI/
    TRUDI/
  vector/              категория -> «Вектор»
    T2X2/
    YAMAKASI/

Категория и подгруппа берутся из того, в какой папке лежит файл: emoji/T2X2/heart.tgs.
Цифры в начале ("1_T2X2") задают порядок и не показываются.
Имя файла = название работы. Файлы идут по порядку имён.
Вложенные папки внутри подгруппы читаются тоже.

Запуск:  python build.py
"""
import json
import os
import re

# красивые названия категорий (ключ = имя папки в нижнем регистре).
# Любая другая папка первого уровня тоже станет категорией со своим именем.
CATEGORY_NAMES = {
    "emoji": "Эмодзи и стикеры",
    "vector": "Вектор",
}
# необязательно: красивое название подгруппы вместо имени папки (ключ в нижнем регистре)
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


def sub_label(folder):
    c = clean(folder)
    return NAMES.get(c.lower(), c or folder)


def cat_label(folder):
    c = clean(folder)
    return CATEGORY_NAMES.get(c.lower(), c or folder)


def dirs(path):
    return [d for d in sorted(os.listdir(path), key=natural)
            if not d.startswith(".") and os.path.isdir(os.path.join(path, d))]


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
    categories = []
    for c in dirs(WORKS):
        cpath = os.path.join(WORKS, c)
        crel = "works/" + c
        groups = []
        loose = scan_loose(cpath, crel)  # файлы прямо в категории, без подгруппы
        if loose:
            groups.append({"name": "", "works": loose})
        for g in dirs(cpath):
            items = scan(os.path.join(cpath, g), crel + "/" + g)
            if items:
                groups.append({"name": sub_label(g), "works": items})
        if groups:
            categories.append({"id": clean(c).lower(), "name": cat_label(c), "groups": groups})

    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump({"categories": categories}, fh, ensure_ascii=False, indent=1)

    print("works.json готов")
    total = 0
    for c in categories:
        print(c["name"])
        for g in c["groups"]:
            total += len(g["works"])
            print("  %s: %d" % (g["name"] or "(без подгруппы)", len(g["works"])))
    print("Всего работ: %d" % total)


def scan_loose(path, rel):
    items = []
    for f in sorted(os.listdir(path), key=natural):
        stem, ext = os.path.splitext(f)
        kind = KINDS.get(ext.lower())
        if f.startswith(".") or not kind or not os.path.isfile(os.path.join(path, f)):
            continue
        items.append({"title": clean(stem) or stem, "file": rel + "/" + f, "kind": kind})
    return items


if __name__ == "__main__":
    main()
