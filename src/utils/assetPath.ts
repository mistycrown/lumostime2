/**
 * @file assetPath.ts
 * @input Static asset path and optional base URI
 * @output Runtime-safe asset URL for web and Electron
 * @pos Utility
 * @description Resolves app asset paths so root-style URLs also work under Electron's file:// runtime.
 */

const ABSOLUTE_URL_PATTERN = /^(?:[a-zA-Z][a-zA-Z\d+\-.]*:|\/\/)/;

export const resolveAssetPath = (assetPath: string, baseUri?: string): string => {
  if (!assetPath) {
    return assetPath;
  }

  if (ABSOLUTE_URL_PATTERN.test(assetPath)) {
    return assetPath;
  }

  const normalizedPath = assetPath.replace(/^\/+/, '');
  const runtimeBaseUri = baseUri ?? (typeof document !== 'undefined' ? document.baseURI : '');

  if (runtimeBaseUri) {
    return new URL(normalizedPath, runtimeBaseUri).toString();
  }

  const fallbackBasePath = import.meta.env.BASE_URL || '/';
  const normalizedBasePath = fallbackBasePath.endsWith('/') ? fallbackBasePath : `${fallbackBasePath}/`;
  return `${normalizedBasePath}${normalizedPath}`;
};
