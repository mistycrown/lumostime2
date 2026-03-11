import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { THEME_KEYS } from '../constants/storageKeys';
import {
  customColorGroupService,
  normalizeCustomColorHex,
} from './customColorGroupService';

type LocalStorageMock = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

const createLocalStorageMock = (): LocalStorageMock => {
  const store = new Map<string, string>();

  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
};

describe('customColorGroupService', () => {
  let localStorageMock: LocalStorageMock;

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalizes supported HEX formats', () => {
    expect(normalizeCustomColorHex('#abc')).toBe('#AABBCC');
    expect(normalizeCustomColorHex('aabbcc')).toBe('#AABBCC');
    expect(normalizeCustomColorHex('#aabbccdd')).toBe('#AABBCCDD');
    expect(normalizeCustomColorHex('')).toBeNull();
    expect(normalizeCustomColorHex('#zzzzzz')).toBeNull();
  });

  it('adds colors once and rejects duplicates after normalization', () => {
    expect(customColorGroupService.addColor('abc')).toEqual({ success: true });
    expect(customColorGroupService.addColor('#AABBCC')).toEqual({
      success: false,
      error: 'DUPLICATE',
    });

    const group = customColorGroupService.getGroup();
    expect(group.colors).toHaveLength(1);
    expect(group.colors[0].color).toBe('#AABBCC');
  });

  it('sanitizes invalid and duplicated persisted colors on read', () => {
    localStorageMock.setItem(
      THEME_KEYS.CUSTOM_COLOR_GROUP,
      JSON.stringify({
        colors: [
          { id: 'first', color: 'abc', createdAt: 1 },
          { id: 'duplicate', color: '#AABBCC', createdAt: 2 },
          { id: 'invalid', color: '#XYZXYZ', createdAt: 3 },
          { color: '#11223344' },
        ],
      })
    );

    const group = customColorGroupService.getGroup();

    expect(group.colors).toHaveLength(2);
    expect(group.colors[0].color).toBe('#AABBCC');
    expect(group.colors[1].color).toBe('#11223344');

    const persisted = JSON.parse(
      localStorageMock.getItem(THEME_KEYS.CUSTOM_COLOR_GROUP) || '{}'
    );
    expect(persisted.colors).toHaveLength(2);
    expect(persisted.version).toBe(1);
  });
});
