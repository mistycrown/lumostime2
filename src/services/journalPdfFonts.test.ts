/**
 * @file journalPdfFonts.test.ts
 * @input Real compressed Chinese fonts and mixed print text
 * @output Regressions for visible decoded glyph outlines and finite mixed-script shaping
 * @updated 2026-10-24: Exercises the WOFF2 compatibility adapter against all four compressed built-ins.
 */
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { PDFDocument, PDFRawStream, decodePDFRawStream } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { embedJournalFont, journalFontkit } from './journalPdfFonts';

describe('compressed journal fonts', () => {
  it.each(['LXGWNeoZhiSong.woff2', 'dingliesongtypeface.woff2', 'ZhuqueFangsong-Regular.woff2', 'WenQuanYi Bitmap Song 13px.woff2'])('embeds real Chinese outlines from %s', async (file) => {
    const pdf = await PDFDocument.create();
    pdf.registerFontkit(journalFontkit);
    const source = await readFile(`public/fonts/${file}`);
    const font = await embedJournalFont(pdf, source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength));
    pdf.addPage().drawText('2026-08-03 Life Journal 春山与秋水', { x: 50, y: 500, font, size: 12 });
    const bytes = await pdf.save();
    expect(bytes.length).toBeLessThan(100000);
    const decoded = await PDFDocument.load(bytes);
    const fontStreams = decoded.context.enumerateIndirectObjects().filter(([, object]) => object instanceof PDFRawStream).map(([, object]) => decodePDFRawStream(object as PDFRawStream).decode()).filter((stream) => (stream[0] === 0 && stream[1] === 1 && stream[2] === 0 && stream[3] === 0) || String.fromCharCode(...stream.slice(0, 4)) === 'true');
    expect(fontStreams).toHaveLength(1);
    const embedded = fontkit.create(fontStreams[0]);
    // The subset has no standalone cmap, so inspect its remapped glyph IDs directly.
    expect(Array.from({ length: embedded.numGlyphs }, (_, id) => embedded.getGlyph(id).path.commands.length).filter(Boolean).length).toBeGreaterThan(10);
    const original = fontkit.create(source);
    const text = '2026Life春山与秋水';
    const glyphIds = font.encodeText(text).asString().match(/.{4}/g)!.map((hex) => parseInt(hex, 16));
    Array.from(text).forEach((char, index) => {
      const before = original.glyphForCodePoint(char.codePointAt(0)!).path.bbox;
      const after = embedded.getGlyph(glyphIds[index]).path.bbox;
      for (const edge of ['minX', 'minY', 'maxX', 'maxY'] as const) expect(Math.abs(before[edge] - after[edge])).toBeLessThanOrEqual(1);
    });
  });
});
