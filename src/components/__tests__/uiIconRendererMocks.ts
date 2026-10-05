/**
 * @file uiIconRendererMocks.ts
 * @input Deferred theme image requests
 * @output Isolated image storage and native emoji settings for renderer tests
 * @pos Test Adapter
 * @updated 2026-10-05: Supports image decoding without application data or cloud access.
 */
export const imageRequests: Array<{ filename: string; resolve: (url: string) => void }> = [];
export const imageService = {
  getImageUrl: (filename: string) => new Promise<string>((resolve) => imageRequests.push({ filename, resolve }))
};
export const useSettings = () => ({ emojiStyle: 'native' });
