/**
 * @file useSyncManager.ts
 * @updated 2026-10-03: Marks restored log snapshots so automatic calendar sync cannot infer mass deletions.
 * @updated 2026-10-04: Tracks modern navigation mode, background, and transparency changes for auto sync.
 * @updated 2026-10-04: Persists restored sticker metadata before appearance listeners reload settings.
 * @input Live application contexts, cloud provider configuration, and data/lifecycle events
 * @output Versioned cloud handoff, manual overrides, conflict choices, and sync status
 * @pos Hook (System Integration)
 * @description Uses current snapshots and one queue; timestamps and file sizes never choose direction.
 * @updated 2026-10-02: Adds destination checkpoints, safe in-flight edits, exact restores, and retry scheduling.
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
import { aiChatStorageService } from '../services/aiChatStorageService';
import { markFeishuLogReplacement } from '../services/feishuAutoSyncStore';
import { appearanceBackupService } from '../services/appearanceBackupService';
import { MOOD_CALENDAR_BACKGROUND_CHANGE_EVENT } from '../services/moodCalendarBackgroundService';
import {
    loadWidgetTemplatesFromStorage,
    saveWidgetTemplatesToStorage,
    WIDGET_TEMPLATES_UPDATED_EVENT
} from '../services/widgetService';
import {
    CUSTOM_COLOR_GROUP_UPDATED_EVENT,
    customColorGroupService
} from '../services/customColorGroupService';
import { downloadWithBackup, getServiceName, getCloudDestinationIdentity, uploadDataToCloud, readCloudSnapshot, CloudService } from '../utils/syncUtils';
import { reportDiagnostic, reportException, withErrorReference } from '../services/errorReporting';
import { AppView } from '../types';
import { SYNC_CONFIG } from '../config/syncConfig';
import { normalizeCheckTemplates, normalizeDailyReviews } from '../utils/checkItemNormalizer';
import { AI_BACKUP_CHANGED_EVENT } from '../utils/aiBackupChange';
import { normalizeFiltersOrder } from '../utils/filterUtils';
import {
    hashSyncContent, readSyncCheckpoint, writeSyncCheckpoint, serializeSyncContent,
    runSyncCycle, getRemoteVersion, readPendingUpload, writePendingUpload, clearPendingUpload
} from '../utils/syncProtocol';
import { createSyncScheduler, SyncAttempt } from '../utils/syncScheduler';
import { getJsonByteSize, getSyncPayloadTimestamp } from '../utils/syncPayloadMetadata';
import {
    clearPendingLocalDataEdit, getLocalDataTimestamp, getLocalEditRevision,
    hasPendingLocalDataEdit, markLocalDataEdited, setLastSeenCloudUploadedAt,
    setLocalDataTimestampUpdateLocked, LOCAL_DATA_TIMESTAMP_UPDATED_EVENT
} from '../utils/localDataTimestamp';
import {
    buildSceneGroupStateFromLegacySlots,
    getActiveSceneGroup,
    loadSceneGroupStateFromStorage,
    saveSceneGroupStateToStorage
} from '../utils/sceneGroupStorage';
import { loadRoutines, saveRoutines } from '../utils/routineStorage';
import {
    PREFERENCES_CHANGED_EVENT,
    preferencesBackupService
} from '../services/preferencesBackupService';

export const useSyncManager = () => {
    type SyncMode = 'startup' | 'resume' | 'manual' | 'auto';
    type SyncExecutionDirection = 'upload' | 'restore';
    interface SyncDirectionDecision {
        direction: 'conflict';
        localJsonSize: number;
        cloudJsonSize: number;
    }
    interface SyncConflictModalState {
        isOpen: boolean;
        mode: SyncMode;
        activeService: CloudService | null;
        localData: any | null;
        cloudData: any | null;
        localTimestamp: number;
        cloudTimestamp: number;
        decision: SyncDirectionDecision | null;
        remoteVersion?: string;
        destination?: string;
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
        memoirFilterConfig, setMemoirFilterConfig,
        updateLastSyncTime,
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

    const addSyncErrorToast = (
        message: string,
        operation: string,
        service?: CloudService,
        error?: unknown
    ) => {
        const context = {
            feature: 'cloud_sync',
            operation,
            ...(service ? { service: getServiceName(service) } : {})
        };
        const sentryEventId = error
            ? reportException(error, context)
            : reportDiagnostic('cloud_sync_user_visible_failure', context, 'warning');
        addToast('error', withErrorReference(message, sentryEventId));
    };

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

    const observedContentRef = useRef<string | null>(null);
    const trackingContentRef = useRef(false);
    const initializedRef = useRef(false);
    const schedulerRef = useRef<ReturnType<typeof createSyncScheduler> | null>(null);
    const conflictRef = useRef(false);
    const [isApplyingCloud, setIsApplyingCloud] = useState(false);
    const restoreCommitRef = useRef<(() => void) | null>(null);
    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            restoreCommitRef.current?.();
            restoreCommitRef.current = null;
        };
    }, []);
    useEffect(() => {
        const resolve = restoreCommitRef.current;
        if (resolve) {
            restoreCommitRef.current = null;
            // Context persistence effects finish in the same passive-effect flush.
            queueMicrotask(resolve);
        }
    });

    const applyDataUpdate = async (data: any, source: 'cloud' | 'local') => {
        const isCloudRestore = source === 'cloud';
        if (isCloudRestore) {
            setIsApplyingCloud(true);
            isRestoring.current = true;
            setLocalDataTimestampUpdateLocked(true);
        }

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

            if (hasField('logs')) {
                markFeishuLogReplacement(data.logs);
                setLogs(data.logs);
            }
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
            if (hasField('customStickerSets')) {
                const restoredSets = data.customStickerSets ?? [];
                localStorage.setItem('lumostime_custom_sticker_sets_v2', JSON.stringify(restoredSets));
                setCustomStickerSets(restoredSets);
            }
            if (hasField('customStickers')) {
                const restoredStickers = data.customStickers ?? [];
                localStorage.setItem('lumostime_custom_stickers_v2', JSON.stringify(restoredStickers));
                setCustomStickers(restoredStickers);
            }
            if (hasField('filters')) setFilters(normalizeFiltersOrder(data.filters));
            if (hasField('memoirFilterConfig') && data.memoirFilterConfig && typeof data.memoirFilterConfig === 'object') {
                setMemoirFilterConfig((previous) => ({
                    ...previous,
                    ...data.memoirFilterConfig,
                    relatedTagIds: Array.isArray(data.memoirFilterConfig.relatedTagIds)
                        ? data.memoirFilterConfig.relatedTagIds
                        : previous.relatedTagIds,
                    relatedScopeIds: Array.isArray(data.memoirFilterConfig.relatedScopeIds)
                        ? data.memoirFilterConfig.relatedScopeIds
                        : previous.relatedScopeIds
                }));
            }
            if (hasField('routines')) saveRoutines(data.routines);
            
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

            if (hasField('widgetTemplates')) {
                saveWidgetTemplatesToStorage(data.widgetTemplates);
            }

            if (hasField('appearanceData')) {
                appearanceBackupService.applyBackupPayload(data.appearanceData);
            }

            if (hasField('preferencesData')) {
                preferencesBackupService.applyBackupPayload(data.preferencesData);
            }

            await new Promise<void>(resolve => {
                restoreCommitRef.current = resolve;
                setRefreshKey(previous => previous + 1);
            });
            console.log(`[Sync] Applied ${source} data payload`);

            // console.log('[App] 同步数据更新完成');
            if (currentView === AppView.TIMELINE) {
                setRefreshKey(prev => prev + 1);
            }
        } finally {
            if (isCloudRestore) {
                observedContentRef.current = serializeSyncContent(latestRef.current.getLocal());
                setLocalDataTimestampUpdateLocked(false);
                isRestoring.current = false;
                setIsApplyingCloud(false);
                console.log('[Sync] Unlocked timestamp updates');
            }
        }
    };

    const handleSyncDataUpdate = async (data: any) => {
        const activeService = getActiveCloudService().service;
        const identity = activeService ? getCloudDestinationIdentity(activeService) : null;
        await applyDataUpdate(data, 'cloud');
        if (identity && activeService && getCloudDestinationIdentity(activeService) === identity) {
            const applied = latestRef.current.getLocal();
            writeSyncCheckpoint(await hashSyncContent(identity), {
                remoteVersion: await getRemoteVersion(data),
                localHash: await hashSyncContent(serializeSyncContent(applied))
            });
            if (serializeSyncContent(latestRef.current.getLocal()) === serializeSyncContent(applied)) {
                clearPendingLocalDataEdit(getLocalEditRevision());
            }
        }
    };

    const handleLocalDataUpdate = async (data: any) => {
        await applyDataUpdate(data, 'local');
        markLocalDataEdited();
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
        const widgetTemplates = loadWidgetTemplatesFromStorage();
        
        const customColorGroup = customColorGroupService.getGroup();

        const localData = {
            logs, todos, categories, todoCategories, collections, collectionEntries, scopes, goals, majorGoals,
            autoLinkRules, reviewTemplates, checkTemplates, dailyReviews, weeklyReviews,
            monthlyReviews, onThisDayEntries, customNarrativeTemplates, userPersonalInfo, customStickerSets, customStickers, filters,
            memoirFilterConfig,
            customColorGroup,
            achievementData: buildAchievementBackupPayload(),
            aiData: assistantBackupService.buildBackupPayload(),
            appearanceData: appearanceBackupService.buildBackupPayload(),
            preferencesData: preferencesBackupService.buildBackupPayload(),
            widgetTemplates,
            sceneTimeSlots,
            sceneGroupState,
            principles, // 添加原则库
            selfBeliefs, // 添加自我认知库
            routines: loadRoutines(),
            version: '1.0.0',
            timestamp: getLocalDataTimestamp() // Use the latest persisted tracking timestamp
        };
        return localData;
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


    const destinationIdentity = getCloudDestinationIdentity;

    // Long-lived native and DOM callbacks always dereference the current render.
    const latestRef = useRef({ getLocal: getFullLocalData, applyDataUpdate, manualSyncMode, isSyncing });
    latestRef.current = { getLocal: getFullLocalData, applyDataUpdate, manualSyncMode, isSyncing };
    const performRef = useRef<(mode: SyncMode) => Promise<SyncAttempt>>(async () => 'blocked');

    const closeSyncConflictModal = () => {
        // Dismissal pauses automatic sync until the user explicitly retries or chooses a direction.
        setSyncConflictModalState(previous => ({ ...previous, isOpen: false }));
    };

    const buildSyncConflictDescription = (
        _mode: SyncMode, _localTimestamp: number, _cloudTimestamp: number, _decision: SyncDirectionDecision
    ): string => '本地和云端都存在尚未共同确认的变化，已暂停自动同步。\n\n请选择要保留的数据。覆盖前会备份被替换的一份。';

    const performSync = async (
        mode: SyncMode,
        force?: SyncExecutionDirection,
        expected?: { remoteVersion?: string; destination?: string },
        requestedService?: CloudService
    ): Promise<SyncAttempt> => {
        if (syncLock.current || latestRef.current.isSyncing) {
            if (mode === 'manual') addToast('info', '正在同步，请稍后再试');
            return 'retry';
        }
        if (mode !== 'manual' && (latestRef.current.manualSyncMode || conflictRef.current)) return 'blocked';
        const { service: activeService, error: serviceError } = requestedService
            ? { service: requestedService, error: null }
            : getActiveCloudService();
        if (!activeService || serviceError) {
            if (mode === 'manual') {
                if (serviceError === 'multiple_services') addToast('error', '请在设置中只保留一个云端服务连接');
                setIsSettingsOpen(true);
            }
            return 'blocked';
        }

        const identity = destinationIdentity(activeService);
        if (expected?.destination && expected.destination !== identity) {
            addToast('warning', '云端连接已改变，请重新同步');
            return 'blocked';
        }
        const ensureDestination = () => {
            if (!mountedRef.current) throw new Error('同步页面已关闭，已停止本次同步');
            if ((!requestedService && getActiveCloudService().service !== activeService) || destinationIdentity(activeService) !== identity) {
                throw new Error('云端连接已改变，已停止本次同步');
            }
            if (mode !== 'manual' && latestRef.current.manualSyncMode) throw new Error('已切换到手动同步');
        };
        syncLock.current = true;
        setIsSyncing(true);
        let message = '';
        let imageWarnings = false;

        try {
            await aiChatStorageService.initialize();
            const destination = await hashSyncContent(identity);
            const result = await runSyncCycle({
                readLocal: () => latestRef.current.getLocal(),
                readRemote: async () => {
                    ensureDestination();
                    return readCloudSnapshot(activeService);
                },
                readCheckpoint: () => readSyncCheckpoint(destination),
                readPendingUpload: () => readPendingUpload(destination),
                recordPendingUpload: checkpoint => writePendingUpload(destination, checkpoint),
                legacyPending: hasPendingLocalDataEdit,
                acknowledge: (checkpoint, snapshot) => {
                    ensureDestination();
                    writeSyncCheckpoint(destination, checkpoint);
                    clearPendingUpload(destination);
                    setLastSeenCloudUploadedAt(getSyncPayloadTimestamp(snapshot, Date.now()));
                    if (serializeSyncContent(latestRef.current.getLocal()) === serializeSyncContent(snapshot)) {
                        clearPendingLocalDataEdit(getLocalEditRevision());
                    } else if (!latestRef.current.manualSyncMode) {
                        schedulerRef.current?.request('auto');
                    }
                    updateLastSyncTime();
                },
                upload: async (snapshot) => {
                    ensureDestination();
                    const uploaded = await uploadDataToCloud(activeService, snapshot);
                    if (!uploaded.success || !uploaded.data) throw new Error(uploaded.message);
                    message = uploaded.message;
                    imageWarnings = !!uploaded.imageStats?.errors.length;
                    return uploaded.data;
                },
                prepareRestore: async (remote, local) => {
                    ensureDestination();
                    const downloaded = await downloadWithBackup(activeService, local, undefined, remote);
                    if (!downloaded.success || !downloaded.data) throw new Error(downloaded.message);
                    message = downloaded.message;
                    imageWarnings = !!downloaded.imageStats?.errors.length;
                    return downloaded.data;
                },
                applyRestore: async (remote) => {
                    ensureDestination();
                    await latestRef.current.applyDataUpdate(remote, 'cloud');
                },
                backupRemote: async (remote) => {
                    ensureDestination();
                    const filename = 'backups/cloud_backup_' + crypto.randomUUID() + '.json';
                    await activeService.uploadData(remote, filename);
                    const verified = await activeService.downloadData(filename);
                    if (JSON.stringify(verified) !== JSON.stringify(remote)) throw new Error('云端安全备份校验失败，已停止覆盖');
                }
            }, { force, expectedRemoteVersion: expected?.remoteVersion });

            if (result.direction === 'conflict') {
                conflictRef.current = true;
                setSyncConflictModalState({
                    isOpen: true, mode, activeService,
                    localData: result.localData, cloudData: result.cloudData,
                    localTimestamp: getSyncPayloadTimestamp(result.localData),
                    cloudTimestamp: getSyncPayloadTimestamp(result.cloudData),
                    decision: {
                        direction: 'conflict',
                        localJsonSize: getJsonByteSize(result.localData),
                        cloudJsonSize: getJsonByteSize(result.cloudData)
                    },
                    remoteVersion: result.remoteVersion, destination: identity
                });
                return 'blocked';
            }
            conflictRef.current = false;
            if (mode === 'manual') {
                addToast(imageWarnings ? 'warning' : result.direction === 'equal' ? 'info' : 'success',
                    result.direction === 'equal' ? '云端与本地数据一致，无需同步' : message);
            } else if (result.direction === 'restore' || imageWarnings) {
                addToast(imageWarnings ? 'warning' : 'success', message || '已下载云端数据');
            }
            return 'success';
        } catch (error) {
            console.error('[Sync] Sync attempt failed; pending edits are retained.', error);
            if (mode === 'manual') addSyncErrorToast(
                error instanceof Error ? error.message : '同步失败，请检查网络或配置',
                'versioned_sync', activeService, error
            );
            return 'retry';
        } finally {
            syncLock.current = false;
            setIsSyncing(false);
        }
    };
    performRef.current = (mode) => performSync(mode);

    const handleQuickSync = async (event?: React.MouseEvent | { stopPropagation?: () => void } | null) => {
        event?.stopPropagation?.();
        if (manualSyncMode) {
            setIsSyncDirectionModalOpen(true);
            return;
        }
        conflictRef.current = false;
        await performSync('manual');
    };
    const handleManualUpload = async () => {
        setIsSyncDirectionModalOpen(false);
        conflictRef.current = false;
        await performSync('manual', 'upload');
    };
    const handleManualDownload = async () => {
        setIsSyncDirectionModalOpen(false);
        conflictRef.current = false;
        await performSync('manual', 'restore');
    };
    const handleServiceSync = async (service: CloudService, direction: SyncExecutionDirection) => {
        conflictRef.current = false;
        await performSync('manual', direction, undefined, service);
    };
    const resolveConflict = async (direction: SyncExecutionDirection) => {
        const expected = { remoteVersion: syncConflictModalState.remoteVersion, destination: syncConflictModalState.destination };
        closeSyncConflictModal();
        conflictRef.current = false;
        // Re-read both sides; do not upload the snapshot captured when the dialog opened.
        await performSync('manual', direction, expected, syncConflictModalState.activeService || undefined);
    };

    const trackChanges = () => {
        if (!initializedRef.current || isRestoring.current || trackingContentRef.current) return;
        trackingContentRef.current = true;
        try {
            const content = serializeSyncContent(latestRef.current.getLocal());
            if (observedContentRef.current === content) return;
            const previous = observedContentRef.current;
            observedContentRef.current = content;
            if (previous === null) return;
            markLocalDataEdited();
            if (!latestRef.current.manualSyncMode) schedulerRef.current?.request('auto');
        } finally {
            trackingContentRef.current = false;
        }
    };
    const trackRef = useRef(trackChanges);
    trackRef.current = trackChanges;

    // Every payload field is covered, including major goals, Memoir filters and achievement-only edits.
    useEffect(() => {
        trackRef.current();
    }, [
        logs, todos, categories, todoCategories, collections, collectionEntries, scopes, goals, majorGoals,
        autoLinkRules, reviewTemplates, checkTemplates, dailyReviews, weeklyReviews, monthlyReviews,
        onThisDayEntries, customNarrativeTemplates, userPersonalInfo, customStickerSets, customStickers,
        filters, memoirFilterConfig, buildAchievementBackupPayload
    ]);

    const service = getActiveCloudService().service;
    const destination = service ? destinationIdentity(service) : '';
    useEffect(() => {
        let cancelled = false;
        const scheduler = createSyncScheduler(mode => performRef.current(mode), {
            debounceMs: SYNC_CONFIG.AUTO_SYNC_DEBOUNCE_MS,
            maxWaitMs: SYNC_CONFIG.AUTO_SYNC_MAX_WAIT_MS,
            cooldownMs: SYNC_CONFIG.RESUME_SYNC_COOLDOWN_MS,
            retryMs: SYNC_CONFIG.PENDING_SYNC_RETRY_DELAY_MS,
            maxRetryMs: SYNC_CONFIG.MAX_RETRY_DELAY_MS
        });
        schedulerRef.current = scheduler;
        conflictRef.current = false;
        void aiChatStorageService.initialize().then(() => {
            if (cancelled) return;
            if (!initializedRef.current) {
                observedContentRef.current = serializeSyncContent(latestRef.current.getLocal());
                initializedRef.current = true;
            }
            if (!manualSyncMode && destination) scheduler.request('startup', true);
        }).catch(error => {
            console.error('[Sync] Failed to initialize chat storage', error);
            if (!cancelled && !manualSyncMode) scheduler.request('startup');
        });
        return () => {
            cancelled = true;
            scheduler.dispose();
            if (schedulerRef.current === scheduler) schedulerRef.current = null;
        };
    }, [manualSyncMode, destination]);

    useEffect(() => {
        const changed = () => trackRef.current();
        const blockRestoreInput = (event: Event) => {
            if (!isRestoring.current) return;
            event.preventDefault();
            event.stopImmediatePropagation();
        };
        const inputEvents = ['pointerdown', 'click', 'keydown', 'beforeinput', 'submit'];
        inputEvents.forEach(name => window.addEventListener(name, blockRestoreInput, { capture: true, passive: false }));
        const events = [
            LOCAL_DATA_TIMESTAMP_UPDATED_EVENT, AI_BACKUP_CHANGED_EVENT,
            CUSTOM_COLOR_GROUP_UPDATED_EVENT, PREFERENCES_CHANGED_EVENT, WIDGET_TEMPLATES_UPDATED_EVENT,
            MOOD_CALENDAR_BACKGROUND_CHANGE_EVENT, 'imageListChanged',
            'sceneGroupsUpdated', 'sceneTimeSlotsUpdated', 'principleLibraryChanged', 'selfBeliefLibraryChanged',
            'routinesUpdated', 'color-scheme-changed', 'ui-icon-theme-changed',
            'lumostime:background-changed', 'navigationDecorationChange', 'navigationIconChange',
            'navigationBackgroundChange', 'navigationBackgroundModeChange', 'navigationTransparencyChange',
            'timepal-type-changed', 'timepal-click-switch-changed', 'timepal-stage-thresholds-changed',
            'timepal-custom-changed', 'achievement-bottle-icon-packs-changed',
            'achievement-bottle-icon-pack-selection-changed'
        ];
        events.forEach(name => window.addEventListener(name, changed));
        const resume = (urgent = false) => {
            trackRef.current();
            if (!latestRef.current.manualSyncMode) schedulerRef.current?.request('resume', urgent);
        };
        const visibility = () => {
            if (document.visibilityState === 'visible' && !Capacitor.isNativePlatform()) resume();
            else if (document.visibilityState === 'hidden' && !latestRef.current.manualSyncMode && hasPendingLocalDataEdit()) {
                schedulerRef.current?.request('auto', true);
            }
        };
        const online = () => resume(true);
        document.addEventListener('visibilitychange', visibility);
        window.addEventListener('online', online);
        // A content-only audit catches localStorage writers that don't yet dispatch a change event.
        const audit = setInterval(() => {
            if (document.visibilityState === 'visible') trackRef.current();
        }, SYNC_CONFIG.LOCAL_AUDIT_INTERVAL_MS);
        let cancelled = false;
        let appListener: { remove: () => Promise<void> } | undefined;
        void App.addListener('appStateChange', state => {
            if (state.isActive && Capacitor.isNativePlatform()) resume();
            else if (!state.isActive && !latestRef.current.manualSyncMode && hasPendingLocalDataEdit()) {
                schedulerRef.current?.request('auto', true);
            }
        }).then(listener => {
            if (cancelled) void listener.remove();
            else appListener = listener;
        }).catch(error => console.warn('[Sync] Native lifecycle listener unavailable', error));
        return () => {
            cancelled = true;
            events.forEach(name => window.removeEventListener(name, changed));
            inputEvents.forEach(name => window.removeEventListener(name, blockRestoreInput, true));
            document.removeEventListener('visibilitychange', visibility);
            window.removeEventListener('online', online);
            clearInterval(audit);
            void appListener?.remove();
        };
    }, []);

    return {
        isSyncing, isApplyingCloud, refreshKey, setRefreshKey,
        handleQuickSync, handleSyncDataUpdate, handleLocalDataUpdate,
        isSyncDirectionModalOpen, setIsSyncDirectionModalOpen,
        handleManualUpload, handleManualDownload,
        handleServiceSync,
        syncConflictModalState, closeSyncConflictModal,
        handleConflictUpload: () => resolveConflict('upload'),
        handleConflictDownload: () => resolveConflict('restore'),
        buildSyncConflictDescription
    };
};
