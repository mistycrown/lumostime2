/**
 * @file dailyCheckUtils.ts
 * @input daily review data, check templates, review templates, target check item id
 * @output daily check helpers for creating reviews, locating items, and applying manual actions
 * @pos Utils (Daily Check)
 * @description Shared daily check utilities used by SceneView and NFC flows to keep review creation, legacy item ID compatibility, and habit punch behavior consistent.
 * @updated 2026-05-05: Hardened template item traversal so legacy or partially synced daily check templates without `items` no longer crash NFC and widget entry points.
 * @updated 2026-05-04: Added a dedicated tracking-calendar daily binding helper so 2x2 tracking widgets can target both manual and automatic daily checks.
 */
import { CheckItem, CheckTemplate, CheckTemplateItem, DailyReview, ReviewTemplate, ReviewTemplateSnapshot } from '../types';
import { normalizeCheckItem } from './checkItemNormalizer';

export type DailyCheckActionMode = 'toggle' | 'increment' | 'reset' | 'complete_once';

export type DailyCheckActionStatus =
  | 'completed'
  | 'already_completed'
  | 'incremented'
  | 'limit_reached'
  | 'toggled'
  | 'reset'
  | 'not_found'
  | 'unsupported_type';

export interface DailyCheckTemplateMeta {
  checkTemplateId: string;
  checkItemId: string;
  content: string;
  category: string;
  type: 'manual' | 'auto';
  manualMode: 'binary' | 'count';
  targetCount: number;
  icon?: string;
  uiIcon?: string;
}

export interface DailyCheckActionResult {
  status: DailyCheckActionStatus;
  item?: CheckItem;
  updatedReview?: DailyReview;
  updatedReviews?: DailyReview[];
  createdReview: boolean;
}

const sortTemplatesByOrder = <T extends { order: number }>(templates: T[]): T[] => {
  return [...templates].sort((a, b) => a.order - b.order);
};

const getTemplateItems = (template: CheckTemplate): CheckTemplateItem[] => (
  Array.isArray(template.items) ? template.items : []
);

const buildDailyCheckTemplateMeta = (
  template: CheckTemplate,
  item: CheckTemplateItem,
  index: number
): DailyCheckTemplateMeta => {
  const type: 'manual' | 'auto' = item.type === 'auto' ? 'auto' : 'manual';
  const manualMode: 'binary' | 'count' = type === 'manual' && item.manualMode === 'count'
    ? 'count'
    : 'binary';
  const targetCount = manualMode === 'count'
    ? Math.max(1, Math.floor(Number(item.targetCount) || 1))
    : 1;

  return {
    checkTemplateId: template.id,
    checkItemId: getCheckTemplateItemKey(template, item, index),
    content: item.content,
    category: template.title,
    type,
    manualMode,
    targetCount,
    icon: item.icon,
    uiIcon: item.uiIcon
  };
};

const getDailyCheckTemplateItems = (
  checkTemplates: CheckTemplate[],
  options?: { includeAuto?: boolean }
): DailyCheckTemplateMeta[] => {
  const includeAuto = Boolean(options?.includeAuto);
  const items: DailyCheckTemplateMeta[] = [];

  sortTemplatesByOrder(checkTemplates.filter(template => template.enabled && template.isDaily)).forEach(template => {
    getTemplateItems(template).forEach((item, index) => {
      const meta = buildDailyCheckTemplateMeta(template, item, index);
      if (!includeAuto && meta.type !== 'manual') {
        return;
      }
      items.push(meta);
    });
  });

  return items;
};

const buildLegacyCheckItemId = (templateId: string, index: number, content: string): string => {
  const normalizedContent = content.trim().replace(/\s+/g, ' ').slice(0, 80) || 'item';
  return `legacy:${templateId}:${index}:${encodeURIComponent(normalizedContent)}`;
};

export const getCheckTemplateItemKey = (
  template: Pick<CheckTemplate, 'id'>,
  item: CheckTemplateItem,
  index: number
): string => {
  if (item.id) {
    return item.id;
  }

  return buildLegacyCheckItemId(template.id, index, item.content);
};

