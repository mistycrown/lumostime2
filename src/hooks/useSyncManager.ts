/**
 * @file useSyncManager.ts
 * @input DataContext (logs, todos, categories, etc.), SettingsContext (sync config, timestamps), CategoryScopeContext (categories, scopes, goals), ReviewContext (reviews), NavigationContext (currentView, modal states), ToastContext (addToast)
 * @output Sync Operations (performSync, handleQuickSync, handleImageSync, handleSyncDataUpdate), Sync State (isSyncing, refreshKey), and size-conflict resolution state
 * @pos Hook (System Integration)
 * @description 同步管理 Hook - 处理数据和图片的云端同步，支持启动同步、恢复同步、手动同步、自动同步等多种模式，并在恢复筛选器时保持顺序稳定，同时保证空值恢复与 majorGoals 载荷一致。
 * @updated 2026-07-06: Included the self-belief library in backup/sync payloads and restore handling so identity descriptions travel with user data.
 * @updated 2026-06-15: Added JSON-size conflict protection so timestamp-based cloud decisions now pause before any larger backup payload would be overwritten by a smaller one, letting the user choose upload vs restore explicitly.
 * @updated 2026-06-14: Prefer uploading confirmed pending local edits during auto-sync even when the local/cloud timestamps still fall inside the equal-tolerance window, so newly created todos are not skipped.
 * @updated 2026-05-18: Reduced timestamp comparison tolerance handling by routing sync direction through a shared helper, so fresh desktop edits are no longer swallowed as "equal" for several seconds after the previous sync.
 * @updated 2026-06-13: Included data collections and collection entries in unified backup/sync payloads, restore handling, and auto-sync change detection.
 * @updated 2026-05-18: Extended the unified backup/sync payload to include the achievement bottle backup block, and now restore that state alongside the main app data during imports and cloud downloads.
 * @updated 2026-05-17: Extended the unified backup/sync payload to include the shared AI backup block, and now restore that AI state alongside the main app data during imports and cloud downloads.
 * @updated 2026-05-18: Included the persisted custom color group in backup/sync payloads and now auto-sync palette-only edits as part of user data.
 *
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import { useState, useRef, useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useData } from '../contexts/DataContext';
import { useAchievement } from '../contexts/AchievementContext';
import { useSettings } from '../contexts/SettingsContext';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { useReview } from '../contexts/ReviewContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useToast } from '../contexts/ToastContext';
import { webdavService } from '../services/webdavService';
import { s3Service } from '../services/s3Service';
import { compatibleS3Service } from '../services/compatibleS3Service';
import { assistantBackupService } from '../services/assistantBackupService';
import {
    CUSTOM_COLOR_GROUP_UPDATED_EVENT,
    customColorGroupService
} from '../services/customColorGroupService';
import { imageService } from '../services/imageService';
import { syncService } from '../services/syncService';
import { uploadDataToCloud, downloadWithBackup, CloudService } from '../utils/syncUtils';
import { AppView } from '../types';
import { SYNC_CONFIG } from '../config/syncConfig';
import { normalizeCheckTemplates, normalizeDailyReviews } from '../utils/checkItemNormalizer';
import { AI_BACKUP_CHANGED_EVENT } from '../utils/aiBackupChange';
import { normalizeFiltersOrder } from '../utils/filterUtils';
import {
    detectForcedSyncConflict,
    getJsonByteSize,
    resolveSyncDirectionDecision,
    SyncDirectionDecision
} from '../utils/syncTimestampDirection';
import { getSyncPayloadTimestamp } from '../utils/syncPayloadMetadata';
import {
    getLocalDataTimestamp,
    setLocalDataTimestampUpdateLocked,
    setLocalDataTimestampValue
} from '../utils/localDataTimestamp';
import {
    buildSceneGroupStateFromLegacySlots,
    getActiveSceneGroup,
    loadSceneGroupStateFromStorage,
    saveSceneGroupStateToStorage
} from '../utils/sceneGroupStorage';

export const useSyncManager = () => {
    type SyncMode = 'startup' | 'resume' | 'manual' | 'auto';
    type SyncExecutionDirection = 'upload' | 'restore';
    interface SyncConflictModalState {
        isOpen: boolean;
        mode: SyncMode;
        activeService: CloudService | null;
        localData: any | null;
        cloudData: any | null;
        localTimestamp: number;
        cloudTimestamp: number;
        decision: SyncDirectionDecision | null;
    }

    // Access Contexts at the top level
    const {
        logs, setLogs,
        todos, setTodos,
        todoCategories, setTodoCategories,
        collections, setCollections,
        collectionEntries, setCollectionEntries
    } = useData();
    const {
        autoLinkRules, setAutoLinkRules,
        customNarrativeTemplates, setCustomNarrativeTemplates,
        userPersonalInfo, setUserPersonalInfo,
        customStickerSets, setCustomStickerSets,
        customStickers, setCustomStickers,
        filters, setFilters,
        lastSyncTime, updateLastSyncTime,
        isRestoring,
        isSyncing, setIsSyncing,
        manualSyncMode
    } = useSettings();
    const { categories, setCategories, scopes, setScopes, goals, setGoals, majorGoals, setMajorGoals } = useCategoryScope();
    const {
        reviewTemplates, setReviewTemplates,
        checkTemplates, setCheckTemplates,
        dailyReviews, setDailyReviews,
        weeklyReviews, setWeeklyReviews,
        monthlyReviews, setMonthlyReviews,
        onThisDayEntries, setOnThisDayEntries
    } = useReview();
    const {
        buildBackupPayload: buildAchievementBackupPayload,
        applyBackupPayload: applyAchievementBackupPayload
    } = useAchievement();
    const { currentView, setIsSettingsOpen } = useNavigation();
    const { addToast } = useToast();

    // Removed local isSyncing state to use global state
    const [refreshKey, setRefreshKey] = useState(0);
    const [isSyncDirectionModalOpen, setIsSyncDirectionModalOpen] = useState(false);
    const [syncConflictModalState, setSyncConflictModalState] = useState<SyncConflictModalState>({
        isOpen: false,
        mode: 'manual',
        activeService: null,
        localData: null,
        cloudData: null,
        localTimestamp: 0,
        cloudTimestamp: 0,
        decision: null
    });

    const handleSyncDataUpdate = async (data: any) => {
        // console.log('[App] 开始更新同步数据...');
        isRestoring.current = true;
        setLocalDataTimestampUpdateLocked(true);

        try {
            const hasField = (key: string) => Object.prototype.hasOwnProperty.call(data, key);
            console.log('[Sync] handleSyncDataUpdate incoming summary:', {
                incomingTimestamp: data?.timestamp,
                currentLogsCount: logs.length,
                incomingLogsCount: Array.isArray(data?.logs) ? data.logs.length : 'unchanged',
                currentTodosCount: todos.length,
                incomingTodosCount: Array.isArray(data?.todos) ? data.todos.length : 'unchanged',
                currentCollectionsCount: collections.length,
                incomingCollectionsCount: Array.isArray(data?.collections) ? data.collections.length : 'unchanged',
                currentCollectionEntriesCount: collectionEntries.length,
                incomingCollectionEntriesCount: Array.isArray(data?.collectionEntries) ? data.collectionEntries.length : 'unchanged',
                currentView
            });

            if (hasField('logs')) setLogs(data.logs);
            if (hasField('categories')) setCategories(data.categories);
            if (hasField('todos')) setTodos(data.todos);
            if (hasField('todoCategories')) setTodoCategories(data.todoCategories);
            if (hasField('collections')) setCollections(data.collections);
            if (hasField('collectionEntries')) setCollectionEntries(data.collectionEntries);
            if (hasField('scopes')) setScopes(data.scopes);
            if (hasField('goals')) setGoals(data.goals);
            if (hasField('majorGoals')) setMajorGoals(data.majorGoals);
            if (hasField('autoLinkRules')) setAutoLinkRules(data.autoLinkRules);
            if (hasField('reviewTemplates')) setReviewTemplates(data.reviewTemplates);
            if (hasField('checkTemplates')) setCheckTemplates(normalizeCheckTemplates(data.checkTemplates));
            if (hasField('dailyReviews')) setDailyReviews(normalizeDailyReviews(data.dailyReviews));
            if (hasField('weeklyReviews')) setWeeklyReviews(data.weeklyReviews);
            if (hasField('monthlyReviews')) setMonthlyReviews(data.monthlyReviews);
            if (hasField('onThisDayEntries')) setOnThisDayEntries(data.onThisDayEntries);
            if (hasField('customNarrativeTemplates')) setCustomNarrativeTemplates(data.customNarrativeTemplates);
            if (hasField('userPersonalInfo')) setUserPersonalInfo(data.userPersonalInfo ?? '');
            if (hasField('customStickerSets')) setCustomStickerSets(data.customStickerSets ?? []);
            if (hasField('customStickers')) setCustomStickers(data.customStickers ?? []);
            if (hasField('filters')) setFilters(normalizeFiltersOrder(data.filters));
            
            // 恢复场景设置到 localStorage（优先新版 sceneGroupState，兼容旧版 sceneTimeSlots）
            if (hasField('sceneGroupState')) {
                saveSceneGroupStateToStorage(data.sceneGroupState);
                window.dispatchEvent(new Event('sceneGroupsUpdated'));
                window.dispatchEvent(new Event('sceneTimeSlotsUpdated'));
            } else if (hasField('sceneTimeSlots')) {
                const migrated = buildSceneGroupStateFromLegacySlots(data.sceneTimeSlots);
                saveSceneGroupStateToStorage(migrated);
                window.dispatchEvent(new Event('sceneGroupsUpdated'));
                window.dispatchEvent(new Event('sceneTimeSlotsUpdated'));
            }
            
            // 恢复原则库到 localStorage
            if (hasField('principles')) {
                localStorage.setItem('lumostime_principles', JSON.stringify(data.principles));
                // 触发事件通知原则库页面更新
                window.dispatchEvent(new Event('principleLibraryChanged'));
            }
            if (hasField('selfBeliefs')) {
                localStorage.setItem('lumostime_self_beliefs', JSON.stringify(data.selfBeliefs));
                window.dispatchEvent(new Event('selfBeliefLibraryChanged'));
            }

            if (hasField('customColorGroup')) {
                customColorGroupService.saveGroup(data.customColorGroup);
            }

            if (hasField('achievementData')) {
                applyAchievementBackupPayload(data.achievementData);
            }

            if (hasField('aiData')) {
                await assistantBackupService.applyBackupPayload(data.aiData);
            }

            await new Promise(resolve => setTimeout(resolve, 10));
            console.log('[Sync] handleSyncDataUpdate applied restore payload');

            // console.log('[App] 同步数据更新完成');
            if (currentView === AppView.TIMELINE) {
                setRefreshKey(prev => prev + 1);
            }
        } finally {
            isRestoring.current = false;
            // Delay re-enabling timestamp updates to ensure all state effects have processed
            await new Promise(resolve => setTimeout(resolve, SYNC_CONFIG.DATA_UPDATE_UNLOCK_DELAY_MS));
            setLocalDataTimestampUpdateLocked(false);
            console.log(`[Sync] Unlocked timestamp updates`);
        }
    };

    const getFullLocalData = () => {
        // 从 localStorage 读取场景组设置（兼容旧版 sceneTimeSlots）
        const sceneGroupState = loadSceneGroupStateFromStorage();
        const sceneTimeSlots = getActiveSceneGroup(sceneGroupState)?.timeSlots || [];
        
        // 从 localStorage 读取原则库
        const principlesStr = localStorage.getItem('lumostime_principles');
        const principles = principlesStr ? JSON.parse(principlesStr) : [];
        const selfBeliefsStr = localStorage.getItem('lumostime_self_beliefs');
        const selfBeliefs = selfBeliefsStr ? JSON.parse(selfBeliefsStr) : [];
        
        const customColorGroup = customColorGroupService.getGroup();

        const localData = {
            logs, todos, categories, todoCategories, collections, collectionEntries, scopes, goals, majorGoals,
            autoLinkRules, reviewTemplates, checkTemplates, dailyReviews, weeklyReviews,
            monthlyReviews, onThisDayEntries, customNarrativeTemplates, userPersonalInfo, customStickerSets, customStickers, filters,
            customColorGroup,
            achievementData: buildAchievementBackupPayload(),
            aiData: assistantBackupService.buildBackupPayload(),
            sceneTimeSlots,
            sceneGroupState,
            principles, // 添加原则库
            selfBeliefs, // 添加自我认知库
            version: '1.0.0',
            timestamp: getLocalDataTimestamp() // Use the latest persisted tracking timestamp
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
     * 获取活跃的云服务
     * @returns 服务实例和错误类型
     */
    const getActiveCloudService = () => {
        const webdavConfig = webdavService.getConfig();
        const s3Config = s3Service.getConfig();
        const compatibleS3Config = compatibleS3Service.getConfig();
        
        // 检查手动断开标志
        const webdavManualDisconnect = localStorage.getItem('lumos_webdav_manual_disconnect') === 'true';
        const s3ManualDisconnect = localStorage.getItem('lumos_s3_manual_disconnect') === 'true';
        const compatibleS3ManualDisconnect = localStorage.getItem('lumos_compatible_s3_manual_disconnect') === 'true';

        // 过滤掉已手动断开的服务
        const hasWebdav = webdavConfig && !webdavManualDisconnect;
        const hasS3 = s3Config && !s3ManualDisconnect;
        const hasCompatibleS3 = compatibleS3Config && !compatibleS3ManualDisconnect;
        const activeCount = [hasWebdav, hasS3, hasCompatibleS3].filter(Boolean).length;

        if (activeCount === 0) {
            return { service: null, error: 'no_service' as const };
        }

        // 如果两个都连接了，提示用户只能选择一个
        if (activeCount > 1) {
            return { service: null, error: 'multiple_services' as const };
        }

        if (hasCompatibleS3) {
            return { service: compatibleS3Service, error: null };
        }

        return { service: hasS3 ? s3Service : webdavService, error: null };
    };

    const resolveCanonicalSyncedTimestamp = async (
        activeService: CloudService,
        fallbackTimestamp: number
    ): Promise<number> => {
        try {
            const remoteFileDate = await activeService.statFile?.();
            if (remoteFileDate) {
                return remoteFileDate.getTime();
            }
        } catch (error) {
            console.warn('[Sync] Failed to read canonical remote timestamp after sync, falling back to payload timestamp.', error);
        }

        return fallbackTimestamp;
    };

    const formatJsonSize = (size: number): string => {
        if (size < 1024) {
            return `${size} B`;
        }

        if (size < 1024 * 1024) {
            return `${(size / 1024).toFixed(1)} KB`;
        }

        return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    };

    const buildSyncConflictDescription = (
        mode: SyncMode,
        localTimestamp: number,
        cloudTimestamp: number,
        decision: SyncDirectionDecision
    ): string => {
        const timestampPreference = decision.timestampDirection === 'upload'
            ? '时间戳判断倾向于“本地覆盖云端”'
            : decision.timestampDirection === 'restore'
                ? '时间戳判断倾向于“云端覆盖本地”'
                : '时间戳判断两边接近';
        const sizePreference = decision.sizeDirection === 'upload'
            ? 'JSON 大小判断倾向于“本地覆盖云端”'
            : decision.sizeDirection === 'restore'
                ? 'JSON 大小判断倾向于“云端覆盖本地”'
                : 'JSON 大小判断两边相同';
        const modeLabel = mode === 'auto'
            ? '自动同步'
            : mode === 'resume'
                ? '恢复同步'
                : mode === 'startup'
                    ? '启动同步'
                    : '手动同步';
        const conflictReason = decision.conflictSource === 'forced-direction-vs-size'
            ? '你当前选择的同步方向会让较小的 JSON 覆盖较大的 JSON。'
            : `${timestampPreference}，但 ${sizePreference}。`;

        return [
            `${modeLabel}检测到同步方向矛盾。`,
            conflictReason,
            '',
            `本地时间戳：${localTimestamp > 0 ? new Date(localTimestamp).toLocaleString() : '无'}`,
            `云端时间戳：${cloudTimestamp > 0 ? new Date(cloudTimestamp).toLocaleString() : '无'}`,
            `本地 JSON 大小：${formatJsonSize(decision.localJsonSize)}`,
            `云端 JSON 大小：${formatJsonSize(decision.cloudJsonSize)}`,
            '',
            '继续同步前，请手动选择最终覆盖方向。'
        ].join('\n');
    };

    const closeSyncConflictModal = () => {
        setSyncConflictModalState({
            isOpen: false,
            mode: 'manual',
            activeService: null,
            localData: null,
            cloudData: null,
            localTimestamp: 0,
            cloudTimestamp: 0,
            decision: null
        });
    };

    const uploadPreparedData = async (
        activeService: CloudService,
        localData: any,
        localTimestamp: number,
        mode: SyncMode
    ): Promise<{
        status: 'uploaded' | 'error';
        message: string;
        hasImageWarnings: boolean;
        syncedTimestamp: number | null;
    }> => {
        if (!localData.logs || !localData.todos) {
            console.error('[Sync] Critical: Logs or Todos are undefined in upload payload!');
            return {
                status: 'error',
                message: '同步取消：本地数据为空',
                hasImageWarnings: false,
                syncedTimestamp: null
            };
        }

        const result = await uploadDataToCloud(
            activeService,
            localData,
            undefined
        );

        if (!result.success) {
            return {
                status: 'error',
                message: result.message,
                hasImageWarnings: false,
                syncedTimestamp: null
            };
        }

        const syncedTimestamp = await resolveCanonicalSyncedTimestamp(
            activeService,
            result.data?.timestamp || localTimestamp
        );

        if (mode === 'startup') {
            updateLastSyncTime();
        }

        return {
            status: 'uploaded',
            message: result.message,
            hasImageWarnings: !!result.imageStats?.errors.length,
            syncedTimestamp
        };
    };

    const restorePreparedData = async (
        activeService: CloudService,
        localData: any,
        cloudData: any,
        cloudTimestamp: number,
        mode: SyncMode
    ): Promise<{
        status: 'restored' | 'error';
        message: string;
        hasImageWarnings: boolean;
        syncedTimestamp: number | null;
    }> => {
        const result = await downloadWithBackup(
            activeService,
            localData,
            undefined,
            async (message) => {
                if (mode === 'manual') {
                    return window.confirm(message);
                }
                return true;
            }
        );

        if (!result.success || !result.data) {
            return {
                status: 'error',
                message: result.message,
                hasImageWarnings: false,
                syncedTimestamp: null
            };
        }

        await handleSyncDataUpdate(result.data);

        const syncedTimestamp = cloudTimestamp || cloudData?.timestamp || result.data?.timestamp || getLocalDataTimestamp();

        if (mode === 'startup') {
            updateLastSyncTime();
        }

        return {
            status: 'restored',
            message: result.message,
            hasImageWarnings: !!result.imageStats?.errors.length,
            syncedTimestamp
        };
    };

    const openSyncConflictModal = (
        mode: SyncMode,
        activeService: CloudService,
        localData: any,
        cloudData: any,
        localTimestamp: number,
        cloudTimestamp: number,
        decision: SyncDirectionDecision
    ) => {
        setSyncConflictModalState({
            isOpen: true,
            mode,
            activeService,
            localData,
            cloudData,
            localTimestamp,
            cloudTimestamp,
            decision
        });
    };

    /**
     * Core Sync Logic - Unified for all sync triggers
     * @param mode 'startup' = App launch | 'resume' = App resume/tab visible | 'manual' = User click | 'auto' = Auto-sync
     */
    const performSync = async (mode: SyncMode) => {
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

            // 获取活跃的云服务
            const { service: activeService, error: serviceError } = getActiveCloudService();
            
            if (serviceError === 'no_service') {
                if (mode === 'manual') setIsSettingsOpen(true);
                return;
            }
            
            if (serviceError === 'multiple_services') {
                if (mode === 'manual') {
                    addToast('error', '检测到同时连接了多个云端服务，请在设置中断开其余连接后再同步');
                    setIsSettingsOpen(true);
                }
                return;
            }

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

            const localData = getFullLocalData();
            const localJsonSize = getJsonByteSize(localData);

            // Track status
            let dataSyncStatus: 'restored' | 'uploaded' | 'equal' | 'error' = 'equal';
            let dataSyncMsg = '';
            let hasImageWarnings = false;
            let syncedTimestamp: number | null = null;

            // 容错阈值：处理上传延迟导致的时间差
            const SYNC_TOLERANCE_MS = SYNC_CONFIG.TOLERANCE_MS;

            // 1. 获取本地时间戳（直接从 localStorage 读取，确保是最新值）
            const localTimestamp = getLocalDataTimestamp();
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
            try {
                const canonicalCloudData = await activeService.downloadData();
                const canonicalCloudTimestamp = getSyncPayloadTimestamp(canonicalCloudData, 0);
                cloudData = canonicalCloudData;

                if (canonicalCloudTimestamp > 0) {
                    cloudTimestamp = canonicalCloudTimestamp;
                    usedFileModTime = false;
                }

                console.log('[Sync][Step 2c] Canonical cloud main backup loaded:', {
                    cloudTimestamp,
                    cloudTimestampSource: canonicalCloudTimestamp > 0 ? 'payload' : 'metadata-fallback',
                    cloudJsonSize: getJsonByteSize(cloudData)
                });
            } catch (error) {
                console.warn('[Sync] Failed to load canonical cloud main backup; keeping metadata fallback.', error);
            }

            const timeDiff = localTimestamp - cloudTimestamp;
            console.log(`[Sync][Step 3] 时间戳比较:`);
            console.log(`[Sync][Step 3]   - 本地时间: ${localTimestamp} (${new Date(localTimestamp).toLocaleString()})`);
            console.log(`[Sync][Step 3]   - 云端时间: ${cloudTimestamp} (${cloudTimestamp > 0 ? new Date(cloudTimestamp).toLocaleString() : '无数据'})`);
            console.log(`[Sync][Step 3]   - 时间差: ${timeDiff}ms (${(timeDiff / 1000).toFixed(1)}秒)`);
            console.log(`[Sync][Step 3]   - 容错阈值: ±${SYNC_TOLERANCE_MS}ms (±${SYNC_TOLERANCE_MS / 1000}秒)`);
            console.log(`[Sync][Step 3]   - 时间来源: ${usedFileModTime ? '文件修改时间' : '文件内部时间戳'}`);

            // 4. 执行操作（使用容错阈值判断）
            if (!cloudData && cloudTimestamp > 0) {
                try {
                    cloudData = await activeService.downloadData();
                } catch (error) {
                    console.warn('[Sync] Failed to download cloud data for JSON-size comparison.', error);
                }
            }

            const cloudJsonSize = cloudData ? getJsonByteSize(cloudData) : 0;
            const decision = resolveSyncDirectionDecision({
                localTimestamp,
                cloudTimestamp,
                toleranceMs: SYNC_TOLERANCE_MS,
                mode,
                hadPendingAutoSync,
                localJsonSize,
                cloudJsonSize
            });

            console.log('[Sync][Step 3]   - 本地 JSON 大小:', localJsonSize);
            console.log('[Sync][Step 3]   - 云端 JSON 大小:', cloudJsonSize);
            console.log('[Sync][Step 3]   - 时间戳方向:', decision.timestampDirection);
            console.log('[Sync][Step 3]   - 大小方向:', decision.sizeDirection);
            console.log('[Sync][Step 3]   - 最终方向:', decision.direction);

            if (decision.direction === 'conflict') {
                console.warn('[Sync][Step 4] 判定: 同步方向冲突，暂停等待用户选择');
                openSyncConflictModal(
                    mode,
                    activeService,
                    localData,
                    cloudData,
                    localTimestamp,
                    cloudTimestamp,
                    decision
                );
                return;
            }

            if (decision.direction === 'restore') {
                // Case 1: Cloud is Newer (超过容错阈值) -> Restore (下载)
                console.log('[Sync][Step 4] 判定: 云端明显较新 -> 执行下载恢复');
                console.log(`[Sync][Step 4]   - 云端比本地新 ${((cloudTimestamp - localTimestamp) / 1000).toFixed(1)} 秒`);

                // Check if there's a pending auto-sync (user just made changes)
                if (mode === 'startup' && hadPendingAutoSync) {
                    console.log('[Sync] 跳过云端恢复：检测到待处理的自动同步（用户刚做了修改）');
                    dataSyncStatus = 'equal';
                    dataSyncMsg = '检测到本地变更，跳过云端恢复';
                } else {
                    const result = await restorePreparedData(
                        activeService,
                        localData,
                        cloudData,
                        cloudTimestamp,
                        mode
                    );

                    if (result.status === 'error') {
                        dataSyncStatus = 'error';
                        dataSyncMsg = result.message;
                        if (mode === 'manual') addToast('error', result.message);
                        return;
                    }

                    hasImageWarnings = result.hasImageWarnings;
                    syncedTimestamp = result.syncedTimestamp;
                    console.log(`[Sync] 数据恢复完成，立即更新 localStorage 时间戳: ${syncedTimestamp}`);
                    dataSyncStatus = 'restored';
                    dataSyncMsg = result.message;
                }
            }
            else if (decision.direction === 'upload') {
                // Case 2: Local is Newer (超过容错阈值) -> Upload (上传)
                console.log('[Sync][Step 4] 判定: 本地明显较新 -> 执行上传');
                console.log(`[Sync][Step 4]   - 本地比云端新 ${((localTimestamp - cloudTimestamp) / 1000).toFixed(1)} 秒`);
                const result = await uploadPreparedData(
                    activeService,
                    localData,
                    localTimestamp,
                    mode
                );

                if (result.status === 'error') {
                    dataSyncStatus = 'error';
                    dataSyncMsg = result.message;
                    if (mode === 'manual') addToast('error', result.message);
                    return;
                }

                hasImageWarnings = result.hasImageWarnings;
                syncedTimestamp = result.syncedTimestamp;
                dataSyncStatus = 'uploaded';
                dataSyncMsg = result.message;
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
                    addToast(hasImageWarnings ? 'warning' : 'success', dataSyncMsg);
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
                const now = typeof syncedTimestamp === 'number' ? syncedTimestamp : Date.now();
                setLocalDataTimestampValue(now);
                console.log(`[Sync] 上传完成，本地时间戳已更新: ${now} (${new Date(now).toLocaleString()})`);
            } else if (dataSyncStatus === 'restored') {
                // 下载成功后，时间戳已经在 handleSyncDataUpdate 后立即更新了
                // 这里只需要更新 React state（确保 UI 同步）
                const storedTimestamp = getLocalDataTimestamp();
                console.log(`[Sync] 下载完成，同步 React state 时间戳: ${storedTimestamp}`);
            }

            if ((currentView === AppView.TIMELINE) || (mode === 'startup' && dataSyncStatus === 'restored')) {
                await new Promise(resolve => setTimeout(resolve, SYNC_CONFIG.UI_REFRESH_DELAY_MS));
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
                setTimeout(() => performSync('auto'), SYNC_CONFIG.PENDING_SYNC_RETRY_DELAY_MS);
            }
        }
    };

    const handleQuickSync = async (e?: React.MouseEvent | { stopPropagation?: () => void } | null) => {
        if (typeof e?.stopPropagation === 'function') {
            e.stopPropagation();
        }
        
        // 如果开启了手动同步模式，弹出方向选择模态框
        if (manualSyncMode) {
            setIsSyncDirectionModalOpen(true);
            return;
        }
        
        // 否则执行自动检测同步
        await performSync('manual');
    };

    const resolveSyncConflict = async (direction: SyncExecutionDirection) => {
        const {
            activeService,
            localData,
            cloudData,
            localTimestamp,
            cloudTimestamp,
            decision,
            mode
        } = syncConflictModalState;

        if (!activeService || !localData || !decision) {
            closeSyncConflictModal();
            return;
        }

        closeSyncConflictModal();

        if (syncLock.current || isSyncing) {
            return;
        }

        syncLock.current = true;
        setIsSyncing(true);

        try {
            if (direction === 'upload') {
                const result = await uploadPreparedData(activeService, localData, localTimestamp, mode);
                if (result.status === 'error') {
                    addToast('error', result.message);
                    return;
                }

                if (typeof result.syncedTimestamp === 'number') {
                    setLocalDataTimestampValue(result.syncedTimestamp);
                }

                addToast(result.hasImageWarnings ? 'warning' : 'success', result.message);
            } else {
                const result = await restorePreparedData(
                    activeService,
                    localData,
                    cloudData,
                    cloudTimestamp,
                    mode
                );

                if (result.status === 'error') {
                    addToast('error', result.message);
                    return;
                }

                if (typeof result.syncedTimestamp === 'number') {
                    setLocalDataTimestampValue(result.syncedTimestamp);
                }

                addToast(result.hasImageWarnings ? 'warning' : 'success', result.message);
            }

            if (currentView === AppView.TIMELINE) {
                await new Promise(resolve => setTimeout(resolve, SYNC_CONFIG.UI_REFRESH_DELAY_MS));
                setRefreshKey(prev => prev + 1);
            }
        } catch (error) {
            console.error('Resolve sync conflict failed', error);
            addToast('error', '同步失败，请检查网络或配置');
        } finally {
            setIsSyncing(false);
            syncLock.current = false;
        }
    };

    const handleConflictUpload = async () => {
        await resolveSyncConflict('upload');
    };

    const handleConflictDownload = async () => {
        await resolveSyncConflict('restore');
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
            // 获取活跃的云服务
            const { service: activeService, error: serviceError } = getActiveCloudService();
            
            if (serviceError === 'no_service') {
                addToast('error', '未连接任何云端服务');
                setIsSettingsOpen(true);
                return;
            }
            
            if (serviceError === 'multiple_services') {
                addToast('error', '检测到同时连接了多个云端服务，请在设置中断开其余连接后再同步');
                setIsSettingsOpen(true);
                return;
            }
            
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
            let cloudData: any = null;

            try {
                cloudData = await activeService.downloadData();
            } catch (error) {
                console.warn('[Sync] Failed to download cloud data before manual upload size check.', error);
            }

            const conflictDecision = detectForcedSyncConflict(
                'upload',
                getJsonByteSize(localData),
                cloudData ? getJsonByteSize(cloudData) : 0
            );

            if (conflictDecision.direction === 'conflict') {
                openSyncConflictModal(
                    'manual',
                    activeService,
                    localData,
                    cloudData,
                    localData.timestamp || getLocalDataTimestamp(),
                    cloudData?.timestamp || 0,
                    conflictDecision
                );
                return;
            }

            const result = await uploadPreparedData(
                activeService,
                localData,
                localData.timestamp || getLocalDataTimestamp(),
                'manual'
            );

            if (result.status === 'error') {
                addToast('error', result.message);
                return;
            }

            if (typeof result.syncedTimestamp === 'number') {
                setLocalDataTimestampValue(result.syncedTimestamp);
                console.log(`[Sync] 手动上传完成，本地时间戳已更新: ${result.syncedTimestamp}`);
            }

            addToast(result.hasImageWarnings ? 'warning' : 'success', result.message);

            if (currentView === AppView.TIMELINE) {
                await new Promise(resolve => setTimeout(resolve, SYNC_CONFIG.UI_REFRESH_DELAY_MS));
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
            // 获取活跃的云服务
            const { service: activeService, error: serviceError } = getActiveCloudService();
            
            if (serviceError === 'no_service') {
                addToast('error', '未连接任何云端服务');
                setIsSettingsOpen(true);
                return;
            }
            
            if (serviceError === 'multiple_services') {
                addToast('error', '检测到同时连接了多个云端服务，请在设置中断开其余连接后再同步');
                setIsSettingsOpen(true);
                return;
            }
            
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
            let cloudData: any = null;

            try {
                cloudData = await activeService.downloadData();
            } catch (error) {
                console.warn('[Sync] Failed to download cloud data before manual download size check.', error);
            }

            const conflictDecision = detectForcedSyncConflict(
                'restore',
                getJsonByteSize(localData),
                cloudData ? getJsonByteSize(cloudData) : 0
            );

            if (conflictDecision.direction === 'conflict') {
                openSyncConflictModal(
                    'manual',
                    activeService,
                    localData,
                    cloudData,
                    localData.timestamp || getLocalDataTimestamp(),
                    cloudData?.timestamp || 0,
                    conflictDecision
                );
                return;
            }

            const result = await restorePreparedData(
                activeService,
                localData,
                cloudData,
                cloudData?.timestamp || 0,
                'manual'
            );

            if (result.status === 'error') {
                addToast('error', result.message);
                return;
            }

            if (typeof result.syncedTimestamp === 'number') {
                setLocalDataTimestampValue(result.syncedTimestamp);
                console.log(`[Sync] 手动下载完成，立即更新 localStorage 时间戳: ${result.syncedTimestamp}`);
            }

            addToast(result.hasImageWarnings ? 'warning' : 'success', result.message);

            await new Promise(resolve => setTimeout(resolve, SYNC_CONFIG.UI_REFRESH_DELAY_MS));
            setRefreshKey(prev => prev + 1);

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
        // 注意：这里只依赖 manualSyncMode，因为：
        // 1. performSync 内部直接从 localStorage 读取时间戳（不依赖 state）
        // 2. 使用 ref 管理锁状态（不依赖 state）
        // 3. 只在 manualSyncMode 变化时需要重新评估是否启动同步
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [manualSyncMode]);

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

        }, SYNC_CONFIG.AUTO_SYNC_DEBOUNCE_MS); // 使用配置的防抖时间
        return () => {
            clearTimeout(timer);
            // Don't clear the pending flag here, only clear it when sync completes or is skipped
        };
    }, [
        logs, todos, categories, todoCategories, collections, collectionEntries,
        scopes, goals, autoLinkRules, reviewTemplates, checkTemplates, dailyReviews,
        weeklyReviews, monthlyReviews, onThisDayEntries, customNarrativeTemplates,
        userPersonalInfo, customStickerSets, customStickers, filters, manualSyncMode
    ]);

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
            
            // 使用配置的防抖时间触发自动同步
            timer = setTimeout(async () => {
                if (!isSyncingRef.current && !isRestoring.current) {
                    await performSync('auto');
                    pendingAutoSyncRef.current = false;
                }
            }, SYNC_CONFIG.AUTO_SYNC_DEBOUNCE_MS);
        };
        
        window.addEventListener('imageListChanged', handleImageListChanged as EventListener);
        
        return () => {
            window.removeEventListener('imageListChanged', handleImageListChanged as EventListener);
            if (timer) clearTimeout(timer);
        };
    }, [manualSyncMode]);

    // 2c. AI-only localStorage Auto Sync
    useEffect(() => {
        let timer: NodeJS.Timeout | null = null;

        const handleAIBackupChanged = () => {
            if (manualSyncMode || isRestoring.current) {
                return;
            }

            if (timer) {
                clearTimeout(timer);
            }

            pendingAutoSyncRef.current = true;

            timer = setTimeout(async () => {
                if (!isSyncingRef.current && !isRestoring.current) {
                    await performSync('auto');
                    pendingAutoSyncRef.current = false;
                }
            }, SYNC_CONFIG.AUTO_SYNC_DEBOUNCE_MS);
        };

        window.addEventListener(AI_BACKUP_CHANGED_EVENT, handleAIBackupChanged as EventListener);

        return () => {
            window.removeEventListener(AI_BACKUP_CHANGED_EVENT, handleAIBackupChanged as EventListener);
            if (timer) clearTimeout(timer);
        };
    }, [manualSyncMode]);

    // 2d. Custom color group Auto Sync
    useEffect(() => {
        let timer: NodeJS.Timeout | null = null;

        const handleCustomColorGroupChanged = () => {
            if (manualSyncMode || isRestoring.current) {
                return;
            }

            if (timer) {
                clearTimeout(timer);
            }

            pendingAutoSyncRef.current = true;

            timer = setTimeout(async () => {
                if (!isSyncingRef.current && !isRestoring.current) {
                    await performSync('auto');
                    pendingAutoSyncRef.current = false;
                }
            }, SYNC_CONFIG.AUTO_SYNC_DEBOUNCE_MS);
        };

        window.addEventListener(CUSTOM_COLOR_GROUP_UPDATED_EVENT, handleCustomColorGroupChanged as EventListener);

        return () => {
            window.removeEventListener(CUSTOM_COLOR_GROUP_UPDATED_EVENT, handleCustomColorGroupChanged as EventListener);
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
        handleManualDownload,
        syncConflictModalState,
        closeSyncConflictModal,
        handleConflictUpload,
        handleConflictDownload,
        buildSyncConflictDescription
    };
};
