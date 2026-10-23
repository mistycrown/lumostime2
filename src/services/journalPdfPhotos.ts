/**
 * @file journalPdfPhotos.ts
 * @input Persisted original Log image references and cancellation signal
 * @output Reusable PDF photos preserving orientation, transparency and aspect ratio
 * @pos Service (Journal photo assets)
 * @updated 2026-10-23: Loads originals sequentially, releases object URLs and fails explicitly for missing images.
 */
import type { PDFDocument, PDFImage } from 'pdf-lib';
import { resolveAssetPath } from '../utils/assetPath';

export const embedJournalPhotos = async (pdf: PDFDocument, references: string[], signal?: AbortSignal): Promise<Map<string, PDFImage>> => {
  const result = new Map<string, PDFImage>();
  for (const reference of new Set(references)) {
    signal?.throwIfAborted();
    let url = '';
    try {
      if (/^(data:|blob:|https?:|\/)/.test(reference)) url = reference.startsWith('/') ? resolveAssetPath(reference) : reference;
      else {
        const { imageService } = await import('./imageService');
        url = await imageService.getImageUrl(reference, 'original');
      }
      if (!url) throw new Error('原图不存在');
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        const cleanup = () => signal?.removeEventListener('abort', abort);
        const abort = () => { cleanup(); image.src = ''; reject(signal?.reason || new Error('已取消')); };
        image.onload = () => { cleanup(); resolve(image); };
        image.onerror = () => { cleanup(); reject(new Error('原图无法解码')); };
        signal?.addEventListener('abort', abort, { once: true });
        image.src = url;
      });
      signal?.throwIfAborted();
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 2400 / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      try {
        const context = canvas.getContext('2d');
        if (!context) throw new Error('无法创建图片画布');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const jpeg = /\.jpe?g(?:$|\?)/i.test(reference) || reference.startsWith('data:image/jpeg');
        result.set(reference, jpeg ? await pdf.embedJpg(canvas.toDataURL('image/jpeg', 0.92)) : await pdf.embedPng(canvas.toDataURL('image/png')));
      } finally { canvas.width = canvas.height = 0; }
    } catch (error) {
      signal?.throwIfAborted();
      throw new Error(`日志图片读取失败：${reference.slice(0, 80)} (${error instanceof Error ? error.message : String(error)})`);
    } finally {
      if (url.startsWith('blob:') && !reference.startsWith('blob:')) URL.revokeObjectURL(url);
    }
  }
  return result;
};
