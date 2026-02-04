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
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
import { getFilterStats } from '../utils/filterUtils';
import { FilterDetailView } from './FilterDetailView';
import { MemoirSettingsView } from './MemoirSettingsView';
import excelExportService from '../services/excelExportService';
import { imageCleanupService } from '../services/imageCleanupService';
import { BatchFocusRecordManageView } from './BatchFocusRecordManageView';
import { usePrivacy } from '../contexts/PrivacyContext';
import { RedemptionService } from '../services/redemptionService';

import { NARRATIVE_TEMPLATES } from '../constants';
// @ts-ignore
import userGuideContent from '../../USER_GUIDE.md?raw';

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

const SponsorshipPreviewView: React.FC<{ onBack: () => void, onToast: (type: ToastType, message: string) => void }> = ({ onBack, onToast }) => {
    const [redemptionCode, setRedemptionCode] = useState('');
    const [isRedeemed, setIsRedeemed] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [supporterId, setSupporterId] = useState<number | undefined>(undefined);
    const redemptionService = new RedemptionService();

    useEffect(() => {
        const checkVerification = async () => {
            const result = await redemptionService.isVerified();
            if (result.isVerified && result.userId) {
                setIsRedeemed(true);
                setSupporterId(result.userId);
            }
        };
        checkVerification();
    }, []);

    const handleRedeem = async () => {
        if (!redemptionCode.trim()) {
            onToast('error', '请输入兑换码');
            return;
        }

        setIsVerifying(true);
        try {
            const result = await redemptionService.verifyCode(redemptionCode);
            if (result.success) {
                redemptionService.saveCode(redemptionCode, result.supporterId);
                setIsRedeemed(true);
                setSupporterId(result.supporterId);
                onToast('success', '验证成功！');
            } else {
                onToast('error', result.error || '兑换码无效');
            }
        } catch (error) {
            onToast('error', '验证失败，请重试');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleClearCode = () => {
        redemptionService.clearSavedCode();
        setIsRedeemed(false);
        setRedemptionCode('');
        setSupporterId(undefined);
        onToast('success', '已重置');
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0 z-10">
                <button
                    onClick={onBack}
                    className="text-stone-400 hover:text-stone-600 p-1"
                >
                    <ChevronLeft size={24} />
                </button>
                <span className="text-stone-800 font-bold text-lg">新赞赏页面预览</span>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-6 pb-40">
                {!isRedeemed ? (
                    <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6 max-w-sm mx-auto mt-10">
                        <div className="text-center space-y-2">
                            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500">
                                <Coffee size={24} />
                            </div>
                            <h3 className="font-bold text-lg text-stone-800">请输入兑换码</h3>
                            <p className="text-sm text-stone-500">该功能目前仅供内部测试</p>
                        </div>

                        <div className="space-y-3">
                            <input
                                type="text"
                                value={redemptionCode}
                                onChange={(e) => setRedemptionCode(e.target.value)}
                                placeholder="输入兑换码..."
                                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all text-center tracking-widest font-mono"
                                disabled={isVerifying}
                            />
                            <button
                                onClick={handleRedeem}
                                disabled={isVerifying}
                                className={`w-full font-bold py-3 rounded-xl transition-all shadow-lg shadow-stone-200 ${
                                    isVerifying
                                        ? 'bg-stone-400 text-white cursor-not-allowed'
                                        : 'bg-stone-800 text-white hover:bg-stone-900 active:scale-[0.98]'
                                }`}
                            >
                                {isVerifying ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        验证中...
                                    </span>
                                ) : (
                                    '进入'
                                )}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white rounded-3xl p-8 shadow-sm text-center space-y-6 border border-amber-50 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-300 via-orange-400 to-amber-300" />

                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-stone-800">感谢您的支持</h2>
                                {supporterId && (
                                    <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-sm font-medium">
                                        <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                                        支持者 #{supporterId}
                                    </div>
                                )}
                                <p className="text-stone-500">您的慷慨不仅是一杯咖啡，更是对 LumosTime 的认可</p>
                            </div>

                            {/* Placeholder for QR Codes */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                                <div className="aspect-square bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200 flex items-center justify-center text-stone-300 flex-col gap-2">
                                    <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
                                        <span className="font-bold text-lg">?</span>
                                    </div>
                                    <span className="text-xs">微信支付 (待添加)</span>
                                </div>
                                <div className="aspect-square bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200 flex items-center justify-center text-stone-300 flex-col gap-2">
                                    <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
                                        <span className="font-bold text-lg">?</span>
                                    </div>
                                    <span className="text-xs">支付宝 (待添加)</span>
                                </div>
                            </div>

                            <div className="text-center">
                                <p className="text-xs text-stone-400 italic">
                                    "每一行代码都倾注了热爱，感谢有你同行。"
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-center">
                            <button
                                onClick={handleClearCode}
                                className="text-xs text-stone-300 hover:text-stone-500 px-4 py-2"
                            >
                                [测试用] 清除兑换码状态
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const AI_PRESETS = {
    gemini: {
        name: 'Gemini',
        config: { provider: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models', modelName: 'gemini-2.5-flash' }
    },
    deepseek: {
        name: 'DeepSeek',
        config: { provider: 'openai', baseUrl: 'https://api.deepseek.com', modelName: 'deepseek-chat' }
    },
    siliconflow: {
        name: '硅基流动',
        config: { provider: 'openai', baseUrl: 'https://api.siliconflow.cn/v1', modelName: 'deepseek-ai/deepseek-v3' }
    },
    openai: {
        name: 'OpenAI (兼容)',
        config: { provider: 'openai', baseUrl: 'https://api.openai.com/v1', modelName: 'gpt-4o-mini' }
    }
};

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
    const [localUserInfo, setLocalUserInfo] = useState(userPersonalInfo || '');
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

    // NFC State
    const [isWritingNfc, setIsWritingNfc] = useState(false);
    const [nfcSelectedCatId, setNfcSelectedCatId] = useState<string>('');
    const [nfcSelectedActId, setNfcSelectedActId] = useState<string>('');

    const handleWriteNfc = async (uri: string) => {
        setIsWritingNfc(true);
        try {
            const success = await NfcService.writeTag(uri);
            if (success) {
                onToast('success', 'NFC Tag Written Successfully!');
            }
        } catch (e: any) {
            console.error(e);
            if (e.message && e.message.includes('Session stopped')) {
                // Cancelled
            } else {
                onToast('error', 'Write Failed: ' + (e.message || 'Unknown'));
            }
        } finally {
            setIsWritingNfc(false);
        }
    };

    const handleCancelNfc = async () => {
        await NfcService.cancelWrite();
        setIsWritingNfc(false);
    };

    // 检测是否在 Electron 环境
    const isElectronEnvironment = () => {
        return typeof window !== 'undefined' && !!(window as any).ipcRenderer;
    };



    const [editingTemplate, setEditingTemplate] = useState<NarrativeTemplate | null>(null);
    const [showAddTemplateModal, setShowAddTemplateModal] = useState(false);

    // Modal State for Narrative Templates
    const [modalTitle, setModalTitle] = useState('');
    const [modalDesc, setModalDesc] = useState('');
    const [modalPrompt, setModalPrompt] = useState('');
    const [modalError, setModalError] = useState('');
    const [modalIsDaily, setModalIsDaily] = useState(true);
    const [modalIsWeekly, setModalIsWeekly] = useState(false);
    const [modalIsMonthly, setModalIsMonthly] = useState(false);
    const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

    // Update Check State
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
    const [updateInfo, setUpdateInfo] = useState<VersionInfo | null>(null);
    const [showUpdateModal, setShowUpdateModal] = useState(false);

    // Donation Modal State
    const [showDonationModal, setShowDonationModal] = useState(false);

    // Filters State
    const [showAddFilterModal, setShowAddFilterModal] = useState(false);
    const [editingFilter, setEditingFilter] = useState<Filter | null>(null);
    const [filterName, setFilterName] = useState('');
    const [filterExpression, setFilterExpression] = useState('');
    const [deletingFilterId, setDeletingFilterId] = useState<string | null>(null);
    const [selectedFilter, setSelectedFilter] = useState<Filter | null>(null);


    useEffect(() => {
        setLocalUserInfo(userPersonalInfo || '');
    }, [userPersonalInfo]);
    const [aiConfigForm, setAiConfigForm] = useState<AIConfig>({ provider: 'openai', apiKey: '', baseUrl: '', modelName: '' });
    const [activePreset, setActivePreset] = useState<string>('openai');
    const [aiTestStatus, setAiTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

    // Reset status when config changes
    useEffect(() => {
        if (aiTestStatus !== 'idle') setAiTestStatus('idle');
    }, [aiConfigForm]);

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

        // 加载AI配置
        const aiConfig = aiService.getConfig();
        if (aiConfig) {
            setAiConfigForm(aiConfig);
        }

        return () => clearTimeout(timer);
    }, []);

    const handlePresetChange = (key: string) => {
        setActivePreset(key);
        // Load saved profile for this preset
        const savedProfile = aiService.getProfile(key);
        if (savedProfile) {
            setAiConfigForm(savedProfile);
        } else {
            // Load default
            const preset = AI_PRESETS[key as keyof typeof AI_PRESETS];
            if (preset) {
                setAiConfigForm({
                    ...preset.config as AIConfig,
                    apiKey: '' // Clear key for new preset
                });
            }
        }
    };



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

    const handleSaveAIConfig = async () => {
        if (!aiConfigForm.apiKey) {
            onToast('error', 'API Key is required');
            return;
        }

        setAiTestStatus('testing');

        // Save to Profile AND Active Config
        aiService.saveProfile(activePreset, aiConfigForm);
        aiService.saveConfig(aiConfigForm);

        try {
            const success = await aiService.checkConnection(aiConfigForm);
            setAiTestStatus(success ? 'success' : 'error');

            // Auto-revert success to idle after 2s for better UX (optional, but nice)
            if (success) {
                setTimeout(() => setAiTestStatus(prev => prev === 'success' ? 'idle' : prev), 2000);
            }
        } catch (e) {
            setAiTestStatus('error');
        }
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

    // Filter 处理函数
    const handleAddFilter = () => {
        setEditingFilter(null);
        setFilterName('');
        setFilterExpression('');
        setShowAddFilterModal(true);
    };

    const handleEditFilter = (filter: Filter) => {
        setEditingFilter(filter);
        setFilterName(filter.name);
        setFilterExpression(filter.filterExpression);
        setShowAddFilterModal(true);
    };

    const handleSaveFilter = () => {
        if (!filterName.trim()) {
            onToast('error', '请输入筛选器名称');
            return;
        }
        if (!filterExpression.trim()) {
            onToast('error', '请输入筛选条件');
            return;
        }

        const updatedFilters = [...(filters || [])];
        if (editingFilter) {
            // 编辑现有筛选器
            const index = updatedFilters.findIndex(f => f.id === editingFilter.id);
            if (index !== -1) {
                updatedFilters[index] = {
                    ...editingFilter,
                    name: filterName.trim(),
                    filterExpression: filterExpression.trim()
                };
            }
        } else {
            // 新建筛选器
            const newFilter: Filter = {
                id: crypto.randomUUID(),
                name: filterName.trim(),
                filterExpression: filterExpression.trim(),
                createdAt: Date.now()
            };
            updatedFilters.push(newFilter);
        }

        onUpdateFilters?.(updatedFilters);
        setShowAddFilterModal(false);
        onToast('success', editingFilter ? '筛选器已更新' : '筛选器已创建');
    };

    const handleDeleteFilter = (id: string) => {
        setDeletingFilterId(id);
    };

    const confirmDeleteFilter = () => {
        if (!deletingFilterId) return;
        const updatedFilters = (filters || []).filter(f => f.id !== deletingFilterId);
        onUpdateFilters?.(updatedFilters);
        setDeletingFilterId(null);
        onToast('success', '筛选器已删除');
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
        // 如果选中了筛选器,显示详情页
        if (selectedFilter) {
            return (
                <FilterDetailView
                    filter={selectedFilter}
                    logs={logs || []}
                    categories={categoriesData || []}
                    scopes={scopes || []}
                    todos={todos || []}
                    todoCategories={todoCategories || []}
                    onClose={() => setSelectedFilter(null)}
                    onEditLog={(log) => {
                        onEditLog?.(log);
                    }}
                />
            );
        }

        return (
            <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
                <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0">
                    <button
                        onClick={() => setActiveSubmenu('main')}
                        className="text-stone-400 hover:text-stone-600 p-1"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <span className="text-stone-800 font-bold text-lg">自定义筛选器</span>
                </div>

                <div className="p-4 space-y-4 overflow-y-auto pb-40">
                    <div className="flex justify-end mb-2">
                        <button
                            onClick={handleAddFilter}
                            className="flex items-center gap-1 px-3 py-1.5 bg-stone-800 text-white text-xs font-bold rounded-lg hover:bg-stone-700 active:scale-95 transition-all"
                        >
                            <PlusCircle size={14} />
                            <span>新建</span>
                        </button>
                    </div>

                    {(filters || []).length === 0 ? (
                        <div className="p-12 text-center text-stone-400 bg-white rounded-2xl shadow-sm">
                            <span className="text-4xl block mb-3 opacity-30 text-stone-800">※</span>
                            <p className="text-sm">还没有自定义筛选器</p>
                            <p className="text-xs mt-1">点击右上角"新建"创建第一个筛选器</p>
                        </div>
                    ) : (
                        <div>
                            {(filters || []).map((filter, idx) => {
                                // 计算筛选统计
                                const stats = getFilterStats(
                                    logs,
                                    filter,
                                    {
                                        categories: categoriesData,
                                        scopes,
                                        todos,
                                        todoCategories
                                    }
                                );

                                const hours = Math.floor(stats.totalDuration / 3600);
                                const minutes = Math.floor((stats.totalDuration % 3600) / 60);
                                const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

                                return (
                                    <div
                                        key={filter.id}
                                        className="bg-white rounded-2xl p-4 shadow-sm mb-3 hover:bg-stone-50 transition-colors cursor-pointer"
                                        onClick={() => setSelectedFilter(filter)}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-stone-800 font-bold text-base flex-shrink-0">※</span>
                                                    <h4 className="font-bold text-stone-800 text-sm">{filter.name}</h4>
                                                </div>
                                                <p className="text-xs text-stone-500 font-mono break-all mb-2">
                                                    {filter.filterExpression}
                                                </p>
                                                <div className="flex items-center gap-3 text-[10px] text-stone-400">
                                                    <span>{stats.count} 条记录</span>
                                                    <span>•</span>
                                                    <span>{timeStr}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditFilter(filter);
                                                    }}
                                                    className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteFilter(filter.id);
                                                    }}
                                                    className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                </div>

                {/* 新建/编辑筛选器 Modal */}
                {showAddFilterModal && (
                    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between p-4 border-b border-stone-100">
                                <h3 className="font-bold text-lg text-stone-800">
                                    {editingFilter ? '编辑筛选器' : '新建筛选器'}
                                </h3>
                                <button onClick={() => setShowAddFilterModal(false)} className="p-1 text-stone-400 hover:text-stone-600">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-4 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-stone-600 mb-1.5">筛选器名称</label>
                                    <input
                                        type="text"
                                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-800 outline-none focus:border-stone-400"
                                        placeholder="例如:瑜伽训练"
                                        value={filterName}
                                        onChange={e => setFilterName(e.target.value)}
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-stone-600 mb-1.5">筛选表达式</label>
                                    <input
                                        type="text"
                                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-800 font-mono outline-none focus:border-stone-400"
                                        placeholder="例如:瑜伽 OR 跑步 #运动 %健康 OR 工作"
                                        value={filterExpression}
                                        onChange={e => setFilterExpression(e.target.value)}
                                    />
                                    <p className="text-[10px] text-stone-400 mt-1.5">
                                        # 标签, % 领域, @ 代办, 无符号=备注, OR 表示"或"
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 border-t border-stone-100 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowAddFilterModal(false)}
                                    className="px-4 py-2 text-sm font-bold text-stone-500 hover:bg-stone-100 rounded-xl transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleSaveFilter}
                                    className="px-6 py-2 text-sm font-bold text-white bg-stone-800 hover:bg-stone-700 rounded-xl shadow-md transition-colors"
                                >
                                    保存
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 删除确认 Modal */}
                <ConfirmModal
                    isOpen={!!deletingFilterId}
                    onClose={() => setDeletingFilterId(null)}
                    onConfirm={confirmDeleteFilter}
                    title="删除筛选器"
                    description="确定要删除这个筛选器吗?此操作无法撤销。"
                    confirmText="删除"
                    cancelText="取消"
                    type="danger"
                />
            </div>
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
        return (
            <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
                <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0">
                    <button
                        onClick={() => setActiveSubmenu('main')}
                        className="text-stone-400 hover:text-stone-600 p-1"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <span className="text-stone-800 font-bold text-lg">AI API</span>
                </div>

                <div className="p-4 space-y-4 overflow-y-auto pb-40">
                    <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">

                        <div className="space-y-4">
                            {/* Preset Select */}
                            <div>
                                <label className="text-xs font-bold text-stone-400 uppercase ml-1">快速预设 (Presets)</label>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    {(Object.entries(AI_PRESETS) as [string, typeof AI_PRESETS.gemini][]).map(([key, preset]) => (
                                        <button
                                            key={key}
                                            onClick={() => handlePresetChange(key)}
                                            className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all truncate ${activePreset === key
                                                ? 'bg-stone-800 text-white border-stone-800 shadow-md'
                                                : 'bg-white text-stone-600 border-stone-200 hover:border-purple-300 hover:text-purple-600'
                                                } active:scale-[0.98]`}
                                        >
                                            {preset.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Base URL */}
                            <div>
                                <label className="text-xs font-bold text-stone-400 uppercase ml-1">接口地址 (Base URL)</label>
                                <div className="flex items-center gap-2 bg-stone-50 px-3 py-2 rounded-xl mt-1 focus-within:ring-2 focus-within:ring-stone-200 transition-all">
                                    <Globe size={18} className="text-stone-400" />
                                    <input
                                        type="text"
                                        placeholder={aiConfigForm.provider === 'openai' ? "https://api.siliconflow.cn/v1" : "https://generativelanguage.googleapis.com/v1beta/models"}
                                        className="flex-1 bg-transparent border-none outline-none text-stone-700 placeholder:text-stone-300 text-sm"
                                        value={aiConfigForm.baseUrl}
                                        onChange={e => setAiConfigForm(prev => ({ ...prev, baseUrl: e.target.value }))}
                                        disabled={aiConfigForm.provider === 'gemini'}
                                    />
                                </div>
                            </div>

                            {/* API Key */}
                            <div>
                                <label className="text-xs font-bold text-stone-400 uppercase ml-1">API 密钥 (Key)</label>
                                <div className="flex items-center gap-2 bg-stone-50 px-3 py-2 rounded-xl mt-1 focus-within:ring-2 focus-within:ring-stone-200 transition-all">
                                    <div className="w-[18px] flex justify-center"><Server size={14} className="text-stone-400" /></div>
                                    <input
                                        type="password"
                                        placeholder="sk-..."
                                        className="flex-1 bg-transparent border-none outline-none text-stone-700 placeholder:text-stone-300 text-sm"
                                        value={aiConfigForm.apiKey}
                                        onChange={e => setAiConfigForm(prev => ({ ...prev, apiKey: e.target.value }))}
                                    />
                                </div>
                            </div>



                            {/* Model Name */}
                            <div>
                                <label className="text-xs font-bold text-stone-400 uppercase ml-1">模型名称 (Model)</label>
                                <div className="flex items-center gap-2 bg-stone-50 px-3 py-2 rounded-xl mt-1 focus-within:ring-2 focus-within:ring-stone-200 transition-all">
                                    <Bot size={18} className="text-stone-400" />
                                    <input
                                        type="text"
                                        placeholder="deepseek-ai/deepseek-v3"
                                        className="flex-1 bg-transparent border-none outline-none text-stone-700 placeholder:text-stone-300 text-sm"
                                        value={aiConfigForm.modelName}
                                        onChange={e => setAiConfigForm(prev => ({ ...prev, modelName: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                onClick={handleSaveAIConfig}
                                disabled={aiTestStatus === 'testing'}
                                className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium active:scale-[0.98] transition-all shadow-lg shadow-stone-200 disabled:opacity-70 ${aiTestStatus === 'success' ? 'bg-green-600 text-white' :
                                    aiTestStatus === 'error' ? 'bg-red-500 text-white' :
                                        'bg-stone-800 text-white'
                                    }`}
                            >
                                {aiTestStatus === 'testing' && <RefreshCw size={18} className="animate-spin" />}
                                {aiTestStatus === 'success' && <CheckCircle2 size={18} />}
                                {aiTestStatus === 'error' && <AlertCircle size={18} />}
                                {aiTestStatus === 'idle' && <Save size={18} />}

                                {aiTestStatus === 'testing' && "测试中..."}
                                {aiTestStatus === 'success' && "连接成功"}
                                {aiTestStatus === 'error' && "连接失败 - 请检查配置"}
                                {aiTestStatus === 'idle' && "保存并测试连接"}
                            </button>
                            <p className="text-[10px] text-center text-stone-400 mt-3">
                                隐私说明：您的输入和标签将发送至配置的 AI 服务商，本地服务器不存储任何数据。
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
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
                                                s3Service.clearConfig();
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

    const handleSaveUserInfo = () => {
        onSetUserPersonalInfo?.(localUserInfo);
        onToast('success', '个人信息已保存');
    };

    const handleAddTemplate = () => {
        setEditingTemplate(null);
        setModalTitle('');
        setModalDesc('');
        setModalPrompt('');
        setModalIsDaily(true);
        setModalIsWeekly(false);
        setModalIsMonthly(false);
        setModalError('');
        setShowAddTemplateModal(true);
    };

    const handleEditTemplate = (template: NarrativeTemplate) => {
        setEditingTemplate(template);
        setModalTitle(template.title);
        setModalDesc(template.description);
        setModalPrompt(template.prompt);
        setModalIsDaily(template.isDaily !== false);
        setModalIsWeekly(template.isWeekly === true);
        setModalIsMonthly(template.isMonthly === true);
        setModalError('');
        setShowAddTemplateModal(true);
    };

    const handleDeleteTemplate = (id: string) => {
        setDeletingTemplateId(id);
    };

    const confirmDeleteTemplate = () => {
        if (!deletingTemplateId) return;

        const newTemplates = (customNarrativeTemplates || []).filter(t => t.id !== deletingTemplateId);
        onUpdateCustomNarrativeTemplates?.(newTemplates);
        setDeletingTemplateId(null);
        onToast('success', '模板已删除');
    };

    const handleSaveTemplate = () => {
        if (!modalTitle.trim()) {
            setModalError('标题不能为空');
            return;
        }
        if (!modalPrompt.trim()) {
            setModalError('提示词不能为空');
            return;
        }

        const newTemplate: NarrativeTemplate = {
            id: editingTemplate ? editingTemplate.id : `custom_${Date.now()}`,
            title: modalTitle.trim(),
            description: modalDesc.trim(),
            prompt: modalPrompt,
            isCustom: true,
            isDaily: modalIsDaily,
            isWeekly: modalIsWeekly,
            isMonthly: modalIsMonthly
        };

        let updatedTemplates = [...(customNarrativeTemplates || [])];
        if (editingTemplate) {
            updatedTemplates = updatedTemplates.map(t => t.id === editingTemplate.id ? newTemplate : t);
        } else {
            updatedTemplates.push(newTemplate);
        }

        onUpdateCustomNarrativeTemplates?.(updatedTemplates);
        setShowAddTemplateModal(false);
        onToast('success', editingTemplate ? '模板已更新' : '新模板已创建');
    };

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

                <div className="p-4 space-y-4 overflow-y-auto pb-40">
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
            <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
                <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0">
                    <button
                        onClick={() => setActiveSubmenu('main')}
                        className="text-stone-400 hover:text-stone-600 p-1"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <span className="text-stone-800 font-bold text-lg">偏好设置</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-40">
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

                        {/* Start Week Toggle */}
                        <div className="flex items-center justify-between p-4 border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors">
                            <div>
                                <h4 className="font-bold text-stone-700">从周日开始</h4>
                                <p className="text-xs text-stone-400 mt-1">日历视图每周第一天将设为周日</p>
                            </div>
                            <button
                                onClick={onToggleStartWeekOnSunday}
                                className={`w-12 h-7 rounded-full transition-colors flex items-center px-1 ${startWeekOnSunday ? 'bg-stone-800' : 'bg-stone-200'
                                    }`}
                            >
                                <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${startWeekOnSunday ? 'translate-x-5' : 'translate-x-0'
                                    }`} />
                            </button>
                        </div>

                        {/* Daily Review Time */}
                        <div className="flex items-center justify-between p-4 border-b border-stone-100 hover:bg-stone-50 transition-colors">
                            <div>
                                <h4 className="font-bold text-stone-700">每日回顾时间</h4>
                                <p className="text-xs text-stone-400 mt-1">到达该时间后，时间轴将显示今日回顾节点</p>
                            </div>
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={4}
                                value={(dailyReviewTime || '22:00').replace(':', '')}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                    onSetDailyReviewTime?.(val);
                                }}
                                onFocus={(e) => e.target.select()}
                                className="bg-stone-100 border-none rounded-lg px-3 py-1.5 text-sm font-bold text-stone-700 focus:outline-none focus:ring-0 focus:bg-stone-200 transition-colors w-20 text-center tracking-widest font-mono"
                            />
                        </div>

                        {/* Weekly Review Time */}
                        <div className="flex items-center justify-between p-4 border-b border-stone-100 hover:bg-stone-50 transition-colors">
                            <div>
                                <h4 className="font-bold text-stone-700">每周回顾时间</h4>
                                <p className="text-xs text-stone-400 mt-1">到达该时间后，时间轴将在每周最后一天显示本周回顾节点</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={4}
                                    placeholder="2200"
                                    value={(weeklyReviewTime || '0-2200').split('-')[1] || '2200'}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        // 周报时间格式：总是存储为"0-<time>"，0表示最后一天
                                        onSetWeeklyReviewTime?.(`0-${val}`);
                                    }}
                                    onFocus={(e) => e.target.select()}
                                    className="bg-stone-100 border-none rounded-lg px-3 py-1.5 text-sm font-bold text-stone-700 focus:outline-none focus:ring-0 focus:bg-stone-200 transition-colors w-20 text-center tracking-widest font-mono"
                                />
                            </div>
                        </div>

                        {/* Monthly Review Time */}
                        <div className="flex items-center justify-between p-4 border-b border-stone-100 hover:bg-stone-50 transition-colors">
                            <div>
                                <h4 className="font-bold text-stone-700">每月回顾时间</h4>
                                <p className="text-xs text-stone-400 mt-1">到达该时间后，时间轴将在每月最后一天显示本月回顾节点</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={4}
                                    placeholder="2200"
                                    value={(monthlyReviewTime || '0-2200').split('-')[1] || '2200'}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        // 月报时间格式：总是存储为"0-<time>"，0表示最后一天
                                        onSetMonthlyReviewTime?.(`0-${val}`);
                                    }}
                                    onFocus={(e) => e.target.select()}
                                    className="bg-stone-100 border-none rounded-lg px-3 py-1.5 text-sm font-bold text-stone-700 focus:outline-none focus:ring-0 focus:bg-stone-200 transition-colors w-20 text-center tracking-widest font-mono"
                                />
                            </div>
                        </div>

                        {/* Auto-focus Note Toggle */}
                        <div className="flex items-center justify-between p-4 border-b border-stone-100 hover:bg-stone-50 transition-colors">
                            <div>
                                <h4 className="font-bold text-stone-700">自动聚焦备注</h4>
                                <p className="text-xs text-stone-400 mt-1">新建记录或专注时自动弹出键盘</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={autoFocusNote}
                                    onChange={onToggleAutoFocusNote}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-stone-800"></div>
                            </label>
                        </div>

                        {/* Min Idle Time Config */}
                        <div className="flex items-center justify-between p-4 border-b border-stone-100 hover:bg-stone-50 transition-colors">
                            <div>
                                <h4 className="font-bold text-stone-700">最小空闲时间隐藏阈值</h4>
                                <p className="text-xs text-stone-400 mt-1">小于此分钟数的空闲时间将不显示（分钟）</p>
                            </div>
                            <div className="flex items-center bg-stone-100 rounded-lg overflow-hidden">
                                <button
                                    className="p-2 hover:bg-stone-200 transition-colors"
                                    onClick={() => onSetMinIdleTimeThreshold?.(Math.max(0, (minIdleTimeThreshold || 1) - 1))}
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="w-8 text-center text-sm font-bold font-mono">{minIdleTimeThreshold}</span>
                                <button
                                    className="p-2 hover:bg-stone-200 transition-colors"
                                    onClick={() => onSetMinIdleTimeThreshold?.((minIdleTimeThreshold || 1) + 1)}
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Default View Config */}
                        <div className="flex items-center justify-between p-4 border-t border-stone-100 relative z-10 hover:bg-stone-50 transition-colors">
                            <div>
                                <h4 className="font-bold text-stone-700">启动默认页</h4>
                                <p className="text-xs text-stone-400 mt-1">应用启动时默认显示的页面</p>
                            </div>
                            <div className="relative">
                                <button
                                    onClick={() => setIsDefaultViewDropdownOpen(!isDefaultViewDropdownOpen)}
                                    className="flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-bold px-4 py-2 rounded-lg transition-colors"
                                >
                                    <span>
                                        {defaultView === 'RECORD' && '记录'}
                                        {defaultView === 'TODO' && '待办'}
                                        {defaultView === 'TIMELINE' && '脉络'}
                                        {defaultView === 'REVIEW' && '档案'}
                                        {defaultView === 'TAGS' && '索引'}
                                        {defaultView === 'STATS' && '统计页'}
                                        {/* Fallback for legacy 'SCOPE' or others if set */}
                                        {defaultView === 'SCOPE' && '领域'}
                                    </span>
                                    <ChevronDown size={14} className={`transition-transform ${isDefaultViewDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isDefaultViewDropdownOpen && (
                                    <>
                                        {/* Backdrop to close */}
                                        <div className="fixed inset-0 z-10" onClick={() => setIsDefaultViewDropdownOpen(false)} />

                                        {/* Dropdown Menu - Opens Upwards */}
                                        <div className="absolute right-0 bottom-full mb-2 w-32 bg-white rounded-xl shadow-xl border border-stone-100 overflow-hidden z-20 flex flex-col py-1 animate-in fade-in zoom-in-95 duration-200 origin-bottom-right">
                                            {[
                                                { label: '记录', value: 'RECORD' },
                                                { label: '待办', value: 'TODO' },
                                                { label: '脉络', value: 'TIMELINE' },
                                                { label: '档案', value: 'REVIEW' },
                                                { label: '索引', value: 'TAGS' },
                                                { label: '统计页', value: 'STATS' }
                                            ].map(opt => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => {
                                                        onSetDefaultView?.(opt.value);
                                                        setIsDefaultViewDropdownOpen(false);
                                                    }}
                                                    className={`px-4 py-2.5 text-left text-sm font-medium transition-colors hover:bg-stone-50 flex items-center justify-between ${defaultView === opt.value ? 'text-stone-900 bg-stone-50' : 'text-stone-500'
                                                        }`}
                                                >
                                                    {opt.label}
                                                    {defaultView === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-stone-800" />}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Default Archive Page Config */}
                        <div className="flex items-center justify-between p-4 border-t border-stone-100 relative z-10 hover:bg-stone-50 transition-colors">
                            <div>
                                <h4 className="font-bold text-stone-700">档案页默认页面</h4>
                                <p className="text-xs text-stone-400 mt-1">进入档案页时默认显示的视图</p>
                            </div>
                            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg">
                                <button
                                    onClick={() => onSetDefaultArchiveView?.('CHRONICLE')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${defaultArchiveView === 'CHRONICLE'
                                        ? 'bg-white text-stone-800 shadow-sm'
                                        : 'text-stone-400 hover:text-stone-600'}`}
                                >
                                    Chronicle
                                </button>
                                <button
                                    onClick={() => onSetDefaultArchiveView?.('MEMOIR')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${defaultArchiveView === 'MEMOIR'
                                        ? 'bg-white text-stone-800 shadow-sm'
                                        : 'text-stone-400 hover:text-stone-600'}`}
                                >
                                    Memoir
                                </button>
                            </div>
                        </div>

                        {/* Default Index Page Config */}
                        <div className="flex items-center justify-between p-4 border-t border-stone-100 relative z-10 hover:bg-stone-50 transition-colors">
                            <div>
                                <h4 className="font-bold text-stone-700">索引页默认页面</h4>
                                <p className="text-xs text-stone-400 mt-1">进入索引页时默认显示的视图</p>
                            </div>
                            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg">
                                <button
                                    onClick={() => onSetDefaultIndexView?.('TAGS')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${defaultIndexView === 'TAGS'
                                        ? 'bg-white text-stone-800 shadow-sm'
                                        : 'text-stone-400 hover:text-stone-600'}`}
                                >
                                    Tags
                                </button>
                                <button
                                    onClick={() => onSetDefaultIndexView?.('SCOPE')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${defaultIndexView === 'SCOPE'
                                        ? 'bg-white text-stone-800 shadow-sm'
                                        : 'text-stone-400 hover:text-stone-600'}`}
                                >
                                    Scopes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (activeSubmenu === 'guide') {
        return (
            <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
                <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0 z-10">
                    <button
                        onClick={() => setActiveSubmenu('main')}
                        className="text-stone-400 hover:text-stone-600 p-1"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <span className="text-stone-800 font-bold text-lg">用户指南</span>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-6 pb-40">
                    <div className="markdown-content">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-stone-800 mb-4 mt-0" {...props} />,
                                h2: ({ node, ...props }) => <h2 className="text-xl font-bold text-stone-800 mt-8 mb-3" {...props} />,
                                h3: ({ node, ...props }) => <h3 className="text-base font-bold text-stone-800 mt-6 mb-2" {...props} />,
                                p: ({ node, ...props }) => <p className="text-stone-600 leading-relaxed my-3 text-sm" {...props} />,
                                ul: ({ node, ...props }) => <ul className="my-3 space-y-1.5 list-disc pl-6" {...props} />,
                                ol: ({ node, ...props }) => <ol className="my-3 space-y-1.5 list-decimal pl-6" {...props} />,
                                li: ({ node, ...props }) => <li className="text-stone-600 text-sm" {...props} />,
                                strong: ({ node, ...props }) => <strong className="text-stone-800 font-bold" {...props} />,
                                code: ({ node, inline, className, children, ...props }: any) =>
                                    inline
                                        ? <code className="text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded text-xs" {...props}>{children}</code>
                                        : <code className="block bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs" {...props}>{children}</code>,
                                blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-stone-300 pl-4 italic text-stone-500 my-4" {...props} />,
                                hr: ({ node, ...props }) => <hr className="border-stone-100 my-6" {...props} />,
                            }}
                        >
                            {userGuideContent}
                        </ReactMarkdown>
                    </div>
                </div>
            </div>
        )

    }

    if (activeSubmenu === 'nfc') {
        return (
            <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
                <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0 z-10">
                    <button
                        onClick={() => setActiveSubmenu('main')}
                        className="text-stone-400 hover:text-stone-600 p-1"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <span className="text-stone-800 font-bold text-lg">NFC Tags</span>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-6 pb-40 space-y-6">
                    {isWritingNfc ? (
                        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl shadow-lg border border-stone-100 animate-in fade-in zoom-in">
                            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                <Nfc size={40} className="text-blue-500" />
                            </div>
                            <h3 className="text-xl font-bold text-stone-800 mb-2">Ready to Scan</h3>
                            <p className="text-stone-500 text-center mb-8">
                                Hold your phone near an NFC tag to write.
                            </p>
                            <button
                                onClick={handleCancelNfc}
                                className="px-8 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold active:scale-95 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Quick Actions */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                                        <Crosshair size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-stone-800">快速打点 (Quick Punch)</h3>
                                        <p className="text-xs text-stone-400">Write a tag to instantly record a "Quick Punch".</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleWriteNfc("lumostime://record?action=quick_punch")}
                                    className="w-full py-3 bg-stone-800 text-white rounded-xl font-bold shadow-lg shadow-stone-200 active:scale-[0.98] transition-all"
                                >
                                    Write Quick Punch Tag
                                </button>
                            </div>

                            {/* Specific Activity */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                        <Tag size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-stone-800">指定活动 (Start Activity)</h3>
                                        <p className="text-xs text-stone-400">Write a tag to start a specific activity.</p>
                                    </div>
                                </div>

                                {/* Category Select */}
                                <CustomSelect
                                    label="Category (活动分类)"
                                    placeholder="Select Category..."
                                    value={nfcSelectedCatId}
                                    onChange={(val) => {
                                        setNfcSelectedCatId(val);
                                        setNfcSelectedActId('');
                                    }}
                                    options={syncData.categories?.map((cat: any) => ({
                                        value: cat.id,
                                        label: cat.name,
                                        icon: <span className="text-lg">{cat.icon}</span>
                                    })) || []}
                                />

                                {/* Activity Select */}
                                <CustomSelect
                                    label="Activity (具体活动)"
                                    placeholder="Select Activity..."
                                    value={nfcSelectedActId}
                                    onChange={(val) => setNfcSelectedActId(val)}
                                    disabled={!nfcSelectedCatId}
                                    options={
                                        syncData.categories
                                            ?.find((c: any) => c.id === nfcSelectedCatId)
                                            ?.activities.map((act: any) => ({
                                                value: act.id,
                                                label: act.name,
                                                icon: <span className="text-lg">{act.icon}</span>
                                            })) || []
                                    }
                                />

                                <button
                                    disabled={!nfcSelectedCatId || !nfcSelectedActId}
                                    onClick={() => handleWriteNfc(`lumostime://record?action=start&cat_id=${nfcSelectedCatId}&act_id=${nfcSelectedActId}`)}
                                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none"
                                >
                                    Write Activity Tag
                                </button>
                            </div>

                            {/* Read/Test Tag */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4 border border-stone-100">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
                                        <Search size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-stone-800">读取测试 (Read / Test)</h3>
                                        <p className="text-xs text-stone-400">Scan a tag to see its content.</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-stone-50 rounded-xl text-xs text-stone-500 text-center border border-dashed border-stone-200">
                                    Hold phone near ANY tag to read it. <br />
                                    (Check Toast message for result)
                                </div>
                            </div>

                            {/* Clear Tag */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4 border border-red-100">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                                        <Trash2 size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-stone-800">Clear Tag (Format)</h3>
                                        <p className="text-xs text-stone-400">Remove all data from a tag.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleWriteNfc("lumostime://clear")}
                                    className="w-full py-3 bg-red-50 text-red-500 border border-red-100 rounded-xl font-bold active:scale-[0.98] transition-all"
                                >
                                    Erase Tag Content
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        )
    }

    if (activeSubmenu === 'narrative_prompt') {
        return (
            <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
                <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0 z-10">
                    <button
                        onClick={() => setActiveSubmenu('main')}
                        className="text-stone-400 hover:text-stone-600 p-1"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <span className="text-stone-800 font-bold text-lg">AI 叙事设定</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 pb-40">
                    {/* User Personal Info Section */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                                <User size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-stone-800 text-[15px]">个人信息</h4>
                                <p className="text-xs text-stone-400 mt-0.5">让 AI 了解你的背景，生成更贴合的叙事</p>
                            </div>
                        </div>

                        <textarea
                            className={`w-full h-32 bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs text-stone-600 outline-none focus:border-stone-400 resize-none leading-relaxed ${isPrivacyMode ? 'blur-sm select-none transition-all duration-500' : 'transition-all duration-500'}`}
                            value={localUserInfo}
                            onChange={(e) => setLocalUserInfo(e.target.value)}
                            placeholder="例如：我是一名正在攻读博士学位的研究生..."
                            maxLength={2000}
                        />

                        <div className="flex justify-end">
                            <button
                                onClick={handleSaveUserInfo}
                                disabled={localUserInfo === (userPersonalInfo || '')}
                                className={`text-sm font-bold px-4 py-2 rounded-lg transition-colors ${localUserInfo !== (userPersonalInfo || '')
                                    ? 'bg-stone-800 text-white'
                                    : 'bg-stone-100 text-stone-400'
                                    }`}
                            >
                                保存信息
                            </button>
                        </div>
                    </div>

                    {/* Custom Templates List */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                                    <Sparkles size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-stone-800 text-[15px]">自定义叙事模板</h4>
                                    <p className="text-xs text-stone-400 mt-0.5">管理你自己创建的叙事风格</p>
                                </div>
                            </div>
                            <button
                                onClick={handleAddTemplate}
                                className="px-3 py-1.5 bg-stone-800 text-white text-xs font-bold rounded-lg flex items-center gap-1 hover:bg-stone-700 transition-colors"
                            >
                                <PlusCircle size={14} />
                                新建模板
                            </button>
                        </div>

                        <div className="space-y-3">
                            {(!customNarrativeTemplates || customNarrativeTemplates.length === 0) && (
                                <div className="text-center py-8 text-stone-400 text-xs bg-stone-50 rounded-xl border border-dashed border-stone-200">
                                    还没有创建自定义模板<br />点击右上角创建你的专属风格
                                </div>
                            )}

                            {customNarrativeTemplates?.map(template => (
                                <div key={template.id} className="p-4 bg-stone-50 rounded-xl border border-stone-100 flex items-start justify-between group hover:border-stone-300 transition-colors">
                                    <div>
                                        <h5 className="font-bold text-stone-800 text-sm">{template.title}</h5>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {/* Legacy compatibility: default to Daily if undefined */}
                                            {(template.isDaily !== false) && (
                                                <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded border border-stone-200">每日</span>
                                            )}
                                            {template.isWeekly && (
                                                <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded border border-stone-200">每周</span>
                                            )}
                                            {template.isMonthly && (
                                                <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded border border-stone-200">每月</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-stone-500 mt-1 line-clamp-2">{template.description}</p>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEditTemplate(template)}
                                            className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-200 rounded-lg"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteTemplate(template.id)}
                                            className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Add/Edit Modal Overlay */}
                {showAddTemplateModal && (
                    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                            <div className="flex items-center justify-between p-4 border-b border-stone-100">
                                <h3 className="font-bold text-lg text-stone-800">
                                    {editingTemplate ? '编辑模板' : '创建新模板'}
                                </h3>
                                <button onClick={() => setShowAddTemplateModal(false)} className="p-1 text-stone-400 hover:text-stone-600">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-4 space-y-4 overflow-y-auto flex-1">
                                <div>
                                    <label className="block text-xs font-bold text-stone-600 mb-1.5">模板名称</label>
                                    <input
                                        type="text"
                                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-800 outline-none focus:border-stone-400"
                                        placeholder="例如：发朋友圈风格"
                                        value={modalTitle}
                                        onChange={e => setModalTitle(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-stone-600 mb-1.5">简短描述</label>
                                    <input
                                        type="text"
                                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-800 outline-none focus:border-stone-400"
                                        placeholder="例如：emoji多一点，语气轻松"
                                        value={modalDesc}
                                        onChange={e => setModalDesc(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-stone-600 mb-1.5">适用周期 (Applicability)</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setModalIsDaily(!modalIsDaily)}
                                            className={`px-2 py-3 rounded-xl text-xs font-bold text-center border transition-all flex items-center justify-center gap-1.5 truncate ${modalIsDaily
                                                ? 'bg-stone-900 text-white border-stone-900 shadow-md transform scale-[1.02]'
                                                : 'bg-stone-50 text-stone-500 border-stone-100 hover:bg-stone-100'
                                                }`}
                                        >
                                            <span className="text-sm">☀️</span>
                                            <span className="truncate">每日</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setModalIsWeekly(!modalIsWeekly)}
                                            className={`px-2 py-3 rounded-xl text-xs font-bold text-center border transition-all flex items-center justify-center gap-1.5 truncate ${modalIsWeekly
                                                ? 'bg-stone-900 text-white border-stone-900 shadow-md transform scale-[1.02]'
                                                : 'bg-stone-50 text-stone-500 border-stone-100 hover:bg-stone-100'
                                                }`}
                                        >
                                            <span className="text-sm">📅</span>
                                            <span className="truncate">每周</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setModalIsMonthly(!modalIsMonthly)}
                                            className={`px-2 py-3 rounded-xl text-xs font-bold text-center border transition-all flex items-center justify-center gap-1.5 truncate ${modalIsMonthly
                                                ? 'bg-stone-900 text-white border-stone-900 shadow-md transform scale-[1.02]'
                                                : 'bg-stone-50 text-stone-500 border-stone-100 hover:bg-stone-100'
                                                }`}
                                        >
                                            <span className="text-sm">🌙</span>
                                            <span className="truncate">每月</span>
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="block text-xs font-bold text-stone-600">叙事风格描述 (Narrative Persona)</label>
                                    </div>
                                    <textarea
                                        className={`w-full h-48 bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs font-mono text-stone-600 outline-none focus:border-stone-400 resize-none leading-relaxed ${isPrivacyMode ? 'blur-sm select-none transition-all duration-500' : 'transition-all duration-500'}`}
                                        placeholder="例如：你是一个幽默的脱口秀演员，请用夸张和调侃的语气点评我今天的时间记录..."
                                        value={modalPrompt}
                                        onChange={e => setModalPrompt(e.target.value)}
                                    />
                                </div>

                                {modalError && (
                                    <div className="text-red-500 text-xs font-bold px-1">{modalError}</div>
                                )}
                            </div>

                            <div className="p-4 border-t border-stone-100 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowAddTemplateModal(false)}
                                    className="px-4 py-2 text-sm font-bold text-stone-500 hover:bg-stone-100 rounded-xl transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleSaveTemplate}
                                    className="px-6 py-2 text-sm font-bold text-white bg-stone-800 hover:bg-stone-700 rounded-xl shadow-md transition-colors"
                                >
                                    保存
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                <ConfirmModal
                    isOpen={!!deletingTemplateId}
                    onClose={() => setDeletingTemplateId(null)}
                    onConfirm={confirmDeleteTemplate}
                    title="删除自定义叙事"
                    description="确定要删除这个叙事风格吗？此操作无法撤销。"
                    confirmText="删除"
                    cancelText="取消"
                    type="danger"
                />
            </div>
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
        return <SponsorshipPreviewView onBack={() => setActiveSubmenu('main')} onToast={onToast} />;
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
                            label="新赞赏页面 (Preview)"
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

            {/* Delete Confirmation Modal for Custom Templates */}
            <ConfirmModal
                isOpen={!!deletingTemplateId}
                onClose={() => setDeletingTemplateId(null)}
                onConfirm={confirmDeleteTemplate}
                title="删除自定义叙事"
                description="确定要删除这个叙事风格吗？此操作无法撤销。"
                confirmText="删除"
                cancelText="取消"
                type="danger"
            />
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
