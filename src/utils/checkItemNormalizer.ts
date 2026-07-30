/**
 * @file checkItemNormalizer.ts
 * @description 日课数据归一化工具 - 兼容旧版布尔数据与新版次数数据
 * @updated 2026-07-30: Defaulted per-item daily check template enabled flags during normalization.
 * @updated 2026-06-13: Preserved Daily Newspaper local comment threads during Daily Review normalization.
 */
import {
  CheckItem,
  CheckTemplate,
  CheckTemplateItem,
  DailyNewspaper,
  DailyReview,
  MonthlyNewspaper,
  MonthlyReview,
  WeeklyNewspaper,
  WeeklyReview
} from '../types';

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
    enabled: item.enabled !== false,
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

export const normalizeDailyNewspaper = (value: Partial<DailyNewspaper> | undefined): DailyNewspaper | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const date = typeof value.date === 'string' ? value.date.trim() : '';
  const title = typeof value.title === 'string' ? value.title.trim() : '';
  const assistantReply = typeof value.assistantReply === 'string' ? value.assistantReply.trim() : '';
  const overallComment = typeof value.overallComment === 'string' ? value.overallComment.trim() : '';
  const annotations = Array.isArray(value.annotations)
    ? value.annotations.flatMap((annotation) => {
      if (!annotation || typeof annotation !== 'object') {
        return [];
      }

      const logId = typeof annotation.logId === 'string' ? annotation.logId.trim() : '';
      const comment = typeof annotation.comment === 'string' ? annotation.comment.trim() : '';
      if (!logId || !comment) {
        return [];
      }

      return [{ logId, comment }];
    })
    : [];
  const commentThreads = Array.isArray(value.commentThreads)
    ? value.commentThreads.flatMap((thread) => {
      if (!thread || typeof thread !== 'object') {
        return [];
      }

      const logId = typeof thread.logId === 'string' ? thread.logId.trim() : '';
      const messages = Array.isArray(thread.messages)
        ? thread.messages.flatMap((message) => {
          if (!message || typeof message !== 'object') {
            return [];
          }

          const role = message.role === 'assistant' ? 'assistant' : message.role === 'user' ? 'user' : '';
          const content = typeof message.content === 'string' ? message.content.trim() : '';
          if (!role || !content) {
            return [];
          }

          return [{
            id: typeof message.id === 'string' && message.id.trim() ? message.id.trim() : crypto.randomUUID(),
            role,
            content,
            createdAt: typeof message.createdAt === 'number' ? message.createdAt : Date.now()
          }];
        })
        : [];

      if (!logId || messages.length === 0) {
        return [];
      }

      return [{
        logId,
        messages,
        updatedAt: typeof thread.updatedAt === 'number'
          ? thread.updatedAt
          : Math.max(...messages.map((message) => message.createdAt))
      }];
    })
    : [];

  if (!date || !title || !assistantReply || !overallComment) {
    return undefined;
  }

  return {
    version: 1,
    date,
    title,
    assistantReply,
    overallComment,
    annotations,
    ...(commentThreads.length > 0 ? { commentThreads } : {}),
    updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : Date.now()
  };
};

export const normalizeWeeklyNewspaper = (value: Partial<WeeklyNewspaper> | undefined): WeeklyNewspaper | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const weekStartDate = typeof value.weekStartDate === 'string' ? value.weekStartDate.trim() : '';
  const weekEndDate = typeof value.weekEndDate === 'string' ? value.weekEndDate.trim() : '';
  const title = typeof value.title === 'string' ? value.title.trim() : '';
  const assistantReply = typeof value.assistantReply === 'string' ? value.assistantReply.trim() : '';
  const overallComment = typeof value.overallComment === 'string' ? value.overallComment.trim() : '';
  const keyInsights = Array.isArray(value.keyInsights)
    ? value.keyInsights.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
    : [];
  const daySections = Array.isArray(value.daySections)
    ? value.daySections.flatMap((section) => {
      if (!section || typeof section !== 'object') {
        return [];
      }

      const date = typeof section.date === 'string' ? section.date.trim() : '';
      const dayLabel = typeof section.dayLabel === 'string' ? section.dayLabel.trim() : '';
      const dailySummary = typeof section.dailySummary === 'string' ? section.dailySummary.trim() : '';
      const keyPoints = Array.isArray(section.keyPoints)
        ? section.keyPoints.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
        : [];

      if (!date || !dayLabel || !dailySummary) {
        return [];
      }

      return [{
        date,
        dayLabel,
        dailySummary,
        keyPoints
      }];
    })
    : [];
  const closingComment = typeof value.closingComment === 'string' ? value.closingComment.trim() : '';
  const nextPeriodPlan = Array.isArray(value.nextPeriodPlan)
    ? value.nextPeriodPlan.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
    : [];

  if (!weekStartDate || !weekEndDate || !title || !assistantReply || !overallComment || !closingComment) {
    return undefined;
  }

  return {
    version: 1,
    weekStartDate,
    weekEndDate,
    title,
    assistantReply,
    overallComment,
    keyInsights,
    daySections,
    closingComment,
    nextPeriodPlan,
    updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : Date.now()
  };
};

