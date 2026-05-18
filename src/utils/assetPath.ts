/**
 * @file assetPath.ts
 * @input Static asset path and optional base URI
 * @output Runtime-safe asset URL for web and Electron
 * @pos Utility
 * @description Resolves app asset paths so root-style URLs also work under Electron's file:// runtime.
 *
 * @updated 2026-05-18: Normalize raw Windows absolute filesystem paths into file URLs so persisted desktop asset paths remain renderable in the renderer.
 */

const ABSOLUTE_URL_PATTERN = /^(?:[a-zA-Z][a-zA-Z\d+\-.]*:|\/\/)/;
const WINDOWS_ABSOLUTE_PATH_PATTERN = /^[a-zA-Z]:[\\/]/;
const importMetaEnv = (import.meta as ImportMeta & {
  env?: {
    BASE_URL?: string;
  };
}).env;

const toFileUrlFromWindowsPath = (assetPath: string): string => {
  const normalizedFilePath = assetPath.replace(/\\/g, '/');
  return `file:///${encodeURI(normalizedFilePath)}`;
};

export const resolveAssetPath = (assetPath: string, baseUri?: string): string => {
  if (!assetPath) {
    return assetPath;
  }

  if (WINDOWS_ABSOLUTE_PATH_PATTERN.test(assetPath)) {
    return toFileUrlFromWindowsPath(assetPath);
  }

  if (ABSOLUTE_URL_PATTERN.test(assetPath)) {
    return assetPath;
  }

  const normalizedPath = assetPath.replace(/^\/+/, '');
  const runtimeBaseUri = baseUri ?? (typeof document !== 'undefined' ? document.baseURI : '');

  if (runtimeBaseUri) {
    return new URL(normalizedPath, runtimeBaseUri).toString();
  }

  const fallbackBasePath = importMetaEnv?.BASE_URL || '/';
  const normalizedBasePath = fallbackBasePath.endsWith('/') ? fallbackBasePath : `${fallbackBasePath}/`;
  return `${normalizedBasePath}${normalizedPath}`;
};
