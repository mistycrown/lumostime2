/**
 * @file checkViewUtils.ts
 * @description Check View 工具函数 - 用于打卡视图的颜色计算和样式生成
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

/**
 * 颜色样式定义
 */
export interface ColorStyle {
  bg: string;
  text: string;
  fill: string;
}

/**
 * 周视图颜色样式（浅色填充）
 */
export const WEEK_COLORS: ColorStyle[] = [
  { bg: 'bg-red-100', text: 'text-red-500', fill: 'bg-red-200' },
  { bg: 'bg-orange-100', text: 'text-orange-500', fill: 'bg-orange-200' },
  { bg: 'bg-amber-100', text: 'text-amber-500', fill: 'bg-amber-200' },
  { bg: 'bg-yellow-100', text: 'text-yellow-600', fill: 'bg-yellow-200' },
  { bg: 'bg-lime-100', text: 'text-lime-600', fill: 'bg-lime-200' },
  { bg: 'bg-green-100', text: 'text-green-600', fill: 'bg-green-200' },
  { bg: 'bg-emerald-100', text: 'text-emerald-600', fill: 'bg-emerald-200' },
  { bg: 'bg-teal-100', text: 'text-teal-600', fill: 'bg-teal-200' },
  { bg: 'bg-cyan-100', text: 'text-cyan-600', fill: 'bg-cyan-200' },
  { bg: 'bg-sky-100', text: 'text-sky-600', fill: 'bg-sky-200' },
  { bg: 'bg-blue-100', text: 'text-blue-600', fill: 'bg-blue-200' },
  { bg: 'bg-indigo-100', text: 'text-indigo-600', fill: 'bg-indigo-200' },
  { bg: 'bg-violet-100', text: 'text-violet-600', fill: 'bg-violet-200' },
  { bg: 'bg-purple-100', text: 'text-purple-600', fill: 'bg-purple-200' },
  { bg: 'bg-fuchsia-100', text: 'text-fuchsia-600', fill: 'bg-fuchsia-200' },
  { bg: 'bg-pink-100', text: 'text-pink-600', fill: 'bg-pink-200' },
  { bg: 'bg-rose-100', text: 'text-rose-600', fill: 'bg-rose-200' }
];

/**
 * 月/年视图颜色样式（深色填充）
 */
export const MONTH_YEAR_COLORS: ColorStyle[] = [
  { bg: 'bg-red-100', text: 'text-red-500', fill: 'bg-red-400' },
  { bg: 'bg-orange-100', text: 'text-orange-500', fill: 'bg-orange-400' },
  { bg: 'bg-amber-100', text: 'text-amber-500', fill: 'bg-amber-400' },
  { bg: 'bg-yellow-100', text: 'text-yellow-600', fill: 'bg-yellow-400' },
  { bg: 'bg-lime-100', text: 'text-lime-600', fill: 'bg-lime-400' },
  { bg: 'bg-green-100', text: 'text-green-600', fill: 'bg-green-400' },
  { bg: 'bg-emerald-100', text: 'text-emerald-600', fill: 'bg-emerald-400' },
  { bg: 'bg-teal-100', text: 'text-teal-600', fill: 'bg-teal-400' },
  { bg: 'bg-cyan-100', text: 'text-cyan-600', fill: 'bg-cyan-400' },
  { bg: 'bg-sky-100', text: 'text-sky-600', fill: 'bg-sky-400' },
  { bg: 'bg-blue-100', text: 'text-blue-600', fill: 'bg-blue-400' },
  { bg: 'bg-indigo-100', text: 'text-indigo-600', fill: 'bg-indigo-400' },
  { bg: 'bg-violet-100', text: 'text-violet-600', fill: 'bg-violet-400' },
  { bg: 'bg-purple-100', text: 'text-purple-600', fill: 'bg-purple-400' },
  { bg: 'bg-fuchsia-100', text: 'text-fuchsia-600', fill: 'bg-fuchsia-400' },
  { bg: 'bg-pink-100', text: 'text-pink-600', fill: 'bg-pink-400' },
  { bg: 'bg-rose-100', text: 'text-rose-600', fill: 'bg-rose-400' }
];

/**
 * 根据习惯名称计算颜色索引
 * 使用字符编码总和取模，确保相同名称总是得到相同颜色
 * 
 * @param habitName - 习惯名称
 * @returns 颜色索引
 */
export function getColorIndexForHabit(habitName: string): number {
  return Math.abs(
    habitName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  ) % WEEK_COLORS.length;
}

/**
 * 获取习惯的颜色样式（周视图）
 * 
 * @param habitName - 习惯名称
 * @returns 颜色样式对象
 */
export function getWeekColorStyle(habitName: string): ColorStyle {
  const index = getColorIndexForHabit(habitName);
  return WEEK_COLORS[index];
}

/**
 * 获取习惯的颜色样式（月/年视图）
 * 
 * @param habitName - 习惯名称
 * @returns 颜色样式对象
 */
export function getMonthYearColorStyle(habitName: string): ColorStyle {
  const index = getColorIndexForHabit(habitName);
  return MONTH_YEAR_COLORS[index];
}
