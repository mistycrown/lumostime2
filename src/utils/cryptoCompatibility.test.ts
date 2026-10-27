/**
 * @file cryptoCompatibility.test.ts
 * @input Native and legacy Web Crypto implementations
 * @output Coverage for UUID format, secure entropy, native preservation and early installation
 * @pos Compatibility regression tests
 * @updated 2026-10-27: Covers Android WebViews without crypto.randomUUID.
 */
import { webcrypto } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installRandomUUIDFallback } from './cryptoCompatibility';

afterEach(() => vi.unstubAllGlobals());

describe('UUID compatibility', () => {
  it('preserves the native implementation', () => {
    const randomUUID = vi.fn();
    const cryptoProvider = { randomUUID } as unknown as Crypto;
    installRandomUUIDFallback(cryptoProvider);
    expect(cryptoProvider.randomUUID).toBe(randomUUID);
    expect(randomUUID).not.toHaveBeenCalled();
  });

  it('uses secure bytes with the correct UUID version and variant', () => {
    const getRandomValues = vi.fn(function (this: Crypto, bytes: Uint8Array) {
      expect(this).toBe(cryptoProvider);
      return bytes.fill(0xff);
    });
    const cryptoProvider = { getRandomValues } as unknown as Crypto;
    installRandomUUIDFallback(cryptoProvider);
    expect(cryptoProvider.randomUUID()).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
    expect(getRandomValues).toHaveBeenCalledOnce();
    const fallback = cryptoProvider.randomUUID;
    installRandomUUIDFallback(cryptoProvider);
    expect(cryptoProvider.randomUUID).toBe(fallback);
  });

  it('installs at import time and generates distinct IDs using getRandomValues', async () => {
    const cryptoProvider = { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) } as Crypto;
    vi.stubGlobal('crypto', cryptoProvider);
    vi.resetModules();
    await import('./cryptoCompatibility');
    const ids = Array.from({ length: 100 }, () => cryptoProvider.randomUUID());
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/));
  });
});
