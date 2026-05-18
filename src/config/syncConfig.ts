/**
 * @file syncConfig.ts
 * @updated 2026-05-18: Reduced timestamp tolerance to 1 second so fresh desktop edits are no longer misclassified as equal right after a sync.
 * @description 同步系统配置常量
 * 
 * 集中管理所有同步相关的配置参数，便于调整和测试
 */

export const SYNC_CONFIG = {
    /**
     * 时间戳容错阈值（毫秒）
     * 
     * 用于比较本地和云端时间戳时的容错范围
     * 如果时间差在此范围内，视为数据一致
     * 
     * 默认：8000ms (8秒)
     * 原因：处理网络延迟和上传延迟
     */
    TOLERANCE_MS: 1000,

    /**
     * 并发上传/下载数量
     * 
     * 同时处理的图片文件数量
     * 
     * 默认：3
     * 原因：平衡性能和稳定性
     * - 太少：速度慢
     * -太多：网络拥塞、服务器压力大
     */
    CONCURRENT_OPERATIONS: 3,

    /**
     * 自动同步防抖时间（毫秒）
     * 
     * 数据变化后等待多久才触发自动同步
     * 
     * 默认：2000ms (2秒)
     * 原因：避免频繁同步，减少网络请求
     */
    AUTO_SYNC_DEBOUNCE_MS: 2000,

    /**
     * 数据更新解锁延迟（毫秒）
     * 
     * handleSyncDataUpdate 完成后等待多久才解锁时间戳更新
     * 
     * 默认：500ms
     * 原因：确保所有 React state effects 都已处理完成
     */
    DATA_UPDATE_UNLOCK_DELAY_MS: 500,

    /**
     * 待处理同步重试延迟（毫秒）
     * 
     * 如果同步期间有新的数据变化，等待多久后重试
     * 
     * 默认：1000ms (1秒)
     * 原因：给当前同步足够的时间完成，避免频繁重试
     */
    PENDING_SYNC_RETRY_DELAY_MS: 1000,

    /**
     * UI 刷新延迟（毫秒）
     * 
     * 同步完成后等待多久才刷新 UI
     * 
     * 默认：100ms
     * 原因：给 React 足够的时间更新 state
     */
    UI_REFRESH_DELAY_MS: 100,

    /**
     * 连接检查超时（毫秒）
     * 
     * 检查云端连接时的超时时间
     * 
     * 默认：10000ms (10秒)
     * 原因：给网络足够的时间响应
     */
    CONNECTION_CHECK_TIMEOUT_MS: 10000,
};

/**
 * 日志级别
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
}

const importMetaEnv = (import.meta as ImportMeta & {
    env?: {
        DEV?: boolean;
    };
}).env;

/**
 * 当前日志级别
 * 
 * 开发环境：DEBUG（显示所有日志）
 * 生产环境：INFO（只显示重要日志）
 */
export const CURRENT_LOG_LEVEL = importMetaEnv?.DEV ? LogLevel.DEBUG : LogLevel.INFO;
