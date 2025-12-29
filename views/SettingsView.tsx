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
    Sparkles,
    Edit,
    Search,
    Link,
    Smartphone
} from 'lucide-react';
import { webdavService, WebDAVConfig } from '../services/webdavService';
import { NfcService } from '../services/NfcService';
import { aiService, AIConfig } from '../services/aiService';
import { UpdateService, VersionInfo } from '../services/updateService';
import { CustomSelect } from '../components/CustomSelect';
import { ToastType } from '../components/Toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ReviewTemplateManageView } from './ReviewTemplateManageView';
import { ConfirmModal } from '../components/ConfirmModal';
import { ReviewTemplate, NarrativeTemplate, Log, TodoItem, Scope, DailyReview } from '../types';
import FocusNotification from '../plugins/FocusNotificationPlugin';
import { AutoRecordSettingsView } from './AutoRecordSettingsView';
import { AutoLinkView } from './AutoLinkView';
import { ObsidianExportView } from './ObsidianExportView';

import { NARRATIVE_TEMPLATES } from '../constants';
// @ts-ignore
import userGuideContent from '../USER_GUIDE.md?raw';

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
    // Daily Review Templates
    reviewTemplates?: ReviewTemplate[];
    onUpdateReviewTemplates?: (templates: ReviewTemplate[]) => void;
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
}

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

