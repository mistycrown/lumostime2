/**
 * @file clipboardUtils.ts
 * @input text to copy
 * @output success/failure
 * @pos Utility (Clipboard)
 * @description 统一的剪贴板操作工具 - 支持现代和传统浏览器
 * 
 * 使用场景：
 * - TimelineView
 * - StatsView
 * - 其他需要复制功能的组件
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

/**
 * 复制文本到剪贴板（现代浏览器）
 * 
 * @param text - 要复制的文本
 * @returns Promise<boolean> - 是否成功
 * 
 * @example
 * ```typescript
 * const success = await copyToClipboard('Hello World');
 * if (success) {
 *   console.log('复制成功');
 * }
 * ```
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    // 优先使用现代 Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // 降级到传统方法
    return fallbackCopyToClipboard(text);
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    
    // 如果现代 API 失败，尝试降级方法
    try {
      return fallbackCopyToClipboard(text);
    } catch (fallbackError) {
      console.error('Fallback copy also failed:', fallbackError);
      return false;
    }
  }
};

/**
 * 降级的复制方法（兼容旧浏览器）
 * 
 * @param text - 要复制的文本
 * @returns boolean - 是否成功
 */
export const fallbackCopyToClipboard = (text: string): boolean => {
  try {
    // 创建临时 textarea 元素
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // 设置样式使其不可见
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.opacity = '0';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    // 尝试复制
    const successful = document.execCommand('copy');
    
    // 清理
    document.body.removeChild(textArea);
    
    return successful;
  } catch (error) {
    console.error('Fallback copy failed:', error);
    return false;
  }
};

/**
 * 从剪贴板读取文本
 * 
 * @returns Promise<string | null> - 剪贴板内容，失败返回 null
 * 
 * @example
 * ```typescript
 * const text = await readFromClipboard();
 * if (text) {
 *   console.log('剪贴板内容:', text);
 * }
 * ```
 */
export const readFromClipboard = async (): Promise<string | null> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      const text = await navigator.clipboard.readText();
      return text;
    }
    
    // 旧浏览器不支持读取剪贴板
    console.warn('Clipboard read not supported in this browser');
    return null;
  } catch (error) {
    console.error('Failed to read from clipboard:', error);
    return null;
  }
};

/**
 * 检查是否支持剪贴板 API
 * 
 * @returns boolean - 是否支持
 * 
 * @example
 * ```typescript
 * if (isClipboardSupported()) {
 *   // 显示复制按钮
 * }
 * ```
 */
export const isClipboardSupported = (): boolean => {
  return !!(navigator.clipboard && window.isSecureContext);
};

/**
 * 复制文本并显示提示（带回调）
 * 
 * @param text - 要复制的文本
 * @param onSuccess - 成功回调
 * @param onError - 失败回调
 * 
 * @example
 * ```typescript
 * copyWithFeedback(
 *   'Hello World',
 *   () => showToast('复制成功'),
 *   () => showToast('复制失败')
 * );
 * ```
 */
export const copyWithFeedback = async (
  text: string,
  onSuccess?: () => void,
  onError?: (error: Error) => void
): Promise<void> => {
  try {
    const success = await copyToClipboard(text);
    
    if (success) {
      onSuccess?.();
    } else {
      onError?.(new Error('Copy failed'));
    }
  } catch (error) {
    onError?.(error as Error);
  }
};

/**
 * 复制 HTML 内容到剪贴板
 * 
 * @param html - HTML 内容
 * @param plainText - 纯文本备用内容
 * @returns Promise<boolean> - 是否成功
 * 
 * @example
 * ```typescript
 * const success = await copyHTMLToClipboard(
 *   '<b>Hello</b> World',
 *   'Hello World'
 * );
 * ```
 */
export const copyHTMLToClipboard = async (
  html: string,
  plainText: string
): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      const blob = new Blob([html], { type: 'text/html' });
      const textBlob = new Blob([plainText], { type: 'text/plain' });
      
      const data = new ClipboardItem({
        'text/html': blob,
        'text/plain': textBlob
      });
      
      await navigator.clipboard.write([data]);
      return true;
    }
    
    // 降级到纯文本复制
    return await copyToClipboard(plainText);
  } catch (error) {
    console.error('Failed to copy HTML to clipboard:', error);
    
    // 降级到纯文本复制
    try {
      return await copyToClipboard(plainText);
    } catch (fallbackError) {
      return false;
    }
  }
};

/**
 * 复制图片到剪贴板
 * 
 * @param imageUrl - 图片 URL
 * @returns Promise<boolean> - 是否成功
 * 
 * @example
 * ```typescript
 * const success = await copyImageToClipboard('/images/chart.png');
 * ```
 */
export const copyImageToClipboard = async (imageUrl: string): Promise<boolean> => {
  try {
    if (!navigator.clipboard || !window.isSecureContext) {
      console.warn('Clipboard API not supported');
      return false;
    }
    
    // 获取图片数据
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    
    // 复制到剪贴板
    const data = new ClipboardItem({ [blob.type]: blob });
    await navigator.clipboard.write([data]);
    
    return true;
  } catch (error) {
    console.error('Failed to copy image to clipboard:', error);
    return false;
  }
};

/**
 * 批量复制多个项目
 * 
 * @param items - 要复制的项目列表
 * @param separator - 分隔符
 * @returns Promise<boolean> - 是否成功
 * 
 * @example
 * ```typescript
 * const success = await copyMultipleItems(
 *   ['Item 1', 'Item 2', 'Item 3'],
 *   '\n'
 * );
 * ```
 */
export const copyMultipleItems = async (
  items: string[],
  separator: string = '\n'
): Promise<boolean> => {
  const text = items.join(separator);
  return await copyToClipboard(text);
};
