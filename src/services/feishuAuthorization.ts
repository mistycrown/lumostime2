/**
 * @file feishuAuthorization.ts
 * @input A validated official Feishu confirmation URL.
 * @output Android system-browser authorization that preserves the app WebView.
 * @pos Feishu authorization navigation; external pages never replace the native app.
 */
import { FeishuNative } from '../plugins/FeishuNativePlugin';
import { validateFeishuAuthorizationUrl } from './feishuCalendarClient';

export async function openNativeFeishuAuthorization(url: string): Promise<void> {
  await FeishuNative.openAuthorization({ url: validateFeishuAuthorizationUrl(url) });
}
