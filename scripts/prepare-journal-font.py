"""
@file prepare-journal-font.py
@input Existing local WenKai WOFF2 and Noto Sans SC WOFF fonts
@output Handwriting and printed TTF assets for reliable PDF embedding (fontTools[brotli])
@pos Asset preparation
@updated 2026-10-23: Prepares separate handwriting and printed fonts, preserving original glyphs and licenses.
"""
from pathlib import Path
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parent.parent
sources = [
    (root / 'public/fonts/LXGWWenKaiLite-Regular.woff2', 'LXGWWenKaiLite-Journal.ttf'),
    (root / 'public/fonts/NotoSansSC-500.woff', 'NotoSansSC-Journal.ttf'),
]
for source, name in sources:
    target = root / 'public/fonts' / name
    if target.exists():
        print(f'Already prepared: {target.name}')
        continue
    font = TTFont(source)
    font.flavor = None
    font.save(target)
    print(f'{target}: {target.stat().st_size} bytes')
