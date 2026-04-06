/**
 * @file timePalStageThresholds.ts
 * @description 时间小友阶段阈值工具，统一处理默认值、存储读取、阶段判定与范围文案
 * @input 本地存储中的阶段阈值配置、累计专注分钟数
 * @output 归一化后的阈值、当前阶段、阶段范围与调试样例分钟数
 * @pos Utility
 */
import { TIMEPAL_KEYS } from '../constants/storageKeys';

export type TimePalStageThresholds = readonly [number, number, number, number];

export interface TimePalStageRange {
  level: number;
  startMinutes: number;
  endMinutes: number | null;
  label: string;
}

export const DEFAULT_TIMEPAL_STAGE_THRESHOLDS: TimePalStageThresholds = [120, 240, 360, 480];
export const TIMEPAL_STAGE_THRESHOLDS_CHANGED_EVENT = 'timepal-stage-thresholds-changed';

const isNonNegativeInteger = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
};

const isValidThresholds = (value: unknown): value is TimePalStageThresholds => {
  if (!Array.isArray(value) || value.length !== 4) {
    return false;
  }

  return value.every(isNonNegativeInteger)
    && value[0] < value[1]
    && value[1] < value[2]
    && value[2] < value[3];
};

export const normalizeTimePalStageThresholds = (value: unknown): TimePalStageThresholds => {
  if (isValidThresholds(value)) {
    return [value[0], value[1], value[2], value[3]];
  }

  return [...DEFAULT_TIMEPAL_STAGE_THRESHOLDS];
};

export const readStoredTimePalStageThresholds = (
  storageLike: Pick<Storage, 'getItem'> = localStorage
): TimePalStageThresholds => {
  try {
    const raw = storageLike.getItem(TIMEPAL_KEYS.STAGE_THRESHOLDS);
    if (!raw) {
      return [...DEFAULT_TIMEPAL_STAGE_THRESHOLDS];
    }

    return normalizeTimePalStageThresholds(JSON.parse(raw));
  } catch {
    return [...DEFAULT_TIMEPAL_STAGE_THRESHOLDS];
  }
};

export const calculateTimePalStageLevel = (
  totalMinutes: number,
  thresholds: TimePalStageThresholds = DEFAULT_TIMEPAL_STAGE_THRESHOLDS
): number => {
  const normalizedThresholds = normalizeTimePalStageThresholds(thresholds);
  const safeMinutes = Number.isFinite(totalMinutes) ? Math.max(0, totalMinutes) : 0;

  if (safeMinutes < normalizedThresholds[0]) {
    return 1;
  }
  if (safeMinutes < normalizedThresholds[1]) {
    return 2;
  }
  if (safeMinutes < normalizedThresholds[2]) {
    return 3;
  }
  if (safeMinutes < normalizedThresholds[3]) {
    return 4;
  }
  return 5;
};

export const getTimePalStageRanges = (
  thresholds: TimePalStageThresholds = DEFAULT_TIMEPAL_STAGE_THRESHOLDS
): TimePalStageRange[] => {
  const normalizedThresholds = normalizeTimePalStageThresholds(thresholds);

  return [
    {
      level: 1,
      startMinutes: 0,
      endMinutes: normalizedThresholds[0] - 1,
      label: `小于 ${normalizedThresholds[0]} 分钟`,
    },
    {
      level: 2,
      startMinutes: normalizedThresholds[0],
      endMinutes: normalizedThresholds[1] - 1,
      label: `${normalizedThresholds[0]} - ${normalizedThresholds[1] - 1} 分钟`,
    },
    {
      level: 3,
      startMinutes: normalizedThresholds[1],
      endMinutes: normalizedThresholds[2] - 1,
      label: `${normalizedThresholds[1]} - ${normalizedThresholds[2] - 1} 分钟`,
    },
    {
      level: 4,
      startMinutes: normalizedThresholds[2],
      endMinutes: normalizedThresholds[3] - 1,
      label: `${normalizedThresholds[2]} - ${normalizedThresholds[3] - 1} 分钟`,
    },
    {
      level: 5,
      startMinutes: normalizedThresholds[3],
      endMinutes: null,
      label: `大于等于 ${normalizedThresholds[3]} 分钟`,
    },
  ];
};

export const getSampleFocusMinutesForStage = (
  level: number,
  thresholds: TimePalStageThresholds = DEFAULT_TIMEPAL_STAGE_THRESHOLDS
): number => {
  const ranges = getTimePalStageRanges(thresholds);
  const range = ranges.find(item => item.level === level) || ranges[0];

  if (range.endMinutes === null) {
    const previousRange = ranges[Math.max(0, range.level - 2)];
    const padding = Math.max(30, Math.round((range.startMinutes - previousRange.startMinutes) / 2));
    return range.startMinutes + padding;
  }

  return Math.round((range.startMinutes + range.endMinutes) / 2);
};
