/**
 * @file useAppInitialization.ts
 * @input SettingsContext (setAppRules), ToastContext (addToast), DataContext (logs, setLogs)
 * @output App Initialization (data repair, dual icon migration, app rules loading, update check, background service init)
 * @pos Hook (System Integration)
 * @description 应用初始化 Hook - 处理应用启动时的数据修复、迁移、规则加载、更新检查等初始化任务
 * @updated 2026-05-03: Replaced CommonJS EdgeToEdge loading with the plugin's ESM entry so Android production bundles stop calling browser-undefined `require()`.
 * @updated 2026-04-15: Unified Android floating-window startup so the overlay can still recover when notifications are disabled.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import { useEffect, useRef } from 'react';
import { EdgeToEdge } from '@capawesome/capacitor-android-edge-to-edge-support';
import { Capacitor } from '@capacitor/core';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import AppUsage from '../plugins/AppUsagePlugin';
import { imageService } from '../services/imageService';
import { UpdateService } from '../services/updateService';
import { backgroundService } from '../services/backgroundService';
import { fontService } from '../services/fontService';
import { useData } from '../contexts/DataContext';
import { dataRepairService } from '../services/dataRepairService';
import { dualIconMigrationService } from '../services/dualIconMigrationService';
import { initResetDataTool } from '../utils/resetDataTool';
import { DEFAULT_PRINCIPLE_PRESETS } from '../constants/principlePresets';
import { startFloatingWindowWithGuards } from '../utils/floatingWindowStartup';

// Edge-to-Edge 支持（仅在 Android 上可用）
export const useAppInitialization = () => {
    const { setAppRules } = useSettings();
    const { addToast } = useToast();
    const { logs, setLogs } = useData();
    const hasCleanedImagesRef = useRef(false);
    const hasRepairedDataRef = useRef(false);

    // Expose UpdateService to window for debugging
    useEffect(() => {
        if (typeof window !== 'undefined') {
            (window as any).UpdateService = UpdateService;
            console.log('💡 调试提示: 可以在控制台使用 UpdateService.checkNeedsUpdate(true) 强制检查更新');
            
            // 初始化数据重置工具
            initResetDataTool();
        }
    }, []);

    // Data repair and migration on mount (run once)
    useEffect(() => {
        const repairAndMigrateData = async () => {
            if (hasRepairedDataRef.current) return;
            hasRepairedDataRef.current = true;

            try {
                // 1. 修复旧迁移逻辑造成的数据问题
                console.log('🔧 [DataRepair] 开始检查数据...');
                const repairResult = await dataRepairService.repairAll();
                if (repairResult.success && repairResult.repairedCount > 0) {
                    console.log(`✅ [DataRepair] ${repairResult.message}`);
                    // 修复后刷新页面以加载新数据
                    setTimeout(() => {
                        window.location.reload();
                    }, 500);
                    return;
                }

                // 2. 初始化双图标系统（为现有数据添加 uiIcon 字段）
                console.log('🔄 [DualIcon] 开始检查数据迁移...');
                const migrationResult = await dualIconMigrationService.migrateAll();
                if (migrationResult.success) {
                    console.log(`✅ [DualIcon] ${migrationResult.message}`);
                }
            } catch (error) {
                console.error('❌ [DataRepair/Migration] 失败:', error);
            }
        };

        repairAndMigrateData();
    }, []);

    // Load app rules on mount
    useEffect(() => {
        const loadAppRules = async () => {
            if (Capacitor.getPlatform() === 'android') {
                try {
                    const result = await AppUsage.getAppRules();
                    setAppRules(result.rules || {});
                    console.log('📋 已加载应用规则:', result.rules);
                } catch (e) {
                    console.error('加载应用规则失败:', e);
                }
            }
        };
        loadAppRules();
    }, []);

    // Check for Updates on Mount (with 24h interval)
    useEffect(() => {
        const checkUpdates = async () => {
            try {
                const updateInfo = await UpdateService.checkNeedsUpdate();
                if (updateInfo) {
                    addToast('info', `发现新版本: ${updateInfo.version}`);
                }
            } catch (e) {
                console.error('[App] 更新检查异常:', e);
            }
        };
        checkUpdates();
    }, []);

    // Initialize background service
    useEffect(() => {
        backgroundService.init();
        console.log('🖼️ Background service initialized');
    }, []);

    // Initialize font service
    useEffect(() => {
        const initFont = async () => {
            try {
                await fontService.initializeFont();
                console.log('🔤 Font service initialized');
            } catch (error) {
                console.error('❌ Font service initialization failed:', error);
            }
        };
        initFont();
    }, []);

    // Initialize principle library with default presets
    useEffect(() => {
        const initPrincipleLibrary = () => {
            try {
                const stored = localStorage.getItem('lumostime_principles');
                if (!stored) {
                    // 如果原则库为空，加载默认预设
                        localStorage.setItem('lumostime_principles', JSON.stringify(DEFAULT_PRINCIPLE_PRESETS));
                        console.log('📚 Principle library initialized with default presets');
                }
            } catch (error) {
                console.error('❌ Principle library initialization failed:', error);
            }
        };
        initPrincipleLibrary();
    }, []);

    // Initialize Edge-to-Edge support for Android
    useEffect(() => {
        const initEdgeToEdge = async () => {
            if (Capacitor.getPlatform() !== 'android') return;

            try {
                // 确保 Edge-to-Edge 已启用（插件默认启用）
                await EdgeToEdge.enable();
                
                // 获取并记录当前的 insets
                const insets = await EdgeToEdge.getInsets();
                console.log('📱 Edge-to-Edge insets:', insets);
                
                // 如果需要，可以将 insets 应用到 CSS 变量
                if (insets.top > 0) {
                    document.documentElement.style.setProperty('--status-bar-height', `${insets.top}px`);
                }
                if (insets.bottom > 0) {
                    document.documentElement.style.setProperty('--navigation-bar-height', `${insets.bottom}px`);
                }
                
                console.log('✅ Edge-to-Edge initialized successfully');
            } catch (error) {
                console.error('❌ Edge-to-Edge initialization failed:', error);
            }
        };
        
        initEdgeToEdge();
    }, []);

    // Initialize floating window on Android if enabled
    useEffect(() => {
        const initFloatingWindow = async () => {
            if (Capacitor.getPlatform() !== 'android') return;

            try {
                const floatingWindowEnabled = localStorage.getItem('floating_window_enabled') === 'true';
                
                if (floatingWindowEnabled) {
                    console.log('🎈 检测到悬浮球已启用，尝试启动...');
                    
                    // 检查权限
                    const result = await startFloatingWindowWithGuards();
                    
                    if (result.started) {
                        // 启动悬浮球服务
                        console.log('✅ 悬浮球已自动启动');
                        if (!result.notificationPermissionGranted) {
                            console.warn('[AppInitialization] Floating window started without notification permission; stability may be reduced.');
                        }
                    } else {
                        console.log('⚠️ 悬浮球权限未授予，无法自动启动');
                    }
                }
            } catch (error) {
                console.error('❌ 悬浮球初始化失败:', error);
            }
        };
        
        initFloatingWindow();
    }, []);

    /**
     * 图片清理逻辑（已禁用）
     * 
     * 说明：此功能用于自动清理日志中引用的无效图片
     * 当前已禁用，因为：
     * 1. 可能在同步过程中误删除正在上传的图片
     * 2. 需要更完善的同步状态检测机制
     * 3. 建议在设置中提供手动清理选项
     * 
     * 如需启用，请确保：
     * - 同步完成后再执行清理
     * - 添加用户确认提示
     * - 记录清理日志供用户查看
     */
    /* 
    useEffect(() => {
        const cleanLogs = async () => {
            // Only run once when logs are loaded
            if (hasCleanedImagesRef.current || logs.length === 0) return;

            try {
                const validImages = new Set(await imageService.listImages());
                let changed = false;
                const newLogs = logs.map(log => {
                    if (!log.images || log.images.length === 0) return log;
                    const valid = log.images.filter(img => validImages.has(img));
                    if (valid.length !== log.images.length) {
                        changed = true;
                        return { ...log, images: valid };
                    }
                    return log;
                });

                if (changed) {
                    console.log('🧹 [Auto-Cleanup] Removed invalid image references from logs.');
                    setLogs(newLogs);
                }
                hasCleanedImagesRef.current = true;
            } catch (e) {
                console.error('Auto-cleanup failed', e);
            }
        };
        cleanLogs();
    }, [logs]);
    */
};
