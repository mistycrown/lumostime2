import { sha256 } from '../utils/crypto';
import { REDEMPTION_HASHES } from '../constants/redemptionHashes';

/**
 * 兑换码验证结果接口
 */
export interface RedemptionResult {
  success: boolean;
  supporterId?: number;
  error?: string;
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

      // 计算 SHA-256 哈希值
      const hash = await sha256(normalizedCode);

      // 在 REDEMPTION_HASHES 中查找哈希值
      const supporterId = REDEMPTION_HASHES[hash];

      if (supporterId !== undefined) {
        // 验证成功
        return {
          success: true,
          supporterId,
        };
      } else {
        // 验证失败
        return {
          success: false,
          error: '兑换码无效，请检查后重试',
        };
      }
    } catch (error) {
      // 哈希计算失败或其他错误
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
