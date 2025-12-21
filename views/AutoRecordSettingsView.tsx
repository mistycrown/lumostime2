import React, { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, Check, ShieldAlert, Smartphone, ChevronRight, X, Search, Link as LinkIcon, Trash2 } from 'lucide-react';
import AppUsage from '../plugins/AppUsagePlugin';
import { Category, Activity } from '../types';

interface Props {
    onBack: () => void;
    categories: Category[];
}

interface InstalledApp {
    packageName: string;
    label: string;
    icon: string; // Base64
}

interface AppRule {
    packageName: string;
    activityId: string;
}

export const AutoRecordSettingsView: React.FC<Props> = ({ onBack, categories }) => {
    const [hasPermission, setHasPermission] = useState<boolean>(false);
    const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
    const [rules, setRules] = useState<{ [key: string]: string }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isDetecting, setIsDetecting] = useState(false);
    const [detectedPackage, setDetectedPackage] = useState<string>('');
    const [isMonitoring, setIsMonitoring] = useState(false); // Monitor state

    // Selection Modal State
    const [selectedApp, setSelectedApp] = useState<InstalledApp | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        checkPermission();
        loadData();
    }, []);

    // Re-check permission on resume
    useEffect(() => {
        const handleResume = () => checkPermission();
        document.addEventListener('resume', handleResume);
        return () => document.removeEventListener('resume', handleResume);
    }, []);

    const checkPermission = async () => {
        try {
            const res = await AppUsage.checkAccessibilityPermission();
            setHasPermission(res.granted);
        } catch (e) { console.error(e); }
    };



    // Need to persist monitoring state? For now let's just use local state for UI, 
    // but in reality we should check if service is running or check a stored pref.
    // For MVP validation, we'll just toggle.
    // Actually, persistence is better.
    const toggleMonitoring = async () => {
        try {
            if (isMonitoring) {
                await AppUsage.stopMonitor();
                setIsMonitoring(false);
                localStorage.setItem('cfg_auto_record_enabled', 'false');
            } else {
                await AppUsage.startMonitor();
                setIsMonitoring(true);
                localStorage.setItem('cfg_auto_record_enabled', 'true');
            }
        } catch (e) { console.error(e); }
    };

    // Load persisted state
    useEffect(() => {
        const saved = localStorage.getItem('cfg_auto_record_enabled') === 'true';
        if (saved) setIsMonitoring(true);
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            // Load rules first
            const rulesRes = await AppUsage.getAppRules();
            setRules(rulesRes.rules || {});

            // Load apps
            const appsRes = await AppUsage.getInstalledApps();
            // Sort: Apps with rules first, then alphabetical
            const sorted = (appsRes.apps || []).sort((a, b) => {
                const hasRuleA = !!rulesRes.rules[a.packageName];
                const hasRuleB = !!rulesRes.rules[b.packageName];
                if (hasRuleA && !hasRuleB) return -1;
                if (!hasRuleA && hasRuleB) return 1;
                return a.label.localeCompare(b.label);
            });
            setInstalledApps(sorted);
        } catch (e) { console.error(e); }
        setIsLoading(false);
    };

    const handlePermissionClick = async () => {
        if (hasPermission) return;
        try { await AppUsage.requestAccessibilityPermission(); } catch (e) { console.log(e); }
    };

    const handleTestDetection = async () => {
        setIsDetecting(true);
        try {
            // @ts-ignore
            const res = await AppUsage.getRunningApp();
            setDetectedPackage(res.packageName);
            if (res.packageName) {
                // Determine if linked
                const ruleId = rules[res.packageName];
                const matchedActivity = getActivityById(ruleId);
                const appName = installedApps.find(a => a.packageName === res.packageName)?.label || res.packageName;

                alert(`当前应用: ${appName}\n${matchedActivity ? `已关联: ${matchedActivity.name}` : '未关联'}`);
            } else {
                alert("未检测到前台应用");
            }
        } catch (e) {
            alert("检测失败");
        }
        setIsDetecting(false);
    };

    const handleAppClick = (app: InstalledApp) => {
        setSelectedApp(app);
        setIsModalOpen(true);
    };

    const handleSaveRule = async (activityId: string) => {
        if (!selectedApp) return;
        try {
            await AppUsage.saveAppRule({ packageName: selectedApp.packageName, activityId });
            setRules(prev => ({ ...prev, [selectedApp.packageName]: activityId }));
            setIsModalOpen(false);
            setSelectedApp(null);

            // Re-sort apps locally to move updated one to top? No, just keep list stable for now.
        } catch (e) { console.error(e); }
    };

    const handleRemoveRule = async () => {
        if (!selectedApp) return;
        try {
            await AppUsage.removeAppRule({ packageName: selectedApp.packageName });
            setRules(prev => {
                const next = { ...prev };
                delete next[selectedApp.packageName];
                return next;
            });
            setIsModalOpen(false);
            setSelectedApp(null);
        } catch (e) { console.error(e); }
    };

    const getActivityById = (id: string) => {
        for (const cat of categories) {
            const act = cat.activities.find(a => a.id === id);
            if (act) return act;
        }
        return null;
    };

    // Filtered apps
    const filteredApps = useMemo(() => {
        if (!searchQuery) return installedApps;
        const q = searchQuery.toLowerCase();
        return installedApps.filter(app =>
            app.label.toLowerCase().includes(q) ||
            app.packageName.toLowerCase().includes(q)
        );
    }, [installedApps, searchQuery]);

    // Modal UI for Activity Selection
    const renderModal = () => {
        if (!isModalOpen || !selectedApp) return null;

        const currentRuleId = rules[selectedApp.packageName];

        return (
            <div className="fixed inset-0 z-[60] flex flex-col bg-slate-50 dark:bg-slate-900 animate-in slide-in-from-bottom duration-200">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 shadow-sm shrink-0">
                    <button onClick={() => setIsModalOpen(false)} className="p-2 -ml-2 text-slate-500">
                        <X size={24} />
                    </button>
                    <div className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        {selectedApp.icon && <img src={selectedApp.icon} className="w-6 h-6 rounded-md" />}
                        {selectedApp.label}
                    </div>
                    {currentRuleId ? (
                        <button onClick={handleRemoveRule} className="p-2 -mr-2 text-red-500">
                            <Trash2 size={20} />
                        </button>
                    ) : <div className="w-8"></div>}
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider">选择关联标签</h3>

                    <div className="space-y-6">
                        {categories.map(cat => (
                            <div key={cat.id}>
                                <div className="flex items-center gap-2 mb-3 px-1">
                                    <span className="text-lg">{cat.icon}</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-300">{cat.name}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {cat.activities.map(act => {
                                        const isSelected = currentRuleId === act.id;
                                        return (
                                            <button
                                                key={act.id}
                                                onClick={() => handleSaveRule(act.id)}
                                                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${isSelected
                                                    ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500 dark:bg-indigo-900/30 dark:border-indigo-400'
                                                    : 'bg-white border-slate-100 dark:bg-slate-800 dark:border-slate-700 active:scale-95'
                                                    }`}
                                            >
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${act.color || 'bg-slate-100 text-slate-500'}`}>
                                                    {act.icon}
                                                </div>
                                                <span className={`text-sm font-medium truncate flex-1 ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                                    {act.name}
                                                </span>
                                                {isSelected && <Check size={16} className="text-indigo-600 dark:text-indigo-400" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 absolute inset-0 z-50">
            {/* Main Header */}
            <div className="flex items-center px-4 py-3 bg-white dark:bg-slate-800 shadow-sm shrink-0 z-10 gap-3">
                <button
                    onClick={onBack}
                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition-transform"
                >
                    <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
                </button>
                <div className="flex-1">
                    <h1 className="text-lg font-bold text-slate-800 dark:text-white">应用自动记录</h1>
                </div>
                {/* Search Toggle? */}
            </div>

            <main className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-6">
                    {/* Permission Status */}
                    {!hasPermission && (
                        <div
                            onClick={handlePermissionClick}
                            className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <ShieldAlert className="text-amber-600 dark:text-amber-500" size={24} />
                                <div>
                                    <div className="font-bold text-amber-900 dark:text-amber-400">需要无障碍服务权限</div>
                                    <div className="text-xs text-amber-700 dark:text-amber-500">点击授权以启用实时应用检测</div>
                                </div>
                            </div>
                            <ChevronRight size={20} className="text-amber-400" />
                        </div>
                    )}

                    {/* Monitoring Switch */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                        <div>
                            <div className="font-bold text-slate-800 dark:text-white">后台自动检测</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                开启后将在通知栏常驻，实时检测应用切换
                            </div>
                        </div>
                        <div
                            onClick={toggleMonitoring}
                            className={`w-12 h-7 rounded-full transition-colors flex items-center px-1 cursor-pointer ${isMonitoring ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                        >
                            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${isMonitoring ? 'translate-x-5' : ''}`} />
                        </div>
                    </div>

                    {/* Test Button (Keep it for verification) */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleTestDetection}
                            className="flex-1 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 active:scale-95 transition-transform"
                        >
                            {isDetecting ? '检测中...' : '检测当前应用 (测试)'}
                        </button>
                    </div>

                    {/* App List */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">已安装应用 ({installedApps.length})</h2>
                            {/* Search Input */}
                        </div>

                        {/* Search Box */}
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="搜索应用..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        {isLoading ? (
                            <div className="text-center py-10 text-slate-400">加载中...</div>
                        ) : (
                            <div className="space-y-2">
                                {filteredApps.map(app => {
                                    const ruleId = rules[app.packageName];
                                    const matched = ruleId ? getActivityById(ruleId) : null;

                                    return (
                                        <div
                                            key={app.packageName}
                                            onClick={() => handleAppClick(app)}
                                            className="bg-white dark:bg-slate-800 p-3 rounded-xl flex items-center gap-3 shadow-sm border border-slate-50 dark:border-slate-700 active:scale-[0.99] transition-transform cursor-pointer"
                                        >
                                            <div className="w-10 h-10 shrink-0">
                                                {app.icon ? (
                                                    <img src={app.icon} className="w-full h-full object-contain" />
                                                ) : (
                                                    <div className="w-full h-full bg-slate-100 rounded-full flex items-center justify-center">
                                                        <Smartphone size={16} className="text-slate-400" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-slate-800 dark:text-slate-200 truncate">{app.label}</div>
                                                <div className="text-[10px] text-slate-400 truncate">{app.packageName}</div>
                                            </div>

                                            {matched ? (
                                                <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-lg">
                                                    <span className="text-lg">{matched.icon}</span>
                                                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 max-w-[80px] truncate">
                                                        {matched.name}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                                                    <span className="text-xs text-slate-400">未关联</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {filteredApps.length === 0 && !isLoading && (
                                    <div className="text-center py-10 text-slate-400">未找到应用</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {renderModal()}
        </div>
    );
};
