/**
 * @file cryptoCompatibility.ts
 * @input Browser Crypto implementation, including older Android WebViews
 * @output A UUID v4 fallback installed before application modules execute
 * @pos Entry-point compatibility
 * @updated 2026-10-27: Uses secure random bytes when native randomUUID is unavailable.
 */
export const installRandomUUIDFallback = (cryptoProvider: Crypto | undefined = globalThis.crypto): void => {
  if (!cryptoProvider || typeof cryptoProvider.randomUUID === 'function') {
    return;
  }

  Object.defineProperty(cryptoProvider, 'randomUUID', {
    configurable: true,
    writable: true,
    value: (): ReturnType<Crypto['randomUUID']> => {
      const bytes = cryptoProvider.getRandomValues(new Uint8Array(16));
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0'));
      return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
    }
  });
};

installRandomUUIDFallback();
