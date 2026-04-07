import { describe, expect, it } from 'vitest';
import {
  getTimePalImagePath,
  getTimePalImagePathFallback,
  getTimePalPreviewPath,
} from './timePalConfig';

const ELECTRON_BASE_URI = 'file:///E:/lumostime/resources/app.asar/dist/index.html';

describe('timePalConfig', () => {
  it('resolves preview and stage images for Electron desktop builds', () => {
    expect(getTimePalPreviewPath('cat', ELECTRON_BASE_URI))
      .toBe('file:///E:/lumostime/resources/app.asar/dist/time_pal_origin/cat/1.webp');
    expect(getTimePalImagePath('cat', 3, ELECTRON_BASE_URI))
      .toBe('file:///E:/lumostime/resources/app.asar/dist/time_pal_origin/cat/3.png');
    expect(getTimePalImagePathFallback('cat', 3, ELECTRON_BASE_URI))
      .toBe('file:///E:/lumostime/resources/app.asar/dist/time_pal_origin/cat/3.webp');
  });
});
