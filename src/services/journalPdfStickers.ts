/**
 * @file journalPdfStickers.ts
 * @input Persisted image:/ui: mood icons and a PDF document
 * @output Original sticker images embedded once and reused throughout the book
 * @pos Service (Journal sticker assets)
 * @updated 2026-10-23: Resolves bundled and managed assets with the same rules as IconRenderer.
 */
import type { PDFDocument, PDFImage } from 'pdf-lib';
import { resolveAssetPath } from '../utils/assetPath';

export const embedJournalStickers = async (pdf: PDFDocument, icons: string[], signal?: AbortSignal): Promise<Map<string, PDFImage>> => {
  const result = new Map<string, PDFImage>();
  for (const icon of new Set(icons)) {
    if (!icon.startsWith('image:') && !icon.startsWith('ui:')) continue;
    signal?.throwIfAborted();
    let urls: string[] = [];
    if (icon.startsWith('image:')) {
      let path = icon.slice(6);
      if (!/\.(png|webp|jpg|jpeg|gif|svg)$/i.test(path)) path += '.webp';
      if (path.startsWith('/')) urls = [resolveAssetPath(path)];
      else {
        const { imageService } = await import('./imageService');
        const url = await imageService.getImageUrl(path, 'original');
        if (url) urls = [url];
      }
    } else {
      const { uiIconService } = await import('./uiIconService');
      const parsed = uiIconService.parseIconString(icon);
      const paths = uiIconService.getIconPathWithFallback(parsed.value as never);
      urls = [paths.primary, paths.fallback].filter(Boolean).map((path) => resolveAssetPath(path));
    }
    let loaded: HTMLImageElement | undefined;
    for (const url of urls) {
      try {
        loaded = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          const abort = () => { image.src = ''; reject(signal?.reason || new Error('已取消')); };
          const cleanup = () => signal?.removeEventListener('abort', abort);
          image.onload = () => { cleanup(); resolve(image); };
          image.onerror = () => { cleanup(); reject(new Error('贴纸读取失败')); };
          signal?.addEventListener('abort', abort, { once: true });
          image.src = url;
        });
        break;
      } catch { signal?.throwIfAborted(); }
    }
    if (!loaded) throw new Error(`贴纸图片读取失败：${icon.slice(0, 80)}`);
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 512 / Math.max(loaded.naturalWidth, loaded.naturalHeight));
    canvas.width = Math.max(1, Math.round(loaded.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(loaded.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('无法创建贴纸画布');
    context.drawImage(loaded, 0, 0, canvas.width, canvas.height);
    result.set(icon, await pdf.embedPng(canvas.toDataURL('image/png')));
    canvas.width = canvas.height = 0;
  }
  return result;
};
