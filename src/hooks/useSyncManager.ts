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
    const { logs, setLogs, todos, setTodos, todoCategories, setTodoCategories } = useData();
    const {
        autoLinkRules, setAutoLinkRules,
        customNarrativeTemplates, setCustomNarrativeTemplates,
        userPersonalInfo, setUserPersonalInfo,
        filters, setFilters,
        lastSyncTime, updateLastSyncTime,
        dataLastModified, setDataLastModified, isRestoring
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

    const [isSyncing, setIsSyncing] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const imageSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // --- Helpers ---
    const handleSyncDataUpdate = async (data: any) => {
        console.log('[App] 开始更新同步数据...');
        isRestoring.current = true;

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
            setDataLastModified(data.timestamp);
        }

        await new Promise(resolve => setTimeout(resolve, 10));

        console.log('[App] 同步数据更新完成');
        if (currentView === AppView.TIMELINE) {
            setRefreshKey(prev => prev + 1);
        }
    };

    const handleImageSync = async (imageList: string[]) => {
        const webdavConfig = webdavService.getConfig();
        const s3Config = s3Service.getConfig();

        if (!webdavConfig && !s3Config) return;

        try {
            const result = await syncService.syncImages(
                (msg) => console.log(`[App] ${msg}`),
                imageList,
                imageList
            );

            if (result.uploaded > 0) addToast('success', `Uploaded ${result.uploaded} images`);
            if (result.downloaded > 0) addToast('success', `Downloaded ${result.downloaded} images`);
            if (result.deletedRemote > 0) addToast('success', `Deleted ${result.deletedRemote} remote images`);

            if (result.errors.length > 0) {
                console.error('[App] Image sync errors:', result.errors);
                addToast('error', `Image sync had ${result.errors.length} errors`);
            }

            if ((result.uploaded > 0 || result.downloaded > 0 || result.deletedRemote > 0) && currentView === AppView.TIMELINE) {
                setRefreshKey(prev => prev + 1);
            }
        } catch (e) {
            console.error('[App] Image sync error', e);
        }
    };

    const handleQuickSync = async (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setIsSyncing(true);
        try {
            const webdavConfig = webdavService.getConfig();
            const s3Config = s3Service.getConfig();

            if (!webdavConfig && !s3Config) {
                setIsSettingsOpen(true);
                setIsSyncing(false);
                return;
            }

            const activeService = s3Config ? s3Service : webdavService;

            // 1. Sync Data
            let cloudTimestamp = 0;
            let cloudData = null;

            try {
                cloudData = await activeService.downloadData();
                cloudTimestamp = cloudData?.timestamp || 0;
            } catch (err) {
                console.log('[App] 云端无数据，将上传本地数据');
            }

            const localTimestamp = dataLastModified;

            if (cloudTimestamp > localTimestamp) {
                if (cloudData) {
                    await handleSyncDataUpdate(cloudData);
                    await new Promise(resolve => setTimeout(resolve, 50));
                    addToast('success', `Downloaded from cloud (${new Date(cloudTimestamp).toLocaleDateString()})`);
                }
            } else {
                const dataToUpload = {
                    logs, todos, categories, todoCategories, scopes, goals,
                    autoLinkRules, reviewTemplates, dailyReviews, weeklyReviews,
                    monthlyReviews, customNarrativeTemplates, userPersonalInfo, filters,
                    timestamp: Date.now(),
                    version: '1.0.0'
                };
                await activeService.uploadData(dataToUpload);
            }

            // 2. Sync Images
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
            if (mergedImageList.length !== localImageList.length) {
                imageService.updateReferencedImagesList(mergedImageList);
            }
            await activeService.uploadImageList(mergedImageList);

            // 3. Sync Image Files
            await handleImageSync(mergedImageList);

            addToast('success', 'Sync complete');

            if (currentView === AppView.TIMELINE) {
                await new Promise(resolve => setTimeout(resolve, 100));
                setRefreshKey(prev => prev + 1);
            }
        } catch (error) {
            console.error("Sync failed", error);
            addToast('error', 'Sync failed');
        } finally {
            setIsSyncing(false);
        }
    };

    // --- Effects ---
    // 1. Startup Pull
    useEffect(() => {
        const initSync = async () => {
            const config = webdavService.getConfig();
            if (!config) return;

            try {
                const cloudDate = await webdavService.statFile();
                const saved = localStorage.getItem('lumos_last_sync_time');
                const localSyncTime = saved ? parseInt(saved) : 0;

                if (cloudDate && cloudDate.getTime() > localSyncTime + 10000) {
                    const data = await webdavService.downloadData();
                    if (data) {
                        await handleSyncDataUpdate(data);
                        updateLastSyncTime();
                    }
                }

                try {
                    const webdavConfig = webdavService.getConfig();
                    const s3Config = s3Service.getConfig();

                    if (webdavConfig || s3Config) {
                        const activeService = s3Config ? s3Service : webdavService;
                        const localImageList = imageService.getReferencedImagesList();
                        const cloudImageData = await activeService.downloadImageList();
                        const cloudImageList = cloudImageData?.images || [];
                        const mergedImageList = Array.from(new Set([...localImageList, ...cloudImageList]));

                        if (mergedImageList.length > localImageList.length) {
                            imageService.updateReferencedImagesList(mergedImageList);
                            await activeService.uploadImageList(mergedImageList);
                        }

                        const imageResult = await syncService.syncImages(undefined, mergedImageList, mergedImageList);
                        if (imageResult.downloaded > 0) {
                            setRefreshKey(prev => prev + 1);
                        }
                    }
                } catch (imageError: any) {
                    console.warn('[App] 启动时图片同步失败:', imageError.message);
                }
            } catch (e) {
                console.error('Startup sync check failed', e);
            }
        };
        initSync();
    }, []);

    // 2. Data Auto Sync
    useEffect(() => {
        const timer = setTimeout(async () => {
            const config = webdavService.getConfig();
            if (!config) return;
            try {
                const dataToSync = {
                    logs, todos, categories, todoCategories, scopes, goals,
                    autoLinkRules, reviewTemplates, dailyReviews, weeklyReviews,
                    monthlyReviews, customNarrativeTemplates, userPersonalInfo, filters,
                    version: '1.0.0',
                    timestamp: Date.now()
                };
                await webdavService.uploadData(dataToSync);
                updateLastSyncTime();
                console.log('[App] 自动上传数据完成');
            } catch (e) {
                console.error('Auto-sync upload failed', e);
            }
        }, 30000);
        return () => clearTimeout(timer);
    }, [logs, todos, categories, todoCategories, scopes, goals, autoLinkRules, reviewTemplates, dailyReviews, weeklyReviews, monthlyReviews, customNarrativeTemplates, userPersonalInfo, filters, lastSyncTime]);

    // 3. Image Auto Sync Listeners
    useEffect(() => {
        const handleImageListChanged = async (e: CustomEvent) => {
            const config = webdavService.getConfig();
            if (!config) return;
            try {
                const imageList = e.detail.images || [];
                await webdavService.uploadImageList(imageList);
            } catch (error) {
                addToast('warning', '图片列表同步失败，请稍后手动同步');
            }
        };

        const handleImageDeleted = async (event: CustomEvent) => {
            const config = webdavService.getConfig();
            if (!config) return;
            if (imageSyncTimeoutRef.current) clearTimeout(imageSyncTimeoutRef.current);
            imageSyncTimeoutRef.current = setTimeout(async () => {
                try {
                    const imageList = imageService.getReferencedImagesList();
                    await handleImageSync(imageList);
                } catch (error) {
                    console.error('[App] 图片删除同步失败:', error);
                }
            }, 2000);
        };

        const handleImageUploaded = async (event: CustomEvent) => {
            const config = webdavService.getConfig();
            if (!config) return;
            if (imageSyncTimeoutRef.current) clearTimeout(imageSyncTimeoutRef.current);
            imageSyncTimeoutRef.current = setTimeout(async () => {
                try {
                    const imageList = imageService.getReferencedImagesList();
                    await handleImageSync(imageList);
                } catch (error: any) {
                    if (error.message && error.message.includes('/images')) {
                        addToast('error', '图片同步失败：请在WebDAV根目录下创建 "images" 文件夹');
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
                const config = webdavService.getConfig();
                if (config) {
                    const dataToSync = {
                        logs, todos, categories, todoCategories, scopes, goals,
                        autoLinkRules, reviewTemplates, dailyReviews, weeklyReviews,
                        monthlyReviews, customNarrativeTemplates, userPersonalInfo,
                        version: '1.0.0',
                        timestamp: Date.now()
                    };
                    webdavService.uploadData(dataToSync).catch(console.error);
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
