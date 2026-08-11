/**
 * @file SettingsView.tsx
 * @input User Settings, Sync Data, AI Config, App State
 * @output Configuration Updates, Data Sync Actions, Navigation
 * @pos View (Settings Modal)
 * @description The central configuration hub. Manages Cloud Sync (WebDAV), AI integration (Providers/Presets), Data (Import/Export), and Application Preferences (Appearance, Habits, etc.), including settings subpage hierarchy state and in-session main-list scroll restoration while keeping manual sync payloads aligned with repository-backed data.
 *
 * 修改历史:
 * - 2026-07-06: 将自我认知库纳入设置页手动同步载荷，保持与主同步 Hook 的备份字段一致。
 * - 2026-05-17: 新增“Windows 特性”设置分组，将“PC端小组件”与“导出到 Obsidian”归口至此分组并限定移动端不可见。

 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 * @updated 2026-07-21: Delegated cloud backup cleanup confirmation to the data-management in-app modal.
 * @updated 2026-08-09: Added the daily-check overview entry under Content.
 * @updated 2026-08-09: Added the Review Overview settings subpage under Content.
 * @updated 2026-08-11: Keeps manual cloud sync acknowledgements separate from the local user-edit timestamp.
 * @updated 2026-08-11: Routes settings-originated data edits through the explicit local-edit path while reserving sync updates for cloud restores.
 * @updated 2026-08-10: Records Settings as the return target when opening daily-check overview.
 */
