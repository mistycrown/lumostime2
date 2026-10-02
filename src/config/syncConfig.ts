/**
 * @file syncConfig.ts
 * @updated 2026-05-18: Reduced timestamp tolerance to 1 second so fresh desktop edits are no longer misclassified as equal right after a sync.
 * @updated 2026-09-03: Added a cooldown for foreground resume checks to avoid repeated lifecycle events triggering duplicate syncs.
 * @description 同步系统配置常量
 * @updated 2026-10-02: Unified edit debounce, maximum wait, local audits and bounded retry delays.
 * 
 * 集中管理所有同步相关的配置参数，便于调整和测试
 */

export const SYNC_CONFIG = {
    /** Maximum concurrent image transfers. */
    CONCURRENT_OPERATIONS: 3,
    /** Coalesce local edits for five seconds, flushing sustained activity within thirty seconds. */
    AUTO_SYNC_DEBOUNCE_MS: 5000,
    AUTO_SYNC_MAX_WAIT_MS: 30_000,
    /** Local-only audit for older writers without change events; this does not poll the cloud. */
    LOCAL_AUDIT_INTERVAL_MS: 15_000,
    /** Foreground checks inside the cooldown are deferred instead of discarded. */
    RESUME_SYNC_COOLDOWN_MS: 30_000,
    /** Retry transient failures with exponential backoff capped at five minutes. */
    PENDING_SYNC_RETRY_DELAY_MS: 5000,
    MAX_RETRY_DELAY_MS: 300_000,
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
