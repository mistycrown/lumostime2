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
        dataLastModified, setDataLastModified, isRestoring,
        isSyncing, setIsSyncing
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
            if (data.dailyReviews) setDailyReviews(data.dailyReviews);
            if (data.weeklyReviews) setWeeklyReviews(data.weeklyReviews);
            if (data.monthlyReviews) setMonthlyReviews(data.monthlyReviews);
            if (data.customNarrativeTemplates) setCustomNarrativeTemplates(data.customNarrativeTemplates);
            if (data.userPersonalInfo) setUserPersonalInfo(data.userPersonalInfo);
            if (data.filters) setFilters(data.filters);

            if (data.timestamp) {
                // Manually set the timestamp to match cloud
                // CRITICAL: Must update both state AND localStorage synchronously
                setDataLastModified(data.timestamp);
                setLocalDataTimestamp(data.timestamp);
                localStorage.setItem('lumostime_local_timestamp', data.timestamp.toString());
                console.log(`[Sync] Updated local timestamp to match cloud: ${data.timestamp} (${new Date(data.timestamp).toLocaleString()})`);
            }

            await new Promise(resolve => setTimeout(resolve, 10));

            // console.log('[App] 同步数据更新完成');
            if (currentView === AppView.TIMELINE) {
                setRefreshKey(prev => prev + 1);
            }
        } finally {
            isRestoring.current = false;
            // Delay re-enabling timestamp updates to ensure all state effects have processed
            setTimeout(() => {
                disableTimestampUpdateRef.current = false;
                // Re-sync localStorage after unlock to prevent any race condition overwrites
                const currentTimestamp = localStorage.getItem('lumostime_local_timestamp');
                console.log(`[Sync] Unlocked timestamp updates. Current localStorage value: ${currentTimestamp}`);
            }, 500);
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

            // 1. 获取本地时间戳
            const localTimestamp = localDataTimestamp;
            console.log(`[Sync][Step 1] 获取本地时间戳: ${localTimestamp} (${new Date(localTimestamp).toLocaleString()})`);

            // 1. Sync Data - 获取云端时间戳
            let cloudTimestamp = 0;
            let cloudData: any = null;

            try {
                cloudData = await activeService.downloadData();
                cloudTimestamp = cloudData?.timestamp || 0;
            } catch (err) {
                console.log('[App] 云端无数据，准备上传本地数据');
            }
            console.log(`[Sync][Step 1] 获取云端时间戳: ${cloudTimestamp} (${new Date(cloudTimestamp).toLocaleString()})`);

            // 2. 比较时间戳
            console.log(`[Sync][Step 2] 比较时间戳: 本地=${localTimestamp} vs 云端=${cloudTimestamp}, 差值=${localTimestamp - cloudTimestamp}ms`);

            // 3. 执行操作
            if (cloudTimestamp > localTimestamp) {
                // Case 1: Cloud is Newer -> Restore
                console.log('[Sync][Step 3] 判定: 云端较新 -> 执行下载恢复');

                // Check if there's a pending auto-sync (user just made changes)
                if (mode === 'startup' && pendingAutoSyncRef.current) {
                    console.log('[Sync] Skipping cloud restore: Auto-sync pending (user just made changes)');
                    dataSyncStatus = 'equal';
                    dataSyncMsg = '检测到本地变更，跳过云端恢复';
                } else {
                    if (cloudData) {
                        const backupSuccess = await backupLocalData(activeService, mode === 'startup' ? 'startup_backup' : 'pre_restore');
                        if (!backupSuccess) {
                            if (mode === 'manual') addToast('error', '备份失败，为保护本地数据已取消还原');
                            return;
                        }
                        await handleSyncDataUpdate(cloudData);

                        if (mode === 'startup') updateLastSyncTime();

                        dataSyncStatus = 'restored';
                        dataSyncMsg = `已下载云端数据 (${new Date(cloudTimestamp).toLocaleDateString()})`;
                    }
                }
            }
            else if (localTimestamp > cloudTimestamp) {
                // Case 2: Local is Newer -> Upload
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

            // 3. Sync Image Files
            const imageResult = await handleImageSync(mergedImageList);

            // [Fixed Sequence] Update Image List JSON AFTER actual files are synced
            // This prevents the "Zombie List" issue on mobile WebDAV where list says file exists but upload failed.

            // Re-calculate outdated status (logic moved here)
            const isCloudListOutdated = mergedImageList.length !== cloudImageList.length ||
                !mergedImageList.every(img => cloudImageList.includes(img));

            if (dataSyncStatus === 'uploaded' || isCloudListOutdated || imageResult.uploaded > 0 || imageResult.deletedRemote > 0) {
                try {
                    // Update list only if we are reasonably sure things are consistent
                    if (mode === 'startup') imageService.updateReferencedImagesList(mergedImageList);
                    await activeService.uploadImageList(mergedImageList);
                    // console.log('[Sync] Image list JSON updated');
                } catch (e) { console.warn('Image list update failed', e); }
            }

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
                // Startup mode: Only toast when restored
                addToast('success', '启动同步：已下载云端数据');
            } else if (mode === 'resume' && (dataSyncStatus === 'restored' || dataSyncStatus === 'uploaded')) {
                // Resume mode: Toast when data changed
                const msg = dataSyncStatus === 'restored' ? '已下载云端数据' : '已上传本地数据';
                addToast('success', msg);
            } else if (mode === 'auto') {
                // Auto mode: Silent, no toast
            }

            // If sync completed successfully, we can clear the pending auto-sync flag
            // because we just synced everything (including whatever latest changes triggered the flag)
            pendingAutoSyncRef.current = false;

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
        await performSync('manual');
    };

    // --- Effects ---
    // 1. Startup Pull
    useEffect(() => {
        performSync('startup');
    }, []);

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

    // 4. App LifeCycle Auto Sync (Resume & Hide)
    useEffect(() => {
        // A. Resume (Foreground) -> Check for Cloud Updates
        let appListener: any;
        const setupListener = async () => {
            appListener = await App.addListener('appStateChange', async (state) => {
                // On native platforms, use App state
                // On web, visibilitychange handles this
                if (state.isActive && Capacitor.isNativePlatform()) {
                    console.log('[App] App resumed. Checking for updates...');
                    performSync('resume');
                }
            });
        };
        setupListener();

        // B. Hide (Background) -> Upload Local Changes (Smart Sync)
        const handleVisibilityChange = () => {
            // Web Visibility API
            if (document.visibilityState === 'hidden') {
                const webdavConfig = webdavService.getConfig();
                const s3Config = s3Service.getConfig();

                if (webdavConfig || s3Config) {
                    const activeService = s3Config ? s3Service : webdavService;
                    const localData = getFullLocalData(); // Includes current localData.timestamp

                    // Smart Sync: Only upload if local data is NEWER than the last synced version
                    // Note: dataLastModified tracks the timestamp of the last successful sync/save
                    // localData.timestamp tracks the time of the last local edit
                    console.log(`[Sync] Background triggered. Local: ${localData.timestamp}, LastSynced: ${dataLastModified}`);

                    if (localData.timestamp > dataLastModified) {
                        console.log('[Sync] New local changes detected. Uploading...');
                        const dataToSync = {
                            ...localData,
                            timestamp: localData.timestamp // Ensure we upload the tracking timestamp
                        };
                        activeService.uploadData(dataToSync).then(() => {
                            console.log('[Sync] Background upload success. Updating last modified.');
                            // Update dataLastModified to match what we just uploaded
                            // This prevents duplicate uploads next time if no changes occur
                            setDataLastModified(localData.timestamp);
                        }).catch(console.error);
                    } else {
                        console.log('[Sync] No new changes. Skipping background upload.');
                    }
                }
            } else if (document.visibilityState === 'visible') {
                // On Web, switching tabs back to visible should also check (similar to App Resume)
                // But on Mobile, 'appStateChange' handles this better.
                // We can leave this for Web or just let it be.
                if (!Capacitor.isNativePlatform()) {
                    console.log('[App] Tab visible. Checking for updates...');
                    performSync('resume');
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            if (appListener) appListener.remove();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [logs, todos, categories, todoCategories, scopes, goals, autoLinkRules, reviewTemplates, dailyReviews, weeklyReviews, monthlyReviews, customNarrativeTemplates, userPersonalInfo, dataLastModified]); // Add dataLastModified dependancy

    return {
        isSyncing,
        refreshKey,
        setRefreshKey,
        handleQuickSync,
        handleImageSync,
        handleSyncDataUpdate
    };
};
