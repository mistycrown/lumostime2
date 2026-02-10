/**
 * @file dataValidation.ts
 * @description 数据验证工具函数
 * 
 * 提供统一的数据验证逻辑，确保数据完整性和一致性
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

/**
 * 验证结果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 验证本地数据的完整性
 * 
 * @param data - 要验证的数据对象
 * @returns 验证结果
 */
export function validateLocalData(data: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. 检查数据对象是否存在
  if (!data || typeof data !== 'object') {
    errors.push('数据对象不存在或格式错误');
    return { isValid: false, errors, warnings };
  }

  // 2. 检查必需字段
  const requiredFields = ['logs', 'todos', 'categories'];
  
  for (const field of requiredFields) {
    if (data[field] === undefined) {
      errors.push(`缺少必需字段: ${field}`);
    } else if (data[field] === null) {
      warnings.push(`字段 ${field} 为 null，将被视为空数组`);
    }
  }

  // 3. 检查数组类型
  const arrayFields = [
    'logs',
    'todos',
    'categories',
    'todoCategories',
    'scopes',
    'goals',
    'autoLinkRules',
    'reviewTemplates',
    'dailyReviews',
    'weeklyReviews',
    'monthlyReviews',
    'customNarrativeTemplates',
    'filters'
  ];

  for (const field of arrayFields) {
    if (data[field] !== undefined && data[field] !== null) {
      if (!Array.isArray(data[field])) {
        errors.push(`字段 ${field} 应该是数组类型`);
      }
    }
  }

  // 4. 检查版本信息
  if (!data.version) {
    warnings.push('缺少版本信息');
  }

  // 5. 检查时间戳
  if (!data.timestamp) {
    warnings.push('缺少时间戳');
  } else if (typeof data.timestamp !== 'number') {
    warnings.push('时间戳格式错误');
  }

  // 6. 检查数据量（警告级别）
  if (data.logs && Array.isArray(data.logs)) {
    if (data.logs.length === 0) {
      warnings.push('日志数据为空');
    } else if (data.logs.length > 100000) {
      warnings.push(`日志数量过多 (${data.logs.length})，可能影响性能`);
    }
  }

  if (data.todos && Array.isArray(data.todos)) {
    if (data.todos.length > 10000) {
      warnings.push(`待办数量过多 (${data.todos.length})，可能影响性能`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 验证并修复数据
 * 
 * @param data - 要验证和修复的数据对象
 * @returns 修复后的数据和验证结果
 */
export function validateAndFixData(data: any): { data: any; result: ValidationResult } {
  const result = validateLocalData(data);

  // 如果数据无效，尝试修复
  if (!result.isValid || result.warnings.length > 0) {
    const fixedData = { ...data };

    // 修复缺失的必需字段
    if (!fixedData.logs) fixedData.logs = [];
    if (!fixedData.todos) fixedData.todos = [];
    if (!fixedData.categories) fixedData.categories = [];

    // 修复可选字段
    if (!fixedData.todoCategories) fixedData.todoCategories = [];
    if (!fixedData.scopes) fixedData.scopes = [];
    if (!fixedData.goals) fixedData.goals = [];
    if (!fixedData.autoLinkRules) fixedData.autoLinkRules = [];
    if (!fixedData.reviewTemplates) fixedData.reviewTemplates = [];
    if (!fixedData.dailyReviews) fixedData.dailyReviews = [];
    if (!fixedData.weeklyReviews) fixedData.weeklyReviews = [];
    if (!fixedData.monthlyReviews) fixedData.monthlyReviews = [];
    if (!fixedData.customNarrativeTemplates) fixedData.customNarrativeTemplates = [];
    if (!fixedData.filters) fixedData.filters = [];

    // 添加版本和时间戳
    if (!fixedData.version) fixedData.version = '1.0.0';
    if (!fixedData.timestamp) fixedData.timestamp = Date.now();

    return { data: fixedData, result };
  }

  return { data, result };
}

/**
 * 比较两个数据版本
 * 
 * @param localData - 本地数据
 * @param cloudData - 云端数据
 * @returns 比较结果
 */
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

/**
 * 获取数据统计信息
 * 
 * @param data - 数据对象
 * @returns 统计信息
 */
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

  // 计算大致大小
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

/**
 * 验证数据是否可以安全上传
 * 
 * @param data - 要上传的数据
 * @returns 是否可以安全上传
 */
export function canSafelyUpload(data: any): { canUpload: boolean; reason?: string } {
  const validation = validateLocalData(data);

  if (!validation.isValid) {
    return {
      canUpload: false,
      reason: validation.errors.join('; ')
    };
  }

  // 检查是否有实际数据
  if (!data.logs || data.logs.length === 0) {
    return {
      canUpload: false,
      reason: '日志数据为空，无法上传'
    };
  }

  return { canUpload: true };
}
