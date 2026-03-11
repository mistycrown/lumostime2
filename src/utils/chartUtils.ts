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

import {
  CHART_STROKE_COLORS,
  getChartStrokeColor,
  getColorHexForCharts,
  getSchedulePresentation,
  type ScheduleThemeVariant,
  type ColorRenderPresentation,
} from './colorAdapterUtils';

export type ScheduleStyleResult = ColorRenderPresentation;

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
  return getColorHexForCharts(className);
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
export const getScheduleStyle = (
  className: string = '',
  theme: ScheduleThemeVariant = 'default'
): ScheduleStyleResult => {
  return getSchedulePresentation(className, theme);
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
  ...CHART_STROKE_COLORS,
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
  return getChartStrokeColor(colorClass);
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
