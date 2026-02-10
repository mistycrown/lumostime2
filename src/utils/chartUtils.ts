/**
 * @file chartUtils.ts
 * @input percentage, colors, durations
 * @output SVG paths, formatted strings, color values
 * @pos Utility (Chart Rendering)
 * @description 图表渲染工具函数 - SVG 路径计算、颜色处理、时长格式化
 * 
 * 使用场景：
 * - StatsView (所有图表视图)
 * - PieChartView
 * - LineChartView
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import { COLOR_OPTIONS } from '../constants';

/**
 * 饼图路径数据接口
 */
export interface PieChartPathData {
  d: string;
  startAngle: number;
  endAngle: number;
}

/**
 * 计算饼图 SVG 路径
 * 
 * @param percentage - 百分比（0-100）
 * @param currentAngle - 当前起始角度
 * @param options - 配置选项
 * @returns SVG 路径数据
 * 
 * @example
 * ```typescript
 * let angle = 0;
 * const path1 = calculatePieChartPath(30, angle);
 * angle = path1.endAngle;
 * const path2 = calculatePieChartPath(50, angle);
 * ```
 */
export const calculatePieChartPath = (
  percentage: number,
  currentAngle: number,
  options: {
    radius?: number;
    center?: number;
    gapAngle?: number;
  } = {}
): PieChartPathData | null => {
  const { radius = 80, center = 100, gapAngle = 2 } = options;

  const sweepAngle = (percentage / 100) * 360;
  
  // 如果角度太小，不渲染
  if (sweepAngle < 1) return null;

  const startAngle = currentAngle;
  const endAngle = currentAngle + sweepAngle - gapAngle;

  const startRad = (startAngle - 90) * Math.PI / 180.0;
  const endRad = (endAngle - 90) * Math.PI / 180.0;

  const x1 = center + radius * Math.cos(startRad);
  const y1 = center + radius * Math.sin(startRad);
  const x2 = center + radius * Math.cos(endRad);
  const y2 = center + radius * Math.sin(endRad);

  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  const d = ["M", x1, y1, "A", radius, radius, 0, largeArcFlag, 1, x2, y2].join(" ");

  return {
    d,
    startAngle,
    endAngle: currentAngle + sweepAngle
  };
};

/**
 * 批量计算饼图路径
 * 
 * @param percentages - 百分比数组
 * @param options - 配置选项
 * @returns SVG 路径数组
 * 
 * @example
 * ```typescript
 * const paths = calculatePieChartPaths([30, 50, 20]);
 * // 返回 3 个路径数据
 * ```
 */
export const calculatePieChartPaths = (
  percentages: number[],
  options: {
    radius?: number;
    center?: number;
    gapAngle?: number;
  } = {}
): (PieChartPathData | null)[] => {
  let currentAngle = 0;
  return percentages.map(percentage => {
    const pathData = calculatePieChartPath(percentage, currentAngle, options);
    if (pathData) {
      currentAngle = pathData.endAngle;
    }
    return pathData;
  });
};

/**
 * 从 Tailwind 颜色类名获取十六进制颜色值
 * 
 * @param className - Tailwind 颜色类名（如 'text-red-500' 或 'bg-blue-400'）
 * @returns 十六进制颜色值
 * 
 * @example
 * ```typescript
 * const color = getHexColor('text-red-500');
 * // 返回: '#fca5a5'
 * ```
 */
export const getHexColor = (className: string = ''): string => {
  if (typeof className !== 'string') return '#e7e5e4';
  
  const match = className.match(/(?:text|bg)-([a-z]+)-/);
  const colorId = match ? match[1] : 'stone';
  const option = COLOR_OPTIONS.find(opt => opt.id === colorId);
  
  return option ? (option.lightHex || option.hex) : '#e7e5e4';
};

/**
 * 获取日程视图的样式类名
 * 
 * @param className - Tailwind 颜色类名
 * @returns 完整的样式类名字符串
 * 
 * @example
 * ```typescript
 * const style = getScheduleStyle('text-red-500');
 * // 返回: 'bg-red-100/90 text-red-700 border-red-200'
 * ```
 */