export const SettingsView: React.FC<SettingsViewProps> = ({ onClose, onExport, onImport, onReset, onClearData, onToast, syncData, onSyncUpdate, startWeekOnSunday, onToggleStartWeekOnSunday, onOpenAutoLink, onOpenSearch, minIdleTimeThreshold = 1, onSetMinIdleTimeThreshold, defaultView = 'RECORD', onSetDefaultView, reviewTemplates = [], onUpdateReviewTemplates, dailyReviewTime, onSetDailyReviewTime, weeklyReviewTime, onSetWeeklyReviewTime, monthlyReviewTime, onSetMonthlyReviewTime, customNarrativeTemplates, onUpdateCustomNarrativeTemplates, userPersonalInfo, onSetUserPersonalInfo, logs = [], todos = [], scopes = [], currentDate = new Date(), dailyReviews = [] }) => {
    const [activeSubmenu, setActiveSubmenu] = useState<'main' | 'data' | 'cloud' | 'ai' | 'preferences' | 'guide' | 'nfc' | 'templates' | 'narrative_prompt' | 'auto_record' | 'autolink' | 'obsidian_export'>('main');
    const [webdavConfig, setWebdavConfig] = useState<WebDAVConfig | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

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

    // Floating Window State
    const [floatingWindowEnabled, setFloatingWindowEnabled] = useState(() => {
        return localStorage.getItem('cfg_floating_window_enabled') === 'true';
    });

    const handleToggleFloatingWindow = async () => {
        // @ts-ignore
        if (window.Capacitor?.getPlatform() !== 'android') {
            onToast('info', '仅支持 Android 设备');
            return;
        }

        if (!floatingWindowEnabled) {
            try {
                const res = await FocusNotification.checkFloatingPermission();
                if (res.granted) {
                    await FocusNotification.startFloatingWindow();
                    setFloatingWindowEnabled(true);
                    localStorage.setItem('cfg_floating_window_enabled', 'true');
                    onToast('success', '悬浮球已开启');
                } else {
                    await FocusNotification.requestFloatingPermission();
                    onToast('info', '请授予悬浮窗权限后重试');
                }
            } catch (e) {
                console.error(e);
                onToast('error', '开启失败');
            }
        } else {
            try {
                await FocusNotification.stopFloatingWindow();
                setFloatingWindowEnabled(false);
                localStorage.setItem('cfg_floating_window_enabled', 'false');
            } catch (e) {
                console.error(e);
            }
        }
    };



    // UI States
    const [isDefaultViewDropdownOpen, setIsDefaultViewDropdownOpen] = useState(false);
    const [configForm, setConfigForm] = useState<WebDAVConfig>({ url: '', username: '', password: '' });
    const [confirmReset, setConfirmReset] = useState(false);
    const [confirmClear, setConfirmClear] = useState(false);

    // AI Config State
    const [localUserInfo, setLocalUserInfo] = useState(userPersonalInfo || '');
    const [showAddTemplateModal, setShowAddTemplateModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<NarrativeTemplate | null>(null);

    // Modal State for Narrative Templates
    const [modalTitle, setModalTitle] = useState('');
    const [modalDesc, setModalDesc] = useState('');
    const [modalPrompt, setModalPrompt] = useState('');
    const [modalError, setModalError] = useState('');
    const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

    // Update Check State
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
    const [updateInfo, setUpdateInfo] = useState<VersionInfo | null>(null);
    const [showUpdateModal, setShowUpdateModal] = useState(false);

    // Donation Modal State
    const [showDonationModal, setShowDonationModal] = useState(false);

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

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const config = webdavService.getConfig();
        if (config) {
            setWebdavConfig(config);
            setConfigForm(config);
        }

        const aiConfig = aiService.getConfig();
        if (aiConfig) {
            setAiConfigForm(aiConfig);
            // Try to infer preset (simple heuristic or default to openai)
            // We could store 'lastUsedPreset' in localStorage too if we wanted perfection, 
            // but let's just leave it neutral or default.
        }

        // Initial load of the default preset's profile if user hasn't set anything? 
        // Actually, let's just ensure if they click a preset, it loads correctly.
        // On mount, we show whatever is "Active" (last saved).
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

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onImport(file);
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
        const success = await webdavService.checkConnection();

        if (success) {
            setWebdavConfig(config);
            onToast('success', 'Connected to WebDAV server successfully!');
        } else {
            webdavService.clearConfig();
            onToast('error', 'Connection failed.');
            // @ts-ignore
            if (window.webdavLastError) {
                // @ts-ignore
                alert('WebDAV Error:\n' + window.webdavLastError);
            } else {
                alert('Connection failed. Please check your URL and credentials.');
            }
        }
        setIsSyncing(false);
    };

    const handleDisconnect = () => {
        webdavService.clearConfig();
        setWebdavConfig(null);
        setConfigForm({ url: '', username: '', password: '' });
        onToast('info', 'Disconnected from WebDAV server');
    };

    const handleSyncUpload = async () => {
        if (!webdavConfig) return;
        setIsSyncing(true);
        try {
            const dataToSync = {
                ...syncData,
                timestamp: Date.now(),
                version: '1.0.0'
            };
            await webdavService.uploadData(dataToSync);
            onToast('success', 'Data uploaded successfully!');
        } catch (error) {
            console.error(error);
            onToast('error', 'Failed to upload data.');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSyncDownload = async () => {
        if (!webdavConfig) return;
        if (!window.confirm("This will overwrite your current local data with the cloud version. Are you sure?")) return;

        setIsSyncing(true);
        try {
            const data = await webdavService.downloadData();
            if (data) {
                onSyncUpdate(data);
                onToast('success', 'Data restored from cloud successfully!');
            }
        } catch (error) {
            console.error(error);
            onToast('error', 'Failed to download data.');
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
            const latestVersion = await UpdateService.checkNeedsUpdate();

            if (latestVersion) {
                // 有新版本可用
                setUpdateInfo(latestVersion);
                setShowUpdateModal(true);
            } else {
                const versionData = await UpdateService.checkForUpdates();
                if (versionData) {
                    // 已是最新版本
                    onToast('success', `当前已是最新版本 v${UpdateService.getCurrentVersion()}`);
                } else {
                    // 检查失败
                    onToast('error', '检查更新失败，请稍后重试');
                }
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
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm text-stone-500 leading-relaxed">
                                    Connect to any WebDAV compatible storage (e.g., Nextcloud, Nutstore) to sync your data.
                                </p>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-bold text-stone-400 uppercase ml-1">Server URL</label>
                                        <div className="flex items-center gap-2 bg-stone-50 px-3 py-2 rounded-xl mt-1 focus-within:ring-2 focus-within:ring-stone-200 transition-all">
                                            <Globe size={18} className="text-stone-400" />
                                            <input
                                                type="text"
                                                placeholder="https://dav.example.com/dav"
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



    const handleSaveUserInfo = () => {
        onSetUserPersonalInfo?.(localUserInfo);
        onToast('success', '个人信息已保存');
    };

    const handleAddTemplate = () => {
        setEditingTemplate(null);
        setModalTitle('');
        setModalDesc('');
        setModalPrompt('');
        setModalError('');
        setShowAddTemplateModal(true);
    };

    const handleEditTemplate = (template: NarrativeTemplate) => {
        setEditingTemplate(template);
        setModalTitle(template.title);
        setModalDesc(template.description);
        setModalPrompt(template.prompt);
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
            isCustom: true
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
            categories={categories || []}
            todos={todos}
            scopes={scopes}
            currentDate={currentDate}
            onToast={onToast}
            dailyReview={todayReview}
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

                <div className="p-4 space-y-4">
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
                                {confirmClear ? "确认清空？将被永久删除" : "清空所有数据 (记录/待办/目标/领域)"}
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-3 p-4 bg-orange-50 rounded-xl text-orange-700 text-sm">
                        <AlertCircle size={20} className="shrink-0" />
                        <p>导入数据是覆盖操作，导入后当前数据将被备份文件替换，请谨慎操作。</p>
                    </div>
                </div>
            </div>
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

                <div className="p-4 space-y-4">
                    <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-3 text-stone-600 mb-2">
                            <Settings size={24} />
                            <h3 className="font-bold text-lg">界面与显示</h3>
                        </div>

                        <div className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
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

                        <div className="flex items-center justify-between py-2 border-b border-stone-100">
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

                        <div className="flex items-center justify-between py-2 border-b border-stone-100">
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

                        <div className="flex items-center justify-between py-2 border-b border-stone-100">
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

                        <div className="flex items-center justify-between py-2">
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

                        <div className="flex items-center justify-between py-2 border-t border-stone-100 relative z-10">
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
                            className="w-full h-32 bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs text-stone-600 outline-none focus:border-stone-400 resize-none leading-relaxed"
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
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="block text-xs font-bold text-stone-600">叙事风格描述 (Narrative Persona)</label>
                                    </div>
                                    <textarea
                                        className="w-full h-48 bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs font-mono text-stone-600 outline-none focus:border-stone-400 resize-none leading-relaxed"
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
                            icon={<Cloud size={18} />}
                            label="WebDAV 云同步"
                            onClick={() => setActiveSubmenu('cloud')}
                        />
                        <MenuItem
                            icon={<Database size={18} />}
                            label="数据导出导入 (包含重置)"
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
                            isLast
                            onClick={() => setShowDonationModal(true)}
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
                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                    <ArrowUpCircle size={24} className="text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-stone-800">发现新版本</h3>
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
                                        <span className="text-sm font-bold text-blue-600">v{updateInfo.version}</span>
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
