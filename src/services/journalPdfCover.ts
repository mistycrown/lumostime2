/**
 * @file journalPdfCover.ts
 * @input Selected journal dates and actual totals
 * @output Responsive portrait/landscape journal covers using vector print artwork
 * @pos Service (Journal cover)
 * @updated 2026-10-23: Keeps covers to the title, date range and actual totals, without automatic quotes.
 * @updated 2026-10-24: Adapts three supplied HTML vector covers and randomly freezes one style per export.
 */
import { concatTransformationMatrix, popGraphicsState, pushGraphicsState } from 'pdf-lib';
import { JOURNAL_COLORS as C, journalDataColor } from './journalPdfTheme';
import { JOURNAL_STROKE } from '../utils/journalTheme';
import { formatJournalDuration, type JournalCoverStyle } from '../utils/journalExport';
import { JOURNAL_COVER_ART } from './journalPdfCoverArt';
import type { JournalPdfWriter } from './journalPdfLayout';

export const JOURNAL_COVER_STYLES: JournalCoverStyle[] = ['minimal', 'classic', 'abstract'];
export const randomJournalCoverStyle = (): JournalCoverStyle => {
  const value = new Uint32Array(1);
  globalThis.crypto.getRandomValues(value);
  return JOURNAL_COVER_STYLES[value[0] % 3];
};

// The supplied strokes use only Cartesian SVG commands. Transform coordinates
// before drawing so nonuniform page scaling cannot change the 0.5px stroke.
const scaleStroke = (path: string, sx: number, sy: number): string => {
  let command = 'M'; let index = 0;
  return (path.match(/[a-zA-Z]|-?\d*\.?\d+/g) || []).map((token) => {
    if (/^[a-zA-Z]$/.test(token)) { command = token.toUpperCase(); index = 0; return token; }
    const factor = command === 'H' ? sx : command === 'V' ? sy : index++ % 2 ? sy : sx;
    return String(Number(token) * factor);
  }).join(' ');
};

export const writeJournalCover = (w: JournalPdfWriter): void => {
  const style = w.model.options.coverStyle || randomJournalCoverStyle();
  w.startCoverPage();
  const wide = w.model.options.paperSize === 'a4';
  const tint = (amount: number) => journalDataColor('', w.model.options.accentColor || '#000000', amount);
  w.rect(0, 0, w.width, w.height, C.paper);
  if (style !== 'classic') {
    const artwork = JOURNAL_COVER_ART[style][wide ? 'landscape' : 'portrait'];
    const [width, height] = artwork.viewBox;
    const artHeight = style === 'minimal' ? w.height * (wide ? 0.66 : 0.60) : w.height;
    const scaleX = w.width / width;
    const scaleY = artHeight / height;
    w.page.pushOperators(pushGraphicsState(), concatTransformationMatrix(scaleX, 0, 0, scaleY, 0, 0));
    artwork.paths.forEach((path, index) => {
      if (path.stroke) return;
      const colors = style === 'minimal' ? [0.93, 0.80, 0.56, 0.28, 1] : [0.94, 0.72, 0.44, 0.88, 0.64, 0.38, 0.38];
      w.page.drawSvgPath(path.d, { x: 0, y: height, color: style === 'minimal' && index === 4 ? C.paper : tint(colors[index]) });
    });
    artwork.circles.forEach((circle) => w.page.drawCircle({ x: circle.cx, y: height - circle.cy, size: circle.r, color: tint(style === 'minimal' ? 0.70 : 0.38) }));
    w.page.pushOperators(popGraphicsState());
    artwork.paths.filter((path) => path.stroke).forEach((path) => w.page.drawSvgPath(scaleStroke(path.d, scaleX, scaleY), { x: 0, y: artHeight, borderColor: tint(0.38), borderWidth: JOURNAL_STROKE }));
  } else {
    const inset = w.width * 0.065;
    for (const gap of [0, 7]) w.page.drawRectangle({ x: inset + gap, y: 32 + gap, width: w.width - 2 * (inset + gap), height: w.height - 64 - 2 * gap, borderColor: tint(gap ? 0.76 : 0.38), borderWidth: JOURNAL_STROKE });
    for (const [x, y, sx, sy] of [[inset, w.height - 32, 1, 1], [w.width - inset, w.height - 32, -1, 1], [w.width - inset, 32, -1, -1], [inset, 32, 1, -1]]) {
      w.page.pushOperators(pushGraphicsState(), concatTransformationMatrix(sx, 0, 0, sy, x, y));
      w.page.drawSvgPath('M0 28 V0 H28 M0 12 C12 12 12 0 12 0 M0 22 C20 22 22 20 22 0', { borderColor: tint(0.38), borderWidth: JOURNAL_STROKE });
      w.page.pushOperators(popGraphicsState());
    }
    const x = w.width / 2 - 23;
    const y = w.height * 0.54;
    w.page.drawSvgPath('M0 0 H46 V5 H0Z M0 75 H46 V80 H0Z M5 5 C5 25 23 31 23 39 C23 48 5 54 5 75 M41 5 C41 25 23 31 23 39 C23 48 41 54 41 75 M12 20 Q23 26 34 20 M23 42 V57 M11 68 Q23 54 35 68', { x, y, borderColor: tint(0.25), borderWidth: JOURNAL_STROKE });
    w.page.drawSvgPath('M12 25 Q23 30 34 25 L23 38Z M12 71 Q23 57 34 71Z', { x, y, color: tint(0.65) });
  }
  const left = style === 'abstract' ? w.width * 0.12 : w.pageMargin + 8;
  const span = style === 'abstract' && wide ? w.width * 0.56 : w.width - 2 * left;
  const place = (value: string, top: number, size: number, color = C.ink) => w.text(value, style === 'abstract' ? left : (w.width - w.widthOf(value, size)) / 2, top, size, color);
  const titleSize = wide ? 64 : 24;
  const titleTop = w.height * (style === 'abstract' ? 0.27 : 0.18);
  place('Life Journal', titleTop, titleSize);
  const range = `${w.model.options.startDate.replace(/-/g, '.')} - ${w.model.options.endDate.replace(/-/g, '.')}`;
  place(range, titleTop + titleSize + 22, 9, C.muted);
  const actual = w.model.days.flatMap((day) => day.logs.filter((log) => !log.source.isPlanned));
  const metrics = [[String(w.model.days.length), '天数'], [formatJournalDuration(w.model.days.reduce((sum, day) => sum + day.actualSeconds, 0)), '记录时长'], [String(new Set(actual.map((log) => log.source.id)).size), '记录数']];
  const top = w.height * (style === 'abstract' ? 0.54 : style === 'classic' ? 0.75 : 0.4);
  metrics.forEach(([value, label], index) => {
    const center = left + (index + 0.5) * span / 3;
    const size = w.widthOf(value, 12) > span / 3 - 8 ? 9 : 12;
    w.text(value, center - w.widthOf(value, size) / 2, top, size, C.ink);
    w.text(label, center - w.widthOf(label, 9) / 2, top + 22, 9, C.muted);
  });
};
