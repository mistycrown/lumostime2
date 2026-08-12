/**
 * @file useFloatingWindowSync.test.ts
 * @input Floating-window sync decision inputs
 * @output Regression coverage for disabled floating-ball startup prevention
 * @pos Test
 * @description Ensures the Android floating-window sync hook hides the regular side bubble without stopping app-awareness overlays when the global switch is off.
 * @updated 2026-08-12: Updated disabled-switch regression coverage for shared-service app-awareness overlays.
 */

import { describe, expect, test } from 'vitest';
import { resolveFloatingWindowSyncAction } from '../utils/floatingWindowSyncDecision';

describe('resolveFloatingWindowSyncAction', () => {
  test('hides the regular side bubble when the global switch is off', () => {
    expect(resolveFloatingWindowSyncAction({
      floatingWindowEnabled: false,
      shouldForceFloatingWindow: false,
      hasLatestSession: false,
      lastSyncedSignature: null,
      nextSignature: 'idle:none',
    })).toEqual({
      action: 'hide',
      signature: 'hidden',
    });
  });

  test('does not repeat hide calls once the disabled state is hidden', () => {
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
