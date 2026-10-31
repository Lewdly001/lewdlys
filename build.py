#!/usr/bin/env python3
"""Собирает works.json из папки works/.

works/
  emoji/                 группа
    T2X2/                подгруппа: на сайте покажется как есть, T2X2
      heart.tgs
    YAMAKASI/
      star.json
    solo.tgs             можно и без подгруппы, прямо в группе
  lottie/
  vector/
    TRUDI/
      logo.svg

Группа = папка в works/, подгруппа = папка внутри группы. Глубже не читается.
Папка, которой нет в NAMES, показывается под своим именем как есть (T2X2 -> T2X2).
В NAMES (ключ в нижнем регистре) задавай только красивые названия вместо имени папки.
Цифры в начале ("1_t2x2") задают порядок и не показываются.
Имя файла = название работы. Файлы идут по порядку имён.

Запуск:  python build.py
"""
import json
import os
import re

# папка -> название на сайте (правь как хочешь, добавляй свои)
NAMES = {
    "emoji": "Эмодзи и стикеры",
    "emoji-stickers": "Эмодзи и стикеры",
    "lottie": "Lottie",
    "vector": "Вектор",
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


def dirs(path):
    return [d for d in sorted(os.listdir(path), key=natural)
            if not d.startswith(".") and os.path.isdir(os.path.join(path, d))]


def scan(path, rel):
    items = []
    for f in sorted(os.listdir(path), key=natural):
        stem, ext = os.path.splitext(f)
        kind = KINDS.get(ext.lower())
        if f.startswith(".") or not kind or not os.path.isfile(os.path.join(path, f)):
            continue
        items.append({"title": clean(stem) or stem, "file": rel + "/" + f, "kind": kind})
    return items


def main():
    if not os.path.isdir(WORKS):
        os.makedirs(WORKS)
    groups = []
    for g in dirs(WORKS):
        gpath = os.path.join(WORKS, g)
        direct = scan(gpath, "works/" + g)
        subs = []
        for s in dirs(gpath):
            items = scan(os.path.join(gpath, s), "works/%s/%s" % (g, s))
            if items:
                subs.append({"name": label(s), "works": items})
        if direct or subs:
            groups.append({"name": label(g), "works": direct, "subs": subs})

    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump({"groups": groups}, fh, ensure_ascii=False, indent=1)

    total = 0
    print("works.json готов")
    for g in groups:
        n = len(g["works"]) + sum(len(s["works"]) for s in g["subs"])
        total += n
        print("  %s: %d" % (g["name"], n))
        if g["works"]:
            print("      (без подгруппы): %d" % len(g["works"]))
        for s in g["subs"]:
            print("      %s: %d" % (s["name"], len(s["works"])))
    print("Всего работ: %d" % total)


if __name__ == "__main__":
    main()
