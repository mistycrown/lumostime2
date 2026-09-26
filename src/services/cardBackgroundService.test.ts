/**
 * @file cardBackgroundService.test.ts
 * @input Stored card background groups, settings, and uploaded image files
 * @output Regression coverage for persistence, carousel selection, alignment, and opacity
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

  it('maps alignments and clamps opacity for the image overlay', () => {
    cardBackgroundService.setOpacity(1.5);
    expect(localStorage.getItem(CARD_BACKGROUND_OPACITY_KEY)).toBe('1');
    expect(getCardBackgroundPosition('right')).toBe('right center');
    expect(getCardBackgroundPosition('right-top')).toBe('right top');
    expect(getCardBackgroundPosition('right-bottom')).toBe('right bottom');

    const style = getCardBackgroundStyle('blob:preview', 'right-top', 0.25);
    expect(style.backgroundPosition).toBe('right top, center');
    expect(style.backgroundImage).toContain('rgba(255, 255, 255, 0.75)');
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
});
