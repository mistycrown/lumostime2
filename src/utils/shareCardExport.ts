/**
 * @file shareCardExport.ts
 * @input Loaded share-card preview DOM and export pixel ratio
 * @output Disposable offscreen snapshot with independently decodable PNG images
 * @pos Utils (ShareCard Export)
 * @updated 2026-10-12: Embeds decoded preview pixels to bypass Blob refetches and cached image failures.
 */

const IMAGE_TIMEOUT_MS = 15000;
const MAX_IMAGE_DIMENSION = 16384;

const waitForImage = (image: HTMLImageElement, index: number): Promise<void> => {
  if (image.complete) {
    return image.naturalWidth > 0 && image.naturalHeight > 0
      ? Promise.resolve()
      : Promise.reject(new Error(`第 ${index + 1} 张图片加载失败，请重新打开分享页面`));
  }

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      window.clearTimeout(timeout);
      image.removeEventListener('load', onLoad);
      image.removeEventListener('error', onError);
    };
    const onLoad = () => {
      cleanup();
      if (image.naturalWidth > 0 && image.naturalHeight > 0) resolve();
      else reject(new Error(`第 ${index + 1} 张图片加载失败`));
    };
    const onError = () => {
      cleanup();
      reject(new Error(`第 ${index + 1} 张图片加载失败，请重新打开分享页面`));
    };
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`第 ${index + 1} 张图片加载超时，请稍后重试`));
    }, IMAGE_TIMEOUT_MS);
    image.addEventListener('load', onLoad, { once: true });
    image.addEventListener('error', onError, { once: true });
  });
};

export const createShareCardExportSnapshot = async (preview: HTMLDivElement, pixelRatio = 2) => {
  const sourceImages = Array.from(preview.querySelectorAll('img'));
  await Promise.all(sourceImages.map(waitForImage));
  await document.fonts.ready;

  const node = preview.cloneNode(true) as HTMLDivElement;
  const clonedImages = Array.from(node.querySelectorAll('img'));
  const width = preview.getBoundingClientRect().width;
  const container = document.createElement('div');
  container.setAttribute('aria-hidden', 'true');
  Object.assign(container.style, {
    position: 'fixed', left: '-100000px', top: '0', width: `${width}px`, pointerEvents: 'none'
  });
  node.style.width = `${width}px`;
  const dispose = () => container.remove();

  try {
    for (const [index, image] of sourceImages.entries()) {
      const bounds = image.getBoundingClientRect();
      const scale = Math.min(1, (bounds.width || width) * pixelRatio / image.naturalWidth,
        MAX_IMAGE_DIMENSION / image.naturalWidth, MAX_IMAGE_DIMENSION / image.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('无法创建图片导出画布，请重试');
      try {
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const cloned = clonedImages[index];
        cloned.removeAttribute('srcset');
        cloned.removeAttribute('sizes');
        cloned.removeAttribute('crossorigin');
        cloned.loading = 'eager';
        cloned.src = canvas.toDataURL('image/png');
        // Keep the preview's exact geometry when downsampling large source photos.
        cloned.style.width = `${bounds.width}px`;
        cloned.style.height = `${bounds.height}px`;
      } catch {
        throw new Error(`第 ${index + 1} 张图片无法导出，请重新打开分享页面`);
      } finally {
        canvas.width = 0;
        canvas.height = 0;
      }
    }

    container.appendChild(node);
    document.body.appendChild(container);
    await Promise.all(clonedImages.map(waitForImage));
    return { node, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
};