export const buildDailyTemplateSnapshot = (reviewTemplates: ReviewTemplate[]): ReviewTemplateSnapshot[] => {
  return sortTemplatesByOrder(reviewTemplates.filter(template => template.isDailyTemplate)).map(template => ({
    id: template.id,
    title: template.title,
    questions: template.questions,
    order: template.order,
    syncToTimeline: template.syncToTimeline
  }));
};

export const buildCheckCategorySyncMap = (checkTemplates: CheckTemplate[]): { [category: string]: boolean } => {
  const syncMap: { [category: string]: boolean } = {};
  sortTemplatesByOrder(checkTemplates.filter(template => template.enabled && template.isDaily)).forEach(template => {
    syncMap[template.title] = template.syncToTimeline || false;
  });
  return syncMap;
};

export const buildDailyCheckItems = (checkTemplates: CheckTemplate[]): CheckItem[] => {
  const checkItems: CheckItem[] = [];

  sortTemplatesByOrder(checkTemplates.filter(template => template.enabled && template.isDaily)).forEach(template => {
    getTemplateItems(template).forEach((item, index) => {
      const type = item.type || 'manual';
      const manualMode = type === 'manual'
        ? (item.manualMode === 'count' ? 'count' : 'binary')
        : undefined;
      const targetCount = type === 'manual'
        ? (manualMode === 'count'
          ? Math.max(1, Math.floor(Number(item.targetCount) || 1))
          : 1)
        : undefined;

      checkItems.push({
        id: getCheckTemplateItemKey(template, item, index),
        category: template.title,
        content: item.content,
        icon: item.icon,
        uiIcon: item.uiIcon,
        isCompleted: false,
        type,
        manualMode,
        currentCount: type === 'manual' ? 0 : undefined,
        targetCount,
        autoConfig: item.autoConfig
      });
    });
  });

  return checkItems;
};

export const createDailyReviewFromTemplates = (
  dateStr: string,
  checkTemplates: CheckTemplate[],
  reviewTemplates: ReviewTemplate[]
): DailyReview => {
  const now = Date.now();

  return {
    id: crypto.randomUUID(),
    date: dateStr,
    createdAt: now,
    updatedAt: now,
    answers: [],
    checkItems: buildDailyCheckItems(checkTemplates),
    checkCategorySyncToTimeline: buildCheckCategorySyncMap(checkTemplates),
    templateSnapshot: buildDailyTemplateSnapshot(reviewTemplates)
  };
};

export const normalizeDailyReviewForCheck = (
  review: DailyReview,
  checkTemplates: CheckTemplate[],
  reviewTemplates: ReviewTemplate[]
): DailyReview => {
  let updatedReview = review;

  if (!updatedReview.checkCategorySyncToTimeline) {
    const syncMap = buildCheckCategorySyncMap(checkTemplates);
    const itemCategories = (updatedReview.checkItems || [])
      .map(item => item.category)
      .filter((category): category is string => Boolean(category));

    itemCategories.forEach(category => {
      if (typeof syncMap[category] === 'undefined') {
        syncMap[category] = false;
      }
    });

    updatedReview = {
      ...updatedReview,
      checkCategorySyncToTimeline: syncMap
    };
  }

  if (!updatedReview.templateSnapshot) {
    updatedReview = {
      ...updatedReview,
      templateSnapshot: buildDailyTemplateSnapshot(reviewTemplates)
    };
  }

  return updatedReview;
};

export const getDailyCheckTemplateMeta = (
  checkTemplates: CheckTemplate[],
  checkItemId: string
): DailyCheckTemplateMeta | null => {
  for (const template of checkTemplates) {
    const templateItems = getTemplateItems(template);
    const itemIndex = templateItems.findIndex((entry, index) => getCheckTemplateItemKey(template, entry, index) === checkItemId);
    const item = itemIndex >= 0 ? templateItems[itemIndex] : undefined;
    if (!item) continue;

    return buildDailyCheckTemplateMeta(template, item, itemIndex);
  }

  return null;
};

export const findCheckItemIndexInReview = (
  review: DailyReview,
  checkTemplates: CheckTemplate[],
  checkItemId: string
): number => {
  const checkItems = review.checkItems || [];
  const idMatchedIndex = checkItems.findIndex(item => item.id === checkItemId);
  if (idMatchedIndex >= 0) {
    return idMatchedIndex;
  }

  const templateMeta = getDailyCheckTemplateMeta(checkTemplates, checkItemId);
  if (!templateMeta) {
    return -1;
  }

  const categoryAndContentMatchedIndex = checkItems.findIndex(item =>
    item.category === templateMeta.category && item.content === templateMeta.content
  );
  if (categoryAndContentMatchedIndex >= 0) {
    return categoryAndContentMatchedIndex;
  }

  return checkItems.findIndex(item => item.content === templateMeta.content);
};

