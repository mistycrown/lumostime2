/**
 * @file storageKeys.ts
 * @description localStorage 键名统一管理
 * 
 * 集中管理所有 localStorage 键名，避免硬编码字符串分散在各处
 * 便于维护和重构
 */

/**
 * TimePal（时光小友）相关的存储键
 */
export const TIMEPAL_KEYS = {
    /** 当前选择的小动物类型 */
    TYPE: 'lumostime_timepal_type',
    /** 自定义时光小友列表 */
    CUSTOM_ITEMS: 'lumostime_timepal_custom_items',
    CLICK_SWITCH_ENABLED: 'lumostime_timepal_click_switch_enabled',
    /** 是否启用标签筛选 */
    FILTER_ENABLED: 'lumostime_timepal_filter_enabled',
    /** 筛选的活动标签 ID 列表 */
    FILTER_ACTIVITIES: 'lumostime_timepal_filter_activities',
    /** 是否启用自定义名言 */
    CUSTOM_QUOTES_ENABLED: 'lumostime_timepal_custom_quotes_enabled',
    /** 自定义名言列表 */
    CUSTOM_QUOTES: 'lumostime_timepal_custom_quotes',
} as const;

/**
 * 主题相关的存储键
 */
export const THEME_KEYS = {
    /** 当前主题预设 ID */
    CURRENT_PRESET: 'lumostime_current_preset',
    /** UI 图标主题 */
    UI_ICON_THEME: 'lumostime_ui_icon_theme',
    /** 配色方案 */
    COLOR_SCHEME: 'lumostime_color_scheme',
    /** 日程图样式 */
    SCHEDULE_STYLE: 'lumostime_schedule_style',
    TIMELINE_STYLE_THEME: 'lumostime_timeline_style_theme',
    TIMELINE_STYLE_CONFIGS: 'lumostime_timeline_style_configs',
    ACHIEVEMENT_BOTTLE_STYLE: 'lumostime_achievement_bottle_style',
    /** 自定义色组 */
    CUSTOM_COLOR_GROUP: 'lumostime_custom_color_group',
    /** 当前背景 */
    CURRENT_BACKGROUND: 'lumos_current_background',
    /** 导航装饰 */
    NAVIGATION_DECORATION: 'navigation_decoration',
    /** 自定义主题预设列表 */
    CUSTOM_PRESETS: 'lumostime_custom_presets',
} as const;

/**
 * 用户数据相关的存储键
 */
export const USER_DATA_KEYS = {
    /** 分类数据 */
    CATEGORIES: 'lumostime_categories',
    /** 棰嗗煙鏁版嵁 */
    SCOPES: 'lumostime_scopes',
    /** 日志数据 */
    LOGS: 'lumostime_logs',
    /** 待办事项 */
    TODOS: 'lumostime_todos',
    /** 待办分类 */
    TODO_CATEGORIES: 'lumostime_todoCategories',
    /** 目标数据 */
    GOALS: 'lumostime_goals',
    /** 澶х洰鏍囨暟鎹 */
    MAJOR_GOALS: 'lumostime_majorGoals',
    /** 本地修改时间戳 */
    LOCAL_TIMESTAMP: 'lumostime_local_timestamp',
} as const;

/**
 * 设置相关的存储键
 */
export const SETTINGS_KEYS = {
    /** 隐私模式 */
    PRIVACY_MODE: 'lumostime_privacy_mode',
    /** 语言设置 */
    LANGUAGE: 'lumostime_language',
    /** 首次启动标记 */
    FIRST_LAUNCH: 'lumostime_first_launch',
    /** 每日回顾时间 */
    DAILY_REVIEW_TIME: 'lumostime_review_time',
    /** 每周回顾时间 */
    WEEKLY_REVIEW_TIME: 'lumostime_weekly_review_time',
    /** 每月回顾时间 */
    MONTHLY_REVIEW_TIME: 'lumostime_monthly_review_time',
    /** 自动生成每日回顾 */
    AUTO_GENERATE_DAILY_REVIEW: 'lumostime_auto_generate_daily_review',
    /** 自动生成每周回顾 */
    AUTO_GENERATE_WEEKLY_REVIEW: 'lumostime_auto_generate_weekly_review',
    /** 自动生成每月回顾 */
    AUTO_GENERATE_MONTHLY_REVIEW: 'lumostime_auto_generate_monthly_review',
} as const;

/**
 * Review 相关的存储键
 */
export const REVIEW_KEYS = {
    /** Review 模板 */
    REVIEW_TEMPLATES: 'lumostime_reviewTemplates',
    /** Check 模板 */
    CHECK_TEMPLATES: 'lumostime_checkTemplates',
    /** Daily Review 数据 */
    DAILY_REVIEWS: 'lumostime_dailyReviews',
    /** Weekly Review 数据 */
    WEEKLY_REVIEWS: 'lumostime_weeklyReviews',
    /** Monthly Review 数据 */
    MONTHLY_REVIEWS: 'lumostime_monthlyReviews',
    ON_THIS_DAY_ENTRIES: 'lumostime_onThisDayEntries',
} as const;

