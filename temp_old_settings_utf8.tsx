/**
 * @file SettingsView.tsx
 * @input User Settings, Sync Data, AI Config, App State
 * @output Configuration Updates, Data Sync Actions, Navigation
 * @pos View (Settings Modal)
 * @description The central configuration hub. Manages Cloud Sync (WebDAV), AI integration (Providers/Presets), Data (Import/Export), and Application Preferences (Appearance, Habits, etc.).
 * 
 * 鈿狅笍 Once I am updated, be sure to update my header comment and the folder's md.
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

import { IconPreview } from '../components/IconPreview';
import { BackgroundSelector } from '../components/BackgroundSelector';
import { NavigationDecorationSelector } from '../components/NavigationDecorationSelector';
import { ICON_OPTIONS } from '../services/iconService';
import { backgroundService } from '../services/backgroundService';
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
    const [selectedIcon, setSelectedIcon] = useState('default');
    const [selectedTheme, setSelectedTheme] = useState('default');
    const [isChangingIcon, setIsChangingIcon] = useState(false);
    const [showDebugInfo, setShowDebugInfo] = useState(false);
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

        // 鍔犺浇褰撳墠鍥炬爣璁剧疆
        const loadCurrentIcon = async () => {
            try {
                const { iconService } = await import('../services/iconService');
                const currentIcon = iconService.getCurrentIcon();
                setSelectedIcon(currentIcon);
            } catch (error) {
                console.error('鍔犺浇褰撳墠鍥炬爣澶辫触:', error);
            }
        };
        loadCurrentIcon();
    }, []);

    const handleRedeem = async () => {
        if (!redemptionCode.trim()) {
            onToast('error', '璇疯緭鍏ュ厬鎹㈢爜');
            return;
        }

        setIsVerifying(true);
        try {
            const result = await redemptionService.verifyCode(redemptionCode);
            if (result.success) {
                redemptionService.saveCode(redemptionCode, result.supporterId);
                setIsRedeemed(true);
                setSupporterId(result.supporterId);
                onToast('success', '楠岃瘉鎴愬姛锛?);
            } else {
                onToast('error', result.error || '鍏戞崲鐮佹棤鏁?);
            }
        } catch (error) {
            onToast('error', '楠岃瘉澶辫触锛岃閲嶈瘯');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleClearCode = () => {
        redemptionService.clearSavedCode();
        setIsRedeemed(false);
        setRedemptionCode('');
        setSupporterId(undefined);
        onToast('success', '宸查噸缃?);
    };

    const handleIconChange = async (iconId: string) => {
        if (!isRedeemed) {
            onToast('error', '璇峰厛楠岃瘉璧炶祻鐮?);
            return;
        }

        setIsChangingIcon(true);
        try {
            const { iconService } = await import('../services/iconService');
            const result = await iconService.setIcon(iconId);
            
            if (result.success) {
                setSelectedIcon(iconId);
                onToast('success', result.message);
            } else {
                onToast('error', result.message);
            }
        } catch (error: any) {
            console.error('鍒囨崲鍥炬爣澶辫触:', error);
            onToast('error', error.message || '鍒囨崲鍥炬爣澶辫触');
        } finally {
            setIsChangingIcon(false);
        }
    };

    const handleShowDebugInfo = async () => {
        // 鍒犻櫎璋冭瘯鍔熻兘锛屼繚鐣欑┖鍑芥暟閬垮厤閿欒
    };

    // 搴旂敤鍥炬爣閫夐」 - 浣跨敤iconService涓殑瀹屾暣鍒楄〃
    const iconOptions = ICON_OPTIONS;

    // 涓婚閫夐」
    const themeOptions = [
        { id: 'default', name: '榛樿', color: '#a8a29e', description: '娓╂殩鐭宠壊涓婚' },
        { id: 'ocean', name: '娴锋磱', color: '#0ea5e9', description: '娓呮柊钃濊壊涓婚' },
        { id: 'forest', name: '妫灄', color: '#22c55e', description: '鑷劧缁胯壊涓婚' },
        { id: 'sunset', name: '鏃ヨ惤', color: '#f97316', description: '娓╂殩姗欒壊涓婚' },
        { id: 'lavender', name: '钖拌。鑽?, color: '#8b5cf6', description: '浼橀泤绱壊涓婚' },
    ];

    // 鏃堕棿灏忓弸閫夐」
    const timePalOptions = [
        { id: 'pal1', icon: '馃惐' },
        { id: 'pal2', icon: '馃惗' },
        { id: 'pal3', icon: '馃惏' },
        { id: 'pal4', icon: '馃' },
    ];

    return (
        <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0 z-10">
                <button
                    onClick={onBack}
                    className="text-stone-400 hover:text-stone-600 p-1"
                >
                    <ChevronLeft size={24} />
                </button>
                <span className="text-stone-800 font-bold text-lg">璧炶祻鍔熻兘</span>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-6 pb-40">
                {!isRedeemed ? (
                    <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6 max-w-sm mx-auto mt-10">
                        <div className="text-center space-y-2">
                            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500">
                                <Coffee size={24} />
                            </div>
                            <h3 className="font-bold text-lg text-stone-800">璇疯緭鍏ュ厬鎹㈢爜</h3>
                            <p className="text-sm text-stone-500">瑙ｉ攣涓撳睘璧炶祻鍔熻兘</p>
                        </div>

                        <div className="space-y-3">
                            <input
                                type="text"
                                value={redemptionCode}
                                onChange={(e) => setRedemptionCode(e.target.value)}
                                placeholder="杈撳叆鍏戞崲鐮?.."
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
                                        楠岃瘉涓?..
                                    </span>
                                ) : (
                                    '瑙ｉ攣鍔熻兘'
                                )}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* 涓撳睘寰界珷鍗＄墖 */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-amber-50 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-300 via-orange-400 to-amber-300" />
                            
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                                    #{supporterId || '001'}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-stone-800 mb-1">涓撳睘璧炲姪寰界珷</h3>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
                                        <span className="text-xs text-amber-600 font-medium">鎰熻阿鎮ㄧ殑鏀寔</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 搴旂敤鍥炬爣鍒囨崲鍗＄墖 */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                        <span className="text-blue-600 text-lg">馃摫</span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-stone-800">搴旂敤鍥炬爣</h3>
                                    </div>
                                </div>
                                
                                {/* 鎵嬪姩鍒锋柊鎸夐挳 - 浠匒ndroid鏄剧ず */}
                                {isRedeemed && Capacitor.isNativePlatform() && (
                                    <button
                                        onClick={async () => {
                                            try {
                                                const { iconService } = await import('../services/iconService');
                                                const result = await iconService.refreshLauncher();
                                                onToast(result.success ? 'success' : 'info', result.message);
                                            } catch (error: any) {
                                                onToast('error', '鍒锋柊澶辫触: ' + error.message);
                                            }
                                        }}
                                        className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                    >
                                        鍒锋柊鍚姩鍣?                                    </button>
                                )}
                            </div>
                            
                            {/* 鍥炬爣缃戞牸 - 鑷€傚簲甯冨眬 */}
                            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(48px, 1fr))' }}>
                                {iconOptions.map((option) => (
                                    <button
                                        key={option.id}
                                        onClick={() => handleIconChange(option.id)}
                                        disabled={isChangingIcon || !isRedeemed}
                                        className={`relative w-12 h-12 rounded-xl transition-all hover:bg-stone-50 ${
                                            !isRedeemed ? 'opacity-50 cursor-not-allowed' : ''
                                        } ${
                                            isChangingIcon ? 'opacity-70' : ''
                                        }`}
                                    >
                                        {isChangingIcon && selectedIcon === option.id && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl">
                                                <div className="w-3 h-3 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        )}
                                        
                                        {/* 鍥炬爣棰勮 */}
                                        <IconPreview 
                                            iconId={option.id}
                                            iconName={option.name}
                                            size="medium"
                                        />
                                        
                                        {/* 閫変腑鐘舵€佹寚绀哄櫒 */}
                                        {selectedIcon === option.id && (
                                            <div className="absolute top-1 right-1 w-5 h-5 bg-stone-800 rounded-full flex items-center justify-center shadow-lg">
                                                <Check size={12} className="text-white" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                            
                            {!isRedeemed && (
                                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                    <p className="text-xs text-amber-700 text-center">
                                        馃敀 璇峰厛楠岃瘉璧炶祻鐮佷互瑙ｉ攣鍥炬爣鍒囨崲鍔熻兘
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 鑳屾櫙鍥剧墖鍒囨崲鍗＄墖 */}
                        <BackgroundSelector onToast={onToast} />

                        {/* 鏍囬鏍忔牱寮忓崱鐗?*/}
                        <NavigationDecorationSelector onToast={onToast} />

                        {/* 鏃堕棿灏忓弸鍗＄墖 */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                                    <span className="text-amber-600 text-lg">馃惥</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-stone-800">鏃堕棿灏忓弸</h3>
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                                {timePalOptions.map((pal) => (
                                    <button
                                        key={pal.id}
                                        className="w-16 h-16 rounded-lg border-2 border-stone-200 hover:border-stone-300 transition-all flex items-center justify-center bg-stone-50"
                                    >
                                        <span className="text-2xl">{pal.icon}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 娴嬭瘯鐢ㄩ噸缃寜閽?*/}
                        <div className="flex justify-center pt-4">
                            <button
                                onClick={handleClearCode}
                                className="text-xs text-stone-300 hover:text-stone-500 px-4 py-2"
                            >
                                [娴嬭瘯鐢╙ 娓呴櫎鍏戞崲鐮佺姸鎬?                            </button>
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
        name: '纭呭熀娴佸姩',
        config: { provider: 'openai', baseUrl: 'https://api.siliconflow.cn/v1', modelName: 'deepseek-ai/deepseek-v3' }
    },
    openai: {
        name: 'OpenAI (鍏煎)',
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

    // 鏍煎紡鍖栨棩鏈熶负8浣嶅瓧绗︿覆 YYYYMMDD
    const formatDateTo8Digits = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    };

    // 瑙ｆ瀽8浣嶅瓧绗︿覆涓烘棩鏈?    const parse8DigitsToDate = (str: string): Date | null => {
        if (str.length !== 8) return null;
        const year = parseInt(str.substring(0, 4));
        const month = parseInt(str.substring(4, 6)) - 1;
        const day = parseInt(str.substring(6, 8));
        const date = new Date(year, month, day);
        if (isNaN(date.getTime())) return null;
        return date;
    };

    // 鍒濆鍖栨棩鏈?    useEffect(() => {
        const today = new Date();
        setExcelStartInput(formatDateTo8Digits(today));
        setExcelEndInput(formatDateTo8Digits(today));
    }, []);

    // Excel瀵煎嚭蹇嵎鏃ユ湡鑼冨洿閫夋嫨
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

    // 鎵цExcel瀵煎嚭
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
            onToast('success', 'Excel瀵煎嚭鎴愬姛');
        } catch (error: any) {
            console.error('Excel瀵煎嚭澶辫触:', error);
            onToast('error', `Excel瀵煎嚭澶辫触: ${error.message}`);
        } finally {
            setIsExportingExcel(false);
        }
    };

    return (
        <>
            {/* 鏃堕棿鑼冨洿 */}
            <div className="space-y-3">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest px-1">鏃堕棿鑼冨洿</p>
                <div className="flex items-center gap-2">
                    <div className="flex-1">
                        <label className="text-xs text-stone-400 mb-1 block px-1">璧峰鏃堕棿</label>
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
                        <label className="text-xs text-stone-400 mb-1 block px-1">缁撴潫鏃堕棿</label>
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

            {/* 蹇嵎鎸夐挳 */}
            <div className="space-y-2">
                <p className="text-xs font-bold text-stone-400 uppercase">蹇嵎閫夋嫨</p>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setExcelQuickRange('today')} className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors">浠婂ぉ</button>
                    <button onClick={() => setExcelQuickRange('yesterday')} className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors">鏄ㄥぉ</button>
                    <button onClick={() => setExcelQuickRange('thisWeek')} className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors">鏈懆</button>
                    <button onClick={() => setExcelQuickRange('lastWeek')} className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors">涓婂懆</button>
                    <button onClick={() => setExcelQuickRange('thisMonth')} className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-colors">鏈湀</button>
                    <button onClick={() => setExcelQuickRange('lastMonth')} className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors">涓婃湀</button>
                    <button onClick={() => setExcelQuickRange('thisYear')} className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors">浠婂勾</button>
                    <button onClick={() => setExcelQuickRange('all')} className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors">鍏ㄩ儴</button>
                </div>
            </div>

            {/* 瀵煎嚭鎸夐挳 */}
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
                        瀵煎嚭涓?..
                    </>
                ) : (
                    <>
                        <FileSpreadsheet size={18} />
                        瀵煎嚭Excel
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
        if (!confirm('杩欏皢鏍规嵁鐜版湁璁板綍閲嶅缓鍥剧墖寮曠敤鍒楄〃锛屽缓璁湪鍚屾鍓嶆墽琛屻€傛槸鍚︾户缁紵')) {
            return;
        }

        setIsCheckingImages(true);
        try {
            const list = await imageService.rebuildReferencedListFromLogs(logs);
            onToast('success', `鍥剧墖鍒楄〃閲嶅缓瀹屾垚锛屽綋鍓嶅紩鐢?${list.length} 寮犲浘鐗嘸);
        } catch (error: any) {
            console.error('淇鍥剧墖鍒楄〃澶辫触:', error);
            onToast('error', `淇澶辫触: ${error.message}`);
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
            onToast('success', '妫€鏌ュ畬鎴?);
        } catch (error: any) {
            console.error('妫€鏌ユ湭寮曠敤鍥剧墖澶辫触:', error);
            onToast('error', `妫€鏌ュけ璐? ${error.message}`);
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

            let message = `娓呯悊瀹屾垚: 鏈湴-${result.deletedLocal}, 杩滅▼-${result.deletedRemote}`;
            if (result.errors.length > 0) {
                message += `, 澶辫触-${result.errors.length}`;
            }

            onToast('success', message);

            // Refresh report
            handleCheckUnreferencedImages();

        } catch (error: any) {
            console.error('娓呯悊鍥剧墖澶辫触:', error);
            onToast('error', `娓呯悊澶辫触: ${error.message}`);
        } finally {
            setIsCleaningImages(false);
        }
    };
    const [isSyncing, setIsSyncing] = useState(false);

    // 鍥剧墖娓呯悊鐩稿叧鐘舵€?    const [isCheckingImages, setIsCheckingImages] = useState(false);
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

    // 妫€娴嬫槸鍚﹀湪 Electron 鐜
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

    // S3閰嶇疆琛ㄥ崟鍙樺寲鏃惰嚜鍔ㄤ繚瀛樺埌localStorage锛堜綔涓鸿崏绋匡級
    useEffect(() => {
        if (s3ConfigForm.bucketName || s3ConfigForm.region || s3ConfigForm.secretId || s3ConfigForm.secretKey) {
            console.log('[SettingsView] 淇濆瓨S3閰嶇疆鑽夌鍒發ocalStorage');
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
            onToast('error', '鎮诞鐞冧粎鏀寔 Android 璁惧');
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
                    onToast('success', '鎮诞鐞冨凡寮€鍚?);
                } else {
                    await FocusNotification.requestFloatingPermission();
                    // Permission result handling requires app resume usually, 
                    // but for simplicity we rely on user manually granting and retrying or plugin handling it.
                    // The plugin requestFloatingPermission typically opens settings.
                    onToast('info', '璇峰湪璁剧疆涓巿浜堟偓娴獥鏉冮檺');
                }
            } else {
                await FocusNotification.stopFloatingWindow();
                onToast('success', '鎮诞鐞冨凡鍏抽棴');
            }
        } catch (error) {
            console.error('Toggle floating window error:', error);
            onToast('error', '鎿嶄綔澶辫触');
            // Revert state on error
            setFloatingWindowEnabled(!newState);
            localStorage.setItem('floating_window_enabled', String(!newState));
        }
    };

    // 缁勪欢鎸傝浇鏃跺姞杞借崏绋块厤缃?    useEffect(() => {
        // 濡傛灉娌℃湁姝ｅ紡閰嶇疆锛屽皾璇曞姞杞借崏绋块厤缃?        if (!s3Config) {
            const draftBucket = localStorage.getItem('lumos_s3_draft_bucket');
            const draftRegion = localStorage.getItem('lumos_s3_draft_region');
            const draftSecretId = localStorage.getItem('lumos_s3_draft_secret_id');
            const draftSecretKey = localStorage.getItem('lumos_s3_draft_secret_key');
            const draftEndpoint = localStorage.getItem('lumos_s3_draft_endpoint');

            if (draftBucket || draftRegion || draftSecretId || draftSecretKey) {
                console.log('[SettingsView] 鍔犺浇S3閰嶇疆鑽夌');
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
        // 鍔犺浇WebDAV閰嶇疆
        const config = webdavService.getConfig();
        const manualWebdavDisconnect = localStorage.getItem('lumos_webdav_manual_disconnect');

        if (config) {
            setConfigForm(config);
            if (manualWebdavDisconnect !== 'true') {
                setWebdavConfig(config);
            }
        }

        // 鍔犺浇S3閰嶇疆 - 娣诲姞鏇村彲闈犵殑鍔犺浇鏈哄埗
        const loadS3Config = () => {
            const s3Config = s3Service.getConfig();
            const manualS3Disconnect = localStorage.getItem('lumos_s3_manual_disconnect');

            console.log('[SettingsView] 鍔犺浇S3閰嶇疆:', s3Config);

            if (s3Config) {
                setS3ConfigForm(s3Config);
                console.log('[SettingsView] S3閰嶇疆宸插姞杞藉埌琛ㄥ崟');
                if (manualS3Disconnect !== 'true') {
                    setS3Config(s3Config);
                }
            } else {
                // 濡傛灉鏈嶅姟涓病鏈夐厤缃紝灏濊瘯鐩存帴浠巐ocalStorage鍔犺浇
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
                    console.log('[SettingsView] 浠巐ocalStorage鍔犺浇S3閰嶇疆:', fallbackConfig);
                    setS3ConfigForm(fallbackConfig);
                    if (manualS3Disconnect !== 'true') {
                        setS3Config(fallbackConfig);
                    }
                }
            }
        };

        // 绔嬪嵆灏濊瘯鍔犺浇
        loadS3Config();

        // 濡傛灉绗竴娆″姞杞藉け璐ワ紝寤惰繜鍐嶈瘯涓€娆?        const timer = setTimeout(loadS3Config, 100);

        // 鍔犺浇AI閰嶇疆
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
            onToast('success', 'WebDAV杩炴帴鎴愬姛');
        } else {
            alert('杩炴帴澶辫触锛岃妫€鏌?URL 鍜屽嚟鎹€?);
        }
        setIsSyncing(false);
    };

    const handleDisconnect = () => {
        // 鍙竻鐞嗘湇鍔′腑鐨勬椿璺冭繛鎺ワ紝淇濈暀localStorage涓殑閰嶇疆缂撳瓨
        webdavService.clearConfig();
        setWebdavConfig(null);
        localStorage.setItem('lumos_webdav_manual_disconnect', 'true');

        console.log('[SettingsView] WebDAV杩炴帴宸叉柇寮€锛屼絾淇濈暀閰嶇疆缂撳瓨渚涗笅娆′娇鐢?);
        onToast('info', '宸叉柇寮€ WebDAV 鏈嶅姟鍣ㄨ繛鎺?(閰嶇疆宸蹭繚瀛?');
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
            onToast('success', '鏁版嵁宸叉垚鍔熶笂浼犺嚦浜戠');
        } catch (error) {
            console.error(error);
            onToast('error', '鏁版嵁涓婁紶澶辫触');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSyncDownload = async () => {
        if (!webdavConfig) return;
        if (!window.confirm("杩欏皢浣跨敤浜戠鐗堟湰瑕嗙洊褰撳墠鏈湴鏁版嵁銆傞鍏堜細灏嗗綋鍓嶆湰鍦版暟鎹殑澶囦唤涓婁紶鍒颁簯绔殑 'backups/' 鐩綍銆傜‘瀹氬悧锛?)) return;

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
                onToast('info', `姝ｅ湪澶囦唤鏈湴鏁版嵁鍒?${backupFilename}...`);
                await webdavService.uploadData(localData, backupFilename);
                onToast('success', '鏈湴鏁版嵁澶囦唤鎴愬姛');
            } catch (backupError: any) {
                console.error('[Settings] Cloud backup failed:', backupError);
                if (!window.confirm(`浜戠澶囦唤澶辫触: ${backupError.message || '鏈煡閿欒'}. 鏄惁缁х画杩樺師? (璀﹀憡: 褰撳墠鏈湴鏁版嵁灏嗕涪澶?`)) {
                    setIsSyncing(false);
                    return;
                }
            }

            const data = await webdavService.downloadData();
            if (data) {
                onSyncUpdate(data);
                onToast('success', '浠庝簯绔仮澶嶆暟鎹垚鍔?);
                // 鍚屾瀹屾垚鍚庡叧闂缃〉闈紝鑷姩鍒锋柊鍒拌剦缁滈〉闈?                setTimeout(() => {
                    onClose();
                }, 1000); // 寤惰繜1绉掕鐢ㄦ埛鐪嬪埌鎴愬姛鎻愮ず
            }
        } catch (error) {
            console.error(error);
            onToast('error', '浠庝簯绔笅杞芥暟鎹け璐?);
        } finally {
            setIsSyncing(false);
        }
    };

    // S3 澶勭悊鍑芥暟
    const handleS3SaveConfig = async () => {
        if (!s3ConfigForm.bucketName || !s3ConfigForm.region || !s3ConfigForm.secretId || !s3ConfigForm.secretKey) {
            onToast('error', '璇峰～鍐欐墍鏈夊繀濉」');
            return;
        }

        // 妫€鏌ecretId鍜孲ecretKey鏄惁鐩稿悓
        if (s3ConfigForm.secretId === s3ConfigForm.secretKey) {
            onToast('error', 'SecretId 鍜?SecretKey 涓嶈兘鐩稿悓锛佽杈撳叆姝ｇ‘鐨?SecretKey');
            return;
        }

        setIsSyncing(true);

        // 淇濆瓨閰嶇疆 (Trim whitespaces)
        const cleanConfig = {
            bucketName: s3ConfigForm.bucketName.trim(),
            region: s3ConfigForm.region.trim(),
            secretId: s3ConfigForm.secretId.trim(),
            secretKey: s3ConfigForm.secretKey.trim(),
            endpoint: s3ConfigForm.endpoint ? s3ConfigForm.endpoint.trim() : ''
        };
        s3Service.saveConfig(cleanConfig);

        // 娴嬭瘯杩炴帴
        const { success, message } = await s3Service.checkConnection();

        if (success) {
            setS3Config(s3ConfigForm);
            localStorage.removeItem('lumos_s3_manual_disconnect'); // Clear manual disconnect flag

            // 淇濆瓨鎴愬姛鍚庢竻鐞嗚崏绋?            localStorage.removeItem('lumos_s3_draft_bucket');
            localStorage.removeItem('lumos_s3_draft_region');
            localStorage.removeItem('lumos_s3_draft_secret_id');
            localStorage.removeItem('lumos_s3_draft_secret_key');
            localStorage.removeItem('lumos_s3_draft_endpoint');
            console.log('[SettingsView] S3閰嶇疆淇濆瓨鎴愬姛锛屾竻鐞嗚崏绋?);
            onToast('success', '鑵捐浜?COS 杩炴帴鎴愬姛');
        } else {
            s3Service.disconnect();
            onToast('error', message || 'COS 杩炴帴澶辫触锛岃妫€鏌ュ嚟鎹?);
        }
        setIsSyncing(false);
    };

    const handleS3Disconnect = () => {
        // 鍙竻鐞嗘湇鍔′腑鐨勬椿璺冭繛鎺ワ紝淇濈暀localStorage涓殑閰嶇疆缂撳瓨
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

        console.log('[SettingsView] S3杩炴帴宸叉柇寮€锛屼絾淇濈暀閰嶇疆缂撳瓨渚涗笅娆′娇鐢?);
        onToast('info', '宸叉柇寮€涓庤吘璁簯 COS 鐨勮繛鎺?(閰嶇疆宸蹭繚瀛?');
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
                console.log(`[Settings] 寮€濮嬪悓姝?${localImageList.length} 寮犲浘鐗囧埌 COS...`);
                const imageResult = await syncService.syncImages(
                    undefined, // no progress callback in settings
                    localImageList,
                    localImageList
                );

                if (imageResult.uploaded > 0 || imageResult.errors.length > 0) {
                    const message = imageResult.errors.length > 0
                        ? `鏁版嵁宸蹭笂浼犮€傚浘鐗? ${imageResult.uploaded} 寮犱笂浼犳垚鍔? ${imageResult.errors.length} 寮犲け璐
                        : `鏁版嵁鍙?${imageResult.uploaded} 寮犲浘鐗囧凡鎴愬姛涓婁紶鑷?COS锛乣;
                    onToast(imageResult.errors.length > 0 ? 'warning' : 'success', message);
                } else {
                    onToast('success', '鏁版嵁宸叉垚鍔熶笂浼犺嚦 COS锛?);
                }
            } else {
                onToast('success', '鏁版嵁宸叉垚鍔熶笂浼犺嚦 COS锛?);
            }
        } catch (error: any) {
            console.error('S3 Upload Error:', error);
            onToast('error', `涓婁紶鏁版嵁鑷?COS 澶辫触: ${error.message || '鏈煡閿欒'}`);
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
        if (!window.confirm("杩欏皢浣跨敤 COS 鐗堟湰瑕嗙洊褰撳墠鏈湴鏁版嵁銆傞鍏堜細灏嗗綋鍓嶆湰鍦版暟鎹殑澶囦唤涓婁紶鍒颁簯绔殑 'backups/' 鐩綍銆傜‘瀹氬悧锛?)) return;

        setIsSyncing(true);
        try {
            // 0. Backup Local Data to Cloud
            try {
                const localData = getFullLocalData();
                if (!localData.logs || !localData.todos) {
                    console.error('[Settings] Critical: Logs or Todos are undefined in backup payload!', localData);
                    alert('閿欒锛氭湰鍦版暟鎹技涔庝负绌?(undefined)銆傚凡涓澶囦唤浠ラ槻姝㈢敤绌烘暟鎹鐩栦簯绔€?);
                    setIsSyncing(false);
                    return;
                }
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const backupFilename = `backups/local_backup_${timestamp}.json`;
                onToast('info', `姝ｅ湪澶囦唤鏈湴鏁版嵁鍒?${backupFilename}...`);
                await s3Service.uploadData(localData, backupFilename);
                onToast('success', '鏈湴鏁版嵁澶囦唤鎴愬姛');
            } catch (backupError: any) {
                console.error('[Settings] Cloud backup failed:', backupError);
                if (!window.confirm(`浜戠澶囦唤澶辫触锛?{backupError.message || '鏈煡閿欒'}. 鏄惁缁х画杩樺師锛?璀﹀憡锛氬綋鍓嶆湰鍦版暟鎹皢涓㈠け)`)) {
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

                        console.log(`[Settings] 寮€濮嬩粠 COS 鍚屾 ${mergedImageList.length} 寮犲浘鐗?..`);
                        const imageResult = await syncService.syncImages(
                            undefined, // no progress callback in settings
                            localImageList,
                            [] // [Fix] Don't assume cloud has these images. Pass empty to force check/upload.
                        );

                        if (imageResult.downloaded > 0 || imageResult.errors.length > 0) {
                            const message = imageResult.errors.length > 0
                                ? `鏁版嵁宸茶繕鍘熴€傚浘鐗? ${imageResult.downloaded} 寮犱笅杞芥垚鍔燂紝${imageResult.errors.length} 寮犲け璐
                                : `鏁版嵁鍙?${imageResult.downloaded} 寮犲浘鐗囧凡鎴愬姛浠?COS 杩樺師锛乣;
                            onToast(imageResult.errors.length > 0 ? 'warning' : 'success', message);
                        } else {
                            onToast('success', '浠?COS 鎭㈠鏁版嵁鎴愬姛锛?);
                        }
                    } else {
                        onToast('success', '浠?COS 鎭㈠鏁版嵁鎴愬姛锛?);
                    }
                } catch (imageError) {
                    console.warn('[Settings] 鍥剧墖鍚屾澶辫触:', imageError);
                    onToast('warning', '鏁版嵁宸叉仮澶嶏紝浣嗗浘鐗囧悓姝ュけ璐?);
                }
            }
        } catch (error) {
            console.error(error);
            onToast('error', '浠?COS 涓嬭浇鏁版嵁澶辫触');
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
            let actIcon = '馃摑';

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
            // 鎬绘槸鑾峰彇鏈€鏂扮増鏈俊鎭苟鏄剧ず妯℃€佹
            const versionData = await UpdateService.checkForUpdates();

            if (versionData) {
                setUpdateInfo(versionData);
                setShowUpdateModal(true);
            } else {
                // 妫€鏌ュけ璐?                onToast('error', '妫€鏌ユ洿鏂板け璐ワ紝璇风◢鍚庨噸璇?);
            }
        } catch (error) {
            console.error('妫€鏌ユ洿鏂板嚭閿?', error);
            onToast('error', '妫€鏌ユ洿鏂板け璐ワ紝璇锋鏌ョ綉缁滆繛鎺?);
        } finally {
            setIsCheckingUpdate(false);
        }
    };

    const handleDownloadUpdate = () => {
        if (updateInfo?.updateUrl) {
            UpdateService.openUpdateUrl(updateInfo.updateUrl);
            setShowUpdateModal(false);
            onToast('info', '宸插湪娴忚鍣ㄤ腑鎵撳紑涓嬭浇椤甸潰');
        }
    };

    // Filter 澶勭悊鍑芥暟
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
            onToast('error', '璇疯緭鍏ョ瓫閫夊櫒鍚嶇О');
            return;
        }
        if (!filterExpression.trim()) {
            onToast('error', '璇疯緭鍏ョ瓫閫夋潯浠?);
            return;
        }

        const updatedFilters = [...(filters || [])];
        if (editingFilter) {
            // 缂栬緫鐜版湁绛涢€夊櫒
            const index = updatedFilters.findIndex(f => f.id === editingFilter.id);
            if (index !== -1) {
                updatedFilters[index] = {
                    ...editingFilter,
                    name: filterName.trim(),
                    filterExpression: filterExpression.trim()
                };
            }
        } else {
            // 鏂板缓绛涢€夊櫒
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
        onToast('success', editingFilter ? '绛涢€夊櫒宸叉洿鏂? : '绛涢€夊櫒宸插垱寤?);
    };

    const handleDeleteFilter = (id: string) => {
        setDeletingFilterId(id);
    };

    const confirmDeleteFilter = () => {
        if (!deletingFilterId) return;
        const updatedFilters = (filters || []).filter(f => f.id !== deletingFilterId);
        onUpdateFilters?.(updatedFilters);
        setDeletingFilterId(null);
        onToast('success', '绛涢€夊櫒宸插垹闄?);
    };

    // 鍥剧墖娓呯悊鍔熻兘



    const handleCleanupCloudBackups = async () => {
        const webdavConfig = webdavService.getConfig();
        const s3Config = s3Service.getConfig();
        const activeService = s3Config ? s3Service : (webdavConfig ? webdavService : null);

        if (!activeService) {
            onToast('error', '鏈繛鎺ヤ簯绔湇鍔?(WebDAV 鎴?S3)');
            return;
        }

        if (!confirm('纭畾瑕佹竻鐞嗕簯绔浠藉悧锛焅n\n杩欏皢妫€鏌?"backups" 鏂囦欢澶癸紝鍙繚鐣欐渶鏂扮殑涓€涓浠芥枃浠讹紝鍏朵綑鐨勫皢琚案涔呭垹闄ゃ€俓n姝ゆ搷浣滀笉鍙挙閿€銆?)) {
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
                onToast('info', '浜戠 backups 鏂囦欢澶逛负绌烘垨鏃犳硶璇诲彇');
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
                onToast('info', `鏃犻渶娓呯悊锛氬綋鍓嶄粎鍙戠幇 ${backupFiles.length} 涓浠芥枃浠禶);
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

            onToast('success', `娓呯悊瀹屾垚锛氬凡淇濈暀 ${latest.name}锛屽垹闄や簡 ${deletedCount} 涓巻鍙插浠絗);

        } catch (error: any) {
            console.error('Cleanup failed:', error);
            onToast('error', `娓呯悊澶辫触: ${error.message}`);
        } finally {
            setIsCleaningBackups(false);
        }
    };



    // Filters瀛愰〉闈?    if (activeSubmenu === 'memoir_filter') {
        return <MemoirSettingsView onBack={() => setActiveSubmenu('main')} />;
    }

    if (activeSubmenu === 'filters') {
        // 濡傛灉閫変腑浜嗙瓫閫夊櫒,鏄剧ず璇︽儏椤?        if (selectedFilter) {
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
                    <span className="text-stone-800 font-bold text-lg">鑷畾涔夌瓫閫夊櫒</span>
                </div>

                <div className="p-4 space-y-4 overflow-y-auto pb-40">
                    <div className="flex justify-end mb-2">
                        <button
                            onClick={handleAddFilter}
                            className="flex items-center gap-1 px-3 py-1.5 bg-stone-800 text-white text-xs font-bold rounded-lg hover:bg-stone-700 active:scale-95 transition-all"
                        >
                            <PlusCircle size={14} />
                            <span>鏂板缓</span>
                        </button>
                    </div>

                    {(filters || []).length === 0 ? (
                        <div className="p-12 text-center text-stone-400 bg-white rounded-2xl shadow-sm">
                            <span className="text-4xl block mb-3 opacity-30 text-stone-800">鈥?/span>
                            <p className="text-sm">杩樻病鏈夎嚜瀹氫箟绛涢€夊櫒</p>
                            <p className="text-xs mt-1">鐐瑰嚮鍙充笂瑙?鏂板缓"鍒涘缓绗竴涓瓫閫夊櫒</p>
                        </div>
                    ) : (
                        <div>
                            {(filters || []).map((filter, idx) => {
                                // 璁＄畻绛涢€夌粺璁?                                const stats = getFilterStats(
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
                                                    <span className="text-stone-800 font-bold text-base flex-shrink-0">鈥?/span>
                                                    <h4 className="font-bold text-stone-800 text-sm">{filter.name}</h4>
                                                </div>
                                                <p className="text-xs text-stone-500 font-mono break-all mb-2">
                                                    {filter.filterExpression}
                                                </p>
                                                <div className="flex items-center gap-3 text-[10px] text-stone-400">
                                                    <span>{stats.count} 鏉¤褰?/span>
                                                    <span>鈥?/span>
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

                {/* 鏂板缓/缂栬緫绛涢€夊櫒 Modal */}
                {showAddFilterModal && (
                    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between p-4 border-b border-stone-100">
                                <h3 className="font-bold text-lg text-stone-800">
                                    {editingFilter ? '缂栬緫绛涢€夊櫒' : '鏂板缓绛涢€夊櫒'}
                                </h3>
                                <button onClick={() => setShowAddFilterModal(false)} className="p-1 text-stone-400 hover:text-stone-600">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-4 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-stone-600 mb-1.5">绛涢€夊櫒鍚嶇О</label>
                                    <input
                                        type="text"
                                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-800 outline-none focus:border-stone-400"
                                        placeholder="渚嬪:鐟滀冀璁粌"
                                        value={filterName}
                                        onChange={e => setFilterName(e.target.value)}
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-stone-600 mb-1.5">绛涢€夎〃杈惧紡</label>
                                    <input
                                        type="text"
                                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-800 font-mono outline-none focus:border-stone-400"
                                        placeholder="渚嬪:鐟滀冀 OR 璺戞 #杩愬姩 %鍋ュ悍 OR 宸ヤ綔"
                                        value={filterExpression}
                                        onChange={e => setFilterExpression(e.target.value)}
                                    />
                                    <p className="text-[10px] text-stone-400 mt-1.5">
                                        # 鏍囩, % 棰嗗煙, @ 浠ｅ姙, 鏃犵鍙?澶囨敞, OR 琛ㄧず"鎴?
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 border-t border-stone-100 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowAddFilterModal(false)}
                                    className="px-4 py-2 text-sm font-bold text-stone-500 hover:bg-stone-100 rounded-xl transition-colors"
                                >
                                    鍙栨秷
                                </button>
                                <button
                                    onClick={handleSaveFilter}
                                    className="px-6 py-2 text-sm font-bold text-white bg-stone-800 hover:bg-stone-700 rounded-xl shadow-md transition-colors"
                                >
                                    淇濆瓨
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 鍒犻櫎纭 Modal */}
                <ConfirmModal
                    isOpen={!!deletingFilterId}
                    onClose={() => setDeletingFilterId(null)}
                    onConfirm={confirmDeleteFilter}
                    title="鍒犻櫎绛涢€夊櫒"
                    description="纭畾瑕佸垹闄よ繖涓瓫閫夊櫒鍚?姝ゆ搷浣滄棤娉曟挙閿€銆?
                    confirmText="鍒犻櫎"
                    cancelText="鍙栨秷"
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
                                <label className="text-xs font-bold text-stone-400 uppercase ml-1">蹇€熼璁?(Presets)</label>
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
                                <label className="text-xs font-bold text-stone-400 uppercase ml-1">鎺ュ彛鍦板潃 (Base URL)</label>
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
                                <label className="text-xs font-bold text-stone-400 uppercase ml-1">API 瀵嗛挜 (Key)</label>
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
                                <label className="text-xs font-bold text-stone-400 uppercase ml-1">妯″瀷鍚嶇О (Model)</label>
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

                                {aiTestStatus === 'testing' && "娴嬭瘯涓?.."}
                                {aiTestStatus === 'success' && "杩炴帴鎴愬姛"}
                                {aiTestStatus === 'error' && "杩炴帴澶辫触 - 璇锋鏌ラ厤缃?}
                                {aiTestStatus === 'idle' && "淇濆瓨骞舵祴璇曡繛鎺?}
                            </button>
                            <p className="text-[10px] text-center text-stone-400 mt-3">
                                闅愮璇存槑锛氭偍鐨勮緭鍏ュ拰鏍囩灏嗗彂閫佽嚦閰嶇疆鐨?AI 鏈嶅姟鍟嗭紝鏈湴鏈嶅姟鍣ㄤ笉瀛樺偍浠讳綍鏁版嵁銆?                            </p>
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

                                    {/* 瀹屽叏娓呯悊閰嶇疆鎸夐挳 */}
                                    <button
                                        onClick={() => {
                                            if (confirm('纭畾瑕佸畬鍏ㄦ竻鐞哤ebDAV閰嶇疆鍚楋紵杩欏皢鍒犻櫎鎵€鏈変繚瀛樼殑閰嶇疆淇℃伅锛屼笅娆￠渶瑕侀噸鏂拌緭鍏ャ€?)) {
                                                webdavService.clearAllConfig();
                                                setWebdavConfig(null);
                                                setConfigForm({ url: '', username: '', password: '' });
                                                console.log('[SettingsView] WebDAV閰嶇疆宸插畬鍏ㄦ竻鐞?);
                                                onToast('info', 'WebDAV configuration completely cleared');
                                            }
                                        }}
                                        className="flex items-center justify-center gap-2 w-full py-2 mt-1 text-red-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors text-xs"
                                    >
                                        <Trash2 size={14} />
                                        瀹屽叏娓呯悊閰嶇疆
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="text-sm text-stone-500 leading-relaxed space-y-2">
                                    <p>Connect to any WebDAV compatible storage (e.g., Nextcloud, Nutstore).</p>
                                    <div className="bg-blue-50 text-blue-700 p-3 rounded-xl text-xs space-y-1">
                                        <p className="font-bold">鈿狅笍 閰嶇疆璇存槑锛?/p>
                                        <p>1. 璇峰湪缃戠洏鏍圭洰褰曟柊寤?<b>Lumostime</b> 鏂囦欢澶广€?/p>
                                        <p>2. 鍦?Lumostime 鏂囦欢澶瑰唴鏂板缓 <b>backups</b> 鍜?<b>images</b> 涓や釜瀛愭枃浠跺す銆?/p>
                                        <p>3. 涓嬫柟 URL 璇峰～鍐欏埌 Lumostime 鏂囦欢澶瑰眰绾с€?/p>
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

                                    {/* 瀹屽叏娓呯悊閰嶇疆鎸夐挳 */}
                                    <button
                                        onClick={() => {
                                            if (confirm('纭畾瑕佸畬鍏ㄦ竻鐞哠3閰嶇疆鍚楋紵杩欏皢鍒犻櫎鎵€鏈変繚瀛樼殑閰嶇疆淇℃伅锛屼笅娆￠渶瑕侀噸鏂拌緭鍏ャ€?)) {
                                                s3Service.clearConfig();
                                                setS3Config(null);
                                                setS3ConfigForm({ bucketName: '', region: '', secretId: '', secretKey: '', endpoint: '' });
                                                // 鍚屾椂娓呯悊鑽夌
                                                localStorage.removeItem('lumos_s3_draft_bucket');
                                                localStorage.removeItem('lumos_s3_draft_region');
                                                localStorage.removeItem('lumos_s3_draft_secret_id');
                                                localStorage.removeItem('lumos_s3_draft_secret_key');
                                                localStorage.removeItem('lumos_s3_draft_endpoint');
                                                console.log('[SettingsView] S3閰嶇疆宸插畬鍏ㄦ竻鐞?);
                                                onToast('info', 'S3 configuration completely cleared');
                                            }
                                        }}
                                        className="flex items-center justify-center gap-2 w-full py-2 mt-1 text-red-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors text-xs"
                                    >
                                        <Trash2 size={14} />
                                        瀹屽叏娓呯悊閰嶇疆
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
                                                placeholder="璇疯緭鍏?SecretId"
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
                                                placeholder="璇疯緭鍏?SecretKey"
                                                className="flex-1 bg-transparent border-none outline-none text-stone-700 placeholder:text-stone-300 text-sm"
                                                value={s3ConfigForm.secretKey}
                                                onChange={e => setS3ConfigForm(prev => ({ ...prev, secretKey: e.target.value }))}
                                            />
                                        </div>
                                        {s3ConfigForm.secretId && s3ConfigForm.secretKey &&
                                            s3ConfigForm.secretId === s3ConfigForm.secretKey && (
                                                <p className="text-xs text-red-500 mt-1 ml-1">
                                                    鈿狅笍 SecretId鍜孲ecretKey涓嶈兘鐩稿悓锛佽杈撳叆涓嶅悓鐨凷ecretKey
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



                                    {/* 娓呯悊鑽夌鎸夐挳 */}
                                    {(s3ConfigForm.bucketName || s3ConfigForm.region || s3ConfigForm.secretId || s3ConfigForm.secretKey) && !s3Config && (
                                        <button
                                            onClick={() => {
                                                setS3ConfigForm({ bucketName: '', region: '', secretId: '', secretKey: '', endpoint: '' });
                                                localStorage.removeItem('lumos_s3_draft_bucket');
                                                localStorage.removeItem('lumos_s3_draft_region');
                                                localStorage.removeItem('lumos_s3_draft_secret_id');
                                                localStorage.removeItem('lumos_s3_draft_secret_key');
                                                localStorage.removeItem('lumos_s3_draft_endpoint');
                                                console.log('[SettingsView] 鎵嬪姩娓呯悊S3閰嶇疆鑽夌');
                                                onToast('info', '宸叉竻鐞嗛厤缃崏绋?);
                                            }}
                                            className="flex items-center justify-center gap-2 w-full py-2 mt-1 text-stone-500 hover:text-stone-600 hover:bg-stone-50 rounded-lg transition-colors text-xs"
                                        >
                                            <Trash2 size={14} />
                                            娓呯悊鑽夌
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
        onToast('success', '涓汉淇℃伅宸蹭繚瀛?);
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
        onToast('success', '妯℃澘宸插垹闄?);
    };

    const handleSaveTemplate = () => {
        if (!modalTitle.trim()) {
            setModalError('鏍囬涓嶈兘涓虹┖');
            return;
        }
        if (!modalPrompt.trim()) {
            setModalError('鎻愮ず璇嶄笉鑳戒负绌?);
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
        onToast('success', editingTemplate ? '妯℃澘宸叉洿鏂? : '鏂版ā鏉垮凡鍒涘缓');
    };

    const { categories } = syncData;

    if (activeSubmenu === 'auto_record') {
        return <AutoRecordSettingsView
            onBack={() => setActiveSubmenu('main')}
            categories={categories || []}
        />;
    }

    if (activeSubmenu === 'obsidian_export') {
        // 鑾峰彇褰撳ぉ鐨?dailyReview
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
                    <span className="text-stone-800 font-bold text-lg">鏁版嵁瀵煎嚭瀵煎叆</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-40">
                    <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-3 text-stone-600 mb-2">
                            <Database size={24} />
                            <h3 className="font-bold text-lg">澶囦唤涓庢仮澶?/h3>
                        </div>
                        <p className="text-sm text-stone-500 mb-4 leading-relaxed">
                            灏嗘偍鐨勬墍鏈夋暟鎹紙鏃堕棿璁板綍銆佸緟鍔炰簨椤广€佸垎绫昏缃瓑锛夊鍑轰负 JSON 鏂囦欢锛屾垨浠庡浠芥枃浠朵腑鎭㈠鏁版嵁銆?                        </p>

                        <div className="grid grid-cols-1 gap-3">
                            <button
                                onClick={onExport}
                                className="flex items-center justify-center gap-2 w-full py-3 bg-stone-800 text-white rounded-xl font-medium active:scale-[0.98] transition-transform"
                            >
                                <Download size={18} />
                                瀵煎嚭鏁版嵁澶囦唤
                            </button>

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center justify-center gap-2 w-full py-3 bg-white border border-stone-200 text-stone-700 rounded-xl font-medium active:scale-[0.98] transition-transform hover:bg-stone-50"
                            >
                                <Upload size={18} />
                                瀵煎叆鏁版嵁澶囦唤
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
                                {confirmReset ? "纭閲嶇疆锛熸鎿嶄綔涓嶅彲鎾ら攢" : "閲嶇疆鎵€鏈夋暟鎹负榛樿鍊?}
                            </button>

                            <button
                                onClick={handleClearClick}
                                className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium active:scale-[0.98] transition-all mt-3 ${confirmClear
                                    ? 'bg-red-600 text-white shadow-lg shadow-red-200'
                                    : 'bg-white border border-red-200 text-red-500 hover:bg-red-50'
                                    }`}
                            >
                                <Trash2 size={18} />
                                {confirmClear ? "纭娓呯┖锛熷皢琚案涔呭垹闄? : "娓呯┖鎵€鏈夋暟鎹?}
                            </button>
                        </div>
                    </div>


                    {/* 浜戠澶囦唤娓呯悊鍗＄墖 */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-3 text-stone-600 mb-2">
                            <Cloud size={24} />
                            <h3 className="font-bold text-lg">浜戠澶囦唤娓呯悊</h3>
                        </div>
                        <p className="text-sm text-stone-500 mb-4 leading-relaxed">
                            妫€鏌ヤ簯绔瓨鍌紙WebDAV/S3锛夌殑 backups 鏂囦欢澶癸紝淇濈暀鏈€鏂扮殑涓€涓浠斤紝娓呯悊鎵€鏈夋棫澶囦唤浠ヨ妭鐪佺┖闂淬€?                        </p>

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
                                    娓呯悊涓?..
                                </>
                            ) : (
                                <>
                                    <Trash2 size={18} />
                                    娓呯悊鏃у浠斤紙鍙繚鐣欐渶鏂帮級
                                </>
                            )}
                        </button>
                    </div>

                    {/* Excel瀵煎嚭鍗＄墖 */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-3 text-stone-600 mb-2">
                            <FileSpreadsheet size={24} />
                            <h3 className="font-bold text-lg">瀵煎嚭涓簒lsx</h3>
                        </div>
                        <p className="text-sm text-stone-500 mb-4 leading-relaxed">
                            閫夋嫨鏃ユ湡鑼冨洿骞跺鍑烘椂闂磋褰曞埌Excel鏂囦欢
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

                    {/* 鍥剧墖娓呯悊鍗＄墖 */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-3 text-stone-800 mb-2">
                            <ImageIcon size={24} />
                            <h3 className="font-bold text-lg">鍥剧墖绠＄悊</h3>
                        </div>
                        <p className="text-sm text-stone-500 mb-4 leading-relaxed">
                            妫€鏌ュ苟娓呯悊鏈涓撴敞璁板綍寮曠敤鐨勫浘鐗囷紝閲婃斁瀛樺偍绌洪棿
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
                                        淇涓?..
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw size={18} />
                                        淇鍥剧墖鍒楄〃
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
                                        妫€鏌ヤ腑...
                                    </>
                                ) : (
                                    <>
                                        <Search size={18} />
                                        妫€鏌ユ湭寮曠敤鍥剧墖
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
                                        娓呯悊涓?..
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={18} />
                                        鎵ц娓呯悊锛堝垹闄ゅ浘鐗囷級
                                    </>
                                )}
                            </button>
                        </div>

                        {/* 鏄剧ず娓呯悊鎶ュ憡 */}
                        {imageCleanupReport && (
                            <div className="mt-4 p-4 bg-stone-50 rounded-xl">
                                <h4 className="font-medium text-stone-700 mb-2">娓呯悊鎶ュ憡</h4>
                                <div className="text-sm text-stone-600 whitespace-pre-line max-h-40 overflow-y-auto">
                                    {imageCleanupReport}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 鍥剧墖娓呯悊纭妯℃€佹 */}
                <ConfirmModal
                    isOpen={isImageCleanupConfirmOpen}
                    onClose={() => setIsImageCleanupConfirmOpen(false)}
                    onConfirm={handleConfirmImageCleanup}
                    title="纭鍒犻櫎鍥剧墖"
                    description="纭畾瑕佸垹闄ゆ墍鏈夋湭寮曠敤鐨勫浘鐗囧悧锛熸鎿嶄綔灏嗗悓鏃跺垹闄ゆ湰鍦板拰杩滅▼鍥剧墖锛屼笖鏃犳硶鎾ら攢锛?
                    confirmText="鍒犻櫎"
                    cancelText="鍙栨秷"
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
                    <span className="text-stone-800 font-bold text-lg">鍋忓ソ璁剧疆</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-40">
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

                        {/* Start Week Toggle */}
                        <div className="flex items-center justify-between p-4 border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors">
                            <div>
                                <h4 className="font-bold text-stone-700">浠庡懆鏃ュ紑濮?/h4>
                                <p className="text-xs text-stone-400 mt-1">鏃ュ巻瑙嗗浘姣忓懆绗竴澶╁皢璁句负鍛ㄦ棩</p>
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
                                <h4 className="font-bold text-stone-700">姣忔棩鍥為【鏃堕棿</h4>
                                <p className="text-xs text-stone-400 mt-1">鍒拌揪璇ユ椂闂村悗锛屾椂闂磋酱灏嗘樉绀轰粖鏃ュ洖椤捐妭鐐?/p>
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
                                <h4 className="font-bold text-stone-700">姣忓懆鍥為【鏃堕棿</h4>
                                <p className="text-xs text-stone-400 mt-1">鍒拌揪璇ユ椂闂村悗锛屾椂闂磋酱灏嗗湪姣忓懆鏈€鍚庝竴澶╂樉绀烘湰鍛ㄥ洖椤捐妭鐐?/p>
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
                                        // 鍛ㄦ姤鏃堕棿鏍煎紡锛氭€绘槸瀛樺偍涓?0-<time>"锛?琛ㄧず鏈€鍚庝竴澶?                                        onSetWeeklyReviewTime?.(`0-${val}`);
                                    }}
                                    onFocus={(e) => e.target.select()}
                                    className="bg-stone-100 border-none rounded-lg px-3 py-1.5 text-sm font-bold text-stone-700 focus:outline-none focus:ring-0 focus:bg-stone-200 transition-colors w-20 text-center tracking-widest font-mono"
                                />
                            </div>
                        </div>

                        {/* Monthly Review Time */}
                        <div className="flex items-center justify-between p-4 border-b border-stone-100 hover:bg-stone-50 transition-colors">
                            <div>
                                <h4 className="font-bold text-stone-700">姣忔湀鍥為【鏃堕棿</h4>
                                <p className="text-xs text-stone-400 mt-1">鍒拌揪璇ユ椂闂村悗锛屾椂闂磋酱灏嗗湪姣忔湀鏈€鍚庝竴澶╂樉绀烘湰鏈堝洖椤捐妭鐐?/p>
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
                                        // 鏈堟姤鏃堕棿鏍煎紡锛氭€绘槸瀛樺偍涓?0-<time>"锛?琛ㄧず鏈€鍚庝竴澶?                                        onSetMonthlyReviewTime?.(`0-${val}`);
                                    }}
                                    onFocus={(e) => e.target.select()}
                                    className="bg-stone-100 border-none rounded-lg px-3 py-1.5 text-sm font-bold text-stone-700 focus:outline-none focus:ring-0 focus:bg-stone-200 transition-colors w-20 text-center tracking-widest font-mono"
                                />
                            </div>
                        </div>

                        {/* Auto-focus Note Toggle */}
                        <div className="flex items-center justify-between p-4 border-b border-stone-100 hover:bg-stone-50 transition-colors">
                            <div>
                                <h4 className="font-bold text-stone-700">鑷姩鑱氱劍澶囨敞</h4>
                                <p className="text-xs text-stone-400 mt-1">鏂板缓璁板綍鎴栦笓娉ㄦ椂鑷姩寮瑰嚭閿洏</p>
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
                                <h4 className="font-bold text-stone-700">鏈€灏忕┖闂叉椂闂撮殣钘忛槇鍊?/h4>
                                <p className="text-xs text-stone-400 mt-1">灏忎簬姝ゅ垎閽熸暟鐨勭┖闂叉椂闂村皢涓嶆樉绀猴紙鍒嗛挓锛?/p>
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
                                <h4 className="font-bold text-stone-700">鍚姩榛樿椤?/h4>
                                <p className="text-xs text-stone-400 mt-1">搴旂敤鍚姩鏃堕粯璁ゆ樉绀虹殑椤甸潰</p>
                            </div>
                            <div className="relative">
                                <button
                                    onClick={() => setIsDefaultViewDropdownOpen(!isDefaultViewDropdownOpen)}
                                    className="flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-bold px-4 py-2 rounded-lg transition-colors"
                                >
                                    <span>
                                        {defaultView === 'RECORD' && '璁板綍'}
                                        {defaultView === 'TODO' && '寰呭姙'}
                                        {defaultView === 'TIMELINE' && '鑴夌粶'}
                                        {defaultView === 'REVIEW' && '妗ｆ'}
                                        {defaultView === 'TAGS' && '绱㈠紩'}
                                        {defaultView === 'STATS' && '缁熻椤?}
                                        {/* Fallback for legacy 'SCOPE' or others if set */}
                                        {defaultView === 'SCOPE' && '棰嗗煙'}
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
                                                { label: '璁板綍', value: 'RECORD' },
                                                { label: '寰呭姙', value: 'TODO' },
                                                { label: '鑴夌粶', value: 'TIMELINE' },
                                                { label: '妗ｆ', value: 'REVIEW' },
                                                { label: '绱㈠紩', value: 'TAGS' },
                                                { label: '缁熻椤?, value: 'STATS' }
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
                                <h4 className="font-bold text-stone-700">妗ｆ椤甸粯璁ら〉闈?/h4>
                                <p className="text-xs text-stone-400 mt-1">杩涘叆妗ｆ椤垫椂榛樿鏄剧ず鐨勮鍥?/p>
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
                                <h4 className="font-bold text-stone-700">绱㈠紩椤甸粯璁ら〉闈?/h4>
                                <p className="text-xs text-stone-400 mt-1">杩涘叆绱㈠紩椤垫椂榛樿鏄剧ず鐨勮鍥?/p>
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
                    <span className="text-stone-800 font-bold text-lg">鐢ㄦ埛鎸囧崡</span>
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
                                        <h3 className="font-bold text-stone-800">蹇€熸墦鐐?(Quick Punch)</h3>
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
                                        <h3 className="font-bold text-stone-800">鎸囧畾娲诲姩 (Start Activity)</h3>
                                        <p className="text-xs text-stone-400">Write a tag to start a specific activity.</p>
                                    </div>
                                </div>

                                {/* Category Select */}
                                <CustomSelect
                                    label="Category (娲诲姩鍒嗙被)"
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
                                    label="Activity (鍏蜂綋娲诲姩)"
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
                                        <h3 className="font-bold text-stone-800">璇诲彇娴嬭瘯 (Read / Test)</h3>
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
                    <span className="text-stone-800 font-bold text-lg">AI 鍙欎簨璁惧畾</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 pb-40">
                    {/* User Personal Info Section */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                                <User size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-stone-800 text-[15px]">涓汉淇℃伅</h4>
                                <p className="text-xs text-stone-400 mt-0.5">璁?AI 浜嗚В浣犵殑鑳屾櫙锛岀敓鎴愭洿璐村悎鐨勫彊浜?/p>
                            </div>
                        </div>

                        <textarea
                            className={`w-full h-32 bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs text-stone-600 outline-none focus:border-stone-400 resize-none leading-relaxed ${isPrivacyMode ? 'blur-sm select-none transition-all duration-500' : 'transition-all duration-500'}`}
                            value={localUserInfo}
                            onChange={(e) => setLocalUserInfo(e.target.value)}
                            placeholder="渚嬪锛氭垜鏄竴鍚嶆鍦ㄦ敾璇诲崥澹浣嶇殑鐮旂┒鐢?.."
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
                                淇濆瓨淇℃伅
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
                                    <h4 className="font-bold text-stone-800 text-[15px]">鑷畾涔夊彊浜嬫ā鏉?/h4>
                                    <p className="text-xs text-stone-400 mt-0.5">绠＄悊浣犺嚜宸卞垱寤虹殑鍙欎簨椋庢牸</p>
                                </div>
                            </div>
                            <button
                                onClick={handleAddTemplate}
                                className="px-3 py-1.5 bg-stone-800 text-white text-xs font-bold rounded-lg flex items-center gap-1 hover:bg-stone-700 transition-colors"
                            >
                                <PlusCircle size={14} />
                                鏂板缓妯℃澘
                            </button>
                        </div>

                        <div className="space-y-3">
                            {(!customNarrativeTemplates || customNarrativeTemplates.length === 0) && (
                                <div className="text-center py-8 text-stone-400 text-xs bg-stone-50 rounded-xl border border-dashed border-stone-200">
                                    杩樻病鏈夊垱寤鸿嚜瀹氫箟妯℃澘<br />鐐瑰嚮鍙充笂瑙掑垱寤轰綘鐨勪笓灞為鏍?                                </div>
                            )}

                            {customNarrativeTemplates?.map(template => (
                                <div key={template.id} className="p-4 bg-stone-50 rounded-xl border border-stone-100 flex items-start justify-between group hover:border-stone-300 transition-colors">
                                    <div>
                                        <h5 className="font-bold text-stone-800 text-sm">{template.title}</h5>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {/* Legacy compatibility: default to Daily if undefined */}
                                            {(template.isDaily !== false) && (
                                                <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded border border-stone-200">姣忔棩</span>
                                            )}
                                            {template.isWeekly && (
                                                <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded border border-stone-200">姣忓懆</span>
                                            )}
                                            {template.isMonthly && (
                                                <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded border border-stone-200">姣忔湀</span>
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
                                    {editingTemplate ? '缂栬緫妯℃澘' : '鍒涘缓鏂版ā鏉?}
                                </h3>
                                <button onClick={() => setShowAddTemplateModal(false)} className="p-1 text-stone-400 hover:text-stone-600">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-4 space-y-4 overflow-y-auto flex-1">
                                <div>
                                    <label className="block text-xs font-bold text-stone-600 mb-1.5">妯℃澘鍚嶇О</label>
                                    <input
                                        type="text"
                                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-800 outline-none focus:border-stone-400"
                                        placeholder="渚嬪锛氬彂鏈嬪弸鍦堥鏍?
                                        value={modalTitle}
                                        onChange={e => setModalTitle(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-stone-600 mb-1.5">绠€鐭弿杩?/label>
                                    <input
                                        type="text"
                                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-800 outline-none focus:border-stone-400"
                                        placeholder="渚嬪锛歟moji澶氫竴鐐癸紝璇皵杞绘澗"
                                        value={modalDesc}
                                        onChange={e => setModalDesc(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-stone-600 mb-1.5">閫傜敤鍛ㄦ湡 (Applicability)</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setModalIsDaily(!modalIsDaily)}
                                            className={`px-2 py-3 rounded-xl text-xs font-bold text-center border transition-all flex items-center justify-center gap-1.5 truncate ${modalIsDaily
                                                ? 'bg-stone-900 text-white border-stone-900 shadow-md transform scale-[1.02]'
                                                : 'bg-stone-50 text-stone-500 border-stone-100 hover:bg-stone-100'
                                                }`}
                                        >
                                            <span className="text-sm">鈽€锔?/span>
                                            <span className="truncate">姣忔棩</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setModalIsWeekly(!modalIsWeekly)}
                                            className={`px-2 py-3 rounded-xl text-xs font-bold text-center border transition-all flex items-center justify-center gap-1.5 truncate ${modalIsWeekly
                                                ? 'bg-stone-900 text-white border-stone-900 shadow-md transform scale-[1.02]'
                                                : 'bg-stone-50 text-stone-500 border-stone-100 hover:bg-stone-100'
                                                }`}
                                        >
                                            <span className="text-sm">馃搮</span>
                                            <span className="truncate">姣忓懆</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setModalIsMonthly(!modalIsMonthly)}
                                            className={`px-2 py-3 rounded-xl text-xs font-bold text-center border transition-all flex items-center justify-center gap-1.5 truncate ${modalIsMonthly
                                                ? 'bg-stone-900 text-white border-stone-900 shadow-md transform scale-[1.02]'
                                                : 'bg-stone-50 text-stone-500 border-stone-100 hover:bg-stone-100'
                                                }`}
                                        >
                                            <span className="text-sm">馃寵</span>
                                            <span className="truncate">姣忔湀</span>
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="block text-xs font-bold text-stone-600">鍙欎簨椋庢牸鎻忚堪 (Narrative Persona)</label>
                                    </div>
                                    <textarea
                                        className={`w-full h-48 bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs font-mono text-stone-600 outline-none focus:border-stone-400 resize-none leading-relaxed ${isPrivacyMode ? 'blur-sm select-none transition-all duration-500' : 'transition-all duration-500'}`}
                                        placeholder="渚嬪锛氫綘鏄竴涓菇榛樼殑鑴卞彛绉€婕斿憳锛岃鐢ㄥじ寮犲拰璋冧緝鐨勮姘旂偣璇勬垜浠婂ぉ鐨勬椂闂磋褰?.."
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
                                    鍙栨秷
                                </button>
                                <button
                                    onClick={handleSaveTemplate}
                                    className="px-6 py-2 text-sm font-bold text-white bg-stone-800 hover:bg-stone-700 rounded-xl shadow-md transition-colors"
                                >
                                    淇濆瓨
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
                    title="鍒犻櫎鑷畾涔夊彊浜?
                    description="纭畾瑕佸垹闄よ繖涓彊浜嬮鏍煎悧锛熸鎿嶄綔鏃犳硶鎾ら攢銆?
                    confirmText="鍒犻櫎"
                    cancelText="鍙栨秷"
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
                <span className="text-stone-800 font-bold text-lg">璁剧疆</span>
                <div className="w-8"></div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-40">

                {/* Section: General */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider pl-2">閫氱敤</h3>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                        <MenuItem
                            icon={<Search size={18} className="text-green-500" />}
                            label="鎼滅储鍏ㄩ儴"
                            onClick={() => {
                                onOpenSearch?.();
                            }}
                        />
                        <MenuItem
                            icon={<Hash size={18} className="text-amber-500" />}
                            label="鑷畾涔夌瓫閫夊櫒"
                            onClick={() => setActiveSubmenu('filters')}
                        />
                        <MenuItem
                            icon={<Sparkles size={18} className="text-purple-500" />}
                            label="AI API"
                            onClick={() => setActiveSubmenu('ai')}
                        />
                        <MenuItem
                            icon={<Link size={18} className="text-blue-500" />}
                            label="鏍囩鍏宠仈棰嗗煙瑙勫垯"
                            onClick={() => setActiveSubmenu('autolink')}
                        />
                        <MenuItem
                            icon={<Nfc size={18} className="text-orange-500" />}
                            label="NFC Tags"
                            onClick={() => setActiveSubmenu('nfc')}
                        />
                        <MenuItem
                            icon={<AlignLeft size={18} className="text-purple-500" />}
                            label="Memoir 绛涢€夋潯浠?
                            onClick={() => setActiveSubmenu('memoir_filter')}
                        />
                        <MenuItem
                            icon={<Settings size={18} />}
                            label="鍋忓ソ璁剧疆"
                            isLast
                            onClick={() => setActiveSubmenu('preferences')}
                        />
                    </div>
                </div>
                {/* Section: Android Features */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider pl-2">Android 鐗规€?/h3>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                        <MenuItem
                            icon={<Smartphone size={18} className="text-indigo-500" />}
                            label="搴旂敤鍏宠仈鏍囩瑙勫垯"
                            onClick={() => setActiveSubmenu('auto_record')}
                        />
                        <ToggleItem
                            icon={<SquareActivity size={18} className="text-teal-500" />}
                            label="寮€鍚偓娴悆"
                            checked={floatingWindowEnabled}
                            onChange={handleToggleFloatingWindow}
                            isLast
                        />
                    </div>
                </div>
                {/* Section: Daily Review */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider pl-2">姣忔棩鍥為【</h3>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                        <MenuItem
                            icon={<FileText size={18} className="text-orange-500" />}
                            label="鍥為【妯℃澘"
                            onClick={() => setActiveSubmenu('templates')}
                        />
                        <MenuItem
                            icon={<CheckCircle2 size={18} className="text-green-500" />}
                            label="鏃ヨ妯℃澘"
                            onClick={() => setActiveSubmenu('check_templates')}
                        />
                        <MenuItem
                            icon={<MessageSquare size={18} className="text-purple-500" />}
                            label="AI 鍙欎簨璁惧畾"
                            isLast
                            onClick={() => setActiveSubmenu('narrative_prompt')}
                        />
                    </div>
                </div>
                {/* Section: Data */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider pl-2">鏁版嵁涓庡悓姝?/h3>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                        <MenuItem
                            icon={<Edit2 size={18} className="text-blue-500" />}
                            label="鎵归噺绠＄悊璁板綍"
                            onClick={() => setActiveSubmenu('batch_manage')}
                        />
                        <MenuItem
                            icon={<Cloud size={18} />}
                            label="WebDAV 浜戝悓姝?
                            onClick={() => setActiveSubmenu('cloud')}
                        />
                        <MenuItem
                            icon={<Database size={18} className="text-orange-500" />}
                            label="S3 浜戝悓姝?
                            onClick={() => setActiveSubmenu('s3')}
                        />
                        <MenuItem
                            icon={<Database size={18} />}
                            label="鏁版嵁瀵煎嚭瀵煎叆 (鍖呭惈閲嶇疆)"
                            isLast={!isElectronEnvironment()}
                            onClick={() => setActiveSubmenu('data')}
                        />
                        {isElectronEnvironment() && (
                            <MenuItem
                                icon={<FileText size={18} className="text-indigo-500" />}
                                label="瀵煎嚭鍒?Obsidian"
                                isLast
                                onClick={() => setActiveSubmenu('obsidian_export')}
                            />
                        )}
                    </div>
                </div>

                {/* Section: About */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider pl-2">鍏充簬</h3>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                        <MenuItem
                            icon={<ArrowUpCircle size={18} className="text-blue-500" />}
                            label={isCheckingUpdate ? "妫€鏌ヤ腑..." : "妫€鏌ユ洿鏂?}
                            onClick={handleCheckUpdate}
                        />
                        <MenuItem
                            icon={<BookOpen size={18} />}
                            label="鐢ㄦ埛鎸囧崡"
                            onClick={() => setActiveSubmenu('guide')}
                        />
                        <MenuItem
                            icon={<Coffee size={18} className="text-amber-600" />}
                            label="璇锋垜鍠濇澂鍜栧暋 鈽?
                            onClick={() => setShowDonationModal(true)}
                        />
                        <MenuItem
                            icon={<Coffee size={18} className="text-pink-500" />}
                            label="杩欓噷杩樺湪寮€鍙戜腑 (Preview)"
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
                                        {UpdateService.compareVersions(UpdateService.getCurrentVersion(), updateInfo.version) ? '鍙戠幇鏂扮増鏈? : '褰撳墠宸叉槸鏈€鏂扮増鏈?}
                                    </h3>
                                    <p className="text-sm text-stone-500">v{updateInfo.version}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="bg-stone-50 rounded-xl p-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-stone-400">褰撳墠鐗堟湰</span>
                                        <span className="text-sm font-medium text-stone-600">v{UpdateService.getCurrentVersion()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-stone-400">鏈€鏂扮増鏈?/span>
                                        <span className={`text-sm font-bold ${UpdateService.compareVersions(UpdateService.getCurrentVersion(), updateInfo.version) ? 'text-blue-600' : 'text-green-600'}`}>
                                            v{updateInfo.version}
                                        </span>
                                    </div>
                                </div>

                                {updateInfo.releaseNotes && (
                                    <div>
                                        <h4 className="text-xs font-bold text-stone-600 mb-2">鏇存柊鍐呭</h4>
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
                                            绋嶅悗鎻愰啋
                                        </button>
                                        <button
                                            onClick={handleDownloadUpdate}
                                            className="flex-1 py-3 px-4 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
                                        >
                                            绔嬪嵆涓嬭浇
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setShowUpdateModal(false)}
                                        className="flex-1 py-3 px-4 text-sm font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
                                    >
                                        鍏抽棴
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Donation Modal - 璧炶祻鐮佹ā鎬佹 */}
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
                                        <h3 className="font-bold text-lg text-stone-800">鎰熻阿鏀寔</h3>
                                        <p className="text-sm text-stone-500">鎮ㄧ殑鏀寔鏄垜鏈€澶х殑鍔ㄥ姏</p>
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
                                        alt="璧炶祻鐮?
                                        className="w-64 h-64 object-contain rounded-xl"
                                    />
                                </div>
                            </div>

                            {/* Footer Message */}
                            <div className="text-center space-y-2">
                                <p className="text-sm text-stone-600">鎵爜鏀寔寮€鍙戣€?/p>
                            </div>

                            {/* Close Button */}
                            <button
                                onClick={() => setShowDonationModal(false)}
                                className="w-full py-3 px-4 text-sm font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
                            >
                                鍏抽棴
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
                title="鍒犻櫎鑷畾涔夊彊浜?
                description="纭畾瑕佸垹闄よ繖涓彊浜嬮鏍煎悧锛熸鎿嶄綔鏃犳硶鎾ら攢銆?
                confirmText="鍒犻櫎"
                cancelText="鍙栨秷"
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