export const getScheduleStyle = (className: string = ''): string => {
  if (typeof className !== 'string') return 'bg-stone-100 text-stone-700 border-stone-200';
  
  const match = className.match(/(?:text|bg)-([a-z]+)-/);
  const color = match ? match[1] : 'stone';
  
  const styles: Record<string, string> = {
    stone: 'bg-stone-100/90 text-stone-700 border-stone-200',
    slate: 'bg-slate-100/90 text-slate-700 border-slate-200',
    gray: 'bg-gray-100/90 text-gray-700 border-gray-200',
    zinc: 'bg-zinc-100/90 text-zinc-700 border-zinc-200',
    neutral: 'bg-neutral-100/90 text-neutral-700 border-neutral-200',
    red: 'bg-red-100/90 text-red-700 border-red-200',
    orange: 'bg-orange-100/90 text-orange-700 border-orange-200',
    amber: 'bg-amber-100/90 text-amber-700 border-amber-200',
    yellow: 'bg-yellow-100/90 text-yellow-700 border-yellow-200',
    lime: 'bg-lime-100/90 text-lime-700 border-lime-200',
    green: 'bg-green-100/90 text-green-700 border-green-200',
    emerald: 'bg-emerald-100/90 text-emerald-700 border-emerald-200',
    teal: 'bg-teal-100/90 text-teal-700 border-teal-200',
    cyan: 'bg-cyan-100/90 text-cyan-700 border-cyan-200',
    sky: 'bg-sky-100/90 text-sky-700 border-sky-200',
    blue: 'bg-blue-100/90 text-blue-700 border-blue-200',
    indigo: 'bg-indigo-100/90 text-indigo-700 border-indigo-200',
    violet: 'bg-violet-100/90 text-violet-700 border-violet-200',
    purple: 'bg-purple-100/90 text-purple-700 border-purple-200',
    fuchsia: 'bg-fuchsia-100/90 text-fuchsia-700 border-fuchsia-200',
    pink: 'bg-pink-100/90 text-pink-700 border-pink-200',
    rose: 'bg-rose-100/90 text-rose-700 border-rose-200',
  };
  
  return styles[color] || styles['stone'];
};

/**
 * 格式化时长（秒 -> 小时分钟）
 * 
 * @param seconds - 秒数
 * @returns 格式化的时长字符串
 * 
 * @example
 * ```typescript
 * formatDuration(3665);  // '1小时 1分钟'
 * formatDuration(125);   // '2分钟'
 * formatDuration(0);     // '0分钟'
 * ```
 */
export const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  
  if (h > 0) return `${h}小时 ${m}分钟`;
  return `${m}分钟`;
};

/**
 * 将秒数转换为小时和分钟对象
 * 
 * @param seconds - 秒数
 * @returns 包含小时和分钟的对象
 * 
 * @example
 * ```typescript
 * const { h, m } = secondsToHoursMinutes(3665);
 * // { h: 1, m: 1 }
 * ```
 */
export const secondsToHoursMinutes = (seconds: number): { h: number; m: number } => {
  return {
    h: Math.floor(seconds / 3600),
    m: Math.floor((seconds % 3600) / 60)
  };
};

/**
 * 折线图颜色映射表
 */
export const CHART_LINE_COLORS: Record<string, string> = {
  red: '#fca5a5',
  blue: '#93c5fd',
  orange: '#fdba74',
  purple: '#d8b4fe',
  emerald: '#6ee7b7',
  fuchsia: '#f0abfc',
  yellow: '#fde047',
  cyan: '#67e8f9',
  rose: '#fda4af',
  indigo: '#a5b4fc',
  lime: '#bef264',
  violet: '#c4b5fd',
  amber: '#fcd34d',
  sky: '#7dd3fc',
  green: '#86efac',
  pink: '#f9a8d4',
  teal: '#5eead4'
};

/**
 * 获取折线图颜色
 * 
 * @param colorClass - Tailwind 颜色类名
 * @returns 十六进制颜色值
 * 
 * @example
 * ```typescript
 * const stroke = getLineChartColor('text-red-500');
 * // 返回: '#fca5a5'
 * ```
 */
export const getLineChartColor = (colorClass: string = ''): string => {
  if (typeof colorClass !== 'string') return '#d6d3d1';
  
  const match = colorClass.match(/(?:text|bg)-([a-z]+)-/);
  const colorId = match ? match[1] : 'stone';
  
  return CHART_LINE_COLORS[colorId] || '#d6d3d1';
};

/**
 * 生成折线图路径
 * 
 * @param dataPoints - 数据点数组
 * @param getX - 获取 X 坐标的函数
 * @param getY - 获取 Y 坐标的函数
 * @returns SVG 路径字符串
 * 
 * @example
 * ```typescript
 * const path = generateLineChartPath(
 *   [1, 2, 3, 4],
 *   (i) => i * 10,
 *   (val) => 100 - val * 20
 * );
 * // 返回: 'M 0 80 L 10 60 L 20 40 L 30 20'
 * ```
 */
export const generateLineChartPath = (
  dataPoints: number[],
  getX: (index: number) => number,
  getY: (value: number) => number
): string => {
  if (dataPoints.length < 2) return '';
  
  return dataPoints
    .map((val, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(val)}`)
    .join(' ');
};

/**
 * 计算 Y 轴最大值（向上取整到合适的刻度）
 * 
 * @param dataPoints - 所有数据系列
 * @returns 最大值
 * 
 * @example
 * ```typescript
 * const max = calculateYAxisMax([[1, 2, 3], [4, 5, 6]]);
 * // 返回: 6 (或更大的整数)
 * ```
 */
export const calculateYAxisMax = (dataPoints: number[][]): number => {
  let max = 0;
  dataPoints.forEach(series => {
    series.forEach(v => {
      if (v > max) max = v;
    });
  });
  
  return max > 0 ? Math.ceil(max) : 5; // 默认最小值为 5
};
