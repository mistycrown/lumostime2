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
    /** 日志数据 */
    LOGS: 'lumostime_logs',
    /** 待办事项 */
    TODOS: 'lumostime_todos',
    /** 目标数据 */
    GOALS: 'lumostime_goals',
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
    ...SYNC_KEYS,
    ...SPONSORSHIP_KEYS,
} as const;

/**
 * 存储键类型
 */
export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

/**
 * 类型安全的 localStorage 工具函数
 */
export const storage = {
    /**
     * 获取存储值
     */
    get: (key: StorageKey): string | null => {
        return localStorage.getItem(key);
    },

    /**
     * 设置存储值
     */
    set: (key: StorageKey, value: string): void => {
        localStorage.setItem(key, value);
    },

    /**
     * 删除存储值
     */
    remove: (key: StorageKey): void => {
        localStorage.removeItem(key);
    },

    /**
     * 获取 JSON 格式的存储值
     */
    getJSON: <T = any>(key: StorageKey, defaultValue?: T): T | null => {
        const value = localStorage.getItem(key);
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
    setJSON: <T = any>(key: StorageKey, value: T): void => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error(`Failed to stringify JSON for localStorage key: ${key}`, e);
        }
    },

    /**
     * 获取布尔值
     */
    getBoolean: (key: StorageKey, defaultValue: boolean = false): boolean => {
        const value = localStorage.getItem(key);
        if (value === null) return defaultValue;
        return value === 'true';
    },

    /**
     * 设置布尔值
     */
    setBoolean: (key: StorageKey, value: boolean): void => {
        localStorage.setItem(key, value.toString());
    },
};
