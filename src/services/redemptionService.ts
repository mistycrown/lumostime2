import { TRANSFORM_PARAMS } from '../constants/redemptionHashes';
import { SPONSORSHIP_KEYS, storage } from '../constants/storageKeys';

/**
 * Redemption verification result interface
 */
export interface RedemptionResult {
  success: boolean;
  supporterId?: number;
  error?: string;
}

// Utility transformation functions
const _x1 = (n: number) => n ^ 0x5A5A;
const _x2 = (n: number) => (n << 3) | (n >> 29);
const _x3 = (n: number) => n * 0x9E3779B9;

/**
 * Encode user identifier with transformation
 */
function encodeUserId(userId: number, masterKeyIndex: number): string {
  const params = TRANSFORM_PARAMS[masterKeyIndex];
  
  let num = userId * params.multiplier;
  num = num + params.offset;
  num = num ^ params.xor;
  num = (num << 4) | masterKeyIndex;
  
  const encoded = (num & 0xFFFFFFFF).toString(16).toUpperCase().padStart(8, '0');
  return encoded;
}

/**
 * Decode and verify user identifier
 */
function decodeUserId(encoded: string): { userId: number; keyIndex: number } | null {
  try {
    let num = parseInt(encoded, 16);
    
    const keyIndex = num & 0xF;
    if (keyIndex >= TRANSFORM_PARAMS.length) {
      return null;
    }
    
    num = num >> 4;
    const params = TRANSFORM_PARAMS[keyIndex];
    
    num = num ^ params.xor;
    num = num - params.offset;
    
    if (num % params.multiplier !== 0) {
      return null;
    }
    
    const userId = num / params.multiplier;
    
    if (userId < 1 || userId > 1000000 || !Number.isInteger(userId)) {
      return null;
    }
    
    return { userId, keyIndex };
    
  } catch (error) {
    return null;
  }
}

/**
 * 优化版本：使用预计算缓存加速解码
 */
class FastDecoder {
  private static cache = new Map<string, { userId: number; keyIndex: number }>();
  
  static decode(encoded: string): { userId: number; keyIndex: number } | null {
    // 检查缓存
    if (this.cache.has(encoded)) {
      return this.cache.get(encoded)!;
    }
    
    // 计算并缓存结果
    const result = decodeUserId(encoded);
    if (result) {
      this.cache.set(encoded, result);
    }
    
    return result;
  }
  
  static clearCache() {
    this.cache.clear();
  }
}

/**
 * 兑换码验证服务类
 * 负责处理兑换码验证的核心业务逻辑
 */
export class RedemptionService {
  // 内存缓存，避免重复计算
  private verificationCache = new Map<string, number>();

  /**
   * 验证兑换码（超快版本）
   * @param code - 用户输入的兑换码
   * @returns Promise<RedemptionResult> - 验证结果
   */
  async verifyCode(code: string): Promise<RedemptionResult> {
    try {
      // 输入标准化：去除空格、转换大写
      const normalizedCode = code.trim().toUpperCase();

      // 1. 检查内存缓存
      if (this.verificationCache.has(normalizedCode)) {
        const userId = this.verificationCache.get(normalizedCode)!;
        return {
          success: true,
          supporterId: userId,
        };
      }

      // 2. 检查格式
      if (!normalizedCode.startsWith("LUMOS-")) {
        return {
          success: false,
          error: '兑换码格式错误',
        };
      }

      // 3. 提取编码部分
      const encodedPart = normalizedCode.slice(6); // 去掉 "LUMOS-"
      
      // 4. 快速解码（只需要5次计算！）
      const result = FastDecoder.decode(encodedPart);

      if (result && result.userId) {
        // 缓存验证结果
        this.verificationCache.set(normalizedCode, result.userId);

        return {
          success: true,
          supporterId: result.userId,
        };
      } else {
        return {
          success: false,
          error: '兑换码无效，请检查后重试',
        };
      }
    } catch (error) {
      console.error('Verification error:', error);
      return {
        success: false,
        error: '验证失败，请重试',
      };
    }
  }

  /**
   * 保存验证成功的兑换码和用户ID
   * @param code - 兑换码
   * @param userId - 用户ID
   */
  saveCode(code: string, userId?: number): void {
    try {
      storage.set(SPONSORSHIP_KEYS.REDEMPTION_CODE, code);
      if (userId) {
        storage.set(SPONSORSHIP_KEYS.SUPPORTER_ID, userId.toString());
      }
    } catch (error) {
      console.warn('LocalStorage not available, using session-only mode:', error);
    }
  }

  /**
   * 获取已保存的兑换码
   * @returns string | null - 保存的兑换码或 null
   */
  getSavedCode(): string | null {
    try {
      return storage.get(SPONSORSHIP_KEYS.REDEMPTION_CODE);
    } catch (error) {
      console.warn('LocalStorage not available:', error);
      return null;
    }
  }

  /**
   * 获取已验证的用户ID（避免重复验证）
   * @returns number | null - 已验证的用户ID或null
   */
  getVerifiedUserId(): number | null {
    try {
      const userId = storage.get(SPONSORSHIP_KEYS.SUPPORTER_ID);
      return userId ? parseInt(userId, 10) : null;
    } catch (error) {
      console.warn('LocalStorage not available:', error);
      return null;
    }
  }

  /**
   * 清除已保存的兑换码和验证状态
   */
  clearSavedCode(): void {
    try {
      storage.remove(SPONSORSHIP_KEYS.REDEMPTION_CODE);
      storage.remove(SPONSORSHIP_KEYS.SUPPORTER_ID);
      this.verificationCache.clear();
      FastDecoder.clearCache();
    } catch (error) {
      console.warn('LocalStorage not available:', error);
    }
  }

  /**
   * 检查是否已验证（超快版本）
   * @returns Promise<{ isVerified: boolean; userId?: number }> - 验证状态和用户ID
   */
  async isVerified(): Promise<{ isVerified: boolean; userId?: number }> {
    // 1. 首先检查是否有已验证的用户ID（瞬间返回）
    const verifiedUserId = this.getVerifiedUserId();
    if (verifiedUserId) {
      return { isVerified: true, userId: verifiedUserId };
    }

    // 2. 如果没有缓存的用户ID，检查是否有保存的兑换码
    const savedCode = this.getSavedCode();
    if (!savedCode) {
      return { isVerified: false };
    }

    // 3. 验证保存的兑换码（现在很快了！）
    const result = await this.verifyCode(savedCode);
    
    if (result.success && result.supporterId) {
      // 保存验证结果以避免下次重复验证
      this.saveCode(savedCode, result.supporterId);
      return { isVerified: true, userId: result.supporterId };
    } else {
      // 如果验证失败，清除保存的数据
      this.clearSavedCode();
      return { isVerified: false };
    }
  }
}
