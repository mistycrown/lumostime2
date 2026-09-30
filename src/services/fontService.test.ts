/**
 * @file fontService.test.ts
 * @input Mocked browser FontFace APIs and custom font files
 * @output Regression coverage for custom font registration fallbacks
 * @pos Test (Font Service)
 * @description Verifies custom font registration prefers ArrayBuffer sources and recovers with a data URL source.
 * @updated 2026-09-30: Added Android WebView-compatible FontFace registration coverage.
 * @updated 2026-09-30: Covers explicit Blob filenames so mobile theme imports do not depend on File.name.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { listFonts, saveFont } = vi.hoisted(() => ({
  listFonts: vi.fn(async () => []),
  saveFont: vi.fn(async () => undefined)
}));

vi.mock('./customFontStorageService', () => ({
  customFontStorageService: { listFonts, saveFont, getFont: vi.fn(), deleteFont: vi.fn() }
}));

const createLocalStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key)
  };
};

const installFileReader = (dataUrl = 'data:font/ttf;base64,Zm9udA==') => {
  class MockFileReader {
    result: string | ArrayBuffer | null = null;
    error: DOMException | null = null;
    onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
    onerror: ((event: ProgressEvent<FileReader>) => void) | null = null;

    readAsDataURL(): void {
      this.result = dataUrl;
      this.onload?.({} as ProgressEvent<FileReader>);
    }
  }

  vi.stubGlobal('FileReader', MockFileReader);
};

describe('fontService custom font registration', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorage());
    listFonts.mockReset();
    listFonts.mockResolvedValue([]);
    saveFont.mockReset();
    saveFont.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('registers a custom font from an ArrayBuffer without reading a data URL', async () => {
    const add = vi.fn();
    const fontFace = vi.fn(function (_family: string, source: BufferSource | string) {
      return { source, load: vi.fn(async () => undefined) };
    });
    const fileReader = vi.fn();
    vi.stubGlobal('FontFace', fontFace);
    vi.stubGlobal('document', { fonts: { add } });
    vi.stubGlobal('FileReader', fileReader);

    const { fontService } = await import('./fontService');
    const result = await fontService.addCustomFont(new File(['font'], 'theme.ttf', { type: 'font/ttf' }));

    expect(result.success).toBe(true);
    expect(fontFace).toHaveBeenCalledOnce();
    expect(fontFace.mock.calls[0][1]).toBeInstanceOf(ArrayBuffer);
    expect(fileReader).not.toHaveBeenCalled();
    expect(add).toHaveBeenCalledOnce();
  });

  it('retries custom font registration with a data URL when ArrayBuffer registration fails', async () => {
    const add = vi.fn();
    const fontFace = vi.fn(function (_family: string, source: BufferSource | string) {
      return {
        source,
        load: vi.fn(() => typeof source === 'string'
          ? Promise.resolve(undefined)
          : Promise.reject(new Error('ArrayBuffer is unsupported')))
      };
    });
    vi.stubGlobal('FontFace', fontFace);
    vi.stubGlobal('document', { fonts: { add } });
    installFileReader();

    const { fontService } = await import('./fontService');
    const result = await fontService.addCustomFont(new File(['font'], 'theme.ttf', { type: 'font/ttf' }));

    expect(result.success).toBe(true);
    expect(fontFace).toHaveBeenCalledTimes(2);
    expect(fontFace.mock.calls[1][1]).toBe('url("data:font/ttf;base64,Zm9udA==")');
    expect(add).toHaveBeenCalledOnce();
  });

  it('does not persist a custom font when every registration strategy fails', async () => {
    const fontFace = vi.fn(function () {
      return { load: vi.fn(() => Promise.reject(new Error('Font rejected'))) };
    });
    vi.stubGlobal('FontFace', fontFace);
    vi.stubGlobal('document', { fonts: { add: vi.fn() } });
    installFileReader();

    const { fontService } = await import('./fontService');
    const result = await fontService.addCustomFont(new File(['font'], 'theme.ttf', { type: 'font/ttf' }));

    expect(result.success).toBe(false);
    expect(fontFace).toHaveBeenCalledTimes(2);
    expect(saveFont).not.toHaveBeenCalled();
  });

  it('uses an explicit filename when importing a Blob without File metadata', async () => {
    const fontFace = vi.fn(function () {
      return { load: vi.fn(async () => undefined) };
    });
    vi.stubGlobal('FontFace', fontFace);
    vi.stubGlobal('document', { fonts: { add: vi.fn() } });

    const { fontService } = await import('./fontService');
    const result = await fontService.addCustomFont(
      new Blob(['font'], { type: 'font/ttf' }),
      'Rabbit Font',
      'rabbit-bear-diary.ttf'
    );

    expect(result.success).toBe(true);
    expect(saveFont).toHaveBeenCalledWith(expect.objectContaining({
      fileName: 'rabbit-bear-diary.ttf',
      displayName: 'Rabbit Font'
    }));
  });

  it('rejects a non-string File name without calling split', async () => {
    const invalidNamedBlob = Object.assign(
      new Blob(['font'], { type: 'font/ttf' }),
      { name: { value: 'theme.ttf' } }
    );

    const { fontService } = await import('./fontService');
    const result = await fontService.addCustomFont(invalidNamedBlob);

    expect(result).toMatchObject({ success: false });
    expect(saveFont).not.toHaveBeenCalled();
  });
});
