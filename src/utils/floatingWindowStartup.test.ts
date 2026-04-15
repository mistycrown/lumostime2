import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Capacitor } from '@capacitor/core';
import FocusNotification from '../plugins/FocusNotificationPlugin';
import { startFloatingWindowWithGuards } from './floatingWindowStartup';

vi.mock('../plugins/FocusNotificationPlugin', () => ({
  default: {
    checkFloatingPermission: vi.fn(),
    requestFloatingPermission: vi.fn(),
    checkNotificationPermission: vi.fn(),
    requestNotificationPermission: vi.fn(),
    startFloatingWindow: vi.fn(),
  },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: vi.fn(),
  },
}));

describe('startFloatingWindowWithGuards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
    vi.mocked(FocusNotification.checkFloatingPermission).mockResolvedValue({ granted: true });
    vi.mocked(FocusNotification.checkNotificationPermission).mockResolvedValue({ granted: true });
    vi.mocked(FocusNotification.requestFloatingPermission).mockResolvedValue(undefined);
    vi.mocked(FocusNotification.requestNotificationPermission).mockResolvedValue({ granted: false });
    vi.mocked(FocusNotification.startFloatingWindow).mockResolvedValue(undefined);
  });

  test('starts the floating window even when notification permission is unavailable', async () => {
    vi.mocked(FocusNotification.checkNotificationPermission).mockResolvedValue({ granted: false });

    const result = await startFloatingWindowWithGuards();

    expect(FocusNotification.startFloatingWindow).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      started: true,
      floatingPermissionGranted: true,
      notificationPermissionGranted: false,
      requestedFloatingPermission: false,
      requestedNotificationPermission: false,
    });
  });

  test('requests overlay permission and skips startup when overlay access is missing', async () => {
    vi.mocked(FocusNotification.checkFloatingPermission).mockResolvedValue({ granted: false });

    const result = await startFloatingWindowWithGuards({
      requestFloatingPermission: true,
    });

    expect(FocusNotification.requestFloatingPermission).toHaveBeenCalledTimes(1);
    expect(FocusNotification.startFloatingWindow).not.toHaveBeenCalled();
    expect(result).toEqual({
      started: false,
      floatingPermissionGranted: false,
      notificationPermissionGranted: false,
      requestedFloatingPermission: true,
      requestedNotificationPermission: false,
    });
  });

  test('requests notification permission after startup when asked', async () => {
    vi.mocked(FocusNotification.checkNotificationPermission).mockResolvedValue({ granted: false });
    vi.mocked(FocusNotification.requestNotificationPermission).mockResolvedValue({ granted: true });

    const result = await startFloatingWindowWithGuards({
      requestNotificationPermission: true,
    });

    expect(FocusNotification.startFloatingWindow).toHaveBeenCalledTimes(1);
    expect(FocusNotification.requestNotificationPermission).toHaveBeenCalledTimes(1);
    expect(result.notificationPermissionGranted).toBe(true);
    expect(result.requestedNotificationPermission).toBe(true);
  });
});
