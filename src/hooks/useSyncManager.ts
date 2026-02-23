/**
 * @file useSyncManager.ts
 * @input DataContext (logs, todos, categories, etc.), SettingsContext (sync config, timestamps), CategoryScopeContext (categories, scopes, goals), ReviewContext (reviews), NavigationContext (currentView, modal states), ToastContext (addToast)
 * @output Sync Operations (performSync, handleQuickSync, handleImageSync, handleSyncDataUpdate), Sync State (isSyncing, refreshKey)
 * @pos Hook (System Integration)
 * @description 同步管理 Hook - 处理数据和图片的云端同步，支持启动同步、恢复同步、手动同步、自动同步等多种模式
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import { useState, useRef, useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useData } from '../contexts/DataContext';
import { useSettings } from '../contexts/SettingsContext';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { useReview } from '../contexts/ReviewContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useToast } from '../contexts/ToastContext';
import { webdavService } from '../services/webdavService';
import { s3Service } from '../services/s3Service';
import { imageService } from '../services/imageService';
import { syncService } from '../services/syncService';
import { uploadDataToCloud, downloadWithBackup, CloudService } from '../utils/syncUtils';
import { AppView } from '../types';

export const useSyncManager = () => {
    // Access Contexts at the top level
    const { logs, setLogs, todos, setTodos, todoCategories, setTodoCategories, localDataTimestamp, setLocalDataTimestamp, disableTimestampUpdateRef } = useData();
    const {
        autoLinkRules, setAutoLinkRules,
        customNarrativeTemplates, setCustomNarrativeTemplates,
        userPersonalInfo, setUserPersonalInfo,
        filters, setFilters,
        lastSyncTime, updateLastSyncTime,
        isRestoring,
        isSyncing, setIsSyncing,
        manualSyncMode
    } = useSettings();
    const { categories, setCategories, scopes, setScopes, goals, setGoals } = useCategoryScope();
    const {
        reviewTemplates, setReviewTemplates,
        checkTemplates, setCheckTemplates,
        dailyReviews, setDailyReviews,
        weeklyReviews, setWeeklyReviews,
        monthlyReviews, setMonthlyReviews
    } = useReview();
    const { currentView, setIsSettingsOpen } = useNavigation();
    const { addToast } = useToast();

    // Removed local isSyncing state to use global state
    const [refreshKey, setRefreshKey] = useState(0);
    const [isSyncDirectionModalOpen, setIsSyncDirectionModalOpen] = useState(false);

    const handleSyncDataUpdate = async (data: any) => {
        // console.log('[App] 开始更新同步数据...');
        isRestoring.current = true;
        disableTimestampUpdateRef.current = true;

        try {
            if (data.logs) setLogs(data.logs);
            if (data.categories) setCategories(data.categories);
            if (data.todos) setTodos(data.todos);
            if (data.todoCategories) setTodoCategories(data.todoCategories);
            if (data.scopes) setScopes(data.scopes);
            if (data.goals) setGoals(data.goals);
            if (data.autoLinkRules) setAutoLinkRules(data.autoLinkRules);
            if (data.reviewTemplates) setReviewTemplates(data.reviewTemplates);
            if (data.checkTemplates) setCheckTemplates(data.checkTemplates);
            if (data.dailyReviews) setDailyReviews(data.dailyReviews);
            if (data.weeklyReviews) setWeeklyReviews(data.weeklyReviews);
            if (data.monthlyReviews) setMonthlyReviews(data.monthlyReviews);
            if (data.customNarrativeTemplates) setCustomNarrativeTemplates(data.customNarrativeTemplates);
            if (data.userPersonalInfo) setUserPersonalInfo(data.userPersonalInfo);
            if (data.filters) setFilters(data.filters);

            await new Promise(resolve => setTimeout(resolve, 10));

            // console.log('[App] 同步数据更新完成');
            if (currentView === AppView.TIMELINE) {
                setRefreshKey(prev => prev + 1);
            }
        } finally {
            isRestoring.current = false;
            // Delay re-enabling timestamp updates to ensure all state effects have processed
            await new Promise(resolve => setTimeout(resolve, 500));
            disableTimestampUpdateRef.current = false;
            console.log(`[Sync] Unlocked timestamp updates`);
        }
    };

    const getFullLocalData = () => {
        const localData = {
            logs, todos, categories, todoCategories, scopes, goals,
            autoLinkRules, reviewTemplates, checkTemplates, dailyReviews, weeklyReviews,
            monthlyReviews, customNarrativeTemplates, userPersonalInfo, filters,
            version: '1.0.0',
            timestamp: localDataTimestamp // Use the tracking timestamp
        };
        return localData;
    };

    const backupLocalData = async (activeService: any, prefix: string = 'auto_backup') => {
        try {
            const localData = getFullLocalData();
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFilename = `backups/${prefix}_${timestamp}.json`;
            await activeService.uploadData(localData, backupFilename);
            return true;
        } catch (error) {
            console.error('[Sync] Backup failed:', error);
            return false;
        }
    };

    const syncLock = useRef(false);

    /**
     * Core Sync Logic - Unified for all sync triggers
     * @param mode 'startup' = App launch | 'resume' = App resume/tab visible | 'manual' = User click | 'auto' = Auto-sync
     */
    const performSync = async (mode: 'startup' | 'resume' | 'manual' | 'auto') => {
        if (syncLock.current || isSyncing) {
            console.log(`[Sync] Skipped ${mode} sync: Already syncing.`);
            return;
        }

        syncLock.current = true;
        setIsSyncing(true);

        try {
            // [Fix] Clear pending flag immediately when starting sync.
            // If new changes happen *during* sync, useEffect will set it to true again,
            // allowing the finally block to catch them. This prevents infinite loops on error.
            // IMPORTANT: Save the pending flag state BEFORE clearing it for startup check
            const hadPendingAutoSync = pendingAutoSyncRef.current;
            pendingAutoSyncRef.current = false;

            const webdavConfig = webdavService.getConfig();
            const s3Config = s3Service.getConfig();
            
            // 检查手动断开标志
            const webdavManualDisconnect = localStorage.getItem('lumos_webdav_manual_disconnect') === 'true';
            const s3ManualDisconnect = localStorage.getItem('lumos_s3_manual_disconnect') === 'true';

            // 过滤掉已手动断开的服务
            const hasWebdav = webdavConfig && !webdavManualDisconnect;
            const hasS3 = s3Config && !s3ManualDisconnect;

            if (!hasWebdav && !hasS3) {
                if (mode === 'manual') setIsSettingsOpen(true);
                return;
            }

            // 如果两个都连接了，提示用户只能选择一个
            if (hasWebdav && hasS3) {
                if (mode === 'manual') {
                    addToast('error', '检测到同时连接了 WebDAV 和 S3，请在设置中断开其中一个');
                    setIsSettingsOpen(true);
                }
                return;
            }

            const activeService = hasS3 ? s3Service : webdavService;

            // [Pre-check] Verify connection before attempting sync
            // This prevents infinite loops on Auth errors and avoids unnecessary retries when offline
            if (activeService.checkConnection) {
                try {
                    // console.log(`[Sync] Checking connection for ${mode} sync...`);
                    // Note: s3Service returns { success: boolean, message?: string }, webdavService returns boolean
                    const result = await activeService.checkConnection();
                    const isConnected = (typeof result === 'object' && 'success' in result) ? result.success : !!result;

                    if (!isConnected) {
                        console.warn(`[Sync] Connection check failed. Aborting ${mode} sync.`);

                        if (mode === 'manual') {
                            const msg = (typeof result === 'object' && result.message) ? result.message : '连接测试失败，请检查网络或配置';
                            addToast('error', msg);
                        } else {
                            // For auto/startup/resume, fail silently or log
                            // console.log(`[Sync] Skipped ${mode}: Connection unestablished`);
                        }
                        return; // Abort sync
                    }
                    // console.log(`[Sync] Connection verified.`);
                } catch (err) {
                    console.error(`[Sync] Connection check exception:`, err);
                    if (mode === 'manual') addToast('error', '连接检查出错');
                    return;
                }
            }

            // Track status
            let dataSyncStatus: 'restored' | 'uploaded' | 'equal' | 'error' = 'equal';
            let dataSyncMsg = '';

            // 容错阈值：8秒（处理上传延迟导致的时间差）
            const SYNC_TOLERANCE_MS = 8000;

            // 1. 获取本地时间戳（直接从 localStorage 读取，确保是最新值）
            const localTimestampStr = localStorage.getItem('lumostime_local_timestamp');
            const localTimestamp = localTimestampStr ? parseInt(localTimestampStr) : Date.now();
            console.log(`[Sync][Step 1] 本地时间戳: ${localTimestamp} (${new Date(localTimestamp).toLocaleString()})`);

            // 2. 获取云端时间戳
            // 策略：优先使用文件修改时间（statFile），如果失败则下载文件获取内部时间戳
            let cloudTimestamp = 0;
            let cloudData: any = null;
            let usedFileModTime = false;

            try {
                console.log(`[Sync][Step 2] 开始获取云端时间戳...`);
                
                // 2a. 尝试获取文件修改时间（优先方案）
                console.log(`[Sync][Step 2a] 尝试获取文件修改时间 (statFile)...`);
                const cloudFileDate = await activeService.statFile?.();
                
                if (cloudFileDate) {
                    cloudTimestamp = cloudFileDate.getTime();
                    usedFileModTime = true;
                    console.log(`[Sync][Step 2a] ✓ 成功获取文件修改时间: ${cloudTimestamp} (${cloudFileDate.toLocaleString()})`);
                } else {
                    console.log(`[Sync][Step 2a] ✗ statFile 返回 null，启动备用方案`);
                    
                    // 2b. 备用方案：下载文件获取内部时间戳
                    console.log(`[Sync][Step 2b] 启动备用方案：下载文件获取内部时间戳...`);
                    cloudData = await activeService.downloadData();
                    cloudTimestamp = cloudData?.timestamp || 0;
                    console.log(`[Sync][Step 2b] ✓ 从文件内部获取时间戳: ${cloudTimestamp} (${new Date(cloudTimestamp).toLocaleString()})`);
                }
            } catch (err) {
                console.log(`[Sync][Step 2] ✗ 获取云端时间戳失败，可能云端无数据`);
                console.log(`[Sync][Step 2] 错误详情:`, err);
                cloudTimestamp = 0;
            }

            // 3. 比较时间戳（使用容错阈值）
            const timeDiff = localTimestamp - cloudTimestamp;
            console.log(`[Sync][Step 3] 时间戳比较:`);
            console.log(`[Sync][Step 3]   - 本地时间: ${localTimestamp} (${new Date(localTimestamp).toLocaleString()})`);
            console.log(`[Sync][Step 3]   - 云端时间: ${cloudTimestamp} (${cloudTimestamp > 0 ? new Date(cloudTimestamp).toLocaleString() : '无数据'})`);
            console.log(`[Sync][Step 3]   - 时间差: ${timeDiff}ms (${(timeDiff / 1000).toFixed(1)}秒)`);
            console.log(`[Sync][Step 3]   - 容错阈值: ±${SYNC_TOLERANCE_MS}ms (±${SYNC_TOLERANCE_MS / 1000}秒)`);
            console.log(`[Sync][Step 3]   - 时间来源: ${usedFileModTime ? '文件修改时间' : '文件内部时间戳'}`);

            // 4. 执行操作（使用容错阈值判断）
            if (cloudTimestamp > localTimestamp + SYNC_TOLERANCE_MS) {
                // Case 1: Cloud is Newer (超过容错阈值) -> Restore (下载)
                console.log('[Sync][Step 4] 判定: 云端明显较新 -> 执行下载恢复');
                console.log(`[Sync][Step 4]   - 云端比本地新 ${((cloudTimestamp - localTimestamp) / 1000).toFixed(1)} 秒`);

                // Check if there's a pending auto-sync (user just made changes)
                if (mode === 'startup' && hadPendingAutoSync) {
                    console.log('[Sync] 跳过云端恢复：检测到待处理的自动同步（用户刚做了修改）');
                    dataSyncStatus = 'equal';
                    dataSyncMsg = '检测到本地变更，跳过云端恢复';
                } else {
                    // 使用统一的下载函数
                    const localData = getFullLocalData();
                    const result = await downloadWithBackup(
                        activeService,
                        localData,
                        undefined,
                        async (message) => {
                            // 自动同步模式下，不需要用户确认
                            if (mode === 'manual') {
                                return window.confirm(message);
                            }
                            return true;
                        }
                    );

                    if (result.success && result.data) {
                        // 等待数据更新完成（包括 500ms 的解锁延迟）
                        await handleSyncDataUpdate(result.data);
                        
                        // 数据更新完成后，立即更新时间戳（在 localStorage 中）
                        // 这样可以确保 localStorage 中的数据和时间戳保持一致
                        const now = Date.now();
                        localStorage.setItem('lumostime_local_timestamp', now.toString());
                        console.log(`[Sync] 数据恢复完成，立即更新 localStorage 时间戳: ${now}`);
                        
                        if (mode === 'startup') updateLastSyncTime();
                        dataSyncStatus = 'restored';
                        dataSyncMsg = result.message;
                    } else {
                        dataSyncStatus = 'error';
                        dataSyncMsg = result.message;
                        if (mode === 'manual') addToast('error', result.message);
                        return;
                    }
                }
            }
            else if (localTimestamp > cloudTimestamp + SYNC_TOLERANCE_MS) {
                // Case 2: Local is Newer (超过容错阈值) -> Upload (上传)
                console.log('[Sync][Step 4] 判定: 本地明显较新 -> 执行上传');
                console.log(`[Sync][Step 4]   - 本地比云端新 ${((localTimestamp - cloudTimestamp) / 1000).toFixed(1)} 秒`);
                const localData = getFullLocalData();

                // Safety check
                if (!localData.logs || !localData.todos) {
                    console.error('[Sync] Critical: Logs or Todos are undefined in upload payload!');
                    if (mode === 'manual') addToast('error', '同步取消：本地数据为空');
                    return;
                }

                // 使用统一的上传函数
                const result = await uploadDataToCloud(
                    activeService,
                    localData,
                    undefined
                );

                if (result.success) {
                    // 注意：不在这里更新时间戳
                    // 时间戳会在所有同步工作完成后统一更新
                    
                    if (mode === 'startup') updateLastSyncTime();
                    dataSyncStatus = 'uploaded';
                    dataSyncMsg = result.message;
                } else {
                    dataSyncStatus = 'error';
                    dataSyncMsg = result.message;
                    if (mode === 'manual') addToast('error', result.message);
                    return;
                }
            }
            else {
                // Case 3: Equal (时间差在容错阈值内)
                console.log('[Sync][Step 4] 判定: 时间戳一致（差值在容错范围内）');
                console.log(`[Sync][Step 4]   - 时间差 ${Math.abs(timeDiff)}ms < 容错阈值 ${SYNC_TOLERANCE_MS}ms`);
                dataSyncStatus = 'equal';
                dataSyncMsg = '数据已是一致';
            }

            // 5. Construct Final Feedback (Only for Manual Mode)
            // 注意：统一函数已经返回完整的消息，包含图片同步信息
            if (mode === 'manual') {
                if (dataSyncStatus === 'equal') {
                    addToast('info', '云端与本地数据一致，无需同步');
                } else if (dataSyncStatus === 'restored' || dataSyncStatus === 'uploaded') {
                    // dataSyncMsg 已经包含了图片同步信息（来自统一函数）
                    addToast('success', dataSyncMsg);
                } else if (dataSyncStatus === 'error') {
                    // 错误消息已经在上面显示过了
                }
            } else if (mode === 'startup' && dataSyncStatus === 'restored') {
                // Startup mode: Only toast when restored
                addToast('success', '启动同步：已下载云端数据');
            } else if (mode === 'resume' && (dataSyncStatus === 'restored' || dataSyncStatus === 'uploaded')) {
                // Resume mode: Toast when data changed
                const msg = dataSyncStatus === 'restored' ? '已下载云端数据' : '已上传本地数据';
                addToast('success', msg);
            } else if (mode === 'auto') {
                // Auto mode: Silent, no toast
            }

            // 6. 统一更新时间戳（在所有同步工作完成后）
            if (dataSyncStatus === 'uploaded') {
                // 上传成功后，使用当前时间作为本地时间戳
                const now = Date.now();
                localStorage.setItem('lumostime_local_timestamp', now.toString());
                setLocalDataTimestamp(now);
                console.log(`[Sync] 上传完成，本地时间戳已更新: ${now} (${new Date(now).toLocaleString()})`);
            } else if (dataSyncStatus === 'restored') {
                // 下载成功后，时间戳已经在 handleSyncDataUpdate 后立即更新了
                // 这里只需要更新 React state（确保 UI 同步）
                const storedTimestamp = localStorage.getItem('lumostime_local_timestamp');
                if (storedTimestamp) {
                    setLocalDataTimestamp(parseInt(storedTimestamp));
                    console.log(`[Sync] 下载完成，同步 React state 时间戳: ${storedTimestamp}`);
                }
            }

            if ((currentView === AppView.TIMELINE) || (mode === 'startup' && dataSyncStatus === 'restored')) {
                await new Promise(resolve => setTimeout(resolve, 100));
                setRefreshKey(prev => prev + 1);
            }

        } catch (error) {
            console.error("Sync failed", error);
            if (mode === 'manual') addToast('error', '同步失败，请检查网络或配置');
        } finally {
            setIsSyncing(false);
            syncLock.current = false;

            // [Retry Logic] If an auto-sync was requested WHILE we were syncing, trigger it now
            // But only if we are not already in a recursive loop (simple check)
            if (pendingAutoSyncRef.current) {
                console.log('[Sync] Pending auto-sync detected after sync finished. Retrying...');
                // Use setTimeout to break the stack and allow state updates
                setTimeout(() => performSync('auto'), 1000);
            }
        }
    };

    const handleQuickSync = async (e?: React.MouseEvent) => {
        e?.stopPropagation();
        
        // 如果开启了手动同步模式，弹出方向选择模态框
        if (manualSyncMode) {
            setIsSyncDirectionModalOpen(true);
            return;
        }
        
        // 否则执行自动检测同步
        await performSync('manual');
    };
    
    // 手动上传到云端（完整流程：主数据 + 图片列表 JSON + 图片文件）
    const handleManualUpload = async () => {
        if (syncLock.current || isSyncing) {
            console.log('[Sync] Skipped manual upload: Already syncing.');
            return;
        }

        syncLock.current = true;
        setIsSyncing(true);

        try {
            const webdavConfig = webdavService.getConfig();
            const s3Config = s3Service.getConfig();
            
            // 检查手动断开标志
            const webdavManualDisconnect = localStorage.getItem('lumos_webdav_manual_disconnect') === 'true';
            const s3ManualDisconnect = localStorage.getItem('lumos_s3_manual_disconnect') === 'true';

            // 过滤掉已手动断开的服务
            const hasWebdav = webdavConfig && !webdavManualDisconnect;
            const hasS3 = s3Config && !s3ManualDisconnect;

            if (!hasWebdav && !hasS3) {
                addToast('error', '未连接任何云端服务');
                setIsSettingsOpen(true);
                return;
            }

            // 如果两个都连接了，提示用户只能选择一个
            if (hasWebdav && hasS3) {
                addToast('error', '检测到同时连接了 WebDAV 和 S3，请在设置中断开其中一个');
                setIsSettingsOpen(true);
                return;
            }

            const activeService = hasS3 ? s3Service : webdavService;
            
            // 验证连接
            if (activeService.checkConnection) {
                const result = await activeService.checkConnection();
                const isConnected = (typeof result === 'object' && 'success' in result) ? result.success : !!result;
                if (!isConnected) {
                    const msg = (typeof result === 'object' && result.message) ? result.message : '连接测试失败，请检查网络或配置';
                    addToast('error', msg);
                    return;
                }
            }

            const localData = getFullLocalData();

            if (!localData.logs || !localData.todos) {
                console.error('[Sync] Critical: Logs or Todos are undefined in upload payload!');
                addToast('error', '同步取消：本地数据为空');
                return;
            }

            // 使用统一的上传函数
            const result = await uploadDataToCloud(
                activeService,
                localData,
                undefined
            );

            if (result.success) {
                // 上传成功后，使用当前时间更新本地时间戳
                const now = Date.now();
                setLocalDataTimestamp(now);
                localStorage.setItem('lumostime_local_timestamp', now.toString());
                console.log(`[Sync] 手动上传完成，本地时间戳已更新: ${now}`);
                
                addToast('success', result.message);
            } else {
                addToast('error', result.message);
            }

            if (currentView === AppView.TIMELINE) {
                await new Promise(resolve => setTimeout(resolve, 100));
                setRefreshKey(prev => prev + 1);
            }

        } catch (error) {
            console.error("Manual upload failed", error);
            addToast('error', '上传失败，请检查网络或配置');
        } finally {
            setIsSyncing(false);
            syncLock.current = false;
        }
    };
    
    // 手动从云端下载（完整流程：主数据 + 图片列表 JSON + 图片文件）
    const handleManualDownload = async () => {
        if (syncLock.current || isSyncing) {
            console.log('[Sync] Skipped manual download: Already syncing.');
            return;
        }

        syncLock.current = true;
        setIsSyncing(true);

        try {
            const webdavConfig = webdavService.getConfig();
            const s3Config = s3Service.getConfig();
            
            // 检查手动断开标志
            const webdavManualDisconnect = localStorage.getItem('lumos_webdav_manual_disconnect') === 'true';
            const s3ManualDisconnect = localStorage.getItem('lumos_s3_manual_disconnect') === 'true';

            // 过滤掉已手动断开的服务
            const hasWebdav = webdavConfig && !webdavManualDisconnect;
            const hasS3 = s3Config && !s3ManualDisconnect;

            if (!hasWebdav && !hasS3) {
                addToast('error', '未连接任何云端服务');
                setIsSettingsOpen(true);
                return;
            }

            // 如果两个都连接了，提示用户只能选择一个
            if (hasWebdav && hasS3) {
                addToast('error', '检测到同时连接了 WebDAV 和 S3，请在设置中断开其中一个');
                setIsSettingsOpen(true);
                return;
            }

            const activeService = hasS3 ? s3Service : webdavService;
            
            // 验证连接
            if (activeService.checkConnection) {
                const result = await activeService.checkConnection();
                const isConnected = (typeof result === 'object' && 'success' in result) ? result.success : !!result;
                if (!isConnected) {
                    const msg = (typeof result === 'object' && result.message) ? result.message : '连接测试失败，请检查网络或配置';
                    addToast('error', msg);
                    return;
                }
            }

            const localData = getFullLocalData();

            // 使用统一的下载函数（包含备份）
            const result = await downloadWithBackup(
                activeService,
                localData,
                undefined,
                async (message) => window.confirm(message)
            );

            if (result.success && result.data) {
                // 等待数据更新完成（包括 500ms 的解锁延迟）
                await handleSyncDataUpdate(result.data);
                
                // 数据更新完成后，立即更新时间戳（在 localStorage 中）
                const now = Date.now();
                localStorage.setItem('lumostime_local_timestamp', now.toString());
                console.log(`[Sync] 手动下载完成，立即更新 localStorage 时间戳: ${now}`);
                
                // 然后更新 React state（会在下次渲染时生效）
                setLocalDataTimestamp(now);
                
                addToast('success', result.message);
                
                await new Promise(resolve => setTimeout(resolve, 100));
                setRefreshKey(prev => prev + 1);
            } else {
                addToast('error', result.message);
            }

        } catch (error) {
            console.error("Manual download failed", error);
            addToast('error', '下载失败，请检查网络或配置');
        } finally {
            setIsSyncing(false);
            syncLock.current = false;
        }
    };

    // --- Effects ---
    // 1. Startup Pull
    useEffect(() => {
        // 如果开启了手动同步模式，跳过启动同步
        if (!manualSyncMode) {
            performSync('startup');
        }
    }, [manualSyncMode]); // 添加 manualSyncMode 依赖，以便在切换模式时重新评估

    // 2. Data Auto Sync
    const isFirstRun = useRef(true);
    const isSyncingRef = useRef(isSyncing);
    const pendingAutoSyncRef = useRef(false); // Track if auto-sync is pending

    useEffect(() => {
        isSyncingRef.current = isSyncing;
    }, [isSyncing]);

    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }

        // 如果开启了手动同步模式，不触发自动同步
        if (manualSyncMode) {
            return;
        }

        // [Fix] Do not set pending flag if we are currently restoring from cloud.
        // Data changes during restore are NOT user actions and should not trigger auto-sync.
        if (isRestoring.current || isSyncingRef.current) {
            // Note: isSyncingRef might be too broad if we want to allow user edits during sync to queue up.
            // But definitely isRestoring should block it.
            if (isRestoring.current) return;
        }

        // Set pending flag immediately when data changes
        pendingAutoSyncRef.current = true;

        const timer = setTimeout(async () => {
            // Prevent auto-sync if a manual/startup sync is in progress
            if (isSyncingRef.current || isRestoring.current) {
                // Keep pending flag true if we skipped, so next time it might try? 
                // Alternatively, performSync calls are locked anyway.
                return;
            }

            // Using unified logic for auto-sync
            // This ensures we do checks and conflict handling even for auto-sync
            await performSync('auto');

            pendingAutoSyncRef.current = false;

        }, 2000); // Debounce reduced to 2s for responsiveness
        return () => {
            clearTimeout(timer);
            // Don't clear the pending flag here, only clear it when sync completes or is skipped
        };
    }, [logs, todos, categories, todoCategories, scopes, goals, autoLinkRules, reviewTemplates, checkTemplates, dailyReviews, weeklyReviews, monthlyReviews, customNarrativeTemplates, userPersonalInfo, filters, manualSyncMode]); // 添加 manualSyncMode 依赖

    // 2b. Image List Auto Sync (监听图片列表 JSON 的变化)
    useEffect(() => {
        let timer: NodeJS.Timeout | null = null;
        
        const handleImageListChanged = () => {
            // 如果开启了手动同步模式，不触发自动同步
            if (manualSyncMode) return;
            
            // 如果正在恢复数据，不触发自动同步
            if (isRestoring.current) return;
            
            // 清除之前的定时器
            if (timer) clearTimeout(timer);
            
            // 设置待同步标志
            pendingAutoSyncRef.current = true;
            
            // 2秒后触发自动同步（与数据变化使用相同的防抖时间）
            timer = setTimeout(async () => {
                if (!isSyncingRef.current && !isRestoring.current) {
                    await performSync('auto');
                    pendingAutoSyncRef.current = false;
                }
            }, 2000);
        };
        
        window.addEventListener('imageListChanged', handleImageListChanged as EventListener);
        
        return () => {
            window.removeEventListener('imageListChanged', handleImageListChanged as EventListener);
            if (timer) clearTimeout(timer);
        };
    }, [manualSyncMode]);

    // 3. App LifeCycle Auto Sync (Resume)
    useEffect(() => {
        // A. Resume (Foreground) -> Check for Cloud Updates
        let appListener: any;
        const setupListener = async () => {
            appListener = await App.addListener('appStateChange', async (state) => {
                // On native platforms, use App state
                if (state.isActive && Capacitor.isNativePlatform()) {
                    // 如果开启了手动同步模式，跳过恢复同步
                    if (!manualSyncMode) {
                        console.log('[App] App resumed. Checking for updates...');
                        performSync('resume');
                    }
                }
            });
        };
        setupListener();

        // B. Web Visibility API - Resume
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // On Web, switching tabs back to visible should also check (similar to App Resume)
                if (!Capacitor.isNativePlatform()) {
                    // 如果开启了手动同步模式，跳过恢复同步
                    if (!manualSyncMode) {
                        console.log('[App] Tab visible. Checking for updates...');
                        performSync('resume');
                    }
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            if (appListener) appListener.remove();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [manualSyncMode]); // 只依赖 manualSyncMode

    return {
        isSyncing,
        refreshKey,
        setRefreshKey,
        handleQuickSync,
        handleSyncDataUpdate,
        isSyncDirectionModalOpen,
        setIsSyncDirectionModalOpen,
        handleManualUpload,
        handleManualDownload
    };
};
