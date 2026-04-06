/**
 * @file ImmersiveModePlugin.ts
 * @input None
 * @output Native immersive mode bridge methods
 * @pos Plugin
 * @description Exposes Android immersive-system-bars controls so fullscreen experiences can hide and restore the system bars without shrinking the WebView.
 */
import { registerPlugin } from '@capacitor/core';

export interface ImmersiveModePlugin {
  enter(): Promise<void>;
  exit(): Promise<void>;
}

const ImmersiveMode = registerPlugin<ImmersiveModePlugin>('ImmersiveMode');

export default ImmersiveMode;
