#!/usr/bin/env python3
"""Собирает works.json из папки works/.

works/
  emoji-stickers/   .tgs .json .webm .mp4
  lottie/
  vector/           .svg

Имя папки = группа. Как группа называется на сайте, задано в NAMES ниже.
Папка, которой нет в NAMES, показывается под своим именем.
Цифры в начале папки ("1_emoji-stickers") задают порядок и не показываются.
Имя файла = название работы. Файлы идут по порядку имён.

Запуск:  python build.py
"""
import json
import os
import re

# папка -> название группы на сайте (правь как хочешь, добавляй свои)
NAMES = {
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


def main():
    groups = []
    if not os.path.isdir(WORKS):
        os.makedirs(WORKS)
    for gdir in sorted(os.listdir(WORKS), key=natural):
        gpath = os.path.join(WORKS, gdir)
        if gdir.startswith(".") or not os.path.isdir(gpath):
            continue
        items = []
        for f in sorted(os.listdir(gpath), key=natural):
            stem, ext = os.path.splitext(f)
            kind = KINDS.get(ext.lower())
            if f.startswith(".") or not kind:
                continue
            items.append({
                "title": clean(stem) or stem,
                "file": "works/%s/%s" % (gdir, f),
                "kind": kind,
            })
        if items:
            key = clean(gdir).lower() or gdir
            groups.append({"name": NAMES.get(key, clean(gdir) or gdir), "works": items})

    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump({"groups": groups}, fh, ensure_ascii=False, indent=1)

    total = sum(len(g["works"]) for g in groups)
    print("Групп: %d, работ: %d -> works.json" % (len(groups), total))
    for g in groups:
        print("  %s: %d" % (g["name"], len(g["works"])))


if __name__ == "__main__":
    main()
