/**
 * @file diagnosticIdentityService.test.ts
 * @input Saved supporter numbers, anonymous identifiers and unavailable storage
 * @output Regression coverage for stable shareable diagnostic identities
 * @pos Test
 * @updated 2026-10-05: Covers restarts, supporter transitions and storage failures.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DIAGNOSTICS_KEYS, SPONSORSHIP_KEYS } from '../constants/storageKeys';

describe('diagnostic identity', () => {
  let entries: Map<string, string>;

  beforeEach(() => {
    vi.resetModules();
    entries = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => entries.set(key, value)
    });
  });

  it('formats existing supporter numbers without truncating larger numbers', async () => {
    const { getDiagnosticIdentity } = await import('./diagnosticIdentityService');
    entries.set(SPONSORSHIP_KEYS.SUPPORTER_ID, '1');
    expect(getDiagnosticIdentity()).toEqual({ id: 'lumos001', type: 'supporter' });
    entries.set(SPONSORSHIP_KEYS.SUPPORTER_ID, '1234');
    expect(getDiagnosticIdentity().id).toBe('lumos1234');
  });

  it('keeps the random numeric identity across reports, restarts and sponsorship changes', async () => {
    const firstModule = await import('./diagnosticIdentityService');
    const anonymous = firstModule.getDiagnosticIdentity();
    expect(anonymous).toEqual({ id: expect.stringMatching(/^\d{16}$/), type: 'anonymous' });
    expect(entries.get(DIAGNOSTICS_KEYS.USER_ID)).toBe(anonymous.id);
    vi.resetModules();
    const { getDiagnosticIdentity } = await import('./diagnosticIdentityService');
    expect(getDiagnosticIdentity()).toEqual(anonymous);
    entries.set(SPONSORSHIP_KEYS.SUPPORTER_ID, '5');
    expect(getDiagnosticIdentity().id).toBe('lumos005');
    entries.delete(SPONSORSHIP_KEYS.SUPPORTER_ID);
    expect(getDiagnosticIdentity()).toEqual(anonymous);
  });

  it.each(['0', '-1', 'NaN', '5garbage', '1000001'])('rejects malformed supporter ID %s', async (value) => {
    entries.set(SPONSORSHIP_KEYS.SUPPORTER_ID, value);
    const { getDiagnosticIdentity } = await import('./diagnosticIdentityService');
    expect(getDiagnosticIdentity().type).toBe('anonymous');
  });

  it('keeps a session identity without recursively logging storage failures', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); }
    });
    const consoleError = vi.spyOn(console, 'error');
    const { getDiagnosticIdentity } = await import('./diagnosticIdentityService');
    const first = getDiagnosticIdentity();
    expect(getDiagnosticIdentity()).toEqual(first);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