/**
 * 同步相关的存储键
 */
export const SYNC_KEYS = {
    /** WebDAV 配置 */
    WEBDAV_CONFIG: 'lumostime_webdav_config',
    /** 最后同步时间 */
    LAST_SYNC_TIME: 'lumostime_last_sync_time',
    /** 同步状态 */
    SYNC_STATUS: 'lumostime_sync_status',
} as const;

/**
 * 投喂功能相关的存储键
 */
export const SPONSORSHIP_KEYS = {
    /** 兑换码 */
    REDEMPTION_CODE: 'lumostime_redemption_code',
    /** 支持者 ID */
    SUPPORTER_ID: 'lumostime_supporter_id',
    /** 验证状态 */
    VERIFIED: 'lumostime_verified',
} as const;

/**
 * 所有存储键的集合（用于类型推断和工具函数）
 */
export const STORAGE_KEYS = {
    ...TIMEPAL_KEYS,
    ...THEME_KEYS,
    ...USER_DATA_KEYS,
    ...SETTINGS_KEYS,
    ...REVIEW_KEYS,
    ...SYNC_KEYS,
    ...SPONSORSHIP_KEYS,
} as const;

/**
 * 存储键类型
 */
export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
export const STORAGE_WRITE_ERROR_EVENT = 'lumostime-storage-write-error';

export interface StorageWriteErrorDetail {
    key: StorageKey | string;
    approximateSize: string;
    isQuotaExceeded: boolean;
}

const getApproximateBytes = (value: string): number => {
    try {
        return new TextEncoder().encode(value).length;
    } catch {
        return value.length * 2;
    }
};

const formatApproximateSize = (value: string): string => {
    const bytes = getApproximateBytes(value);
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const isQuotaExceededError = (error: unknown): boolean => {
    if (!(error instanceof Error)) {
        return false;
    }

    const quotaCodes = [22, 1014];
    const errorWithCode = error as Error & { code?: number; name?: string };
    return quotaCodes.includes(errorWithCode.code || 0)
        || errorWithCode.name === 'QuotaExceededError'
        || errorWithCode.name === 'NS_ERROR_DOM_QUOTA_REACHED';
};

const logStorageWriteError = (key: StorageKey, value: string, error: unknown): void => {
    const approximateSize = formatApproximateSize(value);
    const quotaExceeded = isQuotaExceededError(error);
    const errorType = quotaExceeded ? 'QuotaExceededError' : 'StorageWriteError';
    console.error(`[storage] ${errorType} while writing key "${key}" (~${approximateSize})`, error);

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent<StorageWriteErrorDetail>(STORAGE_WRITE_ERROR_EVENT, {
            detail: {
                key,
                approximateSize,
                isQuotaExceeded: quotaExceeded
            }
        }));
    }
};

/**
 * 类型安全的 localStorage 工具函数
 */
export const storage = {
    /**
     * 获取存储值
     */
    get: (key: StorageKey): string | null => {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.error(`[storage] Failed to read key "${key}"`, e);
            return null;
        }
    },

    /**
     * 设置存储值
     */
    set: (key: StorageKey, value: string): boolean => {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            logStorageWriteError(key, value, e);
            return false;
        }
    },

    /**
     * 删除存储值
     */
    remove: (key: StorageKey): boolean => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error(`[storage] Failed to remove key "${key}"`, e);
            return false;
        }
    },

    /**
     * 获取 JSON 格式的存储值
     */
    getJSON: <T = any>(key: StorageKey, defaultValue?: T): T | null => {
        const value = storage.get(key);
        if (!value) return defaultValue ?? null;
        try {
            return JSON.parse(value) as T;
        } catch (e) {
            console.error(`Failed to parse JSON from localStorage key: ${key}`, e);
            return defaultValue ?? null;
        }
    },

    /**
     * 设置 JSON 格式的存储值
     */
    setJSON: <T = any>(key: StorageKey, value: T): boolean => {
        try {
            const serialized = JSON.stringify(value);
            return storage.set(key, serialized);
        } catch (e) {
            console.error(`Failed to stringify JSON for localStorage key: ${key}`, e);
            return false;
        }
    },

    /**
     * 获取布尔值
     */
    getBoolean: (key: StorageKey, defaultValue: boolean = false): boolean => {
        const value = storage.get(key);
        if (value === null) return defaultValue;
        return value === 'true';
    },

    /**
     * 设置布尔值
     */
    setBoolean: (key: StorageKey, value: boolean): boolean => {
        return storage.set(key, value.toString());
    },
};
