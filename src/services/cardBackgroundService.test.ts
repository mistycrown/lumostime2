/**
 * @file cardBackgroundService.test.ts
 * @input Stored card background groups, settings, and uploaded image files
 * @output Regression coverage for persistence, carousel selection, alignment, and opacity
 * @updated 2026-09-27: Verifies anchored backgrounds fill width without centered cropping.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CARD_BACKGROUND_CURRENT_KEY,
  CARD_BACKGROUND_GROUPS_KEY,
  CARD_BACKGROUND_OPACITY_KEY,
  cardBackgroundService,
  getCardBackgroundPosition,
  getCardBackgroundStyle
} from './cardBackgroundService';

const { saveImage, deleteImage } = vi.hoisted(() => ({
  saveImage: vi.fn(async (file: File) => file.name),
  deleteImage: vi.fn(async () => undefined)
}));

vi.mock('./imageService', () => ({
  imageService: { saveImage, deleteImage }
}));

vi.mock('./settingsImageReferenceService', () => ({
  getSettingsReferencedImages: vi.fn(() => new Set<string>())
}));

const createLocalStorageMock = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) || null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear()
  };
};

describe('card background settings', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorageMock());
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
    saveImage.mockClear();
    deleteImage.mockClear();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('cycles through group images by stable card order', () => {
    localStorage.setItem(CARD_BACKGROUND_GROUPS_KEY, JSON.stringify([{
      id: 'group-1', name: 'Clouds', imageFilenames: ['one.webp', 'two.webp'], alignment: 'right-bottom'
    }]));
    localStorage.setItem(CARD_BACKGROUND_CURRENT_KEY, 'group-1');

    expect(cardBackgroundService.getBackgroundAt(0)).toEqual({ filename: 'one.webp', alignment: 'right-bottom' });
    expect(cardBackgroundService.getBackgroundAt(1)).toEqual({ filename: 'two.webp', alignment: 'right-bottom' });
    expect(cardBackgroundService.getBackgroundAt(2)).toEqual({ filename: 'one.webp', alignment: 'right-bottom' });
    expect(cardBackgroundService.getBackgroundAt(-1)).toEqual({ filename: 'two.webp', alignment: 'right-bottom' });
  });

  it('maps alignment-specific image sizing and clamps opacity for the image overlay', () => {
    cardBackgroundService.setOpacity(1.5);
    expect(localStorage.getItem(CARD_BACKGROUND_OPACITY_KEY)).toBe('1');
    expect(getCardBackgroundPosition('right')).toBe('right center');
    expect(getCardBackgroundPosition('right-top')).toBe('right top');
    expect(getCardBackgroundPosition('right-bottom')).toBe('right bottom');

    const topStyle = getCardBackgroundStyle('blob:preview', 'right-top', 0.25);
    expect(topStyle.backgroundPosition).toBe('center, right top');
    expect(topStyle.backgroundSize).toBe('cover, 100% auto');
    expect(topStyle.backgroundImage).toContain('rgba(255, 255, 255, 0.75)');

    const bottomStyle = getCardBackgroundStyle('blob:preview', 'right-bottom', 0.25);
    expect(bottomStyle.backgroundPosition).toBe('center, right bottom');
    expect(bottomStyle.backgroundSize).toBe('cover, 100% auto');

    const centeredStyle = getCardBackgroundStyle('blob:preview', 'right', 0.25);
    expect(centeredStyle.backgroundPosition).toBe('center, right center');
    expect(centeredStyle.backgroundSize).toBe('cover, cover');
  });

  it('persists a group after saving every selected image', async () => {
    const files = [
      new File(['one'], 'one.png', { type: 'image/png' }),
      new File(['two'], 'two.png', { type: 'image/png' })
    ];
    const group = await cardBackgroundService.addGroup(' Clouds ', files, 'right');

    expect(group).toMatchObject({ name: 'Clouds', imageFilenames: ['one.png', 'two.png'], alignment: 'right' });
    expect(cardBackgroundService.getGroups()).toEqual([group]);
    expect(cardBackgroundService.getCurrentGroupId()).toBe(group.id);
    expect(saveImage).toHaveBeenCalledTimes(2);
  });

  it('updates a group while retaining selected images and adding new uploads', async () => {
    const initial = await cardBackgroundService.addGroup('Clouds', [
      new File(['one'], 'one.png', { type: 'image/png' }),
      new File(['two'], 'two.png', { type: 'image/png' })
    ], 'right');

    const updated = await cardBackgroundService.updateGroup(
      initial.id,
      'Clouds updated',
      ['two.png'],
      [new File(['three'], 'three.png', { type: 'image/png' })],
      'right-bottom'
    );

    expect(updated).toMatchObject({
      id: initial.id,
      name: 'Clouds updated',
      imageFilenames: ['two.png', 'three.png'],
      alignment: 'right-bottom'
    });
    expect(cardBackgroundService.getGroups()).toEqual([updated]);
    expect(deleteImage).toHaveBeenCalledWith('one.png');
  });
});
