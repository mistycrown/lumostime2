/**
 * @file useFloatingWindowSync.test.ts
 * @input Floating-window sync decision inputs
 * @output Regression coverage for disabled floating-ball startup prevention
 * @pos Test
 * @description Ensures the Android floating-window sync hook stops the native service when the global switch is off instead of sending an idle update that can restart it.
 * @updated 2026-07-11: Added disabled-switch regression coverage for floating-window sync actions.
 */

import { describe, expect, test } from 'vitest';
import { resolveFloatingWindowSyncAction } from '../utils/floatingWindowSyncDecision';

describe('resolveFloatingWindowSyncAction', () => {
  test('stops the floating window when the global switch is off', () => {
    expect(resolveFloatingWindowSyncAction({
      floatingWindowEnabled: false,
      shouldForceFloatingWindow: false,
      hasLatestSession: false,
      lastSyncedSignature: null,
      nextSignature: 'idle:none',
    })).toEqual({
      action: 'stop',
      signature: 'hidden',
    });
  });

  test('does not repeat stop calls once the disabled state is hidden', () => {
    expect(resolveFloatingWindowSyncAction({
      floatingWindowEnabled: false,
      shouldForceFloatingWindow: false,
      hasLatestSession: false,
      lastSyncedSignature: 'hidden',
      nextSignature: 'idle:none',
    })).toEqual({
      action: 'none',
      signature: 'hidden',
    });
  });

  test('still syncs app-awareness sessions while the global switch is off', () => {
    expect(resolveFloatingWindowSyncAction({
      floatingWindowEnabled: false,
      shouldForceFloatingWindow: true,
      hasLatestSession: true,
      lastSyncedSignature: 'hidden',
      nextSignature: 'session-1:clock:1710000000000:app-awareness:running:session-1:1710003600000',
    })).toEqual({
      action: 'sync',
      signature: 'session-1:clock:1710000000000:app-awareness:running:session-1:1710003600000',
    });
  });
});
