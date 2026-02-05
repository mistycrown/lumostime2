/**
 * @file SettingsView.tsx
 * @input User Settings, Sync Data, AI Config, App State
 * @output Configuration Updates, Data Sync Actions, Navigation
 * @pos View (Settings Modal)
 * @description The central configuration hub. Manages Cloud Sync (WebDAV), AI integration (Providers/Presets), Data (Import/Export), and Application Preferences (Appearance, Habits, etc.).
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState, useRef, useEffect } from 'react';
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
    Check,
    FileSpreadsheet,
    Sparkles,
    Edit,
    Search,
    Link,
    Smartphone,
    ImageIcon,
    AlignLeft
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { webdavService, WebDAVConfig } from '../services/webdavService';
import { s3Service, S3Config } from '../services/s3Service';
import { imageService } from '../services/imageService';
import { syncService } from '../services/syncService';
import { NfcService } from '../services/NfcService';
import { aiService, AIConfig } from '../services/aiService';
import { UpdateService, VersionInfo } from '../services/updateService';
import { CustomSelect } from '../components/CustomSelect';
import { ToastType } from '../components/Toast';

import { ReviewTemplateManageView } from './ReviewTemplateManageView';
import { CheckTemplateManageView } from './CheckTemplateManageView';
import { ConfirmModal } from '../components/ConfirmModal';
import { ReviewTemplate, NarrativeTemplate, Log, TodoItem, Scope, DailyReview, WeeklyReview, MonthlyReview, TodoCategory, Filter, Category, CheckTemplate } from '../types';
import { DefaultArchiveView, DefaultIndexView, useSettings } from '../contexts/SettingsContext';
import { useData } from '../contexts/DataContext';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { useReview } from '../contexts/ReviewContext';
import FocusNotification from '../plugins/FocusNotificationPlugin';
import { AutoRecordSettingsView } from './AutoRecordSettingsView';
import { AutoLinkView } from './AutoLinkView';
import { ObsidianExportView } from './ObsidianExportView';

import { MemoirSettingsView } from './MemoirSettingsView';
import excelExportService from '../services/excelExportService';
import { imageCleanupService } from '../services/imageCleanupService';
import { BatchFocusRecordManageView } from './BatchFocusRecordManageView';
import { usePrivacy } from '../contexts/PrivacyContext';
import { RedemptionService } from '../services/redemptionService';

import { SponsorshipView } from './SponsorshipView';
import { NARRATIVE_TEMPLATES } from '../constants';
import { AISettingsView } from './settings/AISettingsView';
import { PreferencesSettingsView } from './settings/PreferencesSettingsView';
import { NarrativeSettingsView } from './settings/NarrativeSettingsView';
import { NFCSettingsView } from './settings/NFCSettingsView';

import { UserGuideView } from './settings/UserGuideView';
import { FiltersSettingsView } from './settings/FiltersSettingsView';

interface SettingsViewProps {
    onClose: () => void;
    onExport: () => void;
    onImport: (file: File) => void;
    onReset: () => void;
    onClearData: () => void;
    onToast: (type: ToastType, message: string) => void;
    syncData: any;
    onSyncUpdate: (data: any) => void;
    startWeekOnSunday?: boolean;
    onToggleStartWeekOnSunday?: () => void;
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
    autoFocusNote?: boolean;
    onToggleAutoFocusNote?: () => void;
}


interface ExcelExportCardProps {
    logs: Log[];
    categories: Category[];
    todos: TodoItem[];
    todoCategories: TodoCategory[];
    scopes: Scope[];
    onToast: (type: ToastType, message: string) => void;
}

const ExcelExportCardContent: React.FC<{
    logs: Log[];
    categories: Category[];
    todos: TodoItem[];
    todoCategories: TodoCategory[];
    scopes: Scope[];
    onToast: (type: ToastType, message: string) => void;
}> = ({ logs, categories, todos, todoCategories, scopes, onToast }) => {
    const [excelStartDate, setExcelStartDate] = useState(new Date());
    const [excelEndDate, setExcelEndDate] = useState(new Date());
    const [excelStartInput, setExcelStartInput] = useState('');
    const [excelEndInput, setExcelEndInput] = useState('');
    const [isExportingExcel, setIsExportingExcel] = useState(false);

    // 格式化日期为8位字符串 YYYYMMDD
    const formatDateTo8Digits = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    };

    // 解析8位字符串为日期
    const parse8DigitsToDate = (str: string): Date | null => {
        if (str.length !== 8) return null;
        const year = parseInt(str.substring(0, 4));
        const month = parseInt(str.substring(4, 6)) - 1;
        const day = parseInt(str.substring(6, 8));
        const date = new Date(year, month, day);
        if (isNaN(date.getTime())) return null;
        return date;
    };

    // 初始化日期
    useEffect(() => {
        const today = new Date();
        setExcelStartInput(formatDateTo8Digits(today));
        setExcelEndInput(formatDateTo8Digits(today));
    }, []);

    // Excel导出快捷日期范围选择
    const setExcelQuickRange = (type: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let newStartDate: Date;
        let newEndDate: Date;

        switch (type) {
            case 'today':
                newStartDate = today;
                newEndDate = today;
                break;
            case 'yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                newStartDate = yesterday;
                newEndDate = yesterday;
                break;
            case 'thisWeek':
                const thisWeekStart = new Date(today);
                const dayOfWeek = today.getDay();
                const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                thisWeekStart.setDate(today.getDate() - daysFromMonday);
                newStartDate = thisWeekStart;
                newEndDate = today;
                break;
            case 'lastWeek':
                const lastWeekEnd = new Date(today);
                const currentDayOfWeek = today.getDay();
                const daysToLastSunday = currentDayOfWeek === 0 ? 0 : currentDayOfWeek;
                lastWeekEnd.setDate(today.getDate() - daysToLastSunday - 1);
                const lastWeekStart = new Date(lastWeekEnd);
                lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
                newStartDate = lastWeekStart;
                newEndDate = lastWeekEnd;
                break;
            case 'thisMonth':
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                newStartDate = monthStart;
                newEndDate = today;
                break;
            case 'lastMonth':
                const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
                newStartDate = lastMonthStart;
                newEndDate = lastMonthEnd;
                break;
            case 'thisYear':
                const yearStart = new Date(today.getFullYear(), 0, 1);
                newStartDate = yearStart;
                newEndDate = today;
                break;
            case 'all':
                newStartDate = new Date(2020, 0, 1);
                newEndDate = today;
                break;
            default:
                return;
        }

        setExcelStartDate(newStartDate);
        setExcelEndDate(newEndDate);
        setExcelStartInput(formatDateTo8Digits(newStartDate));
        setExcelEndInput(formatDateTo8Digits(newEndDate));
    };

    // 执行Excel导出
    const handleExcelExport = () => {
        setIsExportingExcel(true);
        try {
            excelExportService.exportLogsToExcel(
                logs,
                categories,
                todos,
                todoCategories,
                scopes,
                excelStartDate,
                excelEndDate
            );
            onToast('success', 'Excel导出成功');
        } catch (error: any) {
            console.error('Excel导出失败:', error);
            onToast('error', `Excel导出失败: ${error.message}`);
        } finally {
            setIsExportingExcel(false);
        }
    };

    return (
        <>
            {/* 时间范围 */}
            <div className="space-y-3">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest px-1">时间范围</p>
                <div className="flex items-center gap-2">
                    <div className="flex-1">
                        <label className="text-xs text-stone-400 mb-1 block px-1">起始时间</label>
                        <input
                            type="text"
                            placeholder="20251229"
                            maxLength={8}
                            value={excelStartInput}
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                setExcelStartInput(value);
                                if (value.length === 8) {
                                    const date = parse8DigitsToDate(value);
                                    if (date) {
                                        setExcelStartDate(date);
                                    }
                                }
                            }}
                            className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm font-mono text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-stone-300"
                        />
                    </div>
                    <span className="text-stone-300 mt-5">-</span>
                    <div className="flex-1">
                        <label className="text-xs text-stone-400 mb-1 block px-1">结束时间</label>
                        <input
                            type="text"
                            placeholder="20251229"
                            maxLength={8}
                            value={excelEndInput}
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                setExcelEndInput(value);
                                if (value.length === 8) {
                                    const date = parse8DigitsToDate(value);
                                    if (date) {
                                        setExcelEndDate(date);
                                    }
                                }
                            }}
                            className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm font-mono text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-stone-300"
                        />
                    </div>
                </div>
            </div>

            {/* 快捷按钮 */}
            <div className="space-y-2">
                <p className="text-xs font-bold text-stone-400 uppercase">快捷选择</p>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setExcelQuickRange('today')} className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors">今天</button>
                    <button onClick={() => setExcelQuickRange('yesterday')} className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors">昨天</button>
                    <button onClick={() => setExcelQuickRange('thisWeek')} className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors">本周</button>
                    <button onClick={() => setExcelQuickRange('lastWeek')} className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors">上周</button>
                    <button onClick={() => setExcelQuickRange('thisMonth')} className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-colors">本月</button>
                    <button onClick={() => setExcelQuickRange('lastMonth')} className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors">上月</button>
                    <button onClick={() => setExcelQuickRange('thisYear')} className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors">今年</button>
                    <button onClick={() => setExcelQuickRange('all')} className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors">全部</button>
                </div>
            </div>

            {/* 导出按钮 */}
            <button
                onClick={handleExcelExport}
                disabled={isExportingExcel}
                className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium active:scale-[0.98] transition-all shadow-lg ${isExportingExcel
                    ? 'bg-stone-400 text-white cursor-not-allowed'
                    : 'bg-stone-800 text-white shadow-stone-300 hover:bg-stone-900'
                    }`}
            >
                {isExportingExcel ? (
                    <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        导出中...
                    </>
                ) : (
                    <>
                        <FileSpreadsheet size={18} />
                        导出Excel
                    </>
                )}
            </button>
        </>
    );
};

export const SettingsView: React.FC<SettingsViewProps> = ({ onClose, onExport, onImport, onReset, onClearData, onToast, syncData, onSyncUpdate, startWeekOnSunday, onToggleStartWeekOnSunday, onOpenAutoLink, onOpenSearch, minIdleTimeThreshold = 1, onSetMinIdleTimeThreshold, defaultView = 'RECORD', onSetDefaultView, defaultArchiveView = 'CHRONICLE', onSetDefaultArchiveView, defaultIndexView = 'TAGS', onSetDefaultIndexView, reviewTemplates = [], onUpdateReviewTemplates, onUpdateDailyReviews, checkTemplates = [], onUpdateCheckTemplates, dailyReviewTime, onSetDailyReviewTime, weeklyReviewTime, onSetWeeklyReviewTime, monthlyReviewTime, onSetMonthlyReviewTime, customNarrativeTemplates, onUpdateCustomNarrativeTemplates, userPersonalInfo, onSetUserPersonalInfo, logs = [], todos = [], scopes = [], currentDate = new Date(), dailyReviews = [], weeklyReviews = [], monthlyReviews = [], todoCategories = [], filters = [], onUpdateFilters, categoriesData = [], onEditLog, autoFocusNote, onToggleAutoFocusNote }) => {
    const { isPrivacyMode } = usePrivacy();
    // Hooks for full data access during backup
    const { logs: ctxLogs, todos: ctxTodos, todoCategories: ctxTodoCategories } = useData();
    const { categories: ctxCategories, scopes: ctxScopes, goals: ctxGoals } = useCategoryScope();
    const { autoLinkRules: ctxAutoLinkRules, userPersonalInfo: ctxUserPersonalInfo, filters: ctxFilters, customNarrativeTemplates: ctxCustomNarrativeTemplates, updateDataLastModified } = useSettings();
    const { dailyReviews: ctxDailyReviews, weeklyReviews: ctxWeeklyReviews, monthlyReviews: ctxMonthlyReviews, reviewTemplates: ctxReviewTemplates } = useReview();

    const [activeSubmenu, setActiveSubmenu] = useState<'main' | 'data' | 'cloud' | 's3' | 'ai' | 'preferences' | 'guide' | 'nfc' | 'templates' | 'check_templates' | 'narrative_prompt' | 'auto_record' | 'autolink' | 'obsidian_export' | 'filters' | 'memoir_filter' | 'batch_manage' | 'sponsorship_preview'>('main');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [webdavConfig, setWebdavConfig] = useState<WebDAVConfig | null>(null);
    const [s3Config, setS3Config] = useState<S3Config | null>(null);
    // Floating Window State
    const [floatingWindowEnabled, setFloatingWindowEnabled] = useState(false);
    const [configForm, setConfigForm] = useState<WebDAVConfig>({ url: '', username: '', password: '' });
    const [s3ConfigForm, setS3ConfigForm] = useState<S3Config>({ bucketName: '', region: '', secretId: '', secretKey: '', endpoint: '' });

    // UI State
    const [isDefaultViewDropdownOpen, setIsDefaultViewDropdownOpen] = useState(false);


    // Data Management State
    const [confirmReset, setConfirmReset] = useState(false);
    const [confirmClear, setConfirmClear] = useState(false);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onImport(file);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleResetClick = () => {
        if (confirmReset) {
            onReset();
            setConfirmReset(false);
        } else {
            setConfirmReset(true);
            setTimeout(() => setConfirmReset(false), 3000);
        }
    };

    const handleClearClick = () => {
        if (confirmClear) {
            onClearData();
            setConfirmClear(false);
        } else {
            setConfirmClear(true);
            setTimeout(() => setConfirmClear(false), 3000);
        }
    };

    const handleFixImageList = async () => {
        if (!confirm('这将根据现有记录重建图片引用列表，建议在同步前执行。是否继续？')) {
            return;
        }

        setIsCheckingImages(true);
        try {
            const list = await imageService.rebuildReferencedListFromLogs(logs);
            onToast('success', `图片列表重建完成，当前引用 ${list.length} 张图片`);
        } catch (error: any) {
            console.error('修复图片列表失败:', error);
            onToast('error', `修复失败: ${error.message}`);
        } finally {
            setIsCheckingImages(false);
        }
    };

    const handleCheckUnreferencedImages = async () => {
        setIsCheckingImages(true);
        setImageCleanupReport('');
        try {
            const report = await imageCleanupService.generateCleanupReport(logs);
            setImageCleanupReport(report);
            onToast('success', '检查完成');
        } catch (error: any) {
            console.error('检查未引用图片失败:', error);
            onToast('error', `检查失败: ${error.message}`);
        } finally {
            setIsCheckingImages(false);
        }
    };

    const handleCleanupImages = (confirm: boolean) => {
        if (!confirm) {
            setIsImageCleanupConfirmOpen(true);
            return;
        }
    };

    const handleConfirmImageCleanup = async () => {
        setIsImageCleanupConfirmOpen(false);
        setIsCleaningImages(true);
        try {
            const result = await imageCleanupService.cleanupUnreferencedImages(logs, {
                deleteLocal: true,
                deleteRemote: true // Assuming we want to sync delete
            });

            let message = `清理完成: 本地-${result.deletedLocal}, 远程-${result.deletedRemote}`;
            if (result.errors.length > 0) {
                message += `, 失败-${result.errors.length}`;
            }

            onToast('success', message);

            // Refresh report
            handleCheckUnreferencedImages();

        } catch (error: any) {
            console.error('清理图片失败:', error);
            onToast('error', `清理失败: ${error.message}`);
        } finally {
            setIsCleaningImages(false);
        }
    };
    const [isSyncing, setIsSyncing] = useState(false);

    // 图片清理相关状态
    const [isCheckingImages, setIsCheckingImages] = useState(false);
    const [isCleaningImages, setIsCleaningImages] = useState(false);
    const [imageCleanupReport, setImageCleanupReport] = useState<string>('');
    const [isImageCleanupConfirmOpen, setIsImageCleanupConfirmOpen] = useState(false);
    const [isCleaningBackups, setIsCleaningBackups] = useState(false);

    // Sync local user info when prop changes
    useEffect(() => {
        // We handle local user info state inside the specific submenu render to avoid conflicts
    }, [userPersonalInfo]);


    const isElectronEnvironment = () => {
        return typeof window !== 'undefined' && !!(window as any).ipcRenderer;
    };



    // Update Check State
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
    const [updateInfo, setUpdateInfo] = useState<VersionInfo | null>(null);
    const [showUpdateModal, setShowUpdateModal] = useState(false);

    // Donation Modal State
    const [showDonationModal, setShowDonationModal] = useState(false);




    // S3配置表单变化时自动保存到localStorage（作为草稿）
    useEffect(() => {
        if (s3ConfigForm.bucketName || s3ConfigForm.region || s3ConfigForm.secretId || s3ConfigForm.secretKey) {
            console.log('[SettingsView] 保存S3配置草稿到localStorage');
            localStorage.setItem('lumos_s3_draft_bucket', s3ConfigForm.bucketName);
            localStorage.setItem('lumos_s3_draft_region', s3ConfigForm.region);
            localStorage.setItem('lumos_s3_draft_secret_id', s3ConfigForm.secretId);
            localStorage.setItem('lumos_s3_draft_secret_key', s3ConfigForm.secretKey);
            localStorage.setItem('lumos_s3_draft_endpoint', s3ConfigForm.endpoint || '');
        }
    }, [s3ConfigForm]);

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
                const { granted } = await FocusNotification.checkFloatingPermission();
                if (granted) {
                    await FocusNotification.startFloatingWindow();
                    onToast('success', '悬浮球已开启');
                } else {
                    await FocusNotification.requestFloatingPermission();
                    // Permission result handling requires app resume usually, 
                    // but for simplicity we rely on user manually granting and retrying or plugin handling it.
                    // The plugin requestFloatingPermission typically opens settings.
                    onToast('info', '请在设置中授予悬浮窗权限');
                }
            } else {
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

    // 组件挂载时加载草稿配置
    useEffect(() => {
        // 如果没有正式配置，尝试加载草稿配置
        if (!s3Config) {
            const draftBucket = localStorage.getItem('lumos_s3_draft_bucket');
            const draftRegion = localStorage.getItem('lumos_s3_draft_region');
            const draftSecretId = localStorage.getItem('lumos_s3_draft_secret_id');
            const draftSecretKey = localStorage.getItem('lumos_s3_draft_secret_key');
            const draftEndpoint = localStorage.getItem('lumos_s3_draft_endpoint');

            if (draftBucket || draftRegion || draftSecretId || draftSecretKey) {
                console.log('[SettingsView] 加载S3配置草稿');
                setS3ConfigForm({
                    bucketName: draftBucket || '',
                    region: draftRegion || '',
                    secretId: draftSecretId || '',
                    secretKey: draftSecretKey || '',
                    endpoint: draftEndpoint || ''
                });
            }
        }
    }, [s3Config]);

    useEffect(() => {
        // 加载WebDAV配置
        const config = webdavService.getConfig();
        const manualWebdavDisconnect = localStorage.getItem('lumos_webdav_manual_disconnect');

        if (config) {
            setConfigForm(config);
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
                setS3ConfigForm(s3Config);
                console.log('[SettingsView] S3配置已加载到表单');
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
                    setS3ConfigForm(fallbackConfig);
                    if (manualS3Disconnect !== 'true') {
                        setS3Config(fallbackConfig);
                    }
                }
            }
        };

        // 立即尝试加载
        loadS3Config();

        // 如果第一次加载失败，延迟再试一次
        const timer = setTimeout(loadS3Config, 100);

        return () => clearTimeout(timer);
    }, []);

    const handleSaveConfig = async () => {
        if (!configForm.url) {
            onToast('error', 'Please enter a URL');
            return;
        }
        setIsSyncing(true);
        // Prepare config
        const config = { ...configForm };
        if (!config.url.startsWith('http')) {
            config.url = 'https://' + config.url;
        }

        // Test connection
        webdavService.saveConfig(config);
        localStorage.removeItem('lumos_webdav_manual_disconnect'); // Clear manual disconnect flag on intentional connect

        const success = await webdavService.checkConnection();

        if (success) {
            setWebdavConfig(config);
            onToast('success', 'WebDAV连接成功');
        } else {
            alert('连接失败，请检查 URL 和凭据。');
        }
        setIsSyncing(false);
    };

    const handleDisconnect = () => {
        // 只清理服务中的活跃连接，保留localStorage中的配置缓存
        webdavService.clearConfig();
        setWebdavConfig(null);
        localStorage.setItem('lumos_webdav_manual_disconnect', 'true');

        console.log('[SettingsView] WebDAV连接已断开，但保留配置缓存供下次使用');
        onToast('info', '已断开 WebDAV 服务器连接 (配置已保存)');
    };

    const handleSyncUpload = async () => {
        if (!webdavConfig) return;
        setIsSyncing(true);
        try {
            const localData = getFullLocalData();
            if (!localData.logs || !localData.todos) {
                console.error('[Settings] Critical: Logs or Todos are undefined in upload payload!', localData);
                alert('Error: Local data is seemingly empty (undefined). Upload aborted.');
                setIsSyncing(false);
                return;
            }
            const uploadTimestamp = Date.now();
            const dataToSync = {
                ...localData,
                timestamp: uploadTimestamp,
                version: '1.0.0'
            };
            await webdavService.uploadData(dataToSync);
            updateDataLastModified();
            onToast('success', '数据已成功上传至云端');
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
            // 0. Backup Local Data to Cloud
            try {
                const localData = getFullLocalData();
                if (!localData.logs || !localData.todos) {
                    console.error('[Settings] Critical: Logs or Todos are undefined in backup payload!', localData);
                    alert('Error: Local data is seemingly empty (undefined). Backup aborted to prevent overwriting cloud with empty data.');
                    setIsSyncing(false);
                    return;
                }
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const backupFilename = `backups/local_backup_${timestamp}.json`;
                onToast('info', `正在备份本地数据到 ${backupFilename}...`);
                await webdavService.uploadData(localData, backupFilename);
                onToast('success', '本地数据备份成功');
            } catch (backupError: any) {
                console.error('[Settings] Cloud backup failed:', backupError);
                if (!window.confirm(`云端备份失败: ${backupError.message || '未知错误'}. 是否继续还原? (警告: 当前本地数据将丢失)`)) {
                    setIsSyncing(false);
                    return;
                }
            }

            const data = await webdavService.downloadData();
            if (data) {
                onSyncUpdate(data);
                onToast('success', '从云端恢复数据成功');
                // 同步完成后关闭设置页面，自动刷新到脉络页面
                setTimeout(() => {
                    onClose();
                }, 1000); // 延迟1秒让用户看到成功提示
            }
        } catch (error) {
            console.error(error);
            onToast('error', '从云端下载数据失败');
        } finally {
            setIsSyncing(false);
        }
    };

    // S3 处理函数
    const handleS3SaveConfig = async () => {
        if (!s3ConfigForm.bucketName || !s3ConfigForm.region || !s3ConfigForm.secretId || !s3ConfigForm.secretKey) {
            onToast('error', '请填写所有必填项');
            return;
        }

        // 检查SecretId和SecretKey是否相同
        if (s3ConfigForm.secretId === s3ConfigForm.secretKey) {
            onToast('error', 'SecretId 和 SecretKey 不能相同！请输入正确的 SecretKey');
            return;
        }

        setIsSyncing(true);

        // 保存配置 (Trim whitespaces)
        const cleanConfig = {
            bucketName: s3ConfigForm.bucketName.trim(),
            region: s3ConfigForm.region.trim(),
            secretId: s3ConfigForm.secretId.trim(),
            secretKey: s3ConfigForm.secretKey.trim(),
            endpoint: s3ConfigForm.endpoint ? s3ConfigForm.endpoint.trim() : ''
        };
        s3Service.saveConfig(cleanConfig);

        // 测试连接
        const { success, message } = await s3Service.checkConnection();

        if (success) {
            setS3Config(s3ConfigForm);
            localStorage.removeItem('lumos_s3_manual_disconnect'); // Clear manual disconnect flag

            // 保存成功后清理草稿
            localStorage.removeItem('lumos_s3_draft_bucket');
            localStorage.removeItem('lumos_s3_draft_region');
            localStorage.removeItem('lumos_s3_draft_secret_id');
            localStorage.removeItem('lumos_s3_draft_secret_key');
            localStorage.removeItem('lumos_s3_draft_endpoint');
            console.log('[SettingsView] S3配置保存成功，清理草稿');
            onToast('success', '腾讯云 COS 连接成功');
        } else {
            s3Service.disconnect();
            onToast('error', message || 'COS 连接失败，请检查凭据');
        }
        setIsSyncing(false);
    };

    const handleS3Disconnect = () => {
        // 只清理服务中的活跃连接，保留localStorage中的配置缓存
        s3Service.disconnect();
        setS3Config(null);
        localStorage.setItem('lumos_s3_manual_disconnect', 'true');

        // Reload form from config (in case it was cleared from state but exists in localStorage)
        // Actually svService.disconnect doesn't clear localStorage, so we can just reload form from it next time or now.
        // We already have s3ConfigForm populated usually, but let's Ensure it.
        const s3Config = s3Service.getConfig();
        // Note: s3Service.disconnect() clears valid config instance, so getConfig() returns null.
        // But localStorage persists.
        // The form should stay as is.

        console.log('[SettingsView] S3连接已断开，但保留配置缓存供下次使用');
        onToast('info', '已断开与腾讯云 COS 的连接 (配置已保存)');
    };

    const handleS3SyncUpload = async () => {
        if (!s3Config) return;
        setIsSyncing(true);
        try {
            // 1. Upload main data
            const localData = getFullLocalData();
            if (!localData.logs || !localData.todos) {
                console.error('[Settings] Critical: Logs or Todos are undefined in upload payload!', localData);
                alert('Error: Local data is seemingly empty (undefined). Upload aborted.');
                setIsSyncing(false);
                return;
            }
            const uploadTimestamp = Date.now();
            const dataToSync = {
                ...localData,
                timestamp: uploadTimestamp,
                version: '1.0.0'
            };
            await s3Service.uploadData(dataToSync);
            updateDataLastModified();

            // 2. Sync images
            const localImageList = imageService.getReferencedImagesList();
            if (localImageList.length > 0) {
                console.log(`[Settings] 开始同步 ${localImageList.length} 张图片到 COS...`);
                const imageResult = await syncService.syncImages(
                    undefined, // no progress callback in settings
                    localImageList,
                    localImageList
                );

                if (imageResult.uploaded > 0 || imageResult.errors.length > 0) {
                    const message = imageResult.errors.length > 0
                        ? `数据已上传。图片: ${imageResult.uploaded} 张上传成功, ${imageResult.errors.length} 张失败`
                        : `数据及 ${imageResult.uploaded} 张图片已成功上传至 COS！`;
                    onToast(imageResult.errors.length > 0 ? 'warning' : 'success', message);
                } else {
                    onToast('success', '数据已成功上传至 COS！');
                }
            } else {
                onToast('success', '数据已成功上传至 COS！');
            }
        } catch (error: any) {
            console.error('S3 Upload Error:', error);
            onToast('error', `上传数据至 COS 失败: ${error.message || '未知错误'}`);
        } finally {
            setIsSyncing(false);
        }
    };

    const getFullLocalData = () => {
        const localData = {
            logs: ctxLogs,
            todos: ctxTodos,
            categories: ctxCategories,
            todoCategories: ctxTodoCategories,
            scopes: ctxScopes,
            goals: ctxGoals,
            autoLinkRules: ctxAutoLinkRules,
            reviewTemplates: ctxReviewTemplates,
            dailyReviews: ctxDailyReviews,
            weeklyReviews: ctxWeeklyReviews,
            monthlyReviews: ctxMonthlyReviews,
            customNarrativeTemplates: ctxCustomNarrativeTemplates,
            userPersonalInfo: ctxUserPersonalInfo,
            filters: ctxFilters,
            version: '1.0.0',
            timestamp: Date.now()
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
            // 0. Backup Local Data to Cloud
            try {
                const localData = getFullLocalData();
                if (!localData.logs || !localData.todos) {
                    console.error('[Settings] Critical: Logs or Todos are undefined in backup payload!', localData);
                    alert('错误：本地数据似乎为空 (undefined)。已中止备份以防止用空数据覆盖云端。');
                    setIsSyncing(false);
                    return;
                }
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const backupFilename = `backups/local_backup_${timestamp}.json`;
                onToast('info', `正在备份本地数据到 ${backupFilename}...`);
                await s3Service.uploadData(localData, backupFilename);
                onToast('success', '本地数据备份成功');
            } catch (backupError: any) {
                console.error('[Settings] Cloud backup failed:', backupError);
                if (!window.confirm(`云端备份失败：${backupError.message || '未知错误'}. 是否继续还原？(警告：当前本地数据将丢失)`)) {
                    setIsSyncing(false);
                    return;
                }
            }

            // 1. Download main data
            const data = await s3Service.downloadData();
            if (data) {
                onSyncUpdate(data);

                // 2. Sync images after data is updated
                try {
                    // Get image list from downloaded data
                    const cloudImageData = await s3Service.downloadImageList();
                    const cloudImageList = cloudImageData?.images || [];
                    const localImageList = imageService.getReferencedImagesList();

                    // Merge and update local image list
                    const mergedImageList = Array.from(new Set([...localImageList, ...cloudImageList]));
                    if (mergedImageList.length > 0) {
                        imageService.updateReferencedImagesList(mergedImageList);

                        console.log(`[Settings] 开始从 COS 同步 ${mergedImageList.length} 张图片...`);
                        const imageResult = await syncService.syncImages(
                            undefined, // no progress callback in settings
                            localImageList,
                            [] // [Fix] Don't assume cloud has these images. Pass empty to force check/upload.
                        );

                        if (imageResult.downloaded > 0 || imageResult.errors.length > 0) {
                            const message = imageResult.errors.length > 0
                                ? `数据已还原。图片: ${imageResult.downloaded} 张下载成功，${imageResult.errors.length} 张失败`
                                : `数据及 ${imageResult.downloaded} 张图片已成功从 COS 还原！`;
                            onToast(imageResult.errors.length > 0 ? 'warning' : 'success', message);
                        } else {
                            onToast('success', '从 COS 恢复数据成功！');
                        }
                    } else {
                        onToast('success', '从 COS 恢复数据成功！');
                    }
                } catch (imageError) {
                    console.warn('[Settings] 图片同步失败:', imageError);
                    onToast('warning', '数据已恢复，但图片同步失败');
                }
            }
        } catch (error) {
            console.error(error);
            onToast('error', '从 COS 下载数据失败');
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

        onSyncUpdate({
            ...syncData,
            logs: newLogs
        });
        onToast('success', 'Generated 50 demo logs');
        onSyncUpdate({
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
        const webdavConfig = webdavService.getConfig();
        const s3Config = s3Service.getConfig();
        const activeService = s3Config ? s3Service : (webdavConfig ? webdavService : null);

        if (!activeService) {
            onToast('error', '未连接云端服务 (WebDAV 或 S3)');
            return;
        }

        if (!confirm('确定要清理云端备份吗？\n\n这将检查 "backups" 文件夹，只保留最新的一个备份文件，其余的将被永久删除。\n此操作不可撤销。')) {
            return;
        }

        setIsCleaningBackups(true);
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
                setIsCleaningBackups(false);
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
                setIsCleaningBackups(false);
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
            setIsCleaningBackups(false);
        }
    };



    // Filters子页面
    if (activeSubmenu === 'memoir_filter') {
        return <MemoirSettingsView onBack={() => setActiveSubmenu('main')} />;
    }

    if (activeSubmenu === 'filters') {
        return (
            <FiltersSettingsView
                onBack={() => setActiveSubmenu('main')}
                onToast={onToast}
                filters={filters}
                onUpdateFilters={(newFilters) => onUpdateFilters?.(newFilters)}
                logs={logs}
                categories={categoriesData || []}
                scopes={scopes || []}
                todos={todos || []}
                todoCategories={todoCategories || []}
                onEditLog={onEditLog}
            />
        );
    }

    if (activeSubmenu === 'check_templates') {
        return (
            <CheckTemplateManageView
                templates={checkTemplates}
                onUpdateTemplates={(newTemplates) => onUpdateCheckTemplates?.(newTemplates)}
                dailyReviews={dailyReviews}
                onBatchUpdateDailyReviewItems={onUpdateDailyReviews || (() => { })}
                onBack={() => setActiveSubmenu('main')}
            />
        );
    }

    if (activeSubmenu === 'ai') {
        return <AISettingsView onBack={() => setActiveSubmenu('main')} onToast={onToast} />;
    }

    if (activeSubmenu === 'cloud') {
        return (
            <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
                <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0">
                    <button
                        onClick={() => setActiveSubmenu('main')}
                        className="text-stone-400 hover:text-stone-600 p-1"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <span className="text-stone-800 font-bold text-lg">WebDAV Sync</span>
                </div>

                <div className="p-4 space-y-4 overflow-y-auto pb-40">
                    <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-3 text-stone-600 mb-2">
                            <Server size={24} />
                            <h3 className="font-bold text-lg">WebDAV Server</h3>
                        </div>

                        {webdavConfig ? (
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 p-3 bg-green-50 text-green-700 rounded-xl border border-green-100">
                                    <CheckCircle2 size={20} className="shrink-0" />
                                    <div className="overflow-hidden">
                                        <p className="font-medium truncate">{webdavConfig.url}</p>
                                        <p className="text-xs opacity-80">User: {webdavConfig.username}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={handleSyncUpload}
                                        disabled={isSyncing}
                                        className="flex flex-col items-center justify-center gap-2 py-4 bg-stone-800 text-white rounded-xl font-medium active:scale-[0.98] transition-transform disabled:opacity-70"
                                    >
                                        <Upload size={20} className={isSyncing ? "animate-pulse" : ""} />
                                        <span>Upload to Cloud</span>
                                    </button>

                                    <button
                                        onClick={handleSyncDownload}
                                        disabled={isSyncing}
                                        className="flex flex-col items-center justify-center gap-2 py-4 bg-white border border-stone-200 text-stone-700 rounded-xl font-medium active:scale-[0.98] transition-transform hover:bg-stone-50 disabled:opacity-70"
                                    >
                                        <Download size={20} className={isSyncing ? "animate-pulse" : ""} />
                                        <span>Restore from Cloud</span>
                                    </button>
                                </div>

                                <div className="pt-4 border-t border-stone-100">
                                    <button
                                        onClick={handleDisconnect}
                                        className="flex items-center justify-center gap-2 w-full py-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm"
                                    >
                                        <LogOut size={16} />
                                        Disconnect
                                    </button>

                                    {/* 完全清理配置按钮 */}
                                    <button
                                        onClick={() => {
                                            if (confirm('确定要完全清理WebDAV配置吗？这将删除所有保存的配置信息，下次需要重新输入。')) {
                                                webdavService.clearAllConfig();
                                                setWebdavConfig(null);
                                                setConfigForm({ url: '', username: '', password: '' });
                                                console.log('[SettingsView] WebDAV配置已完全清理');
                                                onToast('info', 'WebDAV configuration completely cleared');
                                            }
                                        }}
                                        className="flex items-center justify-center gap-2 w-full py-2 mt-1 text-red-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors text-xs"
                                    >
                                        <Trash2 size={14} />
                                        完全清理配置
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="text-sm text-stone-500 leading-relaxed space-y-2">
                                    <p>Connect to any WebDAV compatible storage (e.g., Nextcloud, Nutstore).</p>
                                    <div className="bg-blue-50 text-blue-700 p-3 rounded-xl text-xs space-y-1">
                                        <p className="font-bold">⚠️ 配置说明：</p>
                                        <p>1. 请在网盘根目录新建 <b>Lumostime</b> 文件夹。</p>
                                        <p>2. 在 Lumostime 文件夹内新建 <b>backups</b> 和 <b>images</b> 两个子文件夹。</p>
                                        <p>3. 下方 URL 请填写到 Lumostime 文件夹层级。</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-bold text-stone-400 uppercase ml-1">Server URL</label>
                                        <div className="flex items-center gap-2 bg-stone-50 px-3 py-2 rounded-xl mt-1 focus-within:ring-2 focus-within:ring-stone-200 transition-all">
                                            <Globe size={18} className="text-stone-400" />
                                            <input
                                                type="text"
                                                placeholder="https://dav.jianguoyun.com/dav/Lumostime"
                                                className="flex-1 bg-transparent border-none outline-none text-stone-700 placeholder:text-stone-300 text-sm"
                                                value={configForm.url}
                                                onChange={e => setConfigForm(prev => ({ ...prev, url: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-stone-400 uppercase ml-1">Username</label>
                                        <div className="flex items-center gap-2 bg-stone-50 px-3 py-2 rounded-xl mt-1 focus-within:ring-2 focus-within:ring-stone-200 transition-all">
                                            <User size={18} className="text-stone-400" />
                                            <input
                                                type="text"
                                                placeholder="Username"
                                                className="flex-1 bg-transparent border-none outline-none text-stone-700 placeholder:text-stone-300 text-sm"
                                                value={configForm.username}
                                                onChange={e => setConfigForm(prev => ({ ...prev, username: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-stone-400 uppercase ml-1">Password</label>
                                        <div className="flex items-center gap-2 bg-stone-50 px-3 py-2 rounded-xl mt-1 focus-within:ring-2 focus-within:ring-stone-200 transition-all">
                                            {/* Mock password icon/lock */}
                                            <div className="w-[18px] flex justify-center"><Server size={14} className="text-stone-400" /></div>
                                            <input
                                                type="password"
                                                placeholder="Password / App Token"
                                                className="flex-1 bg-transparent border-none outline-none text-stone-700 placeholder:text-stone-300 text-sm"
                                                value={configForm.password}
                                                onChange={e => setConfigForm(prev => ({ ...prev, password: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <button
                                        onClick={handleSaveConfig}
                                        disabled={isSyncing}
                                        className="flex items-center justify-center gap-2 w-full py-3 bg-stone-800 text-white rounded-xl font-medium active:scale-[0.98] transition-transform shadow-lg shadow-stone-200 disabled:opacity-70"
                                    >
                                        {isSyncing ? (
                                            <RefreshCw size={18} className="animate-spin" />
                                        ) : (
                                            <Save size={18} />
                                        )}
                                        {isSyncing ? "Connecting..." : "Save & Connect"}
                                    </button>
                                    <p className="text-[10px] text-center text-stone-400 mt-3">
                                        Your credentials are stored locally on your device.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (activeSubmenu === 's3') {
        return (
            <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
                <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0">
                    <button
                        onClick={() => setActiveSubmenu('main')}
                        className="text-stone-400 hover:text-stone-600 p-1"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <span className="text-stone-800 font-bold text-lg">S3 Sync</span>
                </div>

                <div className="p-4 space-y-4 overflow-y-auto pb-40">
                    <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-3 text-stone-600 mb-2">
                            <Cloud size={24} />
                            <h3 className="font-bold text-lg">Tencent Cloud COS</h3>
                        </div>

                        {s3Config ? (
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 p-3 bg-green-50 text-green-700 rounded-xl border border-green-100">
                                    <CheckCircle2 size={20} className="shrink-0" />
                                    <div className="overflow-hidden">
                                        <p className="font-medium truncate">{s3Config.bucketName}</p>
                                        <p className="text-xs opacity-80">Region: {s3Config.region}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={handleS3SyncUpload}
                                        disabled={isSyncing}
                                        className="flex flex-col items-center justify-center gap-2 py-4 bg-stone-800 text-white rounded-xl font-medium active:scale-[0.98] transition-transform disabled:opacity-70"
                                    >
                                        <Upload size={20} className={isSyncing ? "animate-pulse" : ""} />
                                        <span>Upload to COS</span>
                                    </button>

                                    <button
                                        onClick={handleS3SyncDownload}
                                        disabled={isSyncing}
                                        className="flex flex-col items-center justify-center gap-2 py-4 bg-white border border-stone-200 text-stone-700 rounded-xl font-medium active:scale-[0.98] transition-transform hover:bg-stone-50 disabled:opacity-70"
                                    >
                                        <Download size={20} className={isSyncing ? "animate-pulse" : ""} />
                                        <span>Restore from COS</span>
                                    </button>
                                </div>

                                <div className="pt-4 border-t border-stone-100">
                                    <button
                                        onClick={handleS3Disconnect}
                                        className="flex items-center justify-center gap-2 w-full py-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm"
                                    >
                                        <LogOut size={16} />
                                        Disconnect
                                    </button>

                                    {/* 完全清理配置按钮 */}
                                    <button
                                        onClick={() => {
                                            if (confirm('确定要完全清理S3配置吗？这将删除所有保存的配置信息，下次需要重新输入。')) {
                                                s3Service.clearStorage();
                                                setS3Config(null);
                                                setS3ConfigForm({ bucketName: '', region: '', secretId: '', secretKey: '', endpoint: '' });
                                                // 同时清理草稿
                                                localStorage.removeItem('lumos_s3_draft_bucket');
                                                localStorage.removeItem('lumos_s3_draft_region');
                                                localStorage.removeItem('lumos_s3_draft_secret_id');
                                                localStorage.removeItem('lumos_s3_draft_secret_key');
                                                localStorage.removeItem('lumos_s3_draft_endpoint');
                                                console.log('[SettingsView] S3配置已完全清理');
                                                onToast('info', 'S3 configuration completely cleared');
                                            }
                                        }}
                                        className="flex items-center justify-center gap-2 w-full py-2 mt-1 text-red-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors text-xs"
                                    >
                                        <Trash2 size={14} />
                                        完全清理配置
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm text-stone-500 leading-relaxed">
                                    Connect to Tencent Cloud COS to sync your data securely.
                                </p>



                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-bold text-stone-400 uppercase ml-1">Bucket Name</label>
                                        <div className="flex items-center gap-2 bg-stone-50 px-3 py-2 rounded-xl mt-1 focus-within:ring-2 focus-within:ring-stone-200 transition-all">
                                            <Database size={18} className="text-stone-400" />
                                            <input
                                                type="text"
                                                placeholder="your-bucket-name-1250000000"
                                                className="flex-1 bg-transparent border-none outline-none text-stone-700 placeholder:text-stone-300 text-sm"
                                                value={s3ConfigForm.bucketName}
                                                onChange={e => setS3ConfigForm(prev => ({ ...prev, bucketName: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-stone-400 uppercase ml-1">Region</label>
                                        <div className="flex items-center gap-2 bg-stone-50 px-3 py-2 rounded-xl mt-1 focus-within:ring-2 focus-within:ring-stone-200 transition-all">
                                            <Globe size={18} className="text-stone-400" />
                                            <input
                                                type="text"
                                                placeholder="ap-beijing"
                                                className="flex-1 bg-transparent border-none outline-none text-stone-700 placeholder:text-stone-300 text-sm"
                                                value={s3ConfigForm.region}
                                                onChange={e => setS3ConfigForm(prev => ({ ...prev, region: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-stone-400 uppercase ml-1">SecretId (Access Key ID)</label>
                                        <div className="flex items-center gap-2 bg-stone-50 px-3 py-2 rounded-xl mt-1 focus-within:ring-2 focus-within:ring-stone-200 transition-all">
                                            <User size={18} className="text-stone-400" />
                                            <input
                                                type="text"
                                                placeholder="请输入 SecretId"
                                                className="flex-1 bg-transparent border-none outline-none text-stone-700 placeholder:text-stone-300 text-sm"
                                                value={s3ConfigForm.secretId}
                                                onChange={e => setS3ConfigForm(prev => ({ ...prev, secretId: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-stone-400 uppercase ml-1">SecretKey (Secret Access Key)</label>
                                        <div className="flex items-center gap-2 bg-stone-50 px-3 py-2 rounded-xl mt-1 focus-within:ring-2 focus-within:ring-stone-200 transition-all">
                                            <div className="w-[18px] flex justify-center"><Server size={14} className="text-stone-400" /></div>
                                            <input
                                                type="password"
                                                placeholder="请输入 SecretKey"
                                                className="flex-1 bg-transparent border-none outline-none text-stone-700 placeholder:text-stone-300 text-sm"
                                                value={s3ConfigForm.secretKey}
                                                onChange={e => setS3ConfigForm(prev => ({ ...prev, secretKey: e.target.value }))}
                                            />
                                        </div>
                                        {s3ConfigForm.secretId && s3ConfigForm.secretKey &&
                                            s3ConfigForm.secretId === s3ConfigForm.secretKey && (
                                                <p className="text-xs text-red-500 mt-1 ml-1">
                                                    ⚠️ SecretId和SecretKey不能相同！请输入不同的SecretKey
                                                </p>
                                            )}
                                    </div>


                                </div>

                                <div className="pt-2">
                                    <button
                                        onClick={handleS3SaveConfig}
                                        disabled={isSyncing}
                                        className="flex items-center justify-center gap-2 w-full py-3 bg-stone-800 text-white rounded-xl font-medium active:scale-[0.98] transition-transform shadow-lg shadow-stone-200 disabled:opacity-70"
                                    >
                                        {isSyncing ? (
                                            <RefreshCw size={18} className="animate-spin" />
                                        ) : (
                                            <Save size={18} />
                                        )}
                                        {isSyncing ? "Connecting..." : "Save & Connect"}
                                    </button>



                                    {/* 清理草稿按钮 */}
                                    {(s3ConfigForm.bucketName || s3ConfigForm.region || s3ConfigForm.secretId || s3ConfigForm.secretKey) && !s3Config && (
                                        <button
                                            onClick={() => {
                                                setS3ConfigForm({ bucketName: '', region: '', secretId: '', secretKey: '', endpoint: '' });
                                                localStorage.removeItem('lumos_s3_draft_bucket');
                                                localStorage.removeItem('lumos_s3_draft_region');
                                                localStorage.removeItem('lumos_s3_draft_secret_id');
                                                localStorage.removeItem('lumos_s3_draft_secret_key');
                                                localStorage.removeItem('lumos_s3_draft_endpoint');
                                                console.log('[SettingsView] 手动清理S3配置草稿');
                                                onToast('info', '已清理配置草稿');
                                            }}
                                            className="flex items-center justify-center gap-2 w-full py-2 mt-1 text-stone-500 hover:text-stone-600 hover:bg-stone-50 rounded-lg transition-colors text-xs"
                                        >
                                            <Trash2 size={14} />
                                            清理草稿
                                        </button>
                                    )}

                                    <p className="text-[10px] text-center text-stone-400 mt-3">
                                        Your credentials are stored locally on your device.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }



    const { categories } = syncData;

    if (activeSubmenu === 'auto_record') {
        return <AutoRecordSettingsView
            onBack={() => setActiveSubmenu('main')}
            categories={categories || []}
        />;
    }

    if (activeSubmenu === 'obsidian_export') {
        // 获取当天的 dailyReview
        const dateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
        const todayReview = dailyReviews.find(r => r.date === dateStr);

        return <ObsidianExportView
            onBack={() => setActiveSubmenu('main')}
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
        />;
    }

    if (activeSubmenu === 'data') {
        return (
            <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
                <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0">
                    <button
                        onClick={() => setActiveSubmenu('main')}
                        className="text-stone-400 hover:text-stone-600 p-1"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <span className="text-stone-800 font-bold text-lg">数据导出导入</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-40">
                    <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-3 text-stone-600 mb-2">
                            <Database size={24} />
                            <h3 className="font-bold text-lg">备份与恢复</h3>
                        </div>
                        <p className="text-sm text-stone-500 mb-4 leading-relaxed">
                            将您的所有数据（时间记录、待办事项、分类设置等）导出为 JSON 文件，或从备份文件中恢复数据。
                        </p>

                        <div className="grid grid-cols-1 gap-3">
                            <button
                                onClick={onExport}
                                className="flex items-center justify-center gap-2 w-full py-3 bg-stone-800 text-white rounded-xl font-medium active:scale-[0.98] transition-transform"
                            >
                                <Download size={18} />
                                导出数据备份
                            </button>

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center justify-center gap-2 w-full py-3 bg-white border border-stone-200 text-stone-700 rounded-xl font-medium active:scale-[0.98] transition-transform hover:bg-stone-50"
                            >
                                <Upload size={18} />
                                导入数据备份
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".json"
                                className="hidden"
                            />
                        </div>

                        <div className="pt-6 mt-2 border-t border-stone-100">
                            <button
                                onClick={handleResetClick}
                                className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium active:scale-[0.98] transition-all ${confirmReset
                                    ? 'bg-red-500 text-white shadow-lg shadow-red-200'
                                    : 'bg-stone-50 text-stone-400 hover:bg-red-50 hover:text-red-400'
                                    }`}
                            >
                                <Trash2 size={18} />
                                {confirmReset ? "确认重置？此操作不可撤销" : "重置所有数据为默认值"}
                            </button>

                            <button
                                onClick={handleClearClick}
                                className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium active:scale-[0.98] transition-all mt-3 ${confirmClear
                                    ? 'bg-red-600 text-white shadow-lg shadow-red-200'
                                    : 'bg-white border border-red-200 text-red-500 hover:bg-red-50'
                                    }`}
                            >
                                <Trash2 size={18} />
                                {confirmClear ? "确认清空？将被永久删除" : "清空所有数据"}
                            </button>
                        </div>
                    </div>


                    {/* 云端备份清理卡片 */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-3 text-stone-600 mb-2">
                            <Cloud size={24} />
                            <h3 className="font-bold text-lg">云端备份清理</h3>
                        </div>
                        <p className="text-sm text-stone-500 mb-4 leading-relaxed">
                            检查云端存储（WebDAV/S3）的 backups 文件夹，保留最新的一个备份，清理所有旧备份以节省空间。
                        </p>

                        <button
                            onClick={handleCleanupCloudBackups}
                            disabled={isCleaningBackups}
                            className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium active:scale-[0.98] transition-transform ${isCleaningBackups
                                ? 'bg-stone-400 text-white cursor-not-allowed'
                                : 'bg-white border border-stone-200 text-stone-800 hover:bg-stone-50'
                                }`}
                        >
                            {isCleaningBackups ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    清理中...
                                </>
                            ) : (
                                <>
                                    <Trash2 size={18} />
                                    清理旧备份（只保留最新）
                                </>
                            )}
                        </button>
                    </div>

                    {/* Excel导出卡片 */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-3 text-stone-600 mb-2">
                            <FileSpreadsheet size={24} />
                            <h3 className="font-bold text-lg">导出为xlsx</h3>
                        </div>
                        <p className="text-sm text-stone-500 mb-4 leading-relaxed">
                            选择日期范围并导出时间记录到Excel文件
                        </p>

                        <ExcelExportCardContent
                            logs={logs}
                            categories={categories || []}
                            todos={todos}
                            scopes={scopes}
                            onToast={onToast}
                            todoCategories={todoCategories}
                        />
                    </div>

                    {/* 图片清理卡片 */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-3 text-stone-800 mb-2">
                            <ImageIcon size={24} />
                            <h3 className="font-bold text-lg">图片管理</h3>
                        </div>
                        <p className="text-sm text-stone-500 mb-4 leading-relaxed">
                            检查并清理未被专注记录引用的图片，释放存储空间
                        </p>

                        <div className="grid grid-cols-1 gap-3">
                            <button
                                onClick={handleFixImageList}
                                disabled={isCheckingImages}
                                className="flex items-center justify-center gap-2 w-full py-3 bg-blue-500 text-white rounded-xl font-medium active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600"
                            >
                                {isCheckingImages ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        修复中...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw size={18} />
                                        修复图片列表
                                    </>
                                )}
                            </button>

                            <button
                                onClick={handleCheckUnreferencedImages}
                                disabled={isCheckingImages}
                                className="flex items-center justify-center gap-2 w-full py-3 bg-white border border-stone-200 text-stone-800 rounded-xl font-medium active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed hover:bg-stone-50"
                            >
                                {isCheckingImages ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                                        检查中...
                                    </>
                                ) : (
                                    <>
                                        <Search size={18} />
                                        检查未引用图片
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => handleCleanupImages(false)}
                                disabled={isCleaningImages}
                                className="flex items-center justify-center gap-2 w-full py-3 bg-white border border-stone-200 text-stone-800 rounded-xl font-medium active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed hover:bg-stone-50"
                            >
                                {isCleaningImages ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                                        清理中...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={18} />
                                        执行清理（删除图片）
                                    </>
                                )}
                            </button>
                        </div>

                        {/* 显示清理报告 */}
                        {imageCleanupReport && (
                            <div className="mt-4 p-4 bg-stone-50 rounded-xl">
                                <h4 className="font-medium text-stone-700 mb-2">清理报告</h4>
                                <div className="text-sm text-stone-600 whitespace-pre-line max-h-40 overflow-y-auto">
                                    {imageCleanupReport}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 图片清理确认模态框 */}
                <ConfirmModal
                    isOpen={isImageCleanupConfirmOpen}
                    onClose={() => setIsImageCleanupConfirmOpen(false)}
                    onConfirm={handleConfirmImageCleanup}
                    title="确认删除图片"
                    description="确定要删除所有未引用的图片吗？此操作将同时删除本地和远程图片，且无法撤销！"
                    confirmText="删除"
                    cancelText="取消"
                    type="danger"
                />
            </div >
        );
    }

    if (activeSubmenu === 'preferences') {
        return (
            <PreferencesSettingsView
                onBack={() => setActiveSubmenu('main')}
                onToast={onToast}
                startWeekOnSunday={startWeekOnSunday}
                onToggleStartWeekOnSunday={onToggleStartWeekOnSunday}
                dailyReviewTime={dailyReviewTime}
                onSetDailyReviewTime={onSetDailyReviewTime}
                weeklyReviewTime={weeklyReviewTime}
                onSetWeeklyReviewTime={onSetWeeklyReviewTime}
                monthlyReviewTime={monthlyReviewTime}
                onSetMonthlyReviewTime={onSetMonthlyReviewTime}
                autoFocusNote={autoFocusNote}
                onToggleAutoFocusNote={onToggleAutoFocusNote}
                minIdleTimeThreshold={minIdleTimeThreshold}
                onSetMinIdleTimeThreshold={onSetMinIdleTimeThreshold}
                defaultView={defaultView}
                onSetDefaultView={onSetDefaultView}
                defaultArchiveView={defaultArchiveView}
                onSetDefaultArchiveView={onSetDefaultArchiveView}
                defaultIndexView={defaultIndexView}
                onSetDefaultIndexView={onSetDefaultIndexView}
            />
        );
    }

    if (activeSubmenu === 'guide') {
        return <UserGuideView onBack={() => setActiveSubmenu('main')} />;
    }

    if (activeSubmenu === 'nfc') {
        return (
            <NFCSettingsView
                onBack={() => setActiveSubmenu('main')}
                onToast={onToast}
                categories={syncData.categories || []}
            />
        );
    }

    if (activeSubmenu === 'narrative_prompt') {
        return (
            <NarrativeSettingsView
                onBack={() => setActiveSubmenu('main')}
                onToast={onToast}
                userPersonalInfo={userPersonalInfo}
                onSetUserPersonalInfo={onSetUserPersonalInfo}
                customNarrativeTemplates={customNarrativeTemplates}
                onUpdateCustomNarrativeTemplates={onUpdateCustomNarrativeTemplates}
            />
        );
    }

    if (activeSubmenu === 'templates') {
        return (
            <ReviewTemplateManageView
                templates={reviewTemplates}
                onUpdateTemplates={(newTemplates) => {
                    onUpdateReviewTemplates?.(newTemplates);
                    // Also update syncData if connected to ensure changes sync
                    if (webdavConfig) {
                        onSyncUpdate({ ...syncData, reviewTemplates: newTemplates });
                    }
                }}
                onBack={() => setActiveSubmenu('main')}
            />
        );
    }

    if (activeSubmenu === 'autolink') {
        return (
            <AutoLinkView
                onClose={() => setActiveSubmenu('main')}
                rules={syncData.autoLinkRules || []}
                onUpdateRules={(rules) => {
                    onSyncUpdate({ ...syncData, autoLinkRules: rules });
                }}
                categories={syncData.categories || []}
                scopes={syncData.scopes || []}
            />
        );
    }

    if (activeSubmenu === 'batch_manage') {
        return (
            <BatchFocusRecordManageView
                onBack={() => setActiveSubmenu('main')}
                logs={logs}
                onUpdateLogs={(updatedLogs) => {
                    onSyncUpdate({ ...syncData, logs: updatedLogs });
                }}
                categories={categoriesData || []}
                scopes={scopes || []}
                todos={todos || []}
                todoCategories={todoCategories || []}
                onToast={onToast}
            />
        );
    }

    if (activeSubmenu === 'sponsorship_preview') {
        return <SponsorshipView onBack={() => setActiveSubmenu('main')} onToast={onToast} />;
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

            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-40">

                {/* Section: General */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider pl-2">通用</h3>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                        <MenuItem
                            icon={<Search size={18} className="text-green-500" />}
                            label="搜索全部"
                            onClick={() => {
                                onOpenSearch?.();
                            }}
                        />
                        <MenuItem
                            icon={<Hash size={18} className="text-amber-500" />}
                            label="自定义筛选器"
                            onClick={() => setActiveSubmenu('filters')}
                        />
                        <MenuItem
                            icon={<Sparkles size={18} className="text-purple-500" />}
                            label="AI API"
                            onClick={() => setActiveSubmenu('ai')}
                        />
                        <MenuItem
                            icon={<Link size={18} className="text-blue-500" />}
                            label="标签关联领域规则"
                            onClick={() => setActiveSubmenu('autolink')}
                        />
                        <MenuItem
                            icon={<Nfc size={18} className="text-orange-500" />}
                            label="NFC Tags"
                            onClick={() => setActiveSubmenu('nfc')}
                        />
                        <MenuItem
                            icon={<AlignLeft size={18} className="text-purple-500" />}
                            label="Memoir 筛选条件"
                            onClick={() => setActiveSubmenu('memoir_filter')}
                        />
                        <MenuItem
                            icon={<Settings size={18} />}
                            label="偏好设置"
                            isLast
                            onClick={() => setActiveSubmenu('preferences')}
                        />
                    </div>
                </div>
                {/* Section: Android Features */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider pl-2">Android 特性</h3>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                        <MenuItem
                            icon={<Smartphone size={18} className="text-indigo-500" />}
                            label="应用关联标签规则"
                            onClick={() => setActiveSubmenu('auto_record')}
                        />
                        <ToggleItem
                            icon={<SquareActivity size={18} className="text-teal-500" />}
                            label="开启悬浮球"
                            checked={floatingWindowEnabled}
                            onChange={handleToggleFloatingWindow}
                            isLast
                        />
                    </div>
                </div>
                {/* Section: Daily Review */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider pl-2">每日回顾</h3>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                        <MenuItem
                            icon={<FileText size={18} className="text-orange-500" />}
                            label="回顾模板"
                            onClick={() => setActiveSubmenu('templates')}
                        />
                        <MenuItem
                            icon={<CheckCircle2 size={18} className="text-green-500" />}
                            label="日课模板"
                            onClick={() => setActiveSubmenu('check_templates')}
                        />
                        <MenuItem
                            icon={<MessageSquare size={18} className="text-purple-500" />}
                            label="AI 叙事设定"
                            isLast
                            onClick={() => setActiveSubmenu('narrative_prompt')}
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
                            onClick={() => setActiveSubmenu('batch_manage')}
                        />
                        <MenuItem
                            icon={<Cloud size={18} />}
                            label="WebDAV 云同步"
                            onClick={() => setActiveSubmenu('cloud')}
                        />
                        <MenuItem
                            icon={<Database size={18} className="text-orange-500" />}
                            label="S3 云同步"
                            onClick={() => setActiveSubmenu('s3')}
                        />
                        <MenuItem
                            icon={<Database size={18} />}
                            label="数据导出导入 (包含重置)"
                            isLast={!isElectronEnvironment()}
                            onClick={() => setActiveSubmenu('data')}
                        />
                        {isElectronEnvironment() && (
                            <MenuItem
                                icon={<FileText size={18} className="text-indigo-500" />}
                                label="导出到 Obsidian"
                                isLast
                                onClick={() => setActiveSubmenu('obsidian_export')}
                            />
                        )}
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
                            onClick={() => setActiveSubmenu('guide')}
                        />
                        <MenuItem
                            icon={<Coffee size={18} className="text-amber-600" />}
                            label="请我喝杯咖啡 ☕"
                            onClick={() => setShowDonationModal(true)}
                        />
                        <MenuItem
                            icon={<Coffee size={18} className="text-pink-500" />}
                            label="这里还在开发中 (Preview)"
                            isLast
                            onClick={() => setActiveSubmenu('sponsorship_preview')}
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
                                        <div className="bg-stone-50 rounded-xl p-4">
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

            {/* Donation Modal - 赞赏码模态框 */}
            {showDonationModal && (
                <div
                    className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
                    onClick={() => setShowDonationModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 space-y-4">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                                        <Coffee size={24} className="text-amber-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-stone-800">感谢支持</h3>
                                        <p className="text-sm text-stone-500">您的支持是我最大的动力</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowDonationModal(false)}
                                    className="p-1 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* QR Code Image */}
                            <div className="flex justify-center">
                                <div className="bg-stone-50 p-4 rounded-2xl">
                                    <img
                                        src="/assets/buy me a coffee.jpg"
                                        alt="赞赏码"
                                        className="w-64 h-64 object-contain rounded-xl"
                                    />
                                </div>
                            </div>

                            {/* Footer Message */}
                            <div className="text-center space-y-2">
                                <p className="text-sm text-stone-600">扫码支持开发者</p>
                            </div>

                            {/* Close Button */}
                            <button
                                onClick={() => setShowDonationModal(false)}
                                className="w-full py-3 px-4 text-sm font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
                            >
                                关闭
                            </button>
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
