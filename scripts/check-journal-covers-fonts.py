"""Verify the six HTML-derived covers and built-in/uploaded font outputs.

@input Renderer artifact directory
@output Rendered cover contact sheet, six-page cover PDF and visible Chinese font checks
@updated 2026-10-24: Verifies real PDF ink, live text and orientation rather than relying on font embedding alone.
"""
import sys
from pathlib import Path
import fitz
from PIL import Image, ImageDraw, ImageFont

root = Path(sys.argv[1])
output = root / 'cover-previews'
output.mkdir(exist_ok=True)
font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 18)
sheet = Image.new('RGB', (1480, 1220), '#ffffff')
draw = ImageDraw.Draw(sheet)
book = fitz.open()
for row, paper in enumerate(['a4', 'a5']):
    for col, style in enumerate(['minimal', 'classic', 'abstract']):
        doc = fitz.open(root / f'cover-{style}-{paper}.pdf')
        page = doc[0]
        assert (page.rect.width > page.rect.height) == (paper == 'a4')
        text = page.get_text()
        assert 'Life Journal' in text and '2026.08.03' in text
        assert all(word in text for word in ['天数', '记录时长', '记录数'])
        pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
        png = output / f'{style}-{paper}.png'
        pix.save(png)
        image = Image.open(png)
        image.thumbnail((460, 565))
        sheet.paste(image, (col * 490 + (480 - image.width) // 2, row * 610 + 35))
        draw.text((col * 490 + 15, row * 610 + 8), f'{style.title()} / {paper.upper()}', font=font, fill='#252525')
        book.insert_pdf(doc, from_page=0, to_page=0)
book.save(output / 'three-cover-styles.pdf', garbage=4, deflate=True)
sheet.save(output / 'cover-styles.jpg', quality=94)
for source in sorted(root.glob('font-*.pdf')):
    doc = fitz.open(source)
    text = ''.join(page.get_text() for page in doc)
    assert '字体排版测试' in text and '把时间留给生活' in text, f'Unsearchable Chinese: {source.name}'
    chinese = 0
    for page in doc:
        for block in page.get_text('dict')['blocks']:
            for line in block.get('lines', []):
                for span in line['spans']:
                    if '春山' not in span['text'] and '字体排版测试' not in span['text']:
                        continue
                    clip = fitz.Rect(span['bbox']) & page.rect
                    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), clip=clip, alpha=False)
                    assert sum(value < 150 for value in pix.samples) > 100, f'Invisible glyphs: {source.name}'
                    chinese += 1
    assert chinese >= 2, f'Missing Chinese font sample: {source.name}'
    doc[-1].get_pixmap(matrix=fitz.Matrix(1.5, 1.5)).save(output / f'{source.stem}.png')
    print(source.name, doc[-1].get_fonts())
print(output / 'cover-styles.jpg')
