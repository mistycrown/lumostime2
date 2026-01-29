import { useState, useRef, useEffect } from 'react';
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
import { AppView } from '../types';

export const useSyncManager = () => {
    const { logs, setLogs, todos, setTodos, todoCategories, setTodoCategories, localDataTimestamp, setLocalDataTimestamp, skipNextTimestampUpdate } = useData();
    const {
        autoLinkRules, setAutoLinkRules,
        customNarrativeTemplates, setCustomNarrativeTemplates,
        userPersonalInfo, setUserPersonalInfo,
        filters, setFilters,
        lastSyncTime, updateLastSyncTime,
        dataLastModified, setDataLastModified, isRestoring,
        isSyncing, setIsSyncing // Use global sync state
    } = useSettings();
    const { categories, setCategories, scopes, setScopes, goals, setGoals } = useCategoryScope();
    const {
        reviewTemplates, setReviewTemplates,
        dailyReviews, setDailyReviews,
        weeklyReviews, setWeeklyReviews,
        monthlyReviews, setMonthlyReviews
    } = useReview();
    const { currentView, setIsSettingsOpen } = useNavigation();
    const { addToast } = useToast();

    // Removed local isSyncing state to use global state
    const [refreshKey, setRefreshKey] = useState(0);
    const imageSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // --- Helpers ---
    const handleSyncDataUpdate = async (data: any) => {
        // console.log('[App] 开始更新同步数据...');
        isRestoring.current = true;

        try {
            // CRITICAL: Tell DataContext to IGNORE the next timestamp update
            // because we are about to programmatically set data from cloud.
            skipNextTimestampUpdate();

            if (data.logs) setLogs(data.logs);
            if (data.categories) setCategories(data.categories);
            if (data.todos) setTodos(data.todos);
            if (data.todoCategories) setTodoCategories(data.todoCategories);
            if (data.scopes) setScopes(data.scopes);
            if (data.goals) setGoals(data.goals);
            if (data.autoLinkRules) setAutoLinkRules(data.autoLinkRules);
            if (data.reviewTemplates) setReviewTemplates(data.reviewTemplates);
            if (data.dailyReviews) setDailyReviews(data.dailyReviews);
            if (data.weeklyReviews) setWeeklyReviews(data.weeklyReviews);
            if (data.monthlyReviews) setMonthlyReviews(data.monthlyReviews);
            if (data.customNarrativeTemplates) setCustomNarrativeTemplates(data.customNarrativeTemplates);
            if (data.userPersonalInfo) setUserPersonalInfo(data.userPersonalInfo);
            if (data.filters) setFilters(data.filters);

            if (data.timestamp) {
                // Manually set the timestamp to match cloud
                setDataLastModified(data.timestamp);
                setLocalDataTimestamp(data.timestamp);
            }

            await new Promise(resolve => setTimeout(resolve, 10));

            // console.log('[App] 同步数据更新完成');
            if (currentView === AppView.TIMELINE) {
                setRefreshKey(prev => prev + 1);
            }
        } finally {
            isRestoring.current = false;
        }
    };

    const handleImageSync = async (imageList: string[]) => {
        const webdavConfig = webdavService.getConfig();
        const s3Config = s3Service.getConfig();

        if (!webdavConfig && !s3Config) return { uploaded: 0, downloaded: 0, deletedRemote: 0, errors: [] };

        try {
            const result = await syncService.syncImages(
                (msg) => { }, // console.log(`[App] ${msg}`),
                imageList,
                imageList
            );

            // Log details but don't toast immediately during Quick Sync
            if (result.errors.length > 0) {
                console.error('[App] Image sync errors:', result.errors);
            }

            if ((result.uploaded > 0 || result.downloaded > 0 || result.deletedRemote > 0) && currentView === AppView.TIMELINE) {
                setRefreshKey(prev => prev + 1);
            }

            return result;
        } catch (e) {
            console.error('[App] Image sync error', e);
            return { uploaded: 0, downloaded: 0, deletedRemote: 0, errors: [e] };
        }
    };

    const getFullLocalData = () => {
        const localData = {
            logs, todos, categories, todoCategories, scopes, goals,
            autoLinkRules, reviewTemplates, dailyReviews, weeklyReviews,
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
            console.log(`[Sync] Backing up local data to ${backupFilename}...`);
            await activeService.uploadData(localData, backupFilename);
            console.log('[Sync] Local data backed up successfully');
            return true;
        } catch (error) {
            console.error('[Sync] Backup failed:', error);
            return false;
        }
    };

    /**
     * Core Sync Logic Shared by Manual Trigger and Startup Trigger
     */
    const performSync = async (mode: 'manual' | 'startup') => {
        setIsSyncing(true);
        try {
            const webdavConfig = webdavService.getConfig();
            const s3Config = s3Service.getConfig();

            if (!webdavConfig && !s3Config) {
                if (mode === 'manual') setIsSettingsOpen(true);
                return;
            }

            const activeService = s3Config ? s3Service : webdavService;

            // Track status
            let dataSyncStatus: 'restored' | 'uploaded' | 'equal' | 'error' = 'equal';
            let dataSyncMsg = '';

            // 1. Sync Data
            let cloudTimestamp = 0;
            let cloudData: any = null;

            try {
                cloudData = await activeService.downloadData();
                cloudTimestamp = cloudData?.timestamp || 0;
            } catch (err) {
                console.log('[App] 云端无数据，准备上传本地数据');
            }

            // Use the authoritative local timestamp
            const localTimestamp = localDataTimestamp;

            /* console.log(`[Sync][${mode}] Time check:`, {
                localTimestamp: localTimestamp,
                cloudTimestamp: cloudTimestamp,
                diff: cloudTimestamp - localTimestamp,
                dateLocal: new Date(localTimestamp).toLocaleString(),
                dateCloud: new Date(cloudTimestamp).toLocaleString()
            }); */

            // 3-Way Logic
            if (cloudTimestamp > localTimestamp) {
                // Case 1: Cloud is Newer -> Restore
                console.log('[Sync] Cloud is newer. Restoring...');
                if (cloudData) {
                    const backupSuccess = await backupLocalData(activeService, mode === 'startup' ? 'startup_backup' : 'pre_restore');
                    if (!backupSuccess) {
                        if (mode === 'manual') addToast('error', '备份失败，为保护本地数据已取消还原');
                        return;
                    }
                    await handleSyncDataUpdate(cloudData);

                    if (mode === 'startup') updateLastSyncTime();

                    dataSyncStatus = 'restored';
                    dataSyncMsg = `已还原云端数据 (${new Date(cloudTimestamp).toLocaleDateString()})`;
                }
            }
            else if (localTimestamp > cloudTimestamp) {
                // Case 2: Local is Newer -> Upload
                // NOTE: For startup, we might want to be passive, but keeping logic consistent is safer.
                // However, usually startup sync is "Pull Only".
                // If local is newer on startup, it means we worked offline. We should probably silent upload or just do nothing and let auto-sync handle it.
                // For safety, let's allow upload if Manual, but maybe skip/silent for startup to avoid startup lag?
                // Let's keep it consistent: Sync means Sync.

                // console.log('[Sync] Local is newer. Uploading...');
                const localData = getFullLocalData();

                // Safety check
                if (!localData.logs || !localData.todos) {
                    console.error('[Sync] Critical: Logs or Todos are undefined in upload payload!');
                    if (mode === 'manual') addToast('error', '同步取消：本地数据为空');
                    return;
                }

                await activeService.uploadData(localData);

                // Update legacy tracking ref if needed
                setDataLastModified(localData.timestamp);
                if (mode === 'startup') updateLastSyncTime();

                dataSyncStatus = 'uploaded';
                dataSyncMsg = '已上传本地数据至云端';
            }
            else {
                // Case 3: Equal
                // console.log('[Sync] Timestamps are equal. Data is consistent.');
                dataSyncStatus = 'equal';
                dataSyncMsg = '数据已是一致';
            }

            // 2. Sync Images (Logic preserved)
            const localImageList = imageService.getReferencedImagesList();
            let cloudImageList: string[] = [];
            try {
                const cloudImageData = await activeService.downloadImageList();
                if (cloudImageData) {
                    cloudImageList = cloudImageData.images || [];
                }
            } catch (err) {
                console.log('[App] 云端无图片列表');
            }

            const mergedImageList = Array.from(new Set([...localImageList, ...cloudImageList]));

            // Check if cloud list needs update
            const isCloudListOutdated = mergedImageList.length !== cloudImageList.length ||
                !mergedImageList.every(img => cloudImageList.includes(img));

            if (dataSyncStatus === 'uploaded' || isCloudListOutdated) {
                // console.log('[Sync] Updating cloud image list...');
                try {
                    if (mode === 'startup') imageService.updateReferencedImagesList(mergedImageList);
                    await activeService.uploadImageList(mergedImageList);
                } catch (e) { console.warn('Image list update failed', e); }
            } else {
                // console.log('[Sync] Cloud image list is up to date, skipping upload.');
            }

            // 3. Sync Image Files
            const imageResult = await handleImageSync(mergedImageList);

            // 4. Construct Final Feedback (Only for Manual Mode)
            if (mode === 'manual') {
                const imageActions = [];
                if (imageResult.uploaded > 0) imageActions.push(`上传 ${imageResult.uploaded} 张图片`);
                if (imageResult.downloaded > 0) imageActions.push(`下载 ${imageResult.downloaded} 张图片`);

                const imageSyncMsg = imageActions.length > 0
                    ? imageActions.join('，')
                    : (imageResult.errors.length > 0 ? '图片同步出错' : '图片一致');

                // Combine messages
                if (dataSyncStatus === 'equal' && imageActions.length === 0 && imageResult.errors.length === 0) {
                    addToast('info', '云端与本地数据一致，无需同步');
                } else {
                    let finalMsg = '';
                    if (dataSyncStatus !== 'equal') {
                        finalMsg = dataSyncMsg;
                        if (imageActions.length > 0) {
                            finalMsg += `，并${imageSyncMsg}`;
                        } else if (imageResult.errors.length > 0) {
                            finalMsg += `，但图片同步出错`;
                        } else {
                            finalMsg += `，${imageSyncMsg}`;
                        }
                    } else {
                        // Data equal, but images changed
                        finalMsg = `数据一致，${imageSyncMsg}`;
                    }

                    const toastType = (imageResult.errors.length > 0 && dataSyncStatus !== 'restored' && dataSyncStatus !== 'uploaded') ? 'warning' : 'success';
                    addToast(toastType, finalMsg);
                }
            } else if (mode === 'startup' && dataSyncStatus === 'restored') {
                addToast('success', '启动同步：已从云端恢复较新数据');
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
        }
    };

    const handleQuickSync = async (e?: React.MouseEvent) => {
        e?.stopPropagation();
        await performSync('manual');
    };

    // --- Effects ---
    // 1. Startup Pull
    useEffect(() => {
        performSync('startup');
    }, []);

    // 2. Data Auto Sync
    const isFirstRun = useRef(true);
    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }

        const timer = setTimeout(async () => {
            // Prevent auto-sync if a manual/startup sync is in progress
            if (isSyncing) return;

            const webdavConfig = webdavService.getConfig();
            const s3Config = s3Service.getConfig();

            if (!webdavConfig && !s3Config) return;

            const activeService = s3Config ? s3Service : webdavService;

            try {
                const localData = getFullLocalData();
                // Simple validation for auto-sync
                if (!localData.logs || !localData.todos) {
                    console.error('[App] Auto-sync skipped: Local data undefined');
                    return;
                }

                // Use localDataTimestamp which is already up to date
                const dataToSync = getFullLocalData(); // this uses localDataTimestamp

                await activeService.uploadData(dataToSync);
                updateLastSyncTime();

                // Legacy tracking update
                setDataLastModified(dataToSync.timestamp);

                // console.log('[App] Auto-sync completed');
            } catch (e) {
                console.error('Auto-sync upload failed', e);
            }
        }, 2000); // Debounce reduced to 2s for responsiveness
        return () => clearTimeout(timer);
    }, [logs, todos, categories, todoCategories, scopes, goals, autoLinkRules, reviewTemplates, dailyReviews, weeklyReviews, monthlyReviews, customNarrativeTemplates, userPersonalInfo, filters]); // Removed lastSyncTime to prevent potential loops

    // 3. Image Auto Sync Listeners
    useEffect(() => {
        const handleImageListChanged = async (e: CustomEvent) => {
            const webdavConfig = webdavService.getConfig();
            const s3Config = s3Service.getConfig();
            if (!webdavConfig && !s3Config) return;
            const activeService = s3Config ? s3Service : webdavService;

            try {
                const imageList = e.detail.images || [];
                await activeService.uploadImageList(imageList);
            } catch (error) {
                addToast('warning', '图片列表同步失败，请稍后手动同步');
            }
        };

        const handleImageDeleted = async (event: CustomEvent) => {
            const webdavConfig = webdavService.getConfig();
            const s3Config = s3Service.getConfig();
            if (!webdavConfig && !s3Config) return;

            if (imageSyncTimeoutRef.current) clearTimeout(imageSyncTimeoutRef.current);
            imageSyncTimeoutRef.current = setTimeout(async () => {
                try {
                    const imageList = imageService.getReferencedImagesList();
                    await handleImageSync(imageList); // This uses active service inside
                } catch (error) {
                    console.error('[App] 图片删除同步失败:', error);
                }
            }, 2000);
        };

        const handleImageUploaded = async (event: CustomEvent) => {
            const webdavConfig = webdavService.getConfig();
            const s3Config = s3Service.getConfig();
            if (!webdavConfig && !s3Config) return;

            if (imageSyncTimeoutRef.current) clearTimeout(imageSyncTimeoutRef.current);
            imageSyncTimeoutRef.current = setTimeout(async () => {
                try {
                    const imageList = imageService.getReferencedImagesList();
                    await handleImageSync(imageList); // This uses active service inside
                } catch (error: any) {
                    if (error.message && error.message.includes('/images')) {
                        addToast('error', '图片同步失败：请在云端根目录下创建 "images" 文件夹');
                    }
                }
            }, 3000);
        };

        window.addEventListener('imageListChanged', handleImageListChanged as EventListener);
        window.addEventListener('imageDeleted', handleImageDeleted as EventListener);
        window.addEventListener('imageUploaded', handleImageUploaded as EventListener);

        return () => {
            window.removeEventListener('imageListChanged', handleImageListChanged as EventListener);
            window.removeEventListener('imageDeleted', handleImageDeleted as EventListener);
            window.removeEventListener('imageUploaded', handleImageUploaded as EventListener);
            if (imageSyncTimeoutRef.current) clearTimeout(imageSyncTimeoutRef.current);
        };
    }, []);

    // 4. Visibility Auto Sync
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                const webdavConfig = webdavService.getConfig();
                const s3Config = s3Service.getConfig();

                if (webdavConfig || s3Config) {
                    const activeService = s3Config ? s3Service : webdavService;
                    const dataToSync = {
                        ...getFullLocalData(),
                        timestamp: Date.now()
                    };
                    activeService.uploadData(dataToSync).catch(console.error);
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [logs, todos, categories, todoCategories, scopes, goals, autoLinkRules, reviewTemplates, dailyReviews, weeklyReviews, monthlyReviews, customNarrativeTemplates, userPersonalInfo]);

    return {
        isSyncing,
        refreshKey,
        setRefreshKey,
        handleQuickSync,
        handleImageSync,
        handleSyncDataUpdate
    };
};
