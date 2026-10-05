/**
 * @file diagnosticIdentityService.ts
 * @input Cached sponsorship identifier and local diagnostics storage
 * @output Shareable supporter or persistent anonymous diagnostics identity
 * @pos Shared diagnostics service
 * @description Reuses supporter numbers without exposing redemption codes or personal data.
 * @updated 2026-10-05: Adds lumos-prefixed supporter IDs and stable random numeric IDs.
 */
import { DIAGNOSTICS_KEYS, SPONSORSHIP_KEYS } from '../constants/storageKeys';

export interface DiagnosticIdentity {
  id: string;
  type: 'supporter' | 'anonymous';
}

let sessionAnonymousId: string | null = null;

// Do not log storage failures here: this helper also runs inside Sentry's beforeSend.
const readStorage = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const createAnonymousId = (): string => {
  const values = new Uint32Array(2);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(values);
  } else {
    values.set([Math.floor(Math.random() * 2 ** 32), Math.floor(Math.random() * 2 ** 32)]);
  }
  return Array.from(values, (value) => (value % 100_000_000).toString().padStart(8, '0')).join('');
};

export const getDiagnosticIdentity = (): DiagnosticIdentity => {
  const supporterId = readStorage(SPONSORSHIP_KEYS.SUPPORTER_ID);
  if (supporterId && /^\d+$/.test(supporterId)) {
    const number = Number(supporterId);
    if (Number.isInteger(number) && number >= 1 && number <= 1_000_000) {
      return { id: `lumos${number.toString().padStart(3, '0')}`, type: 'supporter' };
    }
  }

  const savedId = readStorage(DIAGNOSTICS_KEYS.USER_ID);
  if (savedId && /^\d{16}$/.test(savedId)) {
    sessionAnonymousId = savedId;
  } else {
    sessionAnonymousId ??= createAnonymousId();
    try {
      localStorage.setItem(DIAGNOSTICS_KEYS.USER_ID, sessionAnonymousId);
    } catch {
      // Keep the same identifier in memory when local storage is unavailable.
    }
  }
  return { id: sessionAnonymousId, type: 'anonymous' };
};
