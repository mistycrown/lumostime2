/**
 * @file floatingWindowStartup.ts
 * @input Android platform state, FocusNotification plugin guards, startup options
 * @output Guarded floating-window startup result describing overlay and notification permission state
 * @pos Utility
 * @description Centralizes Android floating-window startup so LumosTime can keep the overlay running even when notification permission is unavailable, while still exposing enough state for toasts and resume recovery.
 * @updated 2026-04-15: Added notification-permission-aware startup flow and permission-return recovery metadata.
 */
import { Capacitor } from '@capacitor/core';
import FocusNotification from '../plugins/FocusNotificationPlugin';

export interface FloatingWindowStartupOptions {
  requestFloatingPermission?: boolean;
  requestNotificationPermission?: boolean;
}

export interface FloatingWindowStartupResult {
  started: boolean;
  floatingPermissionGranted: boolean;
  notificationPermissionGranted: boolean;
  requestedFloatingPermission: boolean;
  requestedNotificationPermission: boolean;
}

const createResult = (
  overrides: Partial<FloatingWindowStartupResult> = {}
): FloatingWindowStartupResult => ({
  started: false,
  floatingPermissionGranted: false,
  notificationPermissionGranted: false,
  requestedFloatingPermission: false,
  requestedNotificationPermission: false,
  ...overrides,
});

export const startFloatingWindowWithGuards = async (
  options: FloatingWindowStartupOptions = {}
): Promise<FloatingWindowStartupResult> => {
  if (Capacitor.getPlatform() !== 'android') {
    return createResult();
  }

  const {
    requestFloatingPermission = false,
    requestNotificationPermission = false,
  } = options;

  const { granted: floatingPermissionGranted } =
    await FocusNotification.checkFloatingPermission();

  if (!floatingPermissionGranted) {
    if (requestFloatingPermission) {
      await FocusNotification.requestFloatingPermission();
    }

    return createResult({
      floatingPermissionGranted,
      requestedFloatingPermission: requestFloatingPermission,
    });
  }

  const { granted: initialNotificationPermissionGranted } =
    await FocusNotification.checkNotificationPermission();

  await FocusNotification.startFloatingWindow();

  let notificationPermissionGranted = initialNotificationPermissionGranted;
  let requestedNotificationPermission = false;

  if (!notificationPermissionGranted && requestNotificationPermission) {
    requestedNotificationPermission = true;
    const requestResult = await FocusNotification.requestNotificationPermission();
    notificationPermissionGranted = requestResult.granted;
  }

  return createResult({
    started: true,
    floatingPermissionGranted,
    notificationPermissionGranted,
    requestedNotificationPermission,
  });
};
