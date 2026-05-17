/**
 * @file dataValidation.ts
 * @description Data validation helpers for backup, import, and cloud sync payloads.
 * @updated 2026-05-18: Added validation support for the nested `achievementData` backup block so achievement bottle progress can travel with user-data exports and sync restores.
 * @updated 2026-05-18: Added validation support for the nested `customColorGroup` backup block so custom palette swatches can travel with user-data exports and sync restores.
 * @updated 2026-05-17: Added unified-backup validation support for the nested `aiData` object so AI chat, prompt, and assistant-state payloads can travel with the main app JSON without tripping import guards.
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */
import {
  CATEGORIES,
  DEFAULT_CHECK_TEMPLATES,
  DEFAULT_REVIEW_TEMPLATES,
  INITIAL_GOALS,
  MOCK_TODO_CATEGORIES,
  SCOPES
} from '../constants';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateLocalData(data: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('Data object is missing or invalid');
    return { isValid: false, errors, warnings };
  }

  const requiredFields = ['logs', 'todos', 'categories'];
  for (const field of requiredFields) {
    if (data[field] === undefined) {
      errors.push(`Missing required field: ${field}`);
    } else if (data[field] === null) {
      warnings.push(`Field ${field} is null and will be treated as an empty array`);
    }
  }

  const arrayFields = [
    'logs',
    'todos',
    'categories',
    'todoCategories',
    'scopes',
    'goals',
    'majorGoals',
    'autoLinkRules',
    'reviewTemplates',
    'checkTemplates',
    'dailyReviews',
    'weeklyReviews',
    'monthlyReviews',
    'onThisDayEntries',
    'customNarrativeTemplates',
    'filters',
    'principles'
  ];

  for (const field of arrayFields) {
    if (data[field] !== undefined && data[field] !== null && !Array.isArray(data[field])) {
      errors.push(`Field ${field} must be an array`);
    }
  }

  if (data.sceneGroupState !== undefined && data.sceneGroupState !== null && typeof data.sceneGroupState !== 'object') {
    errors.push('Field sceneGroupState must be an object');
  }

  if (data.customColorGroup !== undefined && data.customColorGroup !== null && typeof data.customColorGroup !== 'object') {
    errors.push('Field customColorGroup must be an object');
  }

  if (data.achievementData !== undefined && data.achievementData !== null && typeof data.achievementData !== 'object') {
    errors.push('Field achievementData must be an object');
  }

  if (data.aiData !== undefined && data.aiData !== null && typeof data.aiData !== 'object') {
    errors.push('Field aiData must be an object');
  }

  if (!data.version) {
    warnings.push('Missing version information');
  }

  if (!data.timestamp) {
    warnings.push('Missing timestamp');
  } else if (typeof data.timestamp !== 'number') {
    warnings.push('Timestamp must be a number');
  }

  if (Array.isArray(data.logs)) {
    if (data.logs.length === 0) {
      warnings.push('Log data is empty');
    } else if (data.logs.length > 100000) {
      warnings.push(`Log count is very large (${data.logs.length}) and may impact performance`);
    }
  }

  if (Array.isArray(data.todos) && data.todos.length > 10000) {
    warnings.push(`Todo count is very large (${data.todos.length}) and may impact performance`);
  }

  if (Array.isArray(data.categories) && data.categories.length === 0) {
    errors.push('Category data is empty and cannot be restored safely');
  }

  if (Array.isArray(data.todoCategories) && data.todoCategories.length === 0) {
    errors.push('Todo category data is empty and cannot be restored safely');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateAndFixData(data: any): { data: any; result: ValidationResult } {
  const result = validateLocalData(data);

  if (!result.isValid || result.warnings.length > 0) {
    const fixedData = { ...data };

    if (!fixedData.logs) fixedData.logs = [];
    if (!fixedData.todos) fixedData.todos = [];
    if (!fixedData.categories) fixedData.categories = CATEGORIES;

    if (!fixedData.todoCategories) fixedData.todoCategories = MOCK_TODO_CATEGORIES;
    if (!fixedData.scopes) fixedData.scopes = SCOPES;
    if (!fixedData.goals) fixedData.goals = INITIAL_GOALS;
    if (!fixedData.majorGoals) fixedData.majorGoals = [];
    if (!fixedData.autoLinkRules) fixedData.autoLinkRules = [];
    if (!fixedData.reviewTemplates) fixedData.reviewTemplates = DEFAULT_REVIEW_TEMPLATES;
    if (!fixedData.checkTemplates) fixedData.checkTemplates = DEFAULT_CHECK_TEMPLATES;
    if (!fixedData.dailyReviews) fixedData.dailyReviews = [];
    if (!fixedData.weeklyReviews) fixedData.weeklyReviews = [];
    if (!fixedData.monthlyReviews) fixedData.monthlyReviews = [];
    if (!fixedData.onThisDayEntries) fixedData.onThisDayEntries = [];
    if (!fixedData.customNarrativeTemplates) fixedData.customNarrativeTemplates = [];
    if (!fixedData.filters) fixedData.filters = [];
    if (!fixedData.principles) fixedData.principles = [];

    if (!fixedData.version) fixedData.version = '1.0.0';
    if (!fixedData.timestamp) fixedData.timestamp = Date.now();

    return { data: fixedData, result: validateLocalData(fixedData) };
  }

  return { data, result };
}

export function compareDataVersions(localData: any, cloudData: any): {
  isLocalNewer: boolean;
  isCloudNewer: boolean;
  isSame: boolean;
  localTimestamp: number;
  cloudTimestamp: number;
} {
  const localTimestamp = localData?.timestamp || 0;
  const cloudTimestamp = cloudData?.timestamp || 0;

  return {
    isLocalNewer: localTimestamp > cloudTimestamp,
    isCloudNewer: cloudTimestamp > localTimestamp,
    isSame: localTimestamp === cloudTimestamp,
    localTimestamp,
    cloudTimestamp
  };
}

export function getDataStats(data: any): {
  logsCount: number;
  todosCount: number;
  categoriesCount: number;
  scopesCount: number;
  reviewsCount: number;
  totalSize: string;
} {
  const stats = {
    logsCount: Array.isArray(data?.logs) ? data.logs.length : 0,
    todosCount: Array.isArray(data?.todos) ? data.todos.length : 0,
    categoriesCount: Array.isArray(data?.categories) ? data.categories.length : 0,
    scopesCount: Array.isArray(data?.scopes) ? data.scopes.length : 0,
    reviewsCount: (
      (Array.isArray(data?.dailyReviews) ? data.dailyReviews.length : 0) +
      (Array.isArray(data?.weeklyReviews) ? data.weeklyReviews.length : 0) +
      (Array.isArray(data?.monthlyReviews) ? data.monthlyReviews.length : 0)
    ),
    totalSize: '0 KB'
  };

  try {
    const jsonStr = JSON.stringify(data);
    const sizeInBytes = new Blob([jsonStr]).size;
    const sizeInKB = (sizeInBytes / 1024).toFixed(2);
    const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);

    stats.totalSize = sizeInBytes > 1024 * 1024
      ? `${sizeInMB} MB`
      : `${sizeInKB} KB`;
  } catch (error) {
    console.error('[dataValidation] Failed to calculate data size:', error);
  }

  return stats;
}

export function canSafelyUpload(data: any): { canUpload: boolean; reason?: string } {
  const validation = validateLocalData(data);

  if (!validation.isValid) {
    return {
      canUpload: false,
      reason: validation.errors.join('; ')
    };
  }

  if (!data.logs || data.logs.length === 0) {
    return {
      canUpload: false,
      reason: 'Log data is empty and cannot be uploaded'
    };
  }

  return { canUpload: true };
}
