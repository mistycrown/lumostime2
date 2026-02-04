import { sha256 } from '../utils/crypto';
import { MASTER_KEYS } from '../constants/redemptionHashes';

/**
 * 兑换码验证结果接口
 */
export interface RedemptionResult {
  success: boolean;
  supporterId?: number;
  error?: string;
}

/**
 * 将用户ID编码成看起来随机的字符串
 * 使用HMAC确保安全性和一致性
 */
async function encodeUserId(userId: number, masterKey: string): Promise<string> {
  // 使用Web Crypto API的HMAC
  const encoder = new TextEncoder();
  const message = `USER_${userId.toString().padStart(6, '0')}_LUMOS`;
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(masterKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  
  // 转换为base32并取前8位
  const bytes = new Uint8Array(signature.slice(0, 6));
  const base32 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
    .toUpperCase()
    .slice(0, 8);
  
  return base32;
}

/**
 * 解码兑换码并验证其合法性
 */
async function decodeAndVerify(code: string, masterKeys: string[]): Promise<{ isValid: boolean; userId?: number; masterKey?: string }> {
  if (!code.startsWith("LUMOS-")) {
    return { isValid: false };
  }
  
  try {
    // 解析兑换码格式: LUMOS-{ENCODED_ID}
    const encodedPart = code.slice(6); // 去掉 "LUMOS-" 前缀
    
    // 尝试每个主密钥
    for (const masterKey of masterKeys) {
      // 尝试不同的用户ID（限制搜索范围以提高性能）
      for (let userId = 1; userId <= 10000; userId++) { // 限制搜索范围
        const expectedEncoded = await encodeUserId(userId, masterKey);
        if (expectedEncoded === encodedPart) {
          return { isValid: true, userId, masterKey };
        }
      }
    }
    
    return { isValid: false };
  } catch (error) {
    console.error('Decode error:', error);
    return { isValid: false };
  }
}

/**
 * 兑换码验证服务类
 * 负责处理兑换码验证的核心业务逻辑
 */
export class RedemptionService {
  private readonly STORAGE_KEY = 'lumos_sponsorship_code';

  /**
   * 验证兑换码
   * @param code - 用户输入的兑换码
   * @returns Promise<RedemptionResult> - 验证结果
   */
  async verifyCode(code: string): Promise<RedemptionResult> {
    try {
      // 输入标准化：去除空格、转换大写
      const normalizedCode = code.trim().toUpperCase();

      // 使用算法验证兑换码
      const result = await decodeAndVerify(normalizedCode, MASTER_KEYS);

      if (result.isValid && result.userId) {
        // 验证成功
        return {
          success: true,
          supporterId: result.userId,
        };
      } else {
        // 验证失败
        return {
          success: false,
          error: '兑换码无效，请检查后重试',
        };
      }
    } catch (error) {
      // 验证过程中出错
      console.error('Verification error:', error);
      return {
        success: false,
        error: '验证失败，请重试',
      };
    }
  }

  /**
   * 保存验证成功的兑换码
   * @param code - 兑换码
   */
  saveCode(code: string): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, code);
    } catch (error) {
      // LocalStorage 不可用时的降级处理
      console.warn('LocalStorage not available, using session-only mode:', error);
      // 可以在这里添加内存存储作为降级方案
    }
  }

  /**
   * 获取已保存的兑换码
   * @returns string | null - 保存的兑换码或 null
   */
  getSavedCode(): string | null {
    try {
      return localStorage.getItem(this.STORAGE_KEY);
    } catch (error) {
      // LocalStorage 不可用时的降级处理
      console.warn('LocalStorage not available:', error);
      return null;
    }
  }

  /**
   * 清除已保存的兑换码
   */
  clearSavedCode(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      // LocalStorage 不可用时的降级处理
      console.warn('LocalStorage not available:', error);
    }
  }

  /**
   * 检查是否已验证
   * @returns Promise<boolean> - 是否已验证
   */
  async isVerified(): Promise<boolean> {
    // 获取已保存的兑换码
    const savedCode = this.getSavedCode();

    if (!savedCode) {
      return false;
    }

    // 如果存在，自动验证
    const result = await this.verifyCode(savedCode);

    // 如果验证失败，清除保存的兑换码
    if (!result.success) {
      this.clearSavedCode();
      return false;
    }

    // 返回验证状态
    return true;
  }
}
