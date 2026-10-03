/**
 * @file FeishuNativePlugin.ts
 * @input Private execution snapshots and validated official authorization URLs.
 * @output Keystore-backed persistence and external browser authorization.
 * @pos Android bridge; no plaintext browser storage fallback.
 */
import { registerPlugin } from '@capacitor/core';

export interface FeishuNativePlugin {
  read(): Promise<{ snapshot: string | null }>;
  write(options: { snapshot: string }): Promise<void>;
  openAuthorization(options: { url: string }): Promise<void>;
}

export const FeishuNative = registerPlugin<FeishuNativePlugin>('FeishuNative');
