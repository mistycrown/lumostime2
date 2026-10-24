/**
 * @file journalPdfService.ts
 * @input Journal datasets/options, progress callback and optional abort signal
 * @output Offline, searchable PDF bytes or a completed platform download
 * @pos Service (Journal PDF export)
 * @updated 2026-10-23: Embeds the complete TrueType font because fontkit subsets omit WenKai glyph outlines.
 * @updated 2026-10-23: Embeds separate Noto Sans printed labels and WenKai handwritten content.
 * @updated 2026-10-23: Snapshots application calendar colors and embeds original daily sticker assets.
 * @updated 2026-10-23: Loads original Log photos and custom reactions without silently dropping missing assets.
 * @updated 2026-10-23: Uses a vector Collection marker without depending on an unavailable font glyph.
 * @updated 2026-10-24: Embeds independently selected fonts with safe transformed-WOFF2 outlines and Chinese fallback.
 * @updated 2026-10-24: Loads mood stickers only for selected mood/summary content; reaction image references are excluded.
 * @updated 2026-10-24: Preserves legacy review-only summary stickers when guidance and narrative are separated.
 * @updated 2026-10-24: Saves native PDFs in bounded binary chunks with byte progress instead of one large Base64 bridge message.
 */
import { PDFDocument } from 'pdf-lib';
import { Capacitor } from '@capacitor/core';
import { Directory } from '@capacitor/filesystem';
import { buildJournalModel, journalHasPart, type JournalExportData, type JournalExportOptions } from '../utils/journalExport';
import { composeJournalPdf, JOURNAL_FONT_FAMILY, journalGraphemes, JournalPdfWriter, type JournalPdfProgress, type JournalSymbols } from './journalPdfLayout';
import { getResolvedTodoScheduleTypeColors, todoScheduleColorService } from './todoScheduleColorService';
import { embedJournalStickers } from './journalPdfStickers';
import { embedJournalPhotos } from './journalPdfPhotos';
import { JOURNAL_HEX } from '../utils/journalTheme';
import { loadJournalFont, embedJournalFont, journalFontkit } from './journalPdfFonts';
import { writeJournalNativeFile } from './journalNativeFile';

export type { JournalPdfProgress } from './journalPdfLayout';

