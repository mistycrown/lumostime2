/**
 * @file checkItemBatchOperations.ts
 * @input daily reviews, target content, operation type
 * @output updated reviews, operation count
 * @pos Utility (Batch Operations)
 * @description 统一的日课批量操作工具 - 支持扫描、重命名、删除等操作
 * 
 * 使用场景：
 * - CheckTemplateManageView
 * - DailyReviewView
 * - 其他需要批量修改日课的地方
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import { DailyReview, CheckItem } from '../types';

export interface BatchOperationResult {
  updatedReviews: DailyReview[];
  affectedCount: number;
  affectedReviews: number;
}

export interface ScanResult {
  totalMatches: number;
  affectedReviews: number;
  matchDetails: Array<{
    reviewId: string;
    date: string;
    matches: number;
  }>;
}

/**
 * 扫描所有日报中匹配目标内容的日课项
 * 
 * @param reviews - 日报列表
 * @param targetContent - 目标内容（支持部分匹配）
 * @returns 扫描结果
 * 
 * @example
 * ```typescript
 * const result = scanCheckItems(dailyReviews, '早起喝水');
 * console.log(`找到 ${result.totalMatches} 条匹配记录`);
 * ```
 */
export const scanCheckItems = (
  reviews: DailyReview[],
  targetContent: string
): ScanResult => {
  if (!targetContent.trim()) {
    return {
      totalMatches: 0,
      affectedReviews: 0,
      matchDetails: []
    };
  }

  const target = targetContent.trim();
  let totalMatches = 0;
  const matchDetails: ScanResult['matchDetails'] = [];

  reviews.forEach(review => {
    if (!review.checkItems || review.checkItems.length === 0) {
      return;
    }

    let reviewMatches = 0;
    review.checkItems.forEach(item => {
      if (item.content.includes(target)) {
        reviewMatches++;
        totalMatches++;
      }
    });

    if (reviewMatches > 0) {
      matchDetails.push({
        reviewId: review.id,
        date: review.date,
        matches: reviewMatches
      });
    }
  });

  return {
    totalMatches,
    affectedReviews: matchDetails.length,
    matchDetails
  };
};

/**
 * 批量重命名日课项
 * 
 * @param reviews - 日报列表
 * @param targetContent - 目标内容（要被替换的内容）
 * @param newContent - 新内容（替换后的内容）
 * @returns 批量操作结果
 * 
 * @example
 * ```typescript
 * const result = batchRenameCheckItems(
 *   dailyReviews,
 *   '早起喝水',
 *   '早起'
 * );
 * console.log(`成功重命名 ${result.affectedCount} 条记录`);
 * ```
 */
export const batchRenameCheckItems = (
  reviews: DailyReview[],
  targetContent: string,
  newContent: string
): BatchOperationResult => {
  if (!targetContent.trim() || !newContent.trim()) {
    return {
      updatedReviews: reviews,
      affectedCount: 0,
      affectedReviews: 0
    };
  }

  const target = targetContent.trim();
  const replacement = newContent.trim();
  let affectedCount = 0;
  let affectedReviews = 0;

  const updatedReviews = reviews.map(review => {
    if (!review.checkItems || review.checkItems.length === 0) {
      return review;
    }

    let hasChanges = false;
    const newCheckItems = review.checkItems.map(item => {
      if (item.content.includes(target)) {
        hasChanges = true;
        affectedCount++;
        
        // 替换整个内容（而不是部分替换）
        // 这样可以统一标准化日课名称
        return { ...item, content: replacement };
      }
      return item;
    });

    if (hasChanges) {
      affectedReviews++;
      return {
        ...review,
        checkItems: newCheckItems,
        updatedAt: Date.now()
      };
    }

    return review;
  });

  return {
    updatedReviews,
    affectedCount,
    affectedReviews
  };
};

/**
 * 批量删除日课项
 * 
 * @param reviews - 日报列表
 * @param targetContent - 目标内容（要被删除的内容）
 * @returns 批量操作结果
 * 
 * @example
 * ```typescript
 * const result = batchDeleteCheckItems(dailyReviews, '早起喝水');
 * console.log(`成功删除 ${result.affectedCount} 条记录`);
 * ```
 */
export const batchDeleteCheckItems = (
  reviews: DailyReview[],
  targetContent: string
): BatchOperationResult => {
  if (!targetContent.trim()) {
    return {
      updatedReviews: reviews,
      affectedCount: 0,
      affectedReviews: 0
    };
  }

  const target = targetContent.trim();
  let affectedCount = 0;
  let affectedReviews = 0;

  const updatedReviews = reviews.map(review => {
    if (!review.checkItems || review.checkItems.length === 0) {
      return review;
    }

    const initialLength = review.checkItems.length;
    const newCheckItems = review.checkItems.filter(item => {
      const shouldDelete = item.content.includes(target);
      if (shouldDelete) {
        affectedCount++;
      }
      return !shouldDelete;
    });

    if (newCheckItems.length !== initialLength) {
      affectedReviews++;
      return {
        ...review,
        checkItems: newCheckItems,
        updatedAt: Date.now()
      };
    }

    return review;
  });

  return {
    updatedReviews,
    affectedCount,
    affectedReviews
  };
};

/**
 * 批量替换日课项的部分内容
 * 
 * @param reviews - 日报列表
 * @param targetContent - 目标内容（要被替换的部分）
 * @param newContent - 新内容（替换后的部分）
 * @returns 批量操作结果
 * 
 * @example
 * ```typescript
 * const result = batchReplaceCheckItems(
 *   dailyReviews,
 *   '喝水',
 *   '饮水'
 * );
 * // '早起喝水' -> '早起饮水'
 * ```
 */