export const getCheckItemCountState = (item: CheckItem) => {
  const target = Math.max(1, Math.floor(item.targetCount || 1));
  const currentRaw = typeof item.currentCount === 'number'
    ? item.currentCount
    : (item.isCompleted ? target : 0);
  const current = Math.min(target, Math.max(0, Math.floor(currentRaw)));

  return {
    current,
    target,
    isCompleted: current >= target
  };
};

export const upsertDailyReview = (dailyReviews: DailyReview[], updatedReview: DailyReview): DailyReview[] => {
  const existingReviewIndex = dailyReviews.findIndex(review => review.date === updatedReview.date);
  if (existingReviewIndex >= 0) {
    return dailyReviews.map(review => review.date === updatedReview.date ? updatedReview : review);
  }

  return [...dailyReviews, updatedReview];
};

export const ensureDailyReviewForDate = ({
  dateStr,
  dailyReviews,
  checkTemplates,
  reviewTemplates
}: {
  dateStr: string;
  dailyReviews: DailyReview[];
  checkTemplates: CheckTemplate[];
  reviewTemplates: ReviewTemplate[];
}) => {
  const existingReview = dailyReviews.find(review => review.date === dateStr);
  if (!existingReview) {
    const createdReview = createDailyReviewFromTemplates(dateStr, checkTemplates, reviewTemplates);
    return {
      review: createdReview,
      createdReview: true,
      updatedReviews: upsertDailyReview(dailyReviews, createdReview)
    };
  }

  const normalizedReview = normalizeDailyReviewForCheck(existingReview, checkTemplates, reviewTemplates);
  if (normalizedReview !== existingReview) {
    return {
      review: normalizedReview,
      createdReview: false,
      updatedReviews: upsertDailyReview(dailyReviews, normalizedReview)
    };
  }

  return {
    review: existingReview,
    createdReview: false,
    updatedReviews: undefined
  };
};