export const createJournalPdf = async (
  data: JournalExportData,
  options: JournalExportOptions,
  onProgress?: (progress: JournalPdfProgress) => void,
  signal?: AbortSignal
): Promise<{ bytes: Uint8Array; pageCount: number }> => {
  signal?.throwIfAborted();
  onProgress?.({ message: '正在整理手账数据', pages: 0 });
  // Allow controls and progress to paint before projecting larger ranges.
  await new Promise((resolve) => setTimeout(resolve, 0));
  signal?.throwIfAborted();
  const calendarStyle = data.calendarStyle || {
    colorMode: (typeof localStorage !== 'undefined' && localStorage.getItem('todoMonthViewMarkerColorMode') === 'category' ? 'category' : 'schedule') as 'category' | 'schedule',
    colors: typeof localStorage === 'undefined' ? undefined : getResolvedTodoScheduleTypeColors(todoScheduleColorService.getSettings())
  };
  const model = buildJournalModel({ ...data, calendarStyle: calendarStyle.colors ? calendarStyle as NonNullable<JournalExportData['calendarStyle']> : undefined }, options);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(journalFontkit);
  onProgress?.({ message: '正在加载中文字体', pages: 0 });
  const sources = new Map<string, Promise<ArrayBuffer>>();
  const load = (id: string) => {
    if (!sources.has(id)) sources.set(id, loadJournalFont(id));
    return sources.get(id)!;
  };
  const [bytes, printedBytes, fallbackBytes] = await Promise.all([load(options.contentFontId || 'lxgw-wenkai'), load(options.printedFontId || 'default'), load('default')]);
  signal?.throwIfAborted();
  // WenKai subset encoding drops outlines in current fontkit; embed once in full for all pages.
  const font = await embedJournalFont(pdf, bytes);
  const printedFont = printedBytes === bytes ? font : await embedJournalFont(pdf, printedBytes);
  const fallback = fallbackBytes === printedBytes ? printedFont : await embedJournalFont(pdf, fallbackBytes);
  const characters = new Set([...font.getCharacterSet(), ...printedFont.getCharacterSet(), ...fallback.getCharacterSet()]);
  const symbols: JournalSymbols = new Map();
  const values = new Set<string>();
  JSON.stringify(model, (_key, value) => {
    if (typeof value === 'string') values.add(value);
    return value;
  });
  const unsupported = new Set<string>();
  values.forEach((value) => journalGraphemes(value.replace(/[\u0000-\u001f\u007f]/g, '')).forEach((glyph) => {
    if (glyph !== '◬' && Array.from(glyph).some((char) => !characters.has(char.codePointAt(0)!))) unsupported.add(glyph);
  }));
  // Keep emoji and uncommon symbols without sacrificing searchable Chinese body text.
  if (unsupported.size) {
    const face = new FontFace(JOURNAL_FONT_FAMILY, bytes);
    await face.load();
    document.fonts.add(face);
    try {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) throw new Error('无法创建手账符号画布');
      for (const glyph of unsupported) {
        signal?.throwIfAborted();
        if (Array.from(glyph).some((char) => /\p{Script=Han}/u.test(char) && !characters.has(char.codePointAt(0)!))) {
          throw new Error(`手账字体暂不支持汉字“${glyph}”，请调整文字后重试`);
        }
        context.font = `64px "${JOURNAL_FONT_FAMILY}", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
        const width = Math.max(1, context.measureText(glyph).width);
        canvas.width = Math.ceil(width);
        canvas.height = 96;
        context.font = `64px "${JOURNAL_FONT_FAMILY}", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
        context.textBaseline = 'alphabetic';
        context.fillStyle = JOURNAL_HEX.ink;
        context.fillText(glyph, 0, 70);
        symbols.set(glyph, { image: await pdf.embedPng(canvas.toDataURL('image/png')), width: width / 64 });
      }
      canvas.width = canvas.height = 0;
    } finally { document.fonts.delete(face); }
  }
  signal?.throwIfAborted();
  pdf.setTitle(`LumosTime 手账 ${options.startDate} — ${options.endDate}`);
  pdf.setAuthor('LumosTime');
  pdf.setSubject('个人时间手账');
  const writer = new JournalPdfWriter(pdf, font, model, symbols, printedFont, fallback);
  const logDetails = (['dayLogs', 'dayPlans', 'monthAgenda', 'weekPlans'] as const).some((part) => journalHasPart(options, part));
  if ((['mood', 'oneLine', 'daySummary'] as const).some((part) => journalHasPart(options, part)) || (!options.parts && options.sections.includes('reviews'))) {
    onProgress?.({ message: '正在加载每日贴纸', pages: 0 });
    const icons = model.days.map((day) => day.review?.moodEmoji || '');
    const stickers = await embedJournalStickers(pdf, icons, signal);
    stickers.forEach((image, key) => writer.stickers.set(key, image));
  }
  if (logDetails) {
    onProgress?.({ message: '正在加载日志图片', pages: 0 });
    const photos = await embedJournalPhotos(pdf, model.days.flatMap((day) => day.logs.flatMap((log) => log.source.images || [])), signal);
    photos.forEach((image, key) => writer.photos.set(key, image));
  }
  await composeJournalPdf(writer, onProgress, signal);
  onProgress?.({ message: '正在生成 PDF 文件', pages: pdf.getPageCount() });
  await new Promise((resolve) => setTimeout(resolve, 0));
  signal?.throwIfAborted();
  const output = await pdf.save();
  signal?.throwIfAborted();
  return { bytes: output, pageCount: pdf.getPageCount() };
};

export const exportJournalPdf = async (
  data: JournalExportData,
  options: JournalExportOptions,
  onProgress?: (progress: JournalPdfProgress) => void,
  signal?: AbortSignal
): Promise<{ filename: string; pageCount: number; savedPath?: string }> => {
  const { bytes, pageCount } = await createJournalPdf(data, options, onProgress, signal);
  const filename = `LumosTime手账_${options.startDate.replace(/-/g, '')}_${options.endDate.replace(/-/g, '')}.pdf`;
  signal?.throwIfAborted();
  onProgress?.({ message: '正在保存 PDF', pages: pageCount });
  if (Capacitor.isNativePlatform()) {
    const isAndroid = Capacitor.getPlatform() === 'android';
    const path = isAndroid ? `Download/LumosTime/${filename}` : `LumosTime/${filename}`;
    await writeJournalNativeFile(bytes, path, isAndroid ? Directory.ExternalStorage : Directory.Documents,
      (writtenBytes, totalBytes) => onProgress?.({ message: '正在保存 PDF', pages: pageCount, writtenBytes, totalBytes }), signal);
    return { filename, pageCount, savedPath: path };
  }
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  try { anchor.click(); }
  finally {
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  return { filename, pageCount };
};
