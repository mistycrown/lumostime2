/**
 * @file cardBackgroundRendererMocks.ts
 * @input Controlled image reads in the real React card-background renderer harness
 * @output Deferred image adapters and appearance event names
 * @pos Test (Card Background Renderer)
 * @updated 2026-10-05: Enables deterministic image completion order and failure scenarios.
 */
export const APPEARANCE_RESTORED_EVENT = 'lumostime:appearance-restored';
export const getSettingsReferencedImages = () => new Set<string>();

export const imageRequests: {
  filename: string;
  type?: string;
  resolve: (url: string) => void;
  reject: (error: Error) => void;
}[] = [];

export const imageService = {
  getImageUrl: (filename: string, type?: string) => new Promise<string>((resolve, reject) => {
    imageRequests.push({ filename, type, resolve, reject });
  }),
  saveImage: async (file: File) => file.name,
  deleteImage: async () => undefined
};
