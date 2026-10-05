/**
 * @file cardBackgroundService.test.ts
 * @input Stored card background groups, settings, and uploaded image files
 * @output Regression coverage for persistence, carousel selection, alignment, and opacity
 * @updated 2026-09-28: Verifies active backgrounds share a subtle surface shadow.
 * @updated 2026-10-05: Covers unset opacity, active-group deletion, missing-image candidates, and edits during uploads.
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
    saveImage.mockReset().mockImplementation(async (file: File) => file.name);
    deleteImage.mockClear();
  });

  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('uses the default opacity for absent, empty, and invalid settings while preserving explicit zero', () => {
    expect(cardBackgroundService.getOpacity()).toBe(0.4);
    for (const value of ['', ' ', 'invalid']) {
      localStorage.setItem(CARD_BACKGROUND_OPACITY_KEY, value);
      expect(cardBackgroundService.getOpacity()).toBe(0.4);
    }
    cardBackgroundService.setOpacity(0);
    expect(cardBackgroundService.getOpacity()).toBe(0);
  });

  it('cycles through group images by stable card order', () => {
    localStorage.setItem(CARD_BACKGROUND_GROUPS_KEY, JSON.stringify([{
      id: 'group-1', name: 'Clouds', imageFilenames: ['one.webp', 'two.webp'], alignment: 'right-bottom'
    }]));
    localStorage.setItem(CARD_BACKGROUND_CURRENT_KEY, 'group-1');

    expect(cardBackgroundService.getBackgroundAt(0)).toEqual({ filename: 'one.webp', alignment: 'right-bottom' });
    expect(cardBackgroundService.getBackgroundAt(1)).toEqual({ filename: 'two.webp', alignment: 'right-bottom' });
    expect(cardBackgroundService.getBackgroundAt(2)).toEqual({ filename: 'one.webp', alignment: 'right-bottom' });
    expect(cardBackgroundService.getBackgroundAt(-1)).toEqual({ filename: 'two.webp', alignment: 'right-bottom' });
    expect(cardBackgroundService.getBackgroundCandidates(1).map((image) => image.filename)).toEqual(['two.webp', 'one.webp']);
    expect(cardBackgroundService.getBackgroundAt(NaN)?.filename).toBe('one.webp');
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
    expect(topStyle.boxShadow).toBe('0 2px 8px rgba(0, 0, 0, 0.07)');

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

  it('selects the next group when the active group is deleted', async () => {
    const first = await cardBackgroundService.addGroup('First', [new File(['one'], 'one.png', { type: 'image/png' })], 'right');
    const second = await cardBackgroundService.addGroup('Second', [new File(['two'], 'two.png', { type: 'image/png' })], 'right');
    await cardBackgroundService.deleteGroup(second.id);
    expect(cardBackgroundService.getCurrentGroupId()).toBe(first.id);
    await cardBackgroundService.deleteGroup(first.id);
    expect(localStorage.getItem(CARD_BACKGROUND_CURRENT_KEY)).toBeNull();
  });

  it('preserves unrelated groups added during an image upload', async () => {
    const initial = await cardBackgroundService.addGroup('Original', [new File(['one'], 'one.png', { type: 'image/png' })], 'right');
    let completeUpload!: (filename: string) => void;
    saveImage.mockImplementationOnce(() => new Promise<string>((resolve) => { completeUpload = resolve; }));
    const update = cardBackgroundService.updateGroup(initial.id, 'Updated', initial.imageFilenames,
      [new File(['two'], 'two.png', { type: 'image/png' })], 'right');
    const added = { id: 'imported', name: 'Imported', imageFilenames: ['imported.webp'], alignment: 'right-top' };
    localStorage.setItem(CARD_BACKGROUND_GROUPS_KEY, JSON.stringify([initial, added]));
    completeUpload('two.png');
    await update;
    expect(cardBackgroundService.getGroups().map((group) => group.id)).toEqual([initial.id, added.id]);
  });
});
