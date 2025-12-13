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
    Sparkles, // AI Icon
    Bot,
    X,
    Link,
    Search
} from 'lucide-react';
import { webdavService, WebDAVConfig } from '../services/webdavService';
import { aiService, AIConfig } from '../services/aiService';
import { ToastType } from '../components/Toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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

export const SettingsView: React.FC<SettingsViewProps> = ({ onClose, onExport, onImport, onReset, onClearData, onToast, syncData, onSyncUpdate, startWeekOnSunday, onToggleStartWeekOnSunday, onOpenAutoLink, onOpenSearch, minIdleTimeThreshold = 1, onSetMinIdleTimeThreshold }) => {
    const [activeSubmenu, setActiveSubmenu] = useState<'main' | 'data' | 'cloud' | 'ai' | 'preferences' | 'guide'>('main');
    const [webdavConfig, setWebdavConfig] = useState<WebDAVConfig | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [configForm, setConfigForm] = useState<WebDAVConfig>({ url: '', username: '', password: '' });
    const [confirmReset, setConfirmReset] = useState(false);
    const [confirmClear, setConfirmClear] = useState(false);

    // AI Config State
    // AI Config State
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
                            label="自动关联规则"
                            onClick={() => {
                                onOpenAutoLink?.();
                            }}
                        />
                        <MenuItem
                            icon={<Settings size={18} />}
                            label="偏好设置"
                            isLast
                            onClick={() => setActiveSubmenu('preferences')}
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
                            isLast
                            onClick={() => setActiveSubmenu('data')}
                        />
                    </div>
                </div>

                {/* Section: About */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider pl-2">关于</h3>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                        <MenuItem
                            icon={<BookOpen size={18} />}
                            label="用户指南"
                            isLast
                            onClick={() => setActiveSubmenu('guide')}
                        />
                    </div>
                </div>

                <div className="text-center pt-4 pb-8">
                    <span className="text-[10px] text-stone-300">Version 1.0.1 (WebDAV Build)</span>
                </div>

            </div>
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
