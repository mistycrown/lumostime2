/**
 * @file checkItemNormalizer.ts
 * @description 日课数据归一化工具 - 兼容旧版布尔数据与新版次数数据
 */
import { CheckItem, CheckTemplate, CheckTemplateItem, DailyReview } from '../types';

type ManualMode = 'binary' | 'count';

const toNonNegativeInt = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
};

const toPositiveInt = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.floor(value));
};

const resolveManualMode = (item: Partial<CheckItem | CheckTemplateItem>): ManualMode => {
  return item.manualMode === 'count' ? 'count' : 'binary';
};

const normalizeTemplateItem = (item: Partial<CheckTemplateItem>): CheckTemplateItem => {
  const type: 'manual' | 'auto' = item.type === 'auto' ? 'auto' : 'manual';
  const normalizedBase: CheckTemplateItem = {
    ...item,
    id: item.id || crypto.randomUUID(),
    content: item.content || '',
    type
  };

  if (type === 'auto') {
    return {
      ...normalizedBase,
      manualMode: undefined,
      targetCount: undefined
    };
  }

  const manualMode = resolveManualMode(item);
  if (manualMode === 'count') {
    return {
      ...normalizedBase,
      manualMode: 'count',
      targetCount: toPositiveInt(item.targetCount, 1)
    };
  }

  return {
    ...normalizedBase,
    manualMode: 'binary',
    targetCount: undefined
  };
};

export const normalizeCheckItem = (item: Partial<CheckItem>): CheckItem => {
  const type: 'manual' | 'auto' = item.type === 'auto' ? 'auto' : 'manual';
  const normalizedBase: CheckItem = {
    ...item,
    id: item.id || crypto.randomUUID(),
    content: item.content || '',
    isCompleted: Boolean(item.isCompleted),
    type
  };

  if (type === 'auto') {
    return {
      ...normalizedBase,
      manualMode: undefined,
      currentCount: undefined,
      targetCount: undefined
    };
  }

  const manualMode = resolveManualMode(item);
  if (manualMode === 'count') {
    const targetCount = toPositiveInt(item.targetCount, 1);
    const hasCurrentCount = typeof item.currentCount === 'number' && Number.isFinite(item.currentCount);
    const currentCount = hasCurrentCount
      ? Math.min(toNonNegativeInt(item.currentCount, 0), targetCount)
      : (item.isCompleted ? targetCount : 0);
    return {
      ...normalizedBase,
      manualMode: 'count',
      targetCount,
      currentCount,
      isCompleted: currentCount >= targetCount,
      autoConfig: undefined
    };
  }

  const isCompleted = Boolean(item.isCompleted);
  return {
    ...normalizedBase,
    manualMode: 'binary',
    currentCount: isCompleted ? 1 : 0,
    targetCount: 1,
    isCompleted,
    autoConfig: undefined
  };
};

export const normalizeCheckTemplate = (template: Partial<CheckTemplate>): CheckTemplate => {
  return {
    ...template,
    id: template.id || crypto.randomUUID(),
    title: template.title || '未命名日课',
    items: Array.isArray(template.items) ? template.items.map(normalizeTemplateItem) : [],
    enabled: template.enabled !== false,
    order: typeof template.order === 'number' ? template.order : 0,
    isDaily: template.isDaily !== false
  };
};

export const normalizeDailyReview = (review: Partial<DailyReview>): DailyReview => {
  return {
    ...review,
    id: review.id || crypto.randomUUID(),
    date: review.date || '',
    createdAt: typeof review.createdAt === 'number' ? review.createdAt : Date.now(),
    updatedAt: typeof review.updatedAt === 'number' ? review.updatedAt : Date.now(),
    answers: Array.isArray(review.answers) ? review.answers : [],
    checkItems: Array.isArray(review.checkItems) ? review.checkItems.map(normalizeCheckItem) : []
  };
};

export const normalizeCheckTemplates = (templates: unknown): CheckTemplate[] => {
  if (!Array.isArray(templates)) return [];
  return templates.map(template => normalizeCheckTemplate(template as Partial<CheckTemplate>));
};

export const normalizeDailyReviews = (dailyReviews: unknown): DailyReview[] => {
  if (!Array.isArray(dailyReviews)) return [];
  return dailyReviews.map(review => normalizeDailyReview(review as Partial<DailyReview>));
};
