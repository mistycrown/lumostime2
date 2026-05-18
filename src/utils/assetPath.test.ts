import { describe, expect, it } from 'vitest';
import { resolveAssetPath } from './assetPath';

describe('resolveAssetPath', () => {
  it('resolves root-style asset paths against an Electron file base URI', () => {
    expect(resolveAssetPath('/uiicon/cat/01.webp', 'file:///E:/lumostime/resources/app.asar/dist/index.html'))
      .toBe('file:///E:/lumostime/resources/app.asar/dist/uiicon/cat/01.webp');
  });

  it('normalizes raw Windows absolute paths into file URLs', () => {
    expect(resolveAssetPath('C:\\Users\\xiangpu\\AppData\\Local\\Programs\\LumosTime\\resources\\app.asar\\dist\\bottle\\01.png'))
      .toBe('file:///C:/Users/xiangpu/AppData/Local/Programs/LumosTime/resources/app.asar/dist/bottle/01.png');
  });

  it('preserves absolute URLs and data URLs', () => {
    expect(resolveAssetPath('https://example.com/icon.png', 'file:///E:/lumostime/resources/app.asar/dist/index.html'))
      .toBe('https://example.com/icon.png');
    expect(resolveAssetPath('data:image/png;base64,abc', 'file:///E:/lumostime/resources/app.asar/dist/index.html'))
      .toBe('data:image/png;base64,abc');
  });
});
