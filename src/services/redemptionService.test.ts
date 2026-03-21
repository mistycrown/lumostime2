import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SPONSORSHIP_KEYS } from '../constants/storageKeys';
import { RedemptionService } from './redemptionService';

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

describe('RedemptionService', () => {
  let localStorageMock: LocalStorageMock;

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('accepts redemption codes ending with 0 when key index 0 is used', async () => {
    const service = new RedemptionService();

    await expect(service.verifyCode('LUMOS-000FF810')).resolves.toEqual({
      success: true,
      supporterId: 5,
    });
  });

  it('revalidates saved key-index-0 redemption codes through isVerified', async () => {
    const service = new RedemptionService();

    localStorageMock.setItem(SPONSORSHIP_KEYS.REDEMPTION_CODE, 'LUMOS-000D3920');

    await expect(service.isVerified()).resolves.toEqual({
      isVerified: true,
      userId: 10,
    });
    expect(localStorageMock.getItem(SPONSORSHIP_KEYS.SUPPORTER_ID)).toBe('10');
  });
});
