/**
 * @file focusImagesMocks.ts
 * @input Synthetic native camera requests
 * @output Camera/platform adapters; photo files still use real IndexedDB storage
 * @pos Test Support
 * @updated 2026-11-01: Provides deterministic camera webPath fallback and cancellation results.
 */
export const platform = { native: false, cancel: false };
export const Capacitor = { isNativePlatform: () => platform.native, getPlatform: () => 'web', convertFileSrc: (value: string) => value };
export const registerPlugin = () => new Proxy({}, { get: () => async () => ({ remove: () => {} }) });
export class WebPlugin {}
export const useToast = () => ({ addToast: (kind: string, message: string) => console.log('TEST_TOAST', kind, message) });
export const CameraResultType = { Uri: 'uri' };
export const CameraSource = { Camera: 'CAMERA' };
export const photoBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=';
export const Camera = { getPhoto: async () => {
  platform.native = false;
  if (platform.cancel) throw new Error('User cancelled photos app');
  return { webPath: `data:image/png;base64,${photoBase64}`, format: 'png' };
} };
export const Directory = { Data: 'DATA' };
export const Filesystem = { readFile: async () => ({ data: photoBase64 }) };
