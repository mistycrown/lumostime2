/**
 * @file journalPdfService.ts
 * @input Journal datasets/options, progress callback and optional abort signal
 * @output Offline, searchable PDF bytes or a completed platform download
 * @pos Service (Journal PDF export)
 * @updated 2026-10-23: Embeds the complete TrueType font because fontkit subsets omit WenKai glyph outlines.
 */
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { buildJournalModel, type JournalExportData, type JournalExportOptions } from '../utils/journalExport';
import { composeJournalPdf, JOURNAL_FONT_FAMILY, journalGraphemes, JournalPdfWriter, type JournalPdfProgress, type JournalSymbols } from './journalPdfLayout';

export type { JournalPdfProgress } from './journalPdfLayout';
let fontBytes: Promise<ArrayBuffer> | undefined;
const loadFont = (): Promise<ArrayBuffer> => {
  fontBytes ??= fetch(`${import.meta.env.BASE_URL}fonts/LXGWWenKaiLite-Journal.ttf`).then(async (response) => {
    if (!response.ok) throw new Error('手账中文字体加载失败，请重试');
    return response.arrayBuffer();
  }).catch((error) => { fontBytes = undefined; throw error; });
  return fontBytes;
};

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
  const model = buildJournalModel(data, options);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  onProgress?.({ message: '正在加载中文字体', pages: 0 });
  const bytes = await loadFont();
  signal?.throwIfAborted();
  // WenKai subset encoding drops outlines in current fontkit; embed once in full for all pages.
  const font = await pdf.embedFont(bytes, { subset: false });
  const characters = new Set(font.getCharacterSet());
  const symbols: JournalSymbols = new Map();
  const values = new Set<string>();
  JSON.stringify(model, (_key, value) => {
    if (typeof value === 'string') values.add(value);
    return value;
  });
  const unsupported = new Set<string>();
  values.forEach((value) => journalGraphemes(value.replace(/[\u0000-\u001f\u007f]/g, '')).forEach((glyph) => {
    if (Array.from(glyph).some((char) => !characters.has(char.codePointAt(0)!))) unsupported.add(glyph);
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
        context.fillStyle = '#303630';
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
  const writer = new JournalPdfWriter(pdf, font, model, symbols);
  await composeJournalPdf(writer, onProgress, signal);
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
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = () => reject(new Error('PDF 文件读取失败'));
      reader.readAsDataURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
    });
    signal?.throwIfAborted();
    await Filesystem.writeFile({ path, data: base64, directory: isAndroid ? Directory.ExternalStorage : Directory.Documents, recursive: true });
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
