/**
 * @file feishuAuthorization.test.ts
 * @input Official and foreign confirmation URLs.
 * @output Coverage for system-browser authorization without WebView navigation.
 * @pos Android Feishu authorization navigation tests.
 */
import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('../plugins/FeishuNativePlugin', () => ({ FeishuNative: { openAuthorization: vi.fn() } }));
import { FeishuNative } from '../plugins/FeishuNativePlugin';
import { openNativeFeishuAuthorization } from './feishuAuthorization';
beforeEach(() => vi.clearAllMocks());

it('opens official pages in the native external browser and refuses foreign pages', async () => {
  const url = 'https://open.feishu.cn/page/launcher?user_code=CODE';
  await openNativeFeishuAuthorization(url);
  expect(FeishuNative.openAuthorization).toHaveBeenCalledWith({ url });
  await expect(openNativeFeishuAuthorization('https://evil.example/page/launcher')).rejects.toThrow('授权地址');
  expect(FeishuNative.openAuthorization).toHaveBeenCalledTimes(1);
});
