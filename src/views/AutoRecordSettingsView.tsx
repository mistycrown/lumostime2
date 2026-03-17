/**
 * @file AutoRecordSettingsView.tsx
 * @input Installed Apps List, Categories
 * @output Accessibility Permission Request, App Association Rules
 * @pos View (Settings Sub-page)
 * @description Allows users to grant accessibility permissions, configure app-to-activity associations, and mark apps to be ignored by floating-window detection.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, Check, ShieldAlert, Smartphone, ChevronRight, X, Search, Trash2 } from 'lucide-react';
import AppUsage from '../plugins/AppUsagePlugin';
import { Category } from '../types';

interface Props {
    onBack: () => void;
    categories: Category[];
}

interface InstalledApp {
    packageName: string;
    label: string;
    icon: string; // Base64
}

export const AutoRecordSettingsView: React.FC<Props> = ({ onBack, categories }) => {
    const [hasPermission, setHasPermission] = useState<boolean>(false);
    const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
    const [rules, setRules] = useState<{ [key: string]: string }>({});
    const [ignoredApps, setIgnoredApps] = useState<{ [key: string]: boolean }>({});
    const [isLoading, setIsLoading] = useState(false);

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

    const loadData = async () => {
        setIsLoading(true);
        try {
            // Load rules first
            const rulesRes = await AppUsage.getAppRules();
            setRules(rulesRes.rules || {});
            setIgnoredApps(rulesRes.ignoredApps || {});

            // Load apps
            const appsRes = await AppUsage.getInstalledApps();
            // Sort: configured apps first, then alphabetical
            const sorted = (appsRes.apps || []).sort((a, b) => {
                const isConfiguredA = !!rulesRes.rules[a.packageName] || !!rulesRes.ignoredApps?.[a.packageName];
                const isConfiguredB = !!rulesRes.rules[b.packageName] || !!rulesRes.ignoredApps?.[b.packageName];
                if (isConfiguredA && !isConfiguredB) return -1;
                if (!isConfiguredA && isConfiguredB) return 1;
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



    const handleAppClick = (app: InstalledApp) => {
        setSelectedApp(app);
        setIsModalOpen(true);
    };

    const handleSaveRule = async (activityId: string) => {
        if (!selectedApp) return;
        try {
            const activity = getActivityById(activityId);
            await AppUsage.saveAppRule({
                packageName: selectedApp.packageName,
                activityId,
                activityName: activity?.name
            });
            setRules(prev => ({ ...prev, [selectedApp.packageName]: activityId }));
            setIsModalOpen(false);
            setSelectedApp(null);

            // Re-sort apps locally to move updated one to top? No, just keep list stable for now.
        } catch (e) { console.error(e); }
    };

    const handleToggleIgnored = async (app: InstalledApp, ignored: boolean) => {
        try {
            await AppUsage.setAppIgnored({ packageName: app.packageName, ignored });
            setIgnoredApps(prev => ({
                ...prev,
                [app.packageName]: ignored
            }));
        } catch (e) { console.error(e); }
    };

    const renderIgnoreButton = (isIgnored: boolean, onClick: () => void, compact = false) => (
        <button
            type="button"
            aria-pressed={isIgnored}
            onClick={onClick}
            className={`rounded-full font-medium transition-colors ${compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'} ${isIgnored
                ? 'bg-stone-800 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
        >
            {isIgnored ? '忽略' : '开启'}
        </button>
    );

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
            <div
                className="fixed inset-0 z-[60] flex flex-col bg-[#fdfbf7] animate-in slide-in-from-bottom duration-200 font-serif"
                style={{
                    paddingBottom: 'env(safe-area-inset-bottom)'
                }}
            >
                {/* Modal Header */}
                <div
                    className="flex items-center justify-between px-4 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md shrink-0 box-border"
                    style={{
                        height: 'calc(3.5rem + env(safe-area-inset-top))',
                        paddingTop: 'env(safe-area-inset-top)'
                    }}
                >
                    <button onClick={() => setIsModalOpen(false)} className="p-2 -ml-2 text-stone-400 hover:text-stone-600">
                        <X size={24} />
                    </button>
                    <div className="font-bold text-stone-800 flex items-center gap-2">
                        {selectedApp.icon && <img src={selectedApp.icon} className="w-6 h-6 rounded-md" />}
                        {selectedApp.label}
                    </div>
                    {currentRuleId ? (
                        <button onClick={handleRemoveRule} className="p-2 -mr-2 text-red-500 hover:bg-red-50 rounded-lg">
                            <Trash2 size={20} />
                        </button>
                    ) : <div className="w-8"></div>}
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <div className="mb-5 rounded-2xl border border-stone-200 bg-white p-4">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <div className="text-sm font-semibold text-stone-800">忽略此应用</div>
                                <div className="mt-1 text-xs leading-relaxed text-stone-500">
                                    开启后，悬浮球不会识别、展示或提醒这个应用，但已关联的标签会保留。
                                </div>
                            </div>
                            {renderIgnoreButton(
                                !!ignoredApps[selectedApp.packageName],
                                () => handleToggleIgnored(selectedApp, !ignoredApps[selectedApp.packageName])
                            )}
                        </div>
                    </div>
                    <h3 className="text-xs font-bold text-stone-400 mb-4 uppercase tracking-wider">选择关联标签</h3>

                    <div className="space-y-6">
                        {categories.map(cat => (
                            <div key={cat.id}>
                                <div className="flex items-center gap-2 mb-3 px-1">
                                    <span className="text-lg">{cat.icon}</span>
                                    <span className="font-bold text-stone-700">{cat.name}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {cat.activities.map(act => {
                                        const isSelected = currentRuleId === act.id;
                                        return (
                                            <button
                                                key={act.id}
                                                onClick={() => handleSaveRule(act.id)}
                                                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${isSelected
                                                    ? 'bg-stone-50 border-stone-300'
                                                    : 'bg-white border-stone-100 hover:border-stone-300 active:scale-95'
                                                    }`}
                                            >
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${act.color || 'bg-stone-100 text-stone-500'}`}>
                                                    {act.icon}
                                                </div>
                                                <span className={`text-sm font-medium truncate flex-1 ${isSelected ? 'text-stone-900' : 'text-stone-700'}`}>
                                                    {act.name}
                                                </span>
                                                {isSelected && <Check size={16} className="text-stone-400" />}
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
        <div
            className="flex flex-col h-full bg-[#fdfbf7] text-stone-900 fixed inset-0 z-50 font-serif"
            style={{
                paddingBottom: 'env(safe-area-inset-bottom)'
            }}
        >
            {/* Main Header */}
            <div
                className="flex items-center px-4 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md shrink-0 z-10 gap-3 sticky top-0 box-border"
                style={{
                    height: 'calc(3.5rem + env(safe-area-inset-top))',
                    paddingTop: 'env(safe-area-inset-top)'
                }}
            >
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 rounded-full hover:bg-stone-100 active:scale-95 transition-transform"
                >
                    <ArrowLeft size={20} className="text-stone-500" />
                </button>
                <div className="flex-1">
                    <h1 className="text-lg font-bold text-stone-800">应用关联标签规则</h1>
                </div>
            </div>

            <main className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-6 pb-20">
                    {/* Usage Tip */}
                    <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700 leading-relaxed">
                        <p className="font-bold mb-1">💡 功能说明</p>
                        <p>必须要开启 <span className="font-bold">悬浮窗</span>。进入到对应页面后会提示是否开始计时，点击“开始”计时，再次点击结束计时。</p>
                    </div>

                    {/* Permission Status */}
                    {!hasPermission && (
                        <div
                            onClick={handlePermissionClick}
                            className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <ShieldAlert className="text-amber-600" size={24} />
                                <div>
                                    <div className="font-bold text-amber-900">需要无障碍服务权限</div>
                                    <div className="text-xs text-amber-700">点击授权以启用实时应用检测</div>
                                </div>
                            </div>
                            <ChevronRight size={20} className="text-amber-400" />
                        </div>
                    )}




                    {/* App List */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider pl-2">已安装应用 ({installedApps.length})</h2>
                        </div>

                        {/* Search Box */}
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                            <input
                                type="text"
                                placeholder="搜索应用..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-stone-100 text-sm focus:outline-none focus:border-stone-300 transition-colors text-stone-800 placeholder-stone-400"
                            />
                        </div>

                        {isLoading ? (
                            <div className="text-center py-10 text-stone-300">加载中...</div>
                        ) : (
                            <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-stone-100">
                                {filteredApps.map((app, index) => {
                                    const ruleId = rules[app.packageName];
                                    const matched = ruleId ? getActivityById(ruleId) : null;
                                    const isIgnored = !!ignoredApps[app.packageName];
                                    const isLast = index === filteredApps.length - 1;

                                    return (
                                        <div
                                            key={app.packageName}
                                            onClick={() => handleAppClick(app)}
                                            className={`p-4 flex items-center gap-3 active:bg-stone-50 transition-colors cursor-pointer ${!isLast ? 'border-b border-stone-50' : ''}`}
                                        >
                                            <div className="w-10 h-10 shrink-0">
                                                {app.icon ? (
                                                    <img src={app.icon} className="w-full h-full object-contain" />
                                                ) : (
                                                    <div className="w-full h-full bg-stone-100 rounded-full flex items-center justify-center">
                                                        <Smartphone size={16} className="text-stone-400" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-stone-800 truncate">{app.label}</div>
                                                <div className="text-[10px] text-stone-400 truncate">{app.packageName}</div>
                                            </div>

                                            {renderIgnoreButton(
                                                isIgnored,
                                                () => handleToggleIgnored(app, !isIgnored),
                                                true
                                            )}

                                            {matched ? (
                                                <div className="flex items-center gap-2 bg-stone-100 px-2 py-1 rounded-lg">
                                                    <span className="text-lg">{matched.icon}</span>
                                                    <span className="text-xs font-bold text-stone-600 max-w-[80px] truncate">
                                                        {matched.name}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="px-2 py-1 rounded-lg bg-stone-50">
                                                    <span className="text-xs text-stone-400">未关联</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {filteredApps.length === 0 && !isLoading && (
                                    <div className="text-center py-10 text-stone-300">未找到应用</div>
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
