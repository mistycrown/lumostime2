"""
@file prepare-journal-font.py
@input Existing bundled LXGW WenKai Lite WOFF2 font
@output Equivalent TTF for reliable PDF font embedding (requires fontTools[brotli])
@pos Asset preparation
@updated 2026-10-23: Converts web font container to PDF-compatible TrueType without changing glyphs.
"""
from pathlib import Path
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parent.parent
font = TTFont(root / 'public/fonts/LXGWWenKaiLite-Regular.woff2')
font.flavor = None
target = root / 'public/fonts/LXGWWenKaiLite-Journal.ttf'
font.save(target)
print(f'{target}: {target.stat().st_size} bytes')
