/**
 * @file redemptionHashes.ts
 * @input Encoded transformation parameters
 * @output Decoded transformation parameters, Master key identifiers
 * @pos Constants (Redemption System)
 * @description 兑换码哈希参数 - 存储兑换码验证所需的转换参数和主密钥标识
 * 
 * 核心内容：
 * - 转换参数（multiplier, offset, xor）
 * - 主密钥标识符
 * - Base64 编码的配置数据
 * 
 * 安全说明：
 * - 参数经过 Base64 编码
 * - 用于兑换码的加密和验证
 * - 配合 redemptionService 使用
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

// Core transformation utilities
const _e = (s: string) => atob(s);
const _d = (o: any) => JSON.parse(_e(o));

// Encoded configuration data
const _p = "W3sibXVsdGlwbGllciI6MTg0Nywib2Zmc2V0IjoxMjM0NSwiWG9yIjo0Mzk4MX0seyJtdWx0aXBsaWVyIjoyNjYzLCJvZmZzZXQiOjIzNDU2LCJ4b3IiOjQ4MzUwfSx7Im11bHRpcGxpZXIiOjM0OTEsIm9mZnNldCI6MzQ1NjcsInhvciI6NTI3MTl9LHsibXVsdGlwbGllciI6NDIxOSwib2Zmc2V0Ijo0NTY3OCwieG9yIjo1NzA3Mn0seyJtdWx0aXBsaWVyIjo1MzQ3LCJvZmZzZXQiOjU2Nzg5LCJ4b3IiOjYxMTg1fV0=";

export const TRANSFORM_PARAMS = _d(_p);

// Key identifiers for display purposes
export const MASTER_KEYS = [
    "LUMOS_MASTER_KEY_ALPHA",
    "LUMOS_MASTER_KEY_BETA",
    "LUMOS_MASTER_KEY_GAMMA",
    "LUMOS_MASTER_KEY_DELTA",
    "LUMOS_MASTER_KEY_EPSILON"
];
