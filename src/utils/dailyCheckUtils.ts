/**
 * @file dailyCheckUtils.ts
 * @updated 2026-08-28: Added per-item full-history automatic daily-check recalculation from current templates.
 * @input daily review data, check templates, review templates, target check item id
 * @output daily check helpers for creating reviews, locating items, and applying manual actions
 * @pos Utils (Daily Check)
 * @description Shared daily check utilities used by SceneView and NFC flows to keep review creation, legacy item ID compatibility, and habit punch behavior consistent.
 * @updated 2026-07-31: Added a template-enabled filter for displaying stored daily check snapshots.
 * @updated 2026-07-30: Skipped disabled daily check template items across generation, bindings, and manual actions.
 * @updated 2026-05-05: Hardened template item traversal so legacy or partially synced daily check templates without `items` no longer crash NFC and widget entry points.
 * @updated 2026-05-04: Added a dedicated tracking-calendar daily binding helper so 2x2 tracking widgets can target both manual and automatic daily checks.
 * @updated 2026-08-09: Includes per-item colors in daily-check template metadata for native weekly-widget rendering.
 * @updated 2026-08-09: Added a detail-page-only count cycle action for temporary backfill mode.
 */
import { CheckItem, CheckTemplate, CheckTemplateItem, DailyReview, Log, ReviewTemplate, ReviewTemplateSnapshot } from '../types';
import { normalizeCheckItem } from './checkItemNormalizer';
import { updateAutoCheckItems } from './autoCheckUtils';
import type { FilterContext } from './filterUtils';

export type DailyCheckActionMode = 'toggle' | 'increment' | 'reset' | 'complete_once' | 'cycle';

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
  color?: string;
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

export const isCheckTemplateItemEnabled = (item: CheckTemplateItem): boolean => (
  item.enabled !== false
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
    color: item.color,
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
      if (!isCheckTemplateItemEnabled(item)) {
        return;
      }

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
      if (!isCheckTemplateItemEnabled(item)) {
        return;
      }

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

export const filterDailyCheckItemsByEnabledTemplates = (
  checkItems: CheckItem[],
  checkTemplates: CheckTemplate[]
): CheckItem[] => {
  if (checkTemplates.length === 0) {
    return checkItems;
  }

  const enabledTemplateItems = getDailyCheckTemplateItems(checkTemplates, { includeAuto: true });
  if (enabledTemplateItems.length === 0) {
    return [];
  }

  const enabledIds = new Set(enabledTemplateItems.map(item => item.checkItemId));
  const enabledCategoryContent = new Set(enabledTemplateItems.map(item => `${item.category}\u0000${item.content}`));
  const enabledContent = new Set(enabledTemplateItems.map(item => item.content));

  return checkItems.filter(item => (
    enabledIds.has(item.id)
    || Boolean(item.category && enabledCategoryContent.has(`${item.category}\u0000${item.content}`))
    || Boolean(!item.category && enabledContent.has(item.content))
  ));
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

export const recalculateDailyReviewAutoCheck = (
  dailyReviews: DailyReview[],
  checkTemplates: CheckTemplate[],
  logs: Log[],
  filterContext: FilterContext,
  checkItemId: string
): DailyReview[] => {
  const templateItems = checkTemplates
    .filter((template) => template.enabled && template.isDaily)
    .flatMap((template) => getTemplateItems(template)
      .filter(isCheckTemplateItemEnabled)
      .map((item, index) => ({
        template,
        item,
        key: getCheckTemplateItemKey(template, item, index)
      })));

  const targetTemplateMatch = templateItems.find(({ key, item }) => key === checkItemId || item.id === checkItemId);
  if (!targetTemplateMatch || targetTemplateMatch.item.type !== 'auto') {
    return dailyReviews;
  }

  return dailyReviews.map((review) => {
    if (!Array.isArray(review.checkItems) || review.checkItems.length === 0) {
      return review;
    }

    const targetReviewIndex = review.checkItems.findIndex((reviewItem) => (
      reviewItem.id === checkItemId
      || reviewItem.id === targetTemplateMatch.key
      || (reviewItem.category === targetTemplateMatch.template.title && reviewItem.content === targetTemplateMatch.item.content)
      || (!reviewItem.category && reviewItem.content === targetTemplateMatch.item.content)
    ));
    if (targetReviewIndex < 0) {
      return review;
    }

    const targetReviewItem = review.checkItems[targetReviewIndex];
    if (targetReviewItem.type !== 'auto' && !targetReviewItem.autoConfig) {
      return review;
    }

    const refreshedTargetItem: CheckItem = {
      ...targetReviewItem,
      type: 'auto',
      category: targetTemplateMatch.template.title,
      content: targetTemplateMatch.item.content,
      icon: targetTemplateMatch.item.icon,
      uiIcon: targetTemplateMatch.item.uiIcon,
      autoConfig: targetTemplateMatch.item.autoConfig
    };
    const reviewDate = new Date(`${review.date}T12:00:00`);
    const [updatedTargetItem] = updateAutoCheckItems([refreshedTargetItem], logs, filterContext, reviewDate);
    if (!updatedTargetItem) {
      return review;
    }
    const updatedItems = review.checkItems.map((reviewItem, index) => {
      if (index !== targetReviewIndex) {
        return reviewItem;
      }
      return updatedTargetItem;
    });
    return {
      ...review,
      checkItems: updatedItems,
      updatedAt: Date.now()
    };
  });
};

export const getDailyCheckTemplateMeta = (
  checkTemplates: CheckTemplate[],
  checkItemId: string
): DailyCheckTemplateMeta | null => {
  for (const template of checkTemplates) {
    if (!template.enabled || !template.isDaily) {
      continue;
    }

    const templateItems = getTemplateItems(template);
    const itemIndex = templateItems.findIndex((entry, index) => getCheckTemplateItemKey(template, entry, index) === checkItemId);
    const item = itemIndex >= 0 ? templateItems[itemIndex] : undefined;
    if (!item || !isCheckTemplateItemEnabled(item)) continue;

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
    } else if (actionMode === 'cycle') {
      nextCurrent = current >= target ? 0 : current + 1;
      status = nextCurrent >= target ? 'completed' : 'toggled';
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
