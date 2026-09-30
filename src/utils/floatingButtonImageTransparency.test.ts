/**
 * @file floatingButtonImageTransparency.test.ts
 * @input Synthetic RGBA pixel grids
 * @output Regression coverage for floating-button white-background removal
 * @description Verifies that only edge-connected near-white pixels become transparent.
 * @updated 2026-09-30: Added edge connectivity and enclosed-white preservation coverage.
 */

import { describe, expect, test } from 'vitest';
import { clearEdgeConnectedWhitePixels } from './floatingButtonImageTransparency';

const pixel = (data: Uint8ClampedArray, width: number, x: number, y: number) => (
  Array.from(data.slice((y * width + x) * 4, (y * width + x + 1) * 4))
);

describe('clearEdgeConnectedWhitePixels', () => {
  test('makes edge-connected white and near-white pixels transparent', () => {
    const width = 3;
    const height = 3;
    const source = new Uint8ClampedArray([
      255, 255, 255, 255, 246, 248, 250, 255, 255, 255, 255, 255,
      255, 255, 255, 255, 220, 30, 30, 255, 255, 255, 255, 255,
      255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255
    ]);

    const result = clearEdgeConnectedWhitePixels(source, width, height);

    expect(pixel(result, width, 0, 0)[3]).toBe(0);
    expect(pixel(result, width, 1, 0)[3]).toBe(0);
    expect(pixel(result, width, 1, 1)).toEqual([220, 30, 30, 255]);
  });

  test('preserves white pixels enclosed by non-background artwork', () => {
    const width = 5;
    const height = 5;
    const source = new Uint8ClampedArray(width * height * 4);

    for (let index = 0; index < width * height; index += 1) {
      source.set([255, 255, 255, 255], index * 4);
    }
    for (let y = 1; y <= 3; y += 1) {
      for (let x = 1; x <= 3; x += 1) {
        source.set([20, 80, 180, 255], (y * width + x) * 4);
      }
    }
    source.set([255, 255, 255, 255], (2 * width + 2) * 4);

    const result = clearEdgeConnectedWhitePixels(source, width, height);

    expect(pixel(result, width, 0, 0)[3]).toBe(0);
    expect(pixel(result, width, 2, 2)).toEqual([255, 255, 255, 255]);
  });

  test('crosses existing transparent padding to remove the white backdrop behind it', () => {
    const width = 3;
    const height = 1;
    const source = new Uint8ClampedArray([
      0, 0, 0, 0,
      255, 255, 255, 255,
      30, 80, 180, 255
    ]);

    const result = clearEdgeConnectedWhitePixels(source, width, height);

    expect(pixel(result, width, 1, 0)[3]).toBe(0);
    expect(pixel(result, width, 2, 0)).toEqual([30, 80, 180, 255]);
  });
});