export const normalizeMonthlyNewspaper = (value: Partial<MonthlyNewspaper> | undefined): MonthlyNewspaper | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const monthStartDate = typeof value.monthStartDate === 'string' ? value.monthStartDate.trim() : '';
  const monthEndDate = typeof value.monthEndDate === 'string' ? value.monthEndDate.trim() : '';
  const title = typeof value.title === 'string' ? value.title.trim() : '';
  const assistantReply = typeof value.assistantReply === 'string' ? value.assistantReply.trim() : '';
  const overallComment = typeof value.overallComment === 'string' ? value.overallComment.trim() : '';
  const keyInsights = Array.isArray(value.keyInsights)
    ? value.keyInsights.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
    : [];
  const monthlyTheme = typeof value.monthlyTheme === 'string' ? value.monthlyTheme.trim() : '';
  const weekSections = Array.isArray(value.weekSections)
    ? value.weekSections.flatMap((section) => {
      if (!section || typeof section !== 'object') {
        return [];
      }

      const weekStartDate = typeof section.weekStartDate === 'string' ? section.weekStartDate.trim() : '';
      const weekEndDate = typeof section.weekEndDate === 'string' ? section.weekEndDate.trim() : '';
      const weekLabel = typeof section.weekLabel === 'string' ? section.weekLabel.trim() : '';
      const weeklySummary = typeof section.weeklySummary === 'string' ? section.weeklySummary.trim() : '';
      const highlights = Array.isArray(section.highlights)
        ? section.highlights.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
        : [];
      const riskPoint = typeof section.riskPoint === 'string' ? section.riskPoint.trim() : '';

      if (!weekStartDate || !weekEndDate || !weekLabel || !weeklySummary || !riskPoint) {
        return [];
      }

      return [{
        weekStartDate,
        weekEndDate,
        weekLabel,
        weeklySummary,
        highlights,
        riskPoint
      }];
    })
    : [];
  const nextPeriodPlan = Array.isArray(value.nextPeriodPlan)
    ? value.nextPeriodPlan.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
    : [];

  if (!monthStartDate || !monthEndDate || !title || !assistantReply || !overallComment || !monthlyTheme) {
    return undefined;
  }

  return {
    version: 1,
    monthStartDate,
    monthEndDate,
    title,
    assistantReply,
    overallComment,
    keyInsights,
    monthlyTheme,
    weekSections,
    nextPeriodPlan,
    updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : Date.now()
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
    checkItems: Array.isArray(review.checkItems) ? review.checkItems.map(normalizeCheckItem) : [],
    ...(normalizeDailyNewspaper(review.aiNewspaper) ? { aiNewspaper: normalizeDailyNewspaper(review.aiNewspaper) } : {})
  };
};

export const normalizeWeeklyReview = (review: Partial<WeeklyReview>): WeeklyReview => {
  return {
    ...review,
    id: review.id || crypto.randomUUID(),
    weekStartDate: review.weekStartDate || '',
    weekEndDate: review.weekEndDate || '',
    createdAt: typeof review.createdAt === 'number' ? review.createdAt : Date.now(),
    updatedAt: typeof review.updatedAt === 'number' ? review.updatedAt : Date.now(),
    answers: Array.isArray(review.answers) ? review.answers : [],
    ...(normalizeWeeklyNewspaper(review.aiNewspaper) ? { aiNewspaper: normalizeWeeklyNewspaper(review.aiNewspaper) } : {})
  };
};

export const normalizeMonthlyReview = (review: Partial<MonthlyReview>): MonthlyReview => {
  return {
    ...review,
    id: review.id || crypto.randomUUID(),
    monthStartDate: review.monthStartDate || '',
    monthEndDate: review.monthEndDate || '',
    createdAt: typeof review.createdAt === 'number' ? review.createdAt : Date.now(),
    updatedAt: typeof review.updatedAt === 'number' ? review.updatedAt : Date.now(),
    answers: Array.isArray(review.answers) ? review.answers : [],
    ...(normalizeMonthlyNewspaper(review.aiNewspaper) ? { aiNewspaper: normalizeMonthlyNewspaper(review.aiNewspaper) } : {})
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

export const normalizeWeeklyReviews = (weeklyReviews: unknown): WeeklyReview[] => {
  if (!Array.isArray(weeklyReviews)) return [];
  return weeklyReviews.map(review => normalizeWeeklyReview(review as Partial<WeeklyReview>));
};

export const normalizeMonthlyReviews = (monthlyReviews: unknown): MonthlyReview[] => {
  if (!Array.isArray(monthlyReviews)) return [];
  return monthlyReviews.map(review => normalizeMonthlyReview(review as Partial<MonthlyReview>));
};
