/**
 * @file useImageFallback.ts
 * @input initialSrc (image URL)
 * @output src, hasError, handleError
 * @pos Hook (Image Loading)
 * @description 统一的图片降级处理 Hook - 自动尝试 PNG/WebP 格式降级
 * 
 * 使用场景：
 * - NavigationDecorationSelector
 * - IconPreview
 * - IconRenderer
 * - TimelineImage
 * - PresetEditModal
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import { useState, useCallback, useEffect } from 'react';

interface UseImageFallbackOptions {
  /**
   * 是否启用格式降级（PNG ↔ WebP）
   * @default true
   */
  enableFormatFallback?: boolean;
  
  /**
   * 降级顺序
   * @default ['png', 'webp']
   */
  fallbackOrder?: ('png' | 'webp')[];
  
  /**
   * 错误回调
   */
  onError?: (error: Error) => void;
}

interface UseImageFallbackReturn {
  /**
   * 当前图片 URL
   */
  src: string;
  
  /**
   * 是否所有尝试都失败
   */
  hasError: boolean;
  
  /**
   * 错误处理函数（用于 img onError）
   */
  handleError: () => void;
  
  /**
   * 重置状态（用于重新加载）
   */
  reset: () => void;
  
  /**
   * 当前尝试次数
   */
  attempts: number;
}

/**
 * 图片降级处理 Hook
 * 
 * @example
 * ```tsx
 * const { src, hasError, handleError } = useImageFallback('/images/icon.png');
 * 
 * if (hasError) {
 *   return <div>😊</div>; // 显示降级内容
 * }
 * 
 * return <img src={src} onError={handleError} />;
 * ```
 * 
 * @example
 * ```tsx
 * // 自定义降级顺序
 * const { src, hasError, handleError } = useImageFallback('/images/icon.webp', {
 *   fallbackOrder: ['webp', 'png']
 * });
 * ```
 */
export const useImageFallback = (
  initialSrc: string,
  options: UseImageFallbackOptions = {}
): UseImageFallbackReturn => {
  const {
    enableFormatFallback = true,
    fallbackOrder = ['png', 'webp'],
    onError
  } = options;

  const [src, setSrc] = useState(initialSrc);
  const [hasError, setHasError] = useState(false);
  const [attempts, setAttempts] = useState(0);

  // 当 initialSrc 变化时重置状态
  useEffect(() => {
    setSrc(initialSrc);
    setHasError(false);
    setAttempts(0);
  }, [initialSrc]);

  const handleError = useCallback(() => {
    if (!enableFormatFallback) {
      setHasError(true);
      onError?.(new Error(`Failed to load image: ${src}`));
      return;
    }

    // 尝试格式降级
    if (attempts === 0) {
      // 第一次失败，尝试另一种格式
      if (src.endsWith('.png') && fallbackOrder.includes('webp')) {
        setSrc(src.replace(/\.png$/, '.webp'));
        setAttempts(1);
        return;
      } else if (src.endsWith('.webp') && fallbackOrder.includes('png')) {
        setSrc(src.replace(/\.webp$/, '.png'));
        setAttempts(1);
        return;
      }
    } else if (attempts === 1) {
      // 第二次失败，尝试回退到原始格式
      if (src.endsWith('.webp') && initialSrc.endsWith('.png')) {
        setSrc(initialSrc);
        setAttempts(2);
        return;
      } else if (src.endsWith('.png') && initialSrc.endsWith('.webp')) {
        setSrc(initialSrc);
        setAttempts(2);
        return;
      }
    }

    // 所有尝试都失败
    setHasError(true);
    onError?.(new Error(`Failed to load image after ${attempts + 1} attempts: ${src}`));
  }, [src, attempts, enableFormatFallback, fallbackOrder, initialSrc, onError]);

  const reset = useCallback(() => {
    setSrc(initialSrc);
    setHasError(false);
    setAttempts(0);
  }, [initialSrc]);

  return {
    src,
    hasError,
    handleError,
    reset,
    attempts
  };
};

/**
 * 获取图片降级 URL（不使用 Hook）
 * 用于不需要状态管理的场景
 * 
 * @example
 * ```tsx
 * const fallbackUrl = getImageFallbackUrl('/images/icon.png');
 * // 返回: '/images/icon.webp'
 * ```
 */
export const getImageFallbackUrl = (url: string): string => {
  if (url.endsWith('.png')) {
    return url.replace(/\.png$/, '.webp');
  } else if (url.endsWith('.webp')) {
    return url.replace(/\.webp$/, '.png');
  }
  return url;
};
