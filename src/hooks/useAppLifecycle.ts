/**
 * @file useAppLifecycle.ts
 * @input useScrollTracker Hook
 * @output Scroll State (isHeaderScrolled)
 * @pos Hook (System Integration)
 * @description 应用生命周期 Hook - 管理应用的生命周期状态，如滚动状态追踪
 * 
 * 设计说明：
 * - 同步逻辑已移至 useSyncManager，避免重复
 * - 此 Hook 专注于轻量级的 UI 状态管理
 * - 可扩展用于其他生命周期相关的状态追踪
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import { useEffect } from 'react';
import { useScrollTracker } from './useScrollTracker';

export const useAppLifecycle = () => {
    // Scroll tracker
    const isHeaderScrolled = useScrollTracker();

    return { isHeaderScrolled };
};
