/**
 * @file redemptionHashes.ts
 * @input Encoded transformation parameters
 * @output Normalized redemption transform parameters and master key identifiers
 * @pos Constants (Redemption System)
 * @description 兑换码参数常量，兼容历史配置中的 `xor` / `Xor` 字段差异，避免旧兑换码校验失败。
 *
 * 核心内容：
 * - 转换参数（multiplier、offset、xor）
 * - 主密钥标识符
 * - Base64 编码的配置数据
 *
 * 修改历史：
 * - 2026-03-21: 兼容历史 `Xor` 字段，修复尾号为 0 的兑换码无法校验的问题。
 */

export type RawTransformParam = {
  multiplier: number;
  offset: number;
  xor?: number;
  Xor?: number;
};

export type TransformParam = {
  multiplier: number;
  offset: number;
  xor: number;
};

// Core transformation utilities
const decodeBase64 = (value: string) => atob(value);
const parseParams = (value: string): RawTransformParam[] => JSON.parse(decodeBase64(value));

// Encoded configuration data
const encodedParams =
  'W3sibXVsdGlwbGllciI6MTg0Nywib2Zmc2V0IjoxMjM0NSwiWG9yIjo0Mzk4MX0seyJtdWx0aXBsaWVyIjoyNjYzLCJvZmZzZXQiOjIzNDU2LCJ4b3IiOjQ4MzUwfSx7Im11bHRpcGxpZXIiOjM0OTEsIm9mZnNldCI6MzQ1NjcsInhvciI6NTI3MTl9LHsibXVsdGlwbGllciI6NDIxOSwib2Zmc2V0Ijo0NTY3OCwieG9yIjo1NzA3Mn0seyJtdWx0aXBsaWVyIjo1MzQ3LCJvZmZzZXQiOjU2Nzg5LCJ4b3IiOjYxMTg1fV0=';

export const TRANSFORM_PARAMS: TransformParam[] = parseParams(encodedParams).map((param) => ({
  multiplier: param.multiplier,
  offset: param.offset,
  xor: param.xor ?? param.Xor ?? 0,
}));

// Key identifiers for display purposes
export const MASTER_KEYS = [
  'LUMOS_MASTER_KEY_ALPHA',
  'LUMOS_MASTER_KEY_BETA',
  'LUMOS_MASTER_KEY_GAMMA',
  'LUMOS_MASTER_KEY_DELTA',
  'LUMOS_MASTER_KEY_EPSILON',
];
