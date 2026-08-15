/**
 * @file topSafeArea.ts
 * @input Capacitor native-platform state and platform name
 * @output A decision for whether the web layer owns the top safe-area inset
 * @pos Utility
 * @description Keeps Android's WebView margin and CSS safe-area padding from reserving the same status-bar space twice.
 * @updated 2026-08-15: Added Android native-container detection for top safe-area ownership.
 */

export function shouldUseNativeAndroidTopInset(
  isNativePlatform: boolean,
  platform: string
): boolean {
  return isNativePlatform && platform === 'android';
}