import React, { useState, useRef, useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import {
    ChevronRight,
    User,
    Tag,
    Crosshair,
    Flag,
    LayoutGrid,
    Database,
    Hash,
    Palette,
    Settings,
    RotateCcw,
    BookOpen,
    MessageSquare,
    PenTool,
    FileText,
    ChevronLeft,
    Download,
    Upload,
    AlertCircle,
    Cloud,
    CheckCircle2,
    RefreshCw,
    Server,
    LogOut,
    Save,
    Globe,
    Trash2,
    SquareActivity,
    Bot,
    ChevronDown,
    Wifi,
    ArrowUpCircle,
    Coffee,
    Send,
    X,
    Nfc,
    Target,
    Edit2,
    PlusCircle,
    Smile,
    Check,
    FileSpreadsheet,
    Sparkles,
    Edit,
    Search,
    Star,
    Link,
    Smartphone,
    ImageIcon,
    AlignLeft,
    Fish
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { webdavService, WebDAVConfig } from '../services/webdavService';
import { s3Service, S3Config } from '../services/s3Service';
import { compatibleS3Service, CompatibleS3Config } from '../services/compatibleS3Service';
import { imageService } from '../services/imageService';
import { syncService } from '../services/syncService';
import { NfcService } from '../services/NfcService';
import { aiService, AIConfig } from '../services/aiService';
import { customColorGroupService } from '../services/customColorGroupService';
import { UpdateService, VersionInfo } from '../services/updateService';
import { CustomSelect } from '../components/CustomSelect';
import { getTodoProgressTrackingMode, syncSubtaskProgressToParentTodos } from '../utils/todoProgressUtils';
import { ToastType } from '../components/Toast';
import { uploadDataToCloud, downloadWithBackup, CloudService } from '../utils/syncUtils';
import { validateLocalData, canSafelyUpload } from '../utils/dataValidation';
import { getActiveSceneGroup, loadSceneGroupStateFromStorage } from '../utils/sceneGroupStorage';
import { clearPendingLocalDataEdit, getLocalDataTimestamp, setLastSeenCloudUploadedAt } from '../utils/localDataTimestamp';

import { ConfirmModal } from '../components/ConfirmModal';
import { AppView, ReviewTemplate, NarrativeTemplate, Log, TodoItem, Scope, DailyReview, WeeklyReview, MonthlyReview, TodoCategory, Filter, Category, CheckTemplate } from '../types';
import { DefaultArchiveView, DefaultIndexView, DefaultRecordView, TimelineQuickActionKey, TimelineSortOrder, useSettings } from '../contexts/SettingsContext';
import { useData } from '../contexts/DataContext';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { useReview } from '../contexts/ReviewContext';
import { SettingsSubmenu, useNavigation } from '../contexts/NavigationContext';
import FocusNotification from '../plugins/FocusNotificationPlugin';
import excelExportService from '../services/excelExportService';
import { imageCleanupService } from '../services/imageCleanupService';
import { cloudImageConsistencyService } from '../services/cloudImageConsistencyService';
import { usePrivacy } from '../contexts/PrivacyContext';
import { RedemptionService } from '../services/redemptionService';
import { SceneSettingsView } from './SceneSettingsView';
import { startFloatingWindowWithGuards, type FloatingWindowStartupResult } from '../utils/floatingWindowStartup';
import {
    AISettingsViewLazy as AISettingsView,
    AppAwarenessSettingsViewLazy as AppAwarenessSettingsView,
    AutoLinkViewLazy as AutoLinkView,
    AutoRecordSettingsViewLazy as AutoRecordSettingsView,
    BatchFocusRecordManageViewLazy as BatchFocusRecordManageView,
    CheckTemplateManageViewLazy as CheckTemplateManageView,
    CollectionSettingsViewLazy as CollectionSettingsView,
    CloudSyncSettingsViewLazy as CloudSyncSettingsView,
    DataManagementViewLazy as DataManagementView,
    DesktopWidgetSettingsViewLazy as DesktopWidgetSettingsView,
    EmojiSettingsViewLazy as EmojiSettingsView,
    FiltersSettingsViewLazy as FiltersSettingsView,
    MemoirSettingsViewLazy as MemoirSettingsView,
    NarrativeSettingsViewLazy as NarrativeSettingsView,
    NFCSettingsViewLazy as NFCSettingsView,
    ObsidianExportViewLazy as ObsidianExportView,
    PreferencesSettingsViewLazy as PreferencesSettingsView,
    PrincipleLibraryViewLazy as PrincipleLibraryView,
    ReviewOverviewViewLazy as ReviewOverviewView,
    ReviewTemplateManageViewLazy as ReviewTemplateManageView,
    S3SyncSettingsViewLazy as S3SyncSettingsView,
    SponsorshipViewLazy as SponsorshipView,
    UserGuideViewLazy as UserGuideView,
    WidgetSettingsViewLazy as WidgetSettingsView
} from '../utils/lazyViews';

import { NARRATIVE_TEMPLATES } from '../constants';


interface SettingsViewProps {
    onClose: () => void;
    onExport: () => void;
    onImport: (file: File) => void;
    onReset: () => void;
    onClearData: () => void;
    onToast: (type: ToastType, message: string) => void;
    syncData: any;
    /** Apply payload received from the cloud without recording a local edit. */
    onSyncUpdate: (data: any) => void | Promise<void>;
    /** Apply a user-initiated local payload and mark it for upload. */
    onLocalDataUpdate: (data: any) => void | Promise<void>;
    onOpenAutoLink?: () => void;
    onOpenSearch?: () => void;
    minIdleTimeThreshold?: number;
    onSetMinIdleTimeThreshold?: (val: number) => void;
    defaultView?: string;
    onSetDefaultView?: (view: any) => void;
    defaultArchiveView?: DefaultArchiveView;
    onSetDefaultArchiveView?: (view: DefaultArchiveView) => void;
    defaultIndexView?: DefaultIndexView;
    onSetDefaultIndexView?: (view: DefaultIndexView) => void;
    defaultRecordView?: DefaultRecordView;
    onSetDefaultRecordView?: (view: DefaultRecordView) => void;
    // Daily Review Templates
    reviewTemplates?: ReviewTemplate[];
    onUpdateReviewTemplates?: (templates: ReviewTemplate[]) => void;
    // Daily Reviews Data (for batch update)
    onUpdateDailyReviews?: (reviews: DailyReview[]) => void;
    // Daily Check Templates
    checkTemplates?: CheckTemplate[];
    onUpdateCheckTemplates?: (templates: CheckTemplate[]) => void;
    // Daily Review Time
    dailyReviewTime?: string;
    onSetDailyReviewTime?: (time: string) => void;
    // Weekly Review Time
    weeklyReviewTime?: string;
    onSetWeeklyReviewTime?: (time: string) => void;
    // Monthly Review Time
    monthlyReviewTime?: string;
    onSetMonthlyReviewTime?: (time: string) => void;
    // Auto Generate Review
    autoGenerateDailyReview?: boolean;
    onToggleAutoGenerateDailyReview?: () => void;
    autoGenerateWeeklyReview?: boolean;
    onToggleAutoGenerateWeeklyReview?: () => void;
    autoGenerateMonthlyReview?: boolean;
    onToggleAutoGenerateMonthlyReview?: () => void;
    // AI Narrative
    customNarrativeTemplates?: NarrativeTemplate[];
    onUpdateCustomNarrativeTemplates?: (templates: NarrativeTemplate[]) => void;
    userPersonalInfo?: string;
    onSetUserPersonalInfo?: (info: string) => void;
    // Obsidian Export
    logs?: Log[];
    todos?: TodoItem[];
    scopes?: Scope[];
    currentDate?: Date;
    dailyReviews?: DailyReview[];
    weeklyReviews?: WeeklyReview[];
    monthlyReviews?: MonthlyReview[];
    todoCategories?: TodoCategory[];
    // Custom Filters
    filters?: Filter[];
    onUpdateFilters?: (filters: Filter[]) => void;
    categoriesData?: Category[];
    onEditLog?: (log: Log) => void;
    onEditTodo?: (todo: TodoItem) => void;
    autoFocusNote?: boolean;
    onToggleAutoFocusNote?: () => void;
    timelineGalleryMode?: boolean;
    onToggleTimelineGalleryMode?: () => void;
    timelineSortOrder?: TimelineSortOrder;
    onSetTimelineSortOrder?: (sortOrder: TimelineSortOrder) => void;
    timelineQuickActions?: TimelineQuickActionKey[];
    onSetTimelineQuickActions?: (actions: TimelineQuickActionKey[]) => void;
    collapseThreshold?: number;
    onSetCollapseThreshold?: (val: number) => void;
    manualSyncMode?: boolean;
    onToggleManualSyncMode?: () => void;
}
const SettingsSubviewFallback: React.FC<{ label: string }> = ({ label }) => (
    <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex items-center justify-center font-serif">
        <div className="rounded-2xl border border-stone-200 bg-white px-5 py-4 shadow-sm">
            <div className="text-sm font-medium text-stone-500">{label}</div>
        </div>
    </div>
);

const renderLazySettingsSubview = (element: React.ReactNode, label: string) => (
    <React.Suspense fallback={<SettingsSubviewFallback label={label} />}>
        {element}
    </React.Suspense>
);

export const SettingsView: React.FC<SettingsViewProps> = ({ onClose, onExport, onImport, onReset, onClearData, onToast, syncData, onSyncUpdate, onLocalDataUpdate, onOpenAutoLink, onOpenSearch, minIdleTimeThreshold = 1, onSetMinIdleTimeThreshold, defaultView = 'RECORD', onSetDefaultView, defaultArchiveView = 'CHRONICLE', onSetDefaultArchiveView, defaultIndexView = 'TAGS', onSetDefaultIndexView, defaultRecordView = 'TIMER', onSetDefaultRecordView, reviewTemplates = [], onUpdateReviewTemplates, onUpdateDailyReviews, checkTemplates = [], onUpdateCheckTemplates, dailyReviewTime, onSetDailyReviewTime, weeklyReviewTime, onSetWeeklyReviewTime, monthlyReviewTime, onSetMonthlyReviewTime, autoGenerateDailyReview, onToggleAutoGenerateDailyReview, autoGenerateWeeklyReview, onToggleAutoGenerateWeeklyReview, autoGenerateMonthlyReview, onToggleAutoGenerateMonthlyReview, customNarrativeTemplates, onUpdateCustomNarrativeTemplates, userPersonalInfo, onSetUserPersonalInfo, logs = [], todos = [], scopes = [], currentDate = new Date(), dailyReviews = [], weeklyReviews = [], monthlyReviews = [], todoCategories = [], filters = [], onUpdateFilters, categoriesData = [], onEditLog, onEditTodo, autoFocusNote, onToggleAutoFocusNote, timelineGalleryMode, onToggleTimelineGalleryMode, timelineSortOrder = 'asc', onSetTimelineSortOrder, timelineQuickActions = [], onSetTimelineQuickActions, collapseThreshold, onSetCollapseThreshold, manualSyncMode, onToggleManualSyncMode }) => {
    const { isPrivacyMode, togglePrivacyMode } = usePrivacy();
    // Hooks for full data access during backup
    const { logs: ctxLogs, todos: ctxTodos, todoCategories: ctxTodoCategories } = useData();
    const { categories: ctxCategories, scopes: ctxScopes, goals: ctxGoals, majorGoals: ctxMajorGoals } = useCategoryScope();
    const { autoLinkRules: ctxAutoLinkRules, autoApplyAutoLinkRules, setAutoApplyAutoLinkRules, autoApplyTodoLink, setAutoApplyTodoLink, autoStartTimerJumpMode, setAutoStartTimerJumpMode, userPersonalInfo: ctxUserPersonalInfo, filters: ctxFilters, customNarrativeTemplates: ctxCustomNarrativeTemplates, sceneCardTimerMode, setSceneCardTimerMode, immersiveTimerDefaultOrientation, setImmersiveTimerDefaultOrientation } = useSettings();
    const { dailyReviews: ctxDailyReviews, weeklyReviews: ctxWeeklyReviews, monthlyReviews: ctxMonthlyReviews, reviewTemplates: ctxReviewTemplates, checkTemplates: ctxCheckTemplates } = useReview();
    const {
        settingsSubmenu: activeSubmenu,
        setSettingsSubmenu: setActiveSubmenu,
        settingsSubmenuBackCloses,
        setSettingsSubmenuBackCloses,
        currentView,
        setCurrentView,
        setPreviousView,
        setDailyCheckDetailId,
        setDailyChecksReturnTarget
    } = useNavigation();
    const mainListScrollRef = useRef<HTMLDivElement>(null);
    const mainListScrollTopRef = useRef(0);
    const shouldRestoreMainListScrollRef = useRef(false);
    const previousSubmenuRef = useRef<SettingsSubmenu>(activeSubmenu);
    const [webdavConfig, setWebdavConfig] = useState<WebDAVConfig | null>(null);
    const [s3Config, setS3Config] = useState<S3Config | null>(null);
    const [compatibleS3Config, setCompatibleS3Config] = useState<CompatibleS3Config | null>(null);
    // Floating Window State
    const [floatingWindowEnabled, setFloatingWindowEnabled] = useState(false);
    const pendingFloatingWindowResumeCheckRef = useRef(false);

    // UI State
    const [isDefaultViewDropdownOpen, setIsDefaultViewDropdownOpen] = useState(false);


    const [isSyncing, setIsSyncing] = useState(false);

    // Sync local user info when prop changes
    useEffect(() => {
        // We handle local user info state inside the specific submenu render to avoid conflicts
    }, [userPersonalInfo]);

    const openSettingsSubmenu = (submenu: SettingsSubmenu) => {
        if (activeSubmenu === 'main' && mainListScrollRef.current) {
            mainListScrollTopRef.current = mainListScrollRef.current.scrollTop;
            shouldRestoreMainListScrollRef.current = true;
        }

        setSettingsSubmenuBackCloses(false);
        setActiveSubmenu(submenu);
    };

    const handleBackToMain = () => {
        shouldRestoreMainListScrollRef.current = true;
        setSettingsSubmenuBackCloses(false);
        setActiveSubmenu('main');
    };

    const handleBackFromShortcutSubview = () => {
        setSettingsSubmenuBackCloses(false);
        onClose();
    };

    const handleOpenDailyChecks = () => {
        setDailyChecksReturnTarget('settings');
        setPreviousView(currentView);
        setDailyCheckDetailId(null);
        onClose();
        setCurrentView(AppView.DAILY_CHECKS);
    };

    useEffect(() => {
        const previousSubmenu = previousSubmenuRef.current;
        previousSubmenuRef.current = activeSubmenu;

        if (activeSubmenu !== 'main' || previousSubmenu === 'main' || !shouldRestoreMainListScrollRef.current) {
            return;
        }

        const restoreId = window.requestAnimationFrame(() => {
            if (mainListScrollRef.current) {
                mainListScrollRef.current.scrollTop = mainListScrollTopRef.current;
            }
            shouldRestoreMainListScrollRef.current = false;
        });

        return () => window.cancelAnimationFrame(restoreId);
    }, [activeSubmenu]);

    const isElectronEnvironment = () => {
        return typeof window !== 'undefined' && !!(window as any).ipcRenderer;
    };



    // Update Check State
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
    const [updateInfo, setUpdateInfo] = useState<VersionInfo | null>(null);
    const [showUpdateModal, setShowUpdateModal] = useState(false);





    // Initialize Floating Window State
    useEffect(() => {
        const checkFloatingStatus = async () => {
            if (Capacitor.isNativePlatform()) {
                const savedState = localStorage.getItem('floating_window_enabled');
                if (savedState === 'true') {
                    setFloatingWindowEnabled(true);
                    // Optionally sync actual state if needed, but for now trust localStorage or plugin
                }
            }
        };
        checkFloatingStatus();
    }, []);

    const handleFloatingWindowStartFeedback = (
        result: FloatingWindowStartupResult,
        source: 'toggle' | 'resume'
    ) => {
        if (result.started) {
            if (!result.notificationPermissionGranted) {
                onToast('info', '悬浮球已开启，但通知栏常驻不可用，稳定性会变差。请在系统设置中允许通知。');
                return;
            }

            onToast('success', source === 'resume' ? '悬浮球已自动恢复' : '悬浮球已开启');
            return;
        }

        if (!result.floatingPermissionGranted) {
            onToast(
                'info',
                source === 'resume'
                    ? '悬浮窗权限尚未授予，暂未恢复悬浮球。'
                    : '请在系统设置中授予悬浮窗权限，返回后会自动尝试启动。'
            );
            return;
        }

        onToast('error', source === 'resume' ? '自动恢复悬浮球失败' : '开启悬浮球失败');
    };

    useEffect(() => {
        if (Capacitor.getPlatform() !== 'android') {
            return;
        }

        let listener: { remove: () => void } | null = null;
        let cancelled = false;

        const setupListener = async () => {
            listener = await CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
                if (!isActive || !pendingFloatingWindowResumeCheckRef.current) {
                    return;
                }

                pendingFloatingWindowResumeCheckRef.current = false;

                if (localStorage.getItem('floating_window_enabled') !== 'true') {
                    return;
                }

                try {
                    const result = await startFloatingWindowWithGuards();
                    handleFloatingWindowStartFeedback(result, 'resume');
                } catch (error) {
                    console.error('Restore floating window on resume failed:', error);
                    onToast('error', '自动恢复悬浮球失败');
                }
            });

            if (cancelled && listener) {
                listener.remove();
            }
        };

        setupListener();

        return () => {
            cancelled = true;
            listener?.remove();
        };
    }, [onToast]);

    const handleToggleFloatingWindow = async () => {
        if (!Capacitor.isNativePlatform()) {
            onToast('error', '悬浮球仅支持 Android 设备');
            return;
        }

        const newState = !floatingWindowEnabled;
        setFloatingWindowEnabled(newState);
        localStorage.setItem('floating_window_enabled', String(newState));

        try {
            if (newState) {
                const result = await startFloatingWindowWithGuards({
                    requestFloatingPermission: true,
                    requestNotificationPermission: true
                });
                pendingFloatingWindowResumeCheckRef.current =
                    (!result.floatingPermissionGranted && result.requestedFloatingPermission) ||
                    (result.started && !result.notificationPermissionGranted && result.requestedNotificationPermission);

                handleFloatingWindowStartFeedback(result, 'toggle');
                return;
            } else {
                pendingFloatingWindowResumeCheckRef.current = false;
                await FocusNotification.stopFloatingWindow();
                onToast('success', '悬浮球已关闭');
            }
        } catch (error) {
            console.error('Toggle floating window error:', error);
            onToast('error', '操作失败');
            // Revert state on error
            setFloatingWindowEnabled(!newState);
            localStorage.setItem('floating_window_enabled', String(!newState));
        }
    };

    useEffect(() => {
        // 加载WebDAV配置
        const config = webdavService.getConfig();
        const manualWebdavDisconnect = localStorage.getItem('lumos_webdav_manual_disconnect');

        if (config) {
            if (manualWebdavDisconnect !== 'true') {
                setWebdavConfig(config);
            }
        }

        // 加载S3配置 - 添加更可靠的加载机制
        const loadS3Config = () => {
            const s3Config = s3Service.getConfig();
            const manualS3Disconnect = localStorage.getItem('lumos_s3_manual_disconnect');

            console.log('[SettingsView] 加载S3配置:', s3Config);

            if (s3Config) {
                console.log('[SettingsView] S3配置已加载');
                if (manualS3Disconnect !== 'true') {
                    setS3Config(s3Config);
                }
            } else {
                // 如果服务中没有配置，尝试直接从localStorage加载
                const bucketName = localStorage.getItem('lumos_cos_bucket');
                const region = localStorage.getItem('lumos_cos_region');
                const secretId = localStorage.getItem('lumos_cos_secret_id');
                const secretKey = localStorage.getItem('lumos_cos_secret_key');
                const endpoint = localStorage.getItem('lumos_cos_endpoint');

                if (bucketName && region && secretId && secretKey) {
                    const fallbackConfig = {
                        bucketName,
                        region,
                        secretId,
                        secretKey,
                        endpoint: endpoint || ''
                    };
                    console.log('[SettingsView] 从localStorage加载S3配置:', fallbackConfig);
                    if (manualS3Disconnect !== 'true') {
                        setS3Config(fallbackConfig);
                    }
                }
            }
        };

        // 立即尝试加载
        const loadCompatibleS3Config = () => {
            const nextCompatibleS3Config = compatibleS3Service.getConfig();
            const manualCompatibleS3Disconnect = localStorage.getItem('lumos_compatible_s3_manual_disconnect');

            if (nextCompatibleS3Config && manualCompatibleS3Disconnect !== 'true') {
                setCompatibleS3Config(nextCompatibleS3Config);
            }
        };

        loadS3Config();
        loadCompatibleS3Config();

        // 如果第一次加载失败，延迟再试一次
        const timer = setTimeout(() => {
            loadS3Config();
            loadCompatibleS3Config();
        }, 100);

        return () => clearTimeout(timer);
    }, []);


    const resolveCloudUploadedAt = async (service: CloudService, fallback: number): Promise<number> => {
        try {
            const remoteDate = await service.statFile?.();
            if (remoteDate) {
                return remoteDate.getTime();
            }
        } catch (error) {
            console.warn('[Settings] Failed to read cloud upload time', error);
        }

        return fallback;
    };

    const handleSyncUpload = async () => {
        if (!webdavConfig) return;
        setIsSyncing(true);

        try {
            const localData = getFullLocalData();

            // 验证数据
            const uploadCheck = canSafelyUpload(localData);
            if (!uploadCheck.canUpload) {
                alert(`错误: ${uploadCheck.reason}`);
                setIsSyncing(false);
                return;
            }

            // 使用统一的上传函数
            const result = await uploadDataToCloud(
                webdavService,
                localData,
                undefined
            );

            if (result.success) {
                const syncedTimestamp = await resolveCloudUploadedAt(webdavService, result.data?.timestamp || 0);
                setLastSeenCloudUploadedAt(syncedTimestamp);
                clearPendingLocalDataEdit();
                console.log(`[Settings] WebDAV cloud upload acknowledged: ${syncedTimestamp}`);

                onToast('success', result.message);
            } else {
                onToast('error', result.message);
            }
        } catch (error) {
            console.error(error);
            onToast('error', '数据上传失败');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSyncDownload = async () => {
        if (!webdavConfig) return;
        if (!window.confirm("这将使用云端版本覆盖当前本地数据。首先会将当前本地数据的备份上传到云端的 'backups/' 目录。确定吗？")) return;

        setIsSyncing(true);

        try {
            const localData = getFullLocalData();

            // 使用统一的下载函数（包含备份）
            const result = await downloadWithBackup(
                webdavService,
                localData,
                (message) => onToast('info', message)
            );

            if (result.success && result.data) {
                await onSyncUpdate(result.data);
                setLastSeenCloudUploadedAt(await resolveCloudUploadedAt(webdavService, result.data?.timestamp || 0));
                clearPendingLocalDataEdit();
                onToast(result.imageStats?.errors.length ? 'warning' : 'success', result.message);

                // 同步完成后关闭设置页面，自动刷新到脉络页面
                setTimeout(() => {
                    onClose();
                }, 1000);
            } else {
                onToast('error', result.message);
            }
        } catch (error) {
            console.error(error);
            onToast('error', '从云端下载数据失败');
        } finally {
            setIsSyncing(false);
        }
    };


    const handleS3SyncUpload = async () => {
        if (!s3Config) return;
        setIsSyncing(true);

        try {
            const localData = getFullLocalData();

            // 验证数据
            const uploadCheck = canSafelyUpload(localData);
            if (!uploadCheck.canUpload) {
                alert(`错误: ${uploadCheck.reason}`);
                setIsSyncing(false);
                return;
            }

            // 使用统一的上传函数
            const result = await uploadDataToCloud(
                s3Service,
                localData,
                (message) => console.log('[S3 Upload]', message)
            );

            if (result.success) {
                const syncedTimestamp = await resolveCloudUploadedAt(s3Service, result.data?.timestamp || 0);
                setLastSeenCloudUploadedAt(syncedTimestamp);
                clearPendingLocalDataEdit();
                console.log(`[Settings] S3 cloud upload acknowledged: ${syncedTimestamp}`);

                onToast(result.imageStats?.errors.length ? 'warning' : 'success', result.message);
            } else {
                onToast('error', result.message);
            }
        } catch (error: any) {
            console.error('S3 Upload Error:', error);
            onToast('error', `上传数据至 COS 失败: ${error.message || '未知错误'}`);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleCompatibleS3SyncUpload = async () => {
        if (!compatibleS3Config) return;
        setIsSyncing(true);

        try {
            const localData = getFullLocalData();
            const uploadCheck = canSafelyUpload(localData);
            if (!uploadCheck.canUpload) {
                alert(`错误: ${uploadCheck.reason}`);
                setIsSyncing(false);
                return;
            }

            const result = await uploadDataToCloud(
                compatibleS3Service,
                localData,
                (message) => console.log('[Compatible S3 Upload]', message)
            );

            if (result.success) {
                setLastSeenCloudUploadedAt(await resolveCloudUploadedAt(compatibleS3Service, result.data?.timestamp || 0));
                clearPendingLocalDataEdit();
                onToast(result.imageStats?.errors.length ? 'warning' : 'success', result.message);
            } else {
                onToast('error', result.message);
            }
        } catch (error: any) {
            console.error('Compatible S3 Upload Error:', error);
            onToast('error', `上传数据到兼容 S3 失败: ${error.message || '未知错误'}`);
        } finally {
            setIsSyncing(false);
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
            ...syncData,
            logs: syncData?.logs ?? ctxLogs,
            todos: syncData?.todos ?? ctxTodos,
            categories: syncData?.categories ?? ctxCategories,
            todoCategories: syncData?.todoCategories ?? ctxTodoCategories,
            scopes: syncData?.scopes ?? ctxScopes,
            goals: syncData?.goals ?? ctxGoals,
            majorGoals: syncData?.majorGoals ?? ctxMajorGoals,
            autoLinkRules: syncData?.autoLinkRules ?? ctxAutoLinkRules,
            reviewTemplates: syncData?.reviewTemplates ?? ctxReviewTemplates,
            checkTemplates: syncData?.checkTemplates ?? ctxCheckTemplates,
            dailyReviews: syncData?.dailyReviews ?? ctxDailyReviews,
            weeklyReviews: syncData?.weeklyReviews ?? ctxWeeklyReviews,
            monthlyReviews: syncData?.monthlyReviews ?? ctxMonthlyReviews,
            customNarrativeTemplates: syncData?.customNarrativeTemplates ?? ctxCustomNarrativeTemplates,
            userPersonalInfo: syncData?.userPersonalInfo ?? ctxUserPersonalInfo,
            filters: syncData?.filters ?? ctxFilters,
            customColorGroup: syncData?.customColorGroup ?? customColorGroup,
            sceneGroupState, // 新版：场景组状态
            sceneTimeSlots, // 添加场景设置
            principles, // 添加原则库
            selfBeliefs, // 添加自我认知库
            version: '1.0.0',
            timestamp: getLocalDataTimestamp()
        };
        console.log('[SettingsView] getFullLocalData:', {
            logsCount: localData.logs?.length,
            todosCount: localData.todos?.length,
            isLogsUndefined: localData.logs === undefined,
            dataKeys: Object.keys(localData)
        });
        return localData;
    };

    const handleS3SyncDownload = async () => {
        if (!s3Config) return;
        if (!window.confirm("这将使用 COS 版本覆盖当前本地数据。首先会将当前本地数据的备份上传到云端的 'backups/' 目录。确定吗？")) return;

        setIsSyncing(true);

        try {
            const localData = getFullLocalData();

            // 使用统一的下载函数（包含备份）
            const result = await downloadWithBackup(
                s3Service,
                localData,
                (message) => onToast('info', message)
            );

            if (result.success && result.data) {
                await onSyncUpdate(result.data);
                setLastSeenCloudUploadedAt(await resolveCloudUploadedAt(s3Service, result.data?.timestamp || 0));
                clearPendingLocalDataEdit();
                onToast(result.imageStats?.errors.length ? 'warning' : 'success', result.message);

                // 同步完成后关闭设置页面
                setTimeout(() => {
                    onClose();
                }, 1000);
            } else {
                onToast('error', result.message);
            }
        } catch (error) {
            console.error(error);
            onToast('error', '从 COS 下载数据失败');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleCompatibleS3SyncDownload = async () => {
        if (!compatibleS3Config) return;
        if (!window.confirm("这将使用兼容 S3 版本覆盖当前本地数据。首先会将当前本地数据的备份上传到云端的 'backups/' 目录。确定吗？")) return;

        setIsSyncing(true);

        try {
            const localData = getFullLocalData();
            const result = await downloadWithBackup(
                compatibleS3Service,
                localData,
                (message) => onToast('info', message)
            );

            if (result.success && result.data) {
                await onSyncUpdate(result.data);
                setLastSeenCloudUploadedAt(await resolveCloudUploadedAt(compatibleS3Service, result.data?.timestamp || 0));
                clearPendingLocalDataEdit();
                onToast(result.imageStats?.errors.length ? 'warning' : 'success', result.message);

                setTimeout(() => {
                    onClose();
                }, 1000);
            } else {
                onToast('error', result.message);
            }
        } catch (error) {
            console.error(error);
            onToast('error', '从兼容 S3 下载数据失败');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleGenerateDemo = () => {
        if (!window.confirm('Generate 50 random logs? This helps debugging heatmaps.')) return;

        const newLogs = [...(syncData.logs || [])];
        const now = new Date();

        for (let i = 0; i < 50; i++) {
            const dateOffset = Math.floor(Math.random() * 30); // Last 30 days
            const duration = Math.floor(Math.random() * 14400) + 300; // 5min to 4h

            const startTime = new Date(now);
            startTime.setDate(startTime.getDate() - dateOffset);
            startTime.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

            let catId = '';
            let actId = '';
            let actName = 'Demo Task';
            let actIcon = '📝';

            if (syncData.categories && syncData.categories.length > 0) {
                const cat = syncData.categories[Math.floor(Math.random() * syncData.categories.length)];
                catId = cat.id;
                if (cat.activities.length > 0) {
                    const act = cat.activities[Math.floor(Math.random() * cat.activities.length)];
                    actId = act.id;
                    actName = act.name;
                    actIcon = act.icon;
                }
            }

            newLogs.push({
                id: crypto.randomUUID(),
                categoryId: catId,
                activityId: actId,
                activityName: actName,
                activityIcon: actIcon,
                startTime: startTime.getTime(),
                endTime: startTime.getTime() + (duration * 1000),
                duration: duration,
                note: 'Demo Data'
            });
        }

        void onLocalDataUpdate({
            ...syncData,
            logs: newLogs
        });
        onToast('success', 'Generated 50 demo logs');
    };

    const handleCheckUpdate = async () => {
        setIsCheckingUpdate(true);
        try {
            // 总是获取最新版本信息并显示模态框
            const versionData = await UpdateService.checkForUpdates();

            if (versionData) {
                setUpdateInfo(versionData);
                setShowUpdateModal(true);
            } else {
                // 检查失败
                onToast('error', '检查更新失败，请稍后重试');
            }
        } catch (error) {
            console.error('检查更新出错:', error);
            onToast('error', '检查更新失败，请检查网络连接');
        } finally {
            setIsCheckingUpdate(false);
        }
    };

    const handleDownloadUpdate = () => {
        if (updateInfo?.updateUrl) {
            UpdateService.openUpdateUrl(updateInfo.updateUrl);
            setShowUpdateModal(false);
            onToast('info', '已在浏览器中打开下载页面');
        }
    };



    // 图片清理功能



    const handleCleanupCloudBackups = async () => {
        // DataManagementView owns the user confirmation through ConfirmModal.
        const confirm = () => true;
        const webdavConfig = webdavService.getConfig();
        const s3Config = s3Service.getConfig();
        const activeService = compatibleS3Config
            ? compatibleS3Service
            : (s3Config ? s3Service : (webdavConfig ? webdavService : null));

        if (!activeService) {
            onToast('error', '未连接云端服务 (WebDAV、COS 或兼容 S3)');
            return;
        }

        if (!confirm('确定要清理云端备份吗？\n\n这将检查 "backups" 文件夹，只保留最新的一个备份文件，其余的将被永久删除。\n此操作不可撤销。')) {
            return;
        }

        try {
            // 1. Check/List files in 'backups'
            let contents: any[] = [];
            try {
                // Try 'backups' first
                contents = await activeService.getDirectoryContents?.('backups') || [];
                // If empty, it might be because some WebDAV servers need trailing slash or handle paths differently
                if (contents.length === 0) {
                    contents = await activeService.getDirectoryContents?.('backups/') || [];
                }
            } catch (e) {
                console.error('List backups failed:', e);
                // Try trailing slash if first attempt failed
                contents = await activeService.getDirectoryContents?.('backups/') || [];
            }

            if (!contents || contents.length === 0) {
                onToast('info', '云端 backups 文件夹为空或无法读取');
                return;
            }

            // Unify format
            let backupFiles: { key: string, time: number, name: string }[] = [];

            if (s3Config) {
                // S3
                backupFiles = contents
                    .filter((item: any) => item.Key && !item.Key.endsWith('/'))
                    .map((item: any) => ({
                        key: item.Key,
                        time: new Date(item.LastModified).getTime(),
                        name: item.Key.split('/').pop() || item.Key
                    }));
            } else {
                // WebDAV
                backupFiles = contents
                    .filter((item: any) => item.type === 'file')
                    .map((item: any) => ({
                        key: item.filename,
                        time: new Date(item.lastmod).getTime(),
                        name: item.basename || item.filename.split('/').pop()
                    }));
            }

            // Only consider .json files to be safe
            backupFiles = backupFiles.filter(f => f.name.toLowerCase().endsWith('.json'));

            if (backupFiles.length <= 1) {
                onToast('info', `无需清理：当前仅发现 ${backupFiles.length} 个备份文件`);
                return;
            }

            // 2. Sort descending (Newest first)
            backupFiles.sort((a, b) => b.time - a.time);

            // 3. Keep first
            const latest = backupFiles[0];
            const toDelete = backupFiles.slice(1);

            console.log(`[Backups] Keeping latest: ${latest.name}, Deleting ${toDelete.length} old backups`);

            // 4. Delete others
            let deletedCount = 0;
            for (const file of toDelete) {
                try {
                    const success = await activeService.deleteFile(file.key);
                    if (success) deletedCount++;
                } catch (e) {
                    console.error(`Failed to delete ${file.key}`, e);
                }
            }

            onToast('success', `清理完成：已保留 ${latest.name}，删除了 ${deletedCount} 个历史备份`);

        } catch (error: any) {
            console.error('Cleanup failed:', error);
            onToast('error', `清理失败: ${error.message}`);
        } finally {
        }
    };

    const handleCheckCloudImageConsistency = async (): Promise<string> => {
        const { report, analysis } = await cloudImageConsistencyService.generateReport(logs, todos);
        if (!analysis.success) {
            onToast('error', analysis.message);
            return report;
        }

        const hasIssues =
            analysis.localManifestMissingLocalFiles.length > 0 ||
            analysis.localManifestMissingCloudManifest.length > 0 ||
            analysis.cloudManifestExtraEntries.length > 0 ||
            analysis.localManifestMissingCloudFiles.length > 0 ||
            analysis.cloudFilesExtraEntries.length > 0;

        onToast(hasIssues ? 'warning' : 'success', analysis.message);
        return report;
    };

    const handleCleanupCloudImages = async (): Promise<{ message: string; report: string }> => {
        const repairResult = await cloudImageConsistencyService.repairUsingLocalState(logs, todos);
        const { report } = await cloudImageConsistencyService.generateReport(logs, todos);

        onToast(repairResult.success ? 'success' : 'warning', repairResult.message);

        return {
            message: repairResult.message,
            report
        };
    };



    // Filters子页面
    if (activeSubmenu === 'memoir_filter') {
        return renderLazySettingsSubview(
            <MemoirSettingsView onBack={handleBackToMain} />,
            '正在加载 Memoir 设置...'
        );
    }

    if (activeSubmenu === 'filters') {
        return renderLazySettingsSubview(
            <FiltersSettingsView
                onBack={handleBackToMain}
                onToast={onToast}
                filters={filters}
                onUpdateFilters={(newFilters) => onUpdateFilters?.(newFilters)}
                logs={logs}
                categories={categoriesData || []}
                scopes={scopes || []}
                todos={todos || []}
                todoCategories={todoCategories || []}
                onEditLog={onEditLog}
            />,
            '正在加载筛选器设置...'
        );
    }

    if (activeSubmenu === 'collections') {
        return renderLazySettingsSubview(
            <CollectionSettingsView
                onBack={settingsSubmenuBackCloses ? handleBackFromShortcutSubview : handleBackToMain}
                onEditLog={onEditLog}
                onEditTodo={onEditTodo}
            />,
            '正在加载 Collection...'
        );
    }

    if (activeSubmenu === 'review_overview') {
        return renderLazySettingsSubview(
            <ReviewOverviewView
                onBack={handleBackToMain}
                dailyReviews={dailyReviews}
                weeklyReviews={weeklyReviews}
                monthlyReviews={monthlyReviews}
                reviewTemplates={reviewTemplates}
            />,
            '正在加载回顾总览...'
        );
    }

    if (activeSubmenu === 'check_templates') {
        return renderLazySettingsSubview(
            <CheckTemplateManageView
                templates={checkTemplates}
                onUpdateTemplates={(newTemplates) => onUpdateCheckTemplates?.(newTemplates)}
                dailyReviews={dailyReviews}
                onBatchUpdateDailyReviewItems={onUpdateDailyReviews || (() => { })}
                onBack={handleBackToMain}
            />,
            '正在加载日课模板...'
        );
    }

    if (activeSubmenu === 'ai') {
        return renderLazySettingsSubview(
            <AISettingsView onBack={handleBackToMain} onToast={onToast} />,
            '正在加载 AI 设置...'
        );
    }

    if (activeSubmenu === 'emoji') {
        return renderLazySettingsSubview(
            <EmojiSettingsView
                onBack={handleBackToMain}
            />,
            '正在加载 Emoji 设置...'
        );
    }

    if (activeSubmenu === 'principle') {
        return renderLazySettingsSubview(
            <PrincipleLibraryView
                onBack={settingsSubmenuBackCloses ? handleBackFromShortcutSubview : handleBackToMain}
            />,
            '正在加载原则库...'
        );
    }

    if (activeSubmenu === 'cloud') {
        return renderLazySettingsSubview(
            <CloudSyncSettingsView
                onBack={handleBackToMain}
                onToast={onToast}
                webdavConfig={webdavConfig}
                setWebdavConfig={setWebdavConfig}
                onSyncUpload={handleSyncUpload}
                onSyncDownload={handleSyncDownload}
            />,
            '正在加载 WebDAV 同步设置...'
        );
    }

    if (activeSubmenu === 's3') {
        return renderLazySettingsSubview(
            <S3SyncSettingsView
                onBack={handleBackToMain}
                onToast={onToast}
                s3Config={s3Config}
                setS3Config={setS3Config}
                compatibleS3Config={compatibleS3Config}
                setCompatibleS3Config={setCompatibleS3Config}
                onS3SyncUpload={handleS3SyncUpload}
                onS3SyncDownload={handleS3SyncDownload}
                onCompatibleS3SyncUpload={handleCompatibleS3SyncUpload}
                onCompatibleS3SyncDownload={handleCompatibleS3SyncDownload}
            />,
            '正在加载 S3 同步设置...'
        );
    }



    const { categories } = syncData;

    if (activeSubmenu === 'auto_record') {
        return renderLazySettingsSubview(
            <AutoRecordSettingsView
                onBack={handleBackToMain}
                categories={categories || []}
            />,
            '正在加载应用关联规则...'
        );
    }

    if (activeSubmenu === 'app_awareness') {
        return renderLazySettingsSubview(
            <AppAwarenessSettingsView
                onBack={handleBackToMain}
                categories={categories || []}
            />,
            '正在加载应用感知...'
        );
    }

    if (activeSubmenu === 'obsidian_export') {
        // 获取当天的 dailyReview
        const dateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
        const todayReview = dailyReviews.find(r => r.date === dateStr);

        return renderLazySettingsSubview(
            <ObsidianExportView
                onBack={handleBackToMain}
                logs={logs}
                categories={categoriesData || categories || []}
                todos={todos}
                scopes={scopes}
                currentDate={currentDate}
                onToast={onToast}
                dailyReview={todayReview}
                dailyReviews={dailyReviews}
                weeklyReviews={weeklyReviews}
                monthlyReviews={monthlyReviews}
                todoCategories={todoCategories}
            />,
            '正在加载 Obsidian 导出...'
        );
    }

    if (activeSubmenu === 'data') {
        return renderLazySettingsSubview(
            <DataManagementView
                onBack={handleBackToMain}
                onToast={onToast}
                onExport={onExport}
                onImport={onImport}
                onReset={onReset}
                onClearData={onClearData}
                onCleanupCloudBackups={handleCleanupCloudBackups}
                onCheckCloudImageConsistency={handleCheckCloudImageConsistency}
                onCleanupCloudImages={handleCleanupCloudImages}
                logs={logs}
                dailyReviews={dailyReviews}
                categories={categoriesData || []}
                todos={todos}
                todoCategories={todoCategories}
                scopes={scopes}
            />,
            '正在加载数据管理...'
        );
    }

    if (activeSubmenu === 'preferences') {
        return renderLazySettingsSubview(
            <PreferencesSettingsView
                onBack={handleBackToMain}
                onToast={onToast}
                privacyMode={isPrivacyMode}
                onTogglePrivacyMode={togglePrivacyMode}
                dailyReviewTime={dailyReviewTime}
                onSetDailyReviewTime={onSetDailyReviewTime}
                weeklyReviewTime={weeklyReviewTime}
                onSetWeeklyReviewTime={onSetWeeklyReviewTime}
                monthlyReviewTime={monthlyReviewTime}
                onSetMonthlyReviewTime={onSetMonthlyReviewTime}
                autoGenerateDailyReview={autoGenerateDailyReview}
                onToggleAutoGenerateDailyReview={onToggleAutoGenerateDailyReview}
                autoGenerateWeeklyReview={autoGenerateWeeklyReview}
                onToggleAutoGenerateWeeklyReview={onToggleAutoGenerateWeeklyReview}
                autoGenerateMonthlyReview={autoGenerateMonthlyReview}
                onToggleAutoGenerateMonthlyReview={onToggleAutoGenerateMonthlyReview}
                autoFocusNote={autoFocusNote}
                onToggleAutoFocusNote={onToggleAutoFocusNote}
                autoStartTimerJumpMode={autoStartTimerJumpMode}
                onSetAutoStartTimerJumpMode={setAutoStartTimerJumpMode}
                autoApplyAutoLinkRules={autoApplyAutoLinkRules}
                onToggleAutoApplyAutoLinkRules={() => setAutoApplyAutoLinkRules(!autoApplyAutoLinkRules)}
                autoApplyTodoLink={autoApplyTodoLink}
                onToggleAutoApplyTodoLink={() => setAutoApplyTodoLink(!autoApplyTodoLink)}
                timelineGalleryMode={timelineGalleryMode}
                onToggleTimelineGalleryMode={onToggleTimelineGalleryMode}
                timelineSortOrder={timelineSortOrder}
                onSetTimelineSortOrder={onSetTimelineSortOrder}
                timelineQuickActions={timelineQuickActions}
                onSetTimelineQuickActions={onSetTimelineQuickActions}
                collapseThreshold={collapseThreshold}
                onSetCollapseThreshold={onSetCollapseThreshold}
                minIdleTimeThreshold={minIdleTimeThreshold}
                onSetMinIdleTimeThreshold={onSetMinIdleTimeThreshold}
                defaultView={defaultView}
                onSetDefaultView={onSetDefaultView}
                defaultArchiveView={defaultArchiveView}
                onSetDefaultArchiveView={onSetDefaultArchiveView}
                defaultIndexView={defaultIndexView}
                onSetDefaultIndexView={onSetDefaultIndexView}
                defaultRecordView={defaultRecordView}
                onSetDefaultRecordView={onSetDefaultRecordView}
                immersiveTimerDefaultOrientation={immersiveTimerDefaultOrientation}
                onSetImmersiveTimerDefaultOrientation={setImmersiveTimerDefaultOrientation}
                manualSyncMode={manualSyncMode}
                onToggleManualSyncMode={onToggleManualSyncMode}
                sceneCardTimerMode={sceneCardTimerMode}
                onSetSceneCardTimerMode={setSceneCardTimerMode}
            />,
            '正在加载偏好设置...'
        );
    }

    if (activeSubmenu === 'guide') {
        return renderLazySettingsSubview(
            <UserGuideView onBack={handleBackToMain} />,
            '正在加载用户指南...'
        );
    }

    if (activeSubmenu === 'nfc') {
        return renderLazySettingsSubview(
            <NFCSettingsView
                onBack={handleBackToMain}
                onToast={onToast}
                categories={syncData.categories || []}
                checkTemplates={syncData.checkTemplates || []}
            />,
            '正在加载 NFC 设置...'
        );
    }

    if (activeSubmenu === 'narrative_prompt') {
        return renderLazySettingsSubview(
            <NarrativeSettingsView
                onBack={handleBackToMain}
                onToast={onToast}
                userPersonalInfo={userPersonalInfo}
                onSetUserPersonalInfo={onSetUserPersonalInfo}
                customNarrativeTemplates={customNarrativeTemplates}
                onUpdateCustomNarrativeTemplates={onUpdateCustomNarrativeTemplates}
            />,
            '正在加载叙事设置...'
        );
    }

    if (activeSubmenu === 'templates') {
        return renderLazySettingsSubview(
            <ReviewTemplateManageView
                templates={reviewTemplates}
                onUpdateTemplates={(newTemplates) => {
                    onUpdateReviewTemplates?.(newTemplates);
                    void onLocalDataUpdate({ ...syncData, reviewTemplates: newTemplates });
                }}
                onBack={handleBackToMain}
            />,
            '正在加载回顾模板...'
        );
    }

    if (activeSubmenu === 'autolink') {
        return renderLazySettingsSubview(
            <AutoLinkView
                onClose={handleBackToMain}
                rules={syncData.autoLinkRules || []}
                onUpdateRules={(rules) => {
                    void onLocalDataUpdate({ ...syncData, autoLinkRules: rules });
                }}
                categories={syncData.categories || []}
                scopes={syncData.scopes || []}
            />,
            '正在加载自动关联规则...'
        );
    }

    if (activeSubmenu === 'batch_manage') {
        return renderLazySettingsSubview(
            <BatchFocusRecordManageView
                onBack={handleBackToMain}
                logs={logs}
                onUpdateLogs={(updatedLogs) => {
                    const recalculatedTodos = syncSubtaskProgressToParentTodos((todos || []).map(todo => {
                        if (getTodoProgressTrackingMode(todo, todos || []) !== 'manual') return todo;
                        const completedUnits = updatedLogs
                            .filter(log => log.linkedTodoId === todo.id)
                            .reduce((sum, log) => sum + (log.progressIncrement || 0), 0);
                        return {
                            ...todo,
                            isProgress: true,
                            progressTrackingMode: 'manual',
                            completedUnits: Math.max(0, completedUnits)
                        };
                    }));
                    void onLocalDataUpdate({
                        ...syncData,
                        logs: updatedLogs,
                        todos: recalculatedTodos
                    });
                }}
                categories={categoriesData || []}
                scopes={scopes || []}
                todos={todos || []}
                todoCategories={todoCategories || []}
                onToast={onToast}
            />,
            '正在加载批量记录管理...'
        );
    }

    if (activeSubmenu === 'sponsorship_preview') {
        return renderLazySettingsSubview(
            <SponsorshipView
                onBack={handleBackToMain}
                onToast={onToast}
                categories={categoriesData}
            />,
            '正在加载赞助页...'
        );
    }

    if (activeSubmenu === 'scene') {
        return <SceneSettingsView onBack={handleBackToMain} />;
    }

    if (activeSubmenu === 'widget') {
        return renderLazySettingsSubview(
            <WidgetSettingsView
                onBack={handleBackToMain}
                onToast={onToast}
                categories={categoriesData || []}
                checkTemplates={checkTemplates || []}
                todos={todos || []}
                todoCategories={todoCategories || []}
                scopes={scopes || []}
            />,
            '正在加载小组件计时器...'
        );
    }

    if (activeSubmenu === 'desktop_widget') {
        return renderLazySettingsSubview(
            <DesktopWidgetSettingsView
                onBack={handleBackToMain}
            />,
            '正在加载PC端小组件...'
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0">
                <button
                    onClick={onClose}
                    className="p-2 -ml-2 text-stone-400 hover:text-stone-600 transition-colors"
                >
                    <X size={24} />
                </button>
                <span className="text-stone-800 font-bold text-lg">设置</span>
                <div className="w-8"></div>
            </div>

            <div ref={mainListScrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 pb-40">

                {/* Section: General - AI & Automation */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider pl-2">通用</h3>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                        <MenuItem
                            icon={<Sparkles size={18} className="text-purple-500" />}
                            label="AI API"
                            onClick={() => openSettingsSubmenu('ai')}
                        />
                        <MenuItem
                            icon={<Link size={18} className="text-blue-500" />}
                            label="标签关联领域规则"
                            isLast
                            onClick={() => openSettingsSubmenu('autolink')}
                        />
                    </div>
                </div>

                {/* Section: Display & Preferences */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider pl-2">显示与偏好</h3>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                        <MenuItem
                            icon={<Settings size={18} />}
                            label="偏好设置"
                            onClick={() => openSettingsSubmenu('preferences')}
                        />
                        <MenuItem
                            icon={<Smile size={18} className="text-yellow-500" />}
                            label="Emoji 和 Sticker"
                            onClick={() => openSettingsSubmenu('emoji')}
                        />
                        <MenuItem
                            icon={<AlignLeft size={18} className="text-purple-500" />}
                            label="Memoir 筛选条件"
                            onClick={() => openSettingsSubmenu('memoir_filter')}
                        />
                        <MenuItem
                            icon={<LayoutGrid size={18} className="text-blue-500" />}
                            label="场景设置"
                            isLast
                            onClick={() => openSettingsSubmenu('scene')}
                        />
                    </div>
                </div>

                {/* Section: Content */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider pl-2">内容</h3>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                        <MenuItem
                            icon={<Search size={18} className="text-green-500" />}
                            label="搜索全部"
                            onClick={() => {
                                onOpenSearch?.();
                            }}
                        />
                        <MenuItem
                            icon={<CheckCircle2 size={18} className="text-emerald-600" />}
                            label="日课总览"
                            onClick={handleOpenDailyChecks}
                        />
                        <MenuItem
                            icon={<FileText size={18} className="text-indigo-600" />}
                            label="回顾总览"
                            onClick={() => openSettingsSubmenu('review_overview')}
                        />
                        <MenuItem
                            icon={<Hash size={18} className="text-amber-500" />}
                            label="自定义筛选器"
                            onClick={() => openSettingsSubmenu('filters')}
                        />
                        <MenuItem
                            icon={<Star size={18} className="text-stone-500" />}
                            label="Collections"
                            onClick={() => openSettingsSubmenu('collections')}
                        />
                        <MenuItem
                            icon={<BookOpen size={18} className="text-stone-500" />}
                            label="原则库"
                            isLast
                            onClick={() => openSettingsSubmenu('principle')}
                        />
                    </div>
                </div>

                {/* Section: Android Features */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider pl-2">Android 特性</h3>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                        <MenuItem
                            icon={<Nfc size={18} className="text-orange-500" />}
                            label="NFC Tags"
                            onClick={() => openSettingsSubmenu('nfc')}
                        />
                        <MenuItem
                            icon={<Smartphone size={18} className="text-indigo-500" />}
                            label="应用关联标签规则"
                            onClick={() => openSettingsSubmenu('auto_record')}
                        />
                        <MenuItem
                            icon={<Target size={18} className="text-cyan-600" />}
                            label="应用感知"
                            onClick={() => openSettingsSubmenu('app_awareness')}
                        />
                        <ToggleItem
                            icon={<SquareActivity size={18} className="text-teal-500" />}
                            label="开启悬浮球"
                            checked={floatingWindowEnabled}
                            onChange={handleToggleFloatingWindow}
                        />
                        <MenuItem
                            icon={<LayoutGrid size={18} className="text-sky-500" />}
                            label="小组件"
                            isLast
                            onClick={() => openSettingsSubmenu('widget')}
                        />
                    </div>
                </div>

                {/* Section: Windows Features */}
                {isElectronEnvironment() && !Capacitor.isNativePlatform() && (
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider pl-2">Windows 特性</h3>
                        <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                            <MenuItem
                                icon={<LayoutGrid size={18} className="text-amber-500" />}
                                label="PC端小组件"
                                onClick={() => openSettingsSubmenu('desktop_widget')}
                            />
                            <MenuItem
                                icon={<FileText size={18} className="text-indigo-500" />}
                                label="导出到 Obsidian"
                                isLast
                                onClick={() => openSettingsSubmenu('obsidian_export')}
                            />
                        </div>
                    </div>
                )}
                {/* Section: Daily Review */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider pl-2">每日回顾</h3>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                        <MenuItem
                            icon={<FileText size={18} className="text-orange-500" />}
                            label="回顾模板"
                            onClick={() => openSettingsSubmenu('templates')}
                        />
                        <MenuItem
                            icon={<CheckCircle2 size={18} className="text-green-500" />}
                            label="日课模板"
                            onClick={() => openSettingsSubmenu('check_templates')}
                        />
                        <MenuItem
                            icon={<MessageSquare size={18} className="text-purple-500" />}
                            label="AI 叙事设定"
                            isLast
                            onClick={() => openSettingsSubmenu('narrative_prompt')}
                        />
                    </div>
                </div>
                {/* Section: Data */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider pl-2">数据与同步</h3>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                        <MenuItem
                            icon={<Edit2 size={18} className="text-blue-500" />}
                            label="批量管理记录"
                            onClick={() => openSettingsSubmenu('batch_manage')}
                        />
                        <MenuItem
                            icon={<Cloud size={18} />}
                            label="WebDAV 云同步"
                            onClick={() => openSettingsSubmenu('cloud')}
                        />
                        <MenuItem
                            icon={<Database size={18} className="text-orange-500" />}
                            label="S3 云同步"
                            onClick={() => openSettingsSubmenu('s3')}
                        />
                        <MenuItem
                            icon={<FileSpreadsheet size={18} className="text-blue-500" />}
                            label="数据导出导入"
                            isLast
                            onClick={() => openSettingsSubmenu('data')}
                        />
                    </div>
                </div>

                {/* Section: About */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider pl-2">关于</h3>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                        <MenuItem
                            icon={<ArrowUpCircle size={18} className="text-blue-500" />}
                            label={isCheckingUpdate ? "检查中..." : "检查更新"}
                            onClick={handleCheckUpdate}
                        />
                        <MenuItem
                            icon={<BookOpen size={18} />}
                            label="用户指南"
                            onClick={() => openSettingsSubmenu('guide')}
                        />
                        <MenuItem
                            icon={<Fish size={18} className="text-pink-500" />}
                            label="投喂小鱼干"
                            isLast
                            onClick={() => openSettingsSubmenu('sponsorship_preview')}
                        />
                    </div>
                </div>

                <div className="text-center pt-4 pb-8">
                    <span className="text-[10px] text-stone-300">LumosTime v{UpdateService.getCurrentVersion()}</span>
                </div>

            </div>

            {/* Update Available Modal */}
            {showUpdateModal && updateInfo && (
                <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${UpdateService.compareVersions(UpdateService.getCurrentVersion(), updateInfo.version) ? 'bg-blue-100' : 'bg-green-100'}`}>
                                    {UpdateService.compareVersions(UpdateService.getCurrentVersion(), updateInfo.version) ? (
                                        <ArrowUpCircle size={24} className="text-blue-600" />
                                    ) : (
                                        <CheckCircle2 size={24} className="text-green-600" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-stone-800">
                                        {UpdateService.compareVersions(UpdateService.getCurrentVersion(), updateInfo.version) ? '发现新版本' : '当前已是最新版本'}
                                    </h3>
                                    <p className="text-sm text-stone-500">v{updateInfo.version}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="bg-stone-50 rounded-xl p-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-stone-400">当前版本</span>
                                        <span className="text-sm font-medium text-stone-600">v{UpdateService.getCurrentVersion()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-stone-400">最新版本</span>
                                        <span className={`text-sm font-bold ${UpdateService.compareVersions(UpdateService.getCurrentVersion(), updateInfo.version) ? 'text-blue-600' : 'text-green-600'}`}>
                                            v{updateInfo.version}
                                        </span>
                                    </div>
                                </div>

                                {updateInfo.releaseNotes && (
                                    <div>
                                        <h4 className="text-xs font-bold text-stone-600 mb-2">更新内容</h4>
                                        <div className="bg-stone-50 rounded-xl p-4 max-h-[40vh] overflow-y-auto">
                                            <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">
                                                {updateInfo.releaseNotes}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 pt-2">
                                {UpdateService.compareVersions(UpdateService.getCurrentVersion(), updateInfo.version) ? (
                                    <>
                                        <button
                                            onClick={() => setShowUpdateModal(false)}
                                            className="flex-1 py-3 px-4 text-sm font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
                                        >
                                            稍后提醒
                                        </button>
                                        <button
                                            onClick={handleDownloadUpdate}
                                            className="flex-1 py-3 px-4 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
                                        >
                                            立即下载
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setShowUpdateModal(false)}
                                        className="flex-1 py-3 px-4 text-sm font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
                                    >
                                        关闭
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}



        </div>
    );
};



const MenuItem: React.FC<{ icon: React.ReactNode, label: string, isLast?: boolean, onClick?: () => void }> = ({ icon, label, isLast, onClick }) => (
    <div
        onClick={onClick}
        className={`flex items-center justify-between p-4 active:bg-stone-50 transition-colors cursor-pointer ${!isLast ? 'border-b border-stone-50' : ''}`}
    >
        <div className="flex items-center gap-3.5">
            <div className="text-stone-600">{icon}</div>
            <span className="text-[15px] font-medium text-stone-700">{label}</span>
        </div>
        <ChevronRight size={16} className="text-stone-300" />
    </div>
);


const ToggleItem: React.FC<{ icon: React.ReactNode, label: string, isLast?: boolean, checked: boolean, onChange: () => void }> = ({ icon, label, isLast, checked, onChange }) => (
    <div
        onClick={onChange}
        className={`flex items-center justify-between p-4 active:bg-stone-50 transition-colors cursor-pointer ${!isLast ? 'border-b border-stone-50' : ''}`}
    >
        <div className="flex items-center gap-3.5">
            <div className="text-stone-600">{icon}</div>
            <span className="text-[15px] font-medium text-stone-700">{label}</span>
        </div>
        <div className={`w-10 h-6 rounded-full transition-colors relative ${checked ? 'bg-green-500' : 'bg-stone-200'}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'left-5' : 'left-1'}`} />
        </div>
    </div>
);
