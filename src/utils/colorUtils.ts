/**
 * @file colorUtils.ts
 * @input color class string
 * @output hex color code
 * @pos Utility (Color)
 * @description 统一的颜色提取和转换工具 - 从 Tailwind 类名提取十六进制颜色
 * 
 * 使用场景：
 * - BatchManageView
 * - CategoryDetailView
 * - 其他需要从 Tailwind 类名提取颜色的组件
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import { COLOR_OPTIONS } from '../constants';

/**
 * 从 Tailwind 颜色类名中提取十六进制颜色
 * 
 * @param colorClass - Tailwind 颜色类名（如 "bg-blue-500" 或 "text-red-600"）
 * @param prefix - 类名前缀（'bg' 或 'text'）
 * @param useLight - 是否使用浅色版本（lightHex）
 * @returns 十六进制颜色代码
 * 
 * @example
 * ```typescript
 * // 从背景色类名提取
 * const color = extractColorHex('bg-blue-500 text-white', 'bg');
 * // 返回: '#3b82f6' (或 lightHex)
 * 
 * // 从文本色类名提取
 * const color = extractColorHex('text-red-600', 'text');
 * // 返回: '#dc2626' (或 lightHex)
 * 
 * // 使用浅色版本
 * const lightColor = extractColorHex('bg-blue-500', 'bg', true);
 * // 返回: '#dbeafe' (lightHex)
 * ```
 */
export const extractColorHex = (
  colorClass: string,
  prefix: 'bg' | 'text' = 'bg',
  useLight: boolean = true
): string => {
  if (!colorClass) return '#e7e5e4'; // Default stone-200
  
  // 匹配 bg-{color}- 或 text-{color}- 模式
  const pattern = new RegExp(`${prefix}-([a-z]+)-`);
  const match = colorClass.match(pattern);
  
  if (match) {
    const colorName = match[1];
    const option = COLOR_OPTIONS.find(opt => opt.id === colorName);
    
    if (option) {
      return useLight ? option.lightHex : option.hex;
    }
  }
  
  return '#e7e5e4'; // Default stone-200
};

/**
 * 从活动颜色类名中提取十六进制颜色
 * 活动颜色格式: "bg-{color}-{shade} text-{color}-{shade}"
 * 
 * @param activityColor - 活动颜色类名
 * @param useLight - 是否使用浅色版本
 * @returns 十六进制颜色代码
 * 
 * @example
 * ```typescript
 * const color = extractActivityColor('bg-blue-100 text-blue-600');
 * // 返回: '#dbeafe' (lightHex)
 * ```
 */
export const extractActivityColor = (
  activityColor: string,
  useLight: boolean = true
): string => {
  return extractColorHex(activityColor, 'bg', useLight);
};

/**
 * 从分类主题颜色类名中提取十六进制颜色
 * 分类主题颜色格式: "text-{color}-{shade}"
 * 
 * @param themeColor - 分类主题颜色类名
 * @param useLight - 是否使用浅色版本
 * @returns 十六进制颜色代码
 * 
 * @example
 * ```typescript
 * const color = extractCategoryColor('text-blue-600');
 * // 返回: '#dbeafe' (lightHex)
 * ```
 */
export const extractCategoryColor = (
  themeColor: string,
  useLight: boolean = true
): string => {
  return extractColorHex(themeColor, 'text', useLight);
};

/**
 * 从领域主题颜色类名中提取十六进制颜色
 * 领域主题颜色格式: "text-{color}-{shade}" 或 "bg-{color}-{shade}"
 * 
 * @param themeColor - 领域主题颜色类名
 * @param useLight - 是否使用浅色版本
 * @returns 十六进制颜色代码
 * 
 * @example
 * ```typescript
 * const color = extractScopeColor('text-green-600');
 * // 返回: '#dcfce7' (lightHex)
 * ```
 */
export const extractScopeColor = (
  themeColor: string,
  useLight: boolean = true
): string => {
  // 尝试 text- 前缀
  let color = extractColorHex(themeColor, 'text', useLight);
  
  // 如果没有匹配，尝试 bg- 前缀
  if (color === '#e7e5e4') {
    color = extractColorHex(themeColor, 'bg', useLight);
  }
  
  return color;
};

/**
 * 获取颜色的对比文本颜色（黑色或白色）
 * 
 * @param hexColor - 十六进制颜色代码
 * @returns '#000000' 或 '#ffffff'
 * 
 * @example
 * ```typescript
 * const textColor = getContrastTextColor('#3b82f6');
 * // 返回: '#ffffff' (白色，因为蓝色背景需要白色文字)
 * ```
 */
export const getContrastTextColor = (hexColor: string): string => {
  // 移除 # 号
  const hex = hexColor.replace('#', '');
  
  // 转换为 RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // 计算亮度（使用 YIQ 公式）
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  
  // 亮度大于 128 使用黑色文字，否则使用白色文字
  return yiq >= 128 ? '#000000' : '#ffffff';
};

/**
 * 将十六进制颜色转换为 RGBA
 * 
 * @param hexColor - 十六进制颜色代码
 * @param alpha - 透明度（0-1）
 * @returns RGBA 颜色字符串
 * 
 * @example
 * ```typescript
 * const rgba = hexToRgba('#3b82f6', 0.5);
 * // 返回: 'rgba(59, 130, 246, 0.5)'
 * ```
 */
export const hexToRgba = (hexColor: string, alpha: number = 1): string => {
  // 移除 # 号
  const hex = hexColor.replace('#', '');
  
  // 转换为 RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * 根据颜色名称获取完整的颜色选项
 * 
 * @param colorName - 颜色名称（如 'blue', 'red'）
 * @returns 颜色选项对象或 undefined
 * 
 * @example
 * ```typescript
 * const option = getColorOption('blue');
 * // 返回: { id: 'blue', label: '蓝色', hex: '#3b82f6', lightHex: '#dbeafe', ... }
 * ```
 */
export const getColorOption = (colorName: string) => {
  return COLOR_OPTIONS.find(opt => opt.id === colorName);
};

/**
 * 从 Tailwind 类名中提取颜色名称
 * 
 * @param colorClass - Tailwind 颜色类名
 * @param prefix - 类名前缀（'bg' 或 'text'）
 * @returns 颜色名称或 undefined
 * 
 * @example
 * ```typescript
 * const colorName = extractColorName('bg-blue-500 text-white', 'bg');
 * // 返回: 'blue'
 * ```
 */
export const extractColorName = (
  colorClass: string,
  prefix: 'bg' | 'text' = 'bg'
): string | undefined => {
  if (!colorClass) return undefined;
  
  const pattern = new RegExp(`${prefix}-([a-z]+)-`);
  const match = colorClass.match(pattern);
  
  return match ? match[1] : undefined;
};
