/**
 * @file floatingButtonImageTransparency.ts
 * @input Floating-button image pixels or a browser-readable image URL
 * @output PNG data URLs whose edge-connected near-white background is transparent
 * @description Removes only near-white pixels connected to an image edge, preserving enclosed white artwork where possible.
 * @updated 2026-09-30: Added deterministic edge-connected background removal for custom floating-button images.
 */

const DEFAULT_WHITE_THRESHOLD = 238;
const MAX_RENDER_DIMENSION = 512;

const isBackgroundPixel = (
  pixels: Uint8ClampedArray,
  pixelIndex: number,
  whiteThreshold: number
): boolean => {
  const offset = pixelIndex * 4;
  const alpha = pixels[offset + 3];

  return alpha <= 8 || (
    pixels[offset] >= whiteThreshold
    && pixels[offset + 1] >= whiteThreshold
    && pixels[offset + 2] >= whiteThreshold
  );
};

export const clearEdgeConnectedWhitePixels = (
  sourcePixels: Uint8ClampedArray,
  width: number,
  height: number,
  whiteThreshold = DEFAULT_WHITE_THRESHOLD
): Uint8ClampedArray => {
  const pixelCount = width * height;
  const output = new Uint8ClampedArray(sourcePixels);

  if (width <= 0 || height <= 0 || sourcePixels.length !== pixelCount * 4) {
    return output;
  }

  const visited = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let queueStart = 0;
  let queueEnd = 0;

  const enqueue = (pixelIndex: number) => {
    if (visited[pixelIndex] || !isBackgroundPixel(sourcePixels, pixelIndex, whiteThreshold)) {
      return;
    }
    visited[pixelIndex] = 1;
    queue[queueEnd] = pixelIndex;
    queueEnd += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (queueStart < queueEnd) {
    const pixelIndex = queue[queueStart];
    queueStart += 1;
    output[pixelIndex * 4 + 3] = 0;

    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    if (x > 0) enqueue(pixelIndex - 1);
    if (x + 1 < width) enqueue(pixelIndex + 1);
    if (y > 0) enqueue(pixelIndex - width);
    if (y + 1 < height) enqueue(pixelIndex + width);
  }

  return output;
};

export const createTransparentFloatingButtonImage = (imageUrl: string): Promise<string> => (
  new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      const sourceWidth = image.naturalWidth || image.width;
      const sourceHeight = image.naturalHeight || image.height;
      const scale = Math.min(1, MAX_RENDER_DIMENSION / Math.max(sourceWidth, sourceHeight));
      const width = Math.max(1, Math.round(sourceWidth * scale));
      const height = Math.max(1, Math.round(sourceHeight * scale));
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true });

      if (!context) {
        resolve(imageUrl);
        return;
      }

      canvas.width = width;
      canvas.height = height;
      context.drawImage(image, 0, 0, width, height);

      try {
        const imageData = context.getImageData(0, 0, width, height);
        imageData.data.set(clearEdgeConnectedWhitePixels(imageData.data, width, height));
        context.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(imageUrl);
      }
    };
    image.onerror = () => reject(new Error('Failed to load floating-button background image'));
    image.src = imageUrl;
  })
);
