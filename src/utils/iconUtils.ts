/**
 * @file iconUtils.ts
 * @description 图标工具函数 - 处理 emoji 和 uiIcon 的获取和设置
 */

/**
 * 获取当前应该显示的图标
 * @param emoji - emoji 字符（默认主题使用）
 * @param uiIcon - UI 图标 ID（自定义主题使用）
 * @param currentTheme - 当前 UI 主题
 * @returns 应该显示的图标
 */
export function getDisplayIcon(
  emoji: string,
  uiIcon: string | undefined,
  currentTheme: string
): string {
  // 如果是默认主题，返回 emoji
  if (currentTheme === 'default') {
    return emoji;
  }
  
  // 如果是自定义主题，优先返回 uiIcon，如果没有则返回 emoji
  return uiIcon || emoji;
}

/**
 * 设置图标（根据当前主题决定设置哪个字段）
 * @param newIcon - 新图标值
 * @param currentTheme - 当前 UI 主题
 * @param currentEmoji - 当前的 emoji 值
 * @param currentUiIcon - 当前的 uiIcon 值
 * @returns 更新后的 emoji 和 uiIcon
 */
export function setIcon(
  newIcon: string,
  currentTheme: string,
  currentEmoji: string,
  currentUiIcon: string | undefined
): { emoji: string; uiIcon: string | undefined } {
  // 如果是默认主题，更新 emoji
  if (currentTheme === 'default') {
    return {
      emoji: newIcon,
      uiIcon: currentUiIcon
    };
  }
  
  // 如果是自定义主题，更新 uiIcon
  return {
    emoji: currentEmoji,
    uiIcon: newIcon
  };
}

/**
 * 检查是否有 UI 图标数据
 * @param uiIcon - UI 图标 ID
 * @returns 是否有 UI 图标
 */
export function hasUiIcon(uiIcon: string | undefined): boolean {
  return !!uiIcon && uiIcon.startsWith('ui:');
}

/**
 * 初始化 uiIcon 字段（用于数据迁移）
 * 如果对象没有 uiIcon 字段，则添加为 undefined
 */
export function ensureUiIconField<T extends { icon: string; uiIcon?: string }>(
  item: T
): T {
  if (!('uiIcon' in item)) {
    return { ...item, uiIcon: undefined };
  }
  return item;
}
