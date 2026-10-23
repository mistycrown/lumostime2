/**
 * @file journalPdfFonts.ts
 * @input Built-in font IDs or existing uploaded font records
 * @output Valid embedded PDF fonts without changing the application's active font
 * @updated 2026-10-23: Supports separate layout/content fonts and fontkit conversion of compressed web fonts.
 */
import type { PDFDocument, PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { customFontStorageService } from './customFontStorageService';

interface OutlinePath { commands: { command: string; args: number[] }[] }
interface OutlineSubset {
  font: { getGlyph: (id: number) => { path: OutlinePath; advanceWidth: number; _getMetrics: () => { leftBearing: number } } };
  glyphEncoder: { encodeSimple: (path: unknown, instructions: number[]) => Uint8Array };
  glyf: Uint8Array[];
  loca: { offsets: number[] };
  hmtx: { metrics: { advance: number; bearing: number }[] };
  offset: number;
  _addGlyph: (id: number) => number;
}

// Use uncompressed TrueType point flags and deltas. fontkit's encoder omits a
// trailing repeated-flag count, which can corrupt otherwise searchable glyphs.
const encodeOutline = (path: OutlinePath, makeBuffer: (length: number) => Uint8Array): Uint8Array => {
  const points: { x: number; y: number; on: boolean }[] = [];
  const ends: number[] = [];
  let open = false;
  const close = () => { if (open) ends.push(points.length - 1); open = false; };
  const point = (x: number, y: number, on: boolean) => points.push({ x: Math.round(x), y: Math.round(y), on });
  for (const { command, args } of path.commands) {
    if (command === 'moveTo') { close(); point(args[0], args[1], true); open = true; }
    else if (command === 'lineTo') point(args[0], args[1], true);
    else if (command === 'quadraticCurveTo') { point(args[0], args[1], false); point(args[2], args[3], true); }
    else if (command === 'closePath') close();
    else throw new Error('所选字体含有不支持的轮廓，请选择其他字体');
  }
  close();
  const length = 12 + ends.length * 2 + points.length * 5;
  const bytes = makeBuffer(Math.ceil(length / 4) * 4);
  bytes.fill(0);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  view.setInt16(0, ends.length);
  const bounds = points.length ? [Math.min(...points.map((p) => p.x)), Math.min(...points.map((p) => p.y)), Math.max(...points.map((p) => p.x)), Math.max(...points.map((p) => p.y))] : [0, 0, 0, 0];
  bounds.forEach((value, index) => view.setInt16(2 + index * 2, value));
  let offset = 10;
  ends.forEach((end) => { view.setUint16(offset, end); offset += 2; });
  offset += 2; // Zero instruction count.
  points.forEach((p) => { view.setUint8(offset++, p.on ? 1 : 0); });
  for (const axis of ['x', 'y'] as const) {
    let previous = 0;
    points.forEach((p) => { view.setInt16(offset, p[axis] - previous); offset += 2; previous = p[axis]; });
  }
  return bytes;
};

/** fontkit 1.1's subsetter copies transformed WOFF2 glyf bytes as if they were raw TTF.
 * Re-encode the selected glyph outlines with its own TrueType encoder instead. This
 * also flattens composite glyphs, so their obsolete compressed offsets are never copied.
 * Keep this compatibility adapter isolated and covered by real rendered Chinese checks.
 */
export const journalFontkit = {
  create: (bytes: Uint8Array) => {
    const font = fontkit.create(bytes) as ReturnType<typeof fontkit.create> & {
      directory: { tables: { glyf?: { transformed?: boolean } } };
      createSubset: () => OutlineSubset;
    };
    if (font.directory.tables.glyf?.transformed) {
      const create = font.createSubset.bind(font);
      font.createSubset = () => {
        const subset = create();
        const empty = subset.glyphEncoder.encodeSimple({ commands: [], bbox: { minX: 0, minY: 0, maxX: 0, maxY: 0 } }, []);
        const BufferType = empty.constructor as { new(length: number): Uint8Array };
        subset._addGlyph = function (id: number) {
          const glyph = this.font.getGlyph(id);
          const outline = encodeOutline(glyph.path, (length) => new BufferType(length));
          this.glyf.push(outline);
          this.loca.offsets.push(this.offset);
          this.hmtx.metrics.push({ advance: glyph.advanceWidth, bearing: glyph._getMetrics().leftBearing });
          this.offset += outline.length;
          return this.glyf.length - 1;
        };
        return subset;
      };
    }
    return font;
  }
};

const BUILTIN_FILES: Record<string, string> = {
  default: 'NotoSansSC-Journal.ttf',
  'lxgw-wenkai': 'LXGWWenKaiLite-Journal.ttf',
  'lxgw-neo-zhisong': 'LXGWNeoZhiSong.woff2',
  'ding-lie-song': 'dingliesongtypeface.woff2',
  'zhuque-fangsong': 'ZhuqueFangsong-Regular.woff2',
  'wenquanyi-bitmap': 'WenQuanYi Bitmap Song 13px.woff2'
};
const cache = new Map<string, Promise<ArrayBuffer>>();
export const loadJournalFont = async (id: string): Promise<ArrayBuffer> => {
  if (!BUILTIN_FILES[id]) {
    const record = await customFontStorageService.getFont(id);
    if (!record) throw new Error('所选字体已被删除，请重新选择');
    return record.blob.arrayBuffer();
  }
  if (!cache.has(id)) cache.set(id, fetch(`${import.meta.env.BASE_URL}fonts/${encodeURIComponent(BUILTIN_FILES[id])}`).then(async (response) => {
    if (!response.ok) throw new Error('手账中文字体加载失败，请重试');
    return response.arrayBuffer();
  }).catch((error) => { cache.delete(id); throw error; }));
  return cache.get(id)!;
};
export const embedJournalFont = async (pdf: PDFDocument, bytes: ArrayBuffer): Promise<PDFFont> => {
  const signature = new DataView(bytes).getUint32(0);
  // Web fonts cannot be placed directly into a PDF FontFile. Fontkit's subset encoder
  // reconstructs their TrueType/CFF tables. Raw fonts stay whole to preserve WenKai outlines.
  return pdf.embedFont(bytes, { subset: signature === 0x774f4646 || signature === 0x774f4632, features: { pnum: false, tnum: false, liga: false, clig: false, locl: false, ccmp: false } });
};