export const applyDailyCheckActionForDate = ({
  dateStr,
  dailyReviews,
  checkTemplates,
  reviewTemplates,
  checkItemId,
  actionMode
}: {
  dateStr: string;
  dailyReviews: DailyReview[];
  checkTemplates: CheckTemplate[];
  reviewTemplates: ReviewTemplate[];
  checkItemId: string;
  actionMode: DailyCheckActionMode;
}): DailyCheckActionResult => {
  const templateMeta = getDailyCheckTemplateMeta(checkTemplates, checkItemId);
  if (!templateMeta) {
    return {
      status: 'not_found',
      createdReview: false
    };
  }

  if (templateMeta.type !== 'manual') {
    return {
      status: 'unsupported_type',
      createdReview: false
    };
  }

  const ensured = ensureDailyReviewForDate({
    dateStr,
    dailyReviews,
    checkTemplates,
    reviewTemplates
  });
  const review = ensured.review;
  const index = findCheckItemIndexInReview(review, checkTemplates, checkItemId);

  if (index === -1) {
    return {
      status: 'not_found',
      createdReview: ensured.createdReview,
      updatedReview: ensured.updatedReviews ? review : undefined,
      updatedReviews: ensured.updatedReviews
    };
  }

  const currentItem = normalizeCheckItem(review.checkItems?.[index] || {});
  if (currentItem.type === 'auto') {
    return {
      status: 'unsupported_type',
      createdReview: ensured.createdReview,
      updatedReview: ensured.updatedReviews ? review : undefined,
      updatedReviews: ensured.updatedReviews
    };
  }

  let nextItem = currentItem;
  let status: DailyCheckActionStatus = 'toggled';

  if (currentItem.manualMode === 'count') {
    const { current, target, isCompleted } = getCheckItemCountState(currentItem);
    let nextCurrent = current;

    if (actionMode === 'reset') {
      nextCurrent = 0;
      status = 'reset';
    } else if (actionMode === 'toggle') {
      nextCurrent = isCompleted ? Math.max(0, current - 1) : Math.min(target, current + 1);
      status = nextCurrent >= target ? 'completed' : 'toggled';
    } else {
      if (current >= target) {
        return {
          status: 'limit_reached',
          item: {
            ...currentItem,
            currentCount: current,
            targetCount: target,
            isCompleted: true
          },
          createdReview: ensured.createdReview,
          updatedReview: ensured.updatedReviews ? review : undefined,
          updatedReviews: ensured.updatedReviews
        };
      }

      nextCurrent = Math.min(target, current + 1);
      status = nextCurrent >= target ? 'completed' : 'incremented';
    }

    nextItem = {
      ...currentItem,
      id: checkItemId,
      manualMode: 'count',
      targetCount: target,
      currentCount: nextCurrent,
      isCompleted: nextCurrent >= target
    };
  } else {
    if (actionMode === 'reset') {
      nextItem = {
        ...currentItem,
        id: checkItemId,
        manualMode: 'binary',
        currentCount: 0,
        targetCount: 1,
        isCompleted: false
      };
      status = 'reset';
    } else if (actionMode === 'toggle') {
      const isCompleted = !currentItem.isCompleted;
      nextItem = {
        ...currentItem,
        id: checkItemId,
        manualMode: 'binary',
        currentCount: isCompleted ? 1 : 0,
        targetCount: 1,
        isCompleted
      };
      status = isCompleted ? 'completed' : 'toggled';
    } else {
      if (currentItem.isCompleted) {
        return {
          status: 'already_completed',
          item: currentItem,
          createdReview: ensured.createdReview,
          updatedReview: ensured.updatedReviews ? review : undefined,
          updatedReviews: ensured.updatedReviews
        };
      }

      nextItem = {
        ...currentItem,
        id: checkItemId,
        manualMode: 'binary',
        currentCount: 1,
        targetCount: 1,
        isCompleted: true
      };
      status = 'completed';
    }
  }

  const updatedCheckItems = [...(review.checkItems || [])];
  updatedCheckItems[index] = nextItem;

  const updatedReview: DailyReview = {
    ...review,
    checkItems: updatedCheckItems,
    updatedAt: Date.now()
  };

  return {
    status,
    item: nextItem,
    updatedReview,
    updatedReviews: upsertDailyReview(dailyReviews, updatedReview),
    createdReview: ensured.createdReview
  };
};

export const getDailyCheckProgressForDate = ({
  dateStr,
  dailyReviews,
  checkTemplates,
  checkItemId
}: {
  dateStr: string;
  dailyReviews: DailyReview[];
  checkTemplates: CheckTemplate[];
  checkItemId: string;
}) => {
  const templateMeta = getDailyCheckTemplateMeta(checkTemplates, checkItemId);
  const defaultManualMode = templateMeta?.manualMode || 'binary';
  const defaultTarget = templateMeta?.targetCount || 1;
  const review = dailyReviews.find(entry => entry.date === dateStr);

  if (!review || !review.checkItems) {
    return {
      isCompleted: false,
      manualMode: defaultManualMode,
      currentCount: 0,
      targetCount: defaultTarget
    };
  }

  const index = findCheckItemIndexInReview(review, checkTemplates, checkItemId);
  if (index === -1) {
    return {
      isCompleted: false,
      manualMode: defaultManualMode,
      currentCount: 0,
      targetCount: defaultTarget
    };
  }

  const item = normalizeCheckItem(review.checkItems[index]);
  if (item.type !== 'auto' && item.manualMode === 'count') {
    const { current, target, isCompleted } = getCheckItemCountState(item);
    return {
      isCompleted,
      manualMode: 'count' as const,
      currentCount: current,
      targetCount: target
    };
  }

  return {
    isCompleted: item.isCompleted || false,
    manualMode: 'binary' as const,
    currentCount: item.isCompleted ? 1 : 0,
    targetCount: 1
  };
};

export const getEligibleNfcDailyCheckItems = (checkTemplates: CheckTemplate[]): DailyCheckTemplateMeta[] => {
  return getDailyCheckTemplateItems(checkTemplates);
};

export const getEligibleTrackingCalendarDailyCheckItems = (
  checkTemplates: CheckTemplate[]
): DailyCheckTemplateMeta[] => getDailyCheckTemplateItems(checkTemplates, { includeAuto: true });
