/**
 * @file NativeStatusBarAppearancePlugin.ts
 * @input Native status-bar color and icon appearance requests
 * @output Typed bridge for Android window status-bar appearance
 * @pos Plugin
 * @description Applies the Android Window status-bar surface independently from the WebView edge-to-edge container.
 * @updated 2026-07-22: Added dark-mode native status-bar appearance bridge.
 */
import { registerPlugin } from '@capacitor/core';

export interface NativeStatusBarAppearancePlugin {
  apply(options: { color: string; lightIcons: boolean }): Promise<void>;
}

const NativeStatusBarAppearance = registerPlugin<NativeStatusBarAppearancePlugin>('NativeStatusBarAppearance');

export default NativeStatusBarAppearance;