export const batchReplaceCheckItems = (
  reviews: DailyReview[],
  targetContent: string,
  newContent: string
): BatchOperationResult => {
  if (!targetContent.trim() || !newContent.trim()) {
    return {
      updatedReviews: reviews,
      affectedCount: 0,
      affectedReviews: 0
    };
  }

  const target = targetContent.trim();
  const replacement = newContent.trim();
  let affectedCount = 0;
  let affectedReviews = 0;

  const updatedReviews = reviews.map(review => {
    if (!review.checkItems || review.checkItems.length === 0) {
      return review;
    }

    let hasChanges = false;
    const newCheckItems = review.checkItems.map(item => {
      if (item.content.includes(target)) {
        hasChanges = true;
        affectedCount++;
        
        // 部分替换（保留其他内容）
        return {
          ...item,
          content: item.content.replace(target, replacement)
        };
      }
      return item;
    });

    if (hasChanges) {
      affectedReviews++;
      return {
        ...review,
        checkItems: newCheckItems,
        updatedAt: Date.now()
      };
    }

    return review;
  });

  return {
    updatedReviews,
    affectedCount,
    affectedReviews
  };
};

/**
 * 批量更新日课项的完成状态
 * 
 * @param reviews - 日报列表
 * @param targetContent - 目标内容
 * @param isCompleted - 新的完成状态
 * @returns 批量操作结果
 * 
 * @example
 * ```typescript
 * const result = batchUpdateCheckItemStatus(
 *   dailyReviews,
 *   '早起喝水',
 *   true
 * );
 * console.log(`成功标记 ${result.affectedCount} 条为已完成`);
 * ```
 */
export const batchUpdateCheckItemStatus = (
  reviews: DailyReview[],
  targetContent: string,
  isCompleted: boolean
): BatchOperationResult => {
  if (!targetContent.trim()) {
    return {
      updatedReviews: reviews,
      affectedCount: 0,
      affectedReviews: 0
    };
  }

  const target = targetContent.trim();
  let affectedCount = 0;
  let affectedReviews = 0;

  const updatedReviews = reviews.map(review => {
    if (!review.checkItems || review.checkItems.length === 0) {
      return review;
    }

    let hasChanges = false;
    const newCheckItems = review.checkItems.map(item => {
      if (item.content.includes(target) && item.isCompleted !== isCompleted) {
        hasChanges = true;
        affectedCount++;
        return { ...item, isCompleted };
      }
      return item;
    });

    if (hasChanges) {
      affectedReviews++;
      return {
        ...review,
        checkItems: newCheckItems,
        updatedAt: Date.now()
      };
    }

    return review;
  });

  return {
    updatedReviews,
    affectedCount,
    affectedReviews
  };
};

/**
 * 批量添加日课项到所有日报
 * 
 * @param reviews - 日报列表
 * @param newItem - 新的日课项（不包括 id）
 * @param dateRange - 日期范围（可选，默认所有日报）
 * @returns 批量操作结果
 * 
 * @example
 * ```typescript
 * const result = batchAddCheckItem(
 *   dailyReviews,
 *   { content: '新日课', isCompleted: false }
 * );
 * ```
 */
export const batchAddCheckItem = (
  reviews: DailyReview[],
  newItem: Omit<CheckItem, 'id'>,
  dateRange?: { start: Date; end: Date }
): BatchOperationResult => {
  let affectedCount = 0;
  let affectedReviews = 0;

  const updatedReviews = reviews.map(review => {
    // 检查日期范围
    if (dateRange) {
      const reviewDate = new Date(review.date);
      if (reviewDate < dateRange.start || reviewDate > dateRange.end) {
        return review;
      }
    }

    // 检查是否已存在相同内容的日课
    const exists = review.checkItems?.some(
      item => item.content === newItem.content
    );

    if (exists) {
      return review;
    }

    affectedCount++;
    affectedReviews++;

    const newCheckItem: CheckItem = {
      ...newItem,
      id: crypto.randomUUID()
    };

    return {
      ...review,
      checkItems: [...(review.checkItems || []), newCheckItem],
      updatedAt: Date.now()
    };
  });

  return {
    updatedReviews,
    affectedCount,
    affectedReviews
  };
};

/**
 * 获取所有日课项的统计信息
 * 
 * @param reviews - 日报列表
 * @returns 统计信息
 * 
 * @example
 * ```typescript
 * const stats = getCheckItemsStats(dailyReviews);
 * console.log(`总共 ${stats.totalItems} 个日课项`);
 * console.log(`完成率: ${stats.completionRate}%`);
 * ```
 */
export const getCheckItemsStats = (reviews: DailyReview[]) => {
  let totalItems = 0;
  let completedItems = 0;
  const contentFrequency = new Map<string, number>();

  reviews.forEach(review => {
    if (!review.checkItems) return;

    review.checkItems.forEach(item => {
      totalItems++;
      if (item.isCompleted) {
        completedItems++;
      }

      // 统计内容频率
      const count = contentFrequency.get(item.content) || 0;
      contentFrequency.set(item.content, count + 1);
    });
  });

  const completionRate = totalItems > 0 
    ? ((completedItems / totalItems) * 100).toFixed(1) 
    : '0.0';

  // 获取最常见的日课项
  const topItems = Array.from(contentFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([content, count]) => ({ content, count }));

  return {
    totalItems,
    completedItems,
    completionRate: parseFloat(completionRate),
    topItems,
    uniqueItems: contentFrequency.size
  };
};
