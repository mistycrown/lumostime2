import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, ShieldAlert, Plus, Trash2, AppWindow, Play, Save } from 'lucide-react';
import AppUsage from '../plugins/AppUsagePlugin';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES } from '../constants';
import { Activity } from '../types';

const AutoRecordSettingsView: React.FC = () => {
    const navigate = useNavigate();
    const [hasPermission, setHasPermission] = useState<boolean>(false);
    const [rules, setRules] = useState<Record<string, string>>({});
    const [pkgInput, setPkgInput] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [selectedActivityId, setSelectedActivityId] = useState('');
    const [detectedPkg, setDetectedPkg] = useState('');

    useEffect(() => {
        checkPermission();
        loadRules();

        const handleResume = () => {
            checkPermission();
            loadRules(); // Reload rules too
        };
        document.addEventListener('resume', handleResume);
        return () => {
            document.removeEventListener('resume', handleResume);
        };
    }, []);

    const checkPermission = async () => {
        try {
            const result = await AppUsage.checkAccessibilityPermission();
            setHasPermission(result.granted);
        } catch (error) {
            console.error('Error checking permission:', error);
        }
    };

    const loadRules = async () => {
        try {
            const res = await AppUsage.getAppRules();
            if (res.rules) {
                setRules(res.rules);
            }
        } catch (e) {
            console.error("Failed to load rules", e);
        }
    };

    const handlePermissionClick = async () => {
        if (hasPermission) {
            alert("已获得无障碍权限");
            return;
        }

        try {
            await AppUsage.requestAccessibilityPermission();
        } catch (error) {
            console.error('Error requesting permission:', error);
        }
    };

    const handleDetectCurrentApp = async () => {
        try {
            const res = await AppUsage.getRunningApp();
            const pkg = res.packageName;
            if (pkg) {
                setDetectedPkg(pkg);
                setPkgInput(pkg);
            } else {
                alert("未能检测到应当包名，请确保权限已开启");
            }
        } catch (e: any) {
            alert(`检测失败: ${e.message}`);
        }
    };

    const handleSaveRule = async () => {
        if (!pkgInput.trim()) {
            alert("请输入包名");
            return;
        }
        if (!selectedActivityId) {
            alert("请选择要关联的活动");
            return;
        }

        try {
            await AppUsage.saveAppRule({
                packageName: pkgInput.trim(),
                activityId: selectedActivityId
            });
            setPkgInput('');
            setSelectedActivityId('');
            setSelectedCategoryId('');
            setDetectedPkg('');
            loadRules(); // Refresh
        } catch (e: any) {
            alert(`保存失败: ${e.message}`);
        }
    };

    const handleDeleteRule = async (pkg: string) => {
        if (!confirm(`确定要删除 ${pkg} 的关联规则吗？`)) return;
        try {
            await AppUsage.removeAppRule({ packageName: pkg });
            loadRules();
        } catch (e: any) {
            alert(`删除失败: ${e.message}`);
        }
    };

    // Helper to find activity by ID
    const findActivity = (id: string): Activity | undefined => {
        for (const cat of CATEGORIES) {
            const act = cat.activities.find(a => a.id === id);
            if (act) return act;
        }
        return undefined;
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
            {/* Header */}
            <div className="flex items-center px-4 py-3 bg-white dark:bg-slate-800 shadow-sm shrink-0 z-10 gap-3">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition-transform"
                >
                    <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
                </button>
                <h1 className="text-lg font-bold text-slate-800 dark:text-white">应用自动记录</h1>
            </div>

            <main className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* Permission Section */}
                <section className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
                    <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-wider">权限设置</h2>
                    <div
                        onClick={handlePermissionClick}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 active:scale-[0.98] transition-all cursor-pointer"
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${hasPermission ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                {hasPermission ? <Check size={20} /> : <ShieldAlert size={20} />}
                            </div>
                            <div>
                                <div className="font-medium text-slate-800 dark:text-slate-200">
                                    无障碍服务权限
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {hasPermission ? '已授权，可以正常工作' : '需要授权以实时检测应用切换'}
                                </div>
                            </div>
                        </div>
                        <div className="text-sm font-medium text-primary-600 dark:text-primary-400">
                            {hasPermission ? '已开启' : '去授权'}
                        </div>
                    </div>
                </section>

                {/* Add Rule Section */}
                <section className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
                    <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">添加自动规则</h2>

                    <div className="space-y-3">
                        {/* Package Input */}
                        <div className="flex gap-2">
                            <input
                                className="flex-1 p-3 bg-slate-50 dark:bg-slate-700 border-none rounded-xl text-sm focus:ring-2 ring-primary-500 outline-none"
                                placeholder="应用包名 (或点击右侧检测)"
                                value={pkgInput}
                                onChange={(e) => setPkgInput(e.target.value)}
                            />
                            <button
                                onClick={handleDetectCurrentApp}
                                className="p-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 transition-all"
                                title="检测当前应用"
                            >
                                <AppWindow size={20} />
                            </button>
                        </div>
                        {detectedPkg && (
                            <div className="text-xs text-slate-400 px-1">
                                检测到: {detectedPkg}
                            </div>
                        )}

                        {/* Category Select */}
                        <select
                            className="w-full p-3 bg-slate-50 dark:bg-slate-700 border-none rounded-xl text-sm focus:ring-2 ring-primary-500 outline-none"
                            value={selectedCategoryId}
                            onChange={(e) => {
                                setSelectedCategoryId(e.target.value);
                                setSelectedActivityId('');
                            }}
                        >
                            <option value="">选择分类...</option>
                            {CATEGORIES.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                            ))}
                        </select>

                        {/* Activity Select */}
                        {selectedCategoryId && (
                            <select
                                className="w-full p-3 bg-slate-50 dark:bg-slate-700 border-none rounded-xl text-sm focus:ring-2 ring-primary-500 outline-none"
                                value={selectedActivityId}
                                onChange={(e) => setSelectedActivityId(e.target.value)}
                            >
                                <option value="">选择活动...</option>
                                {CATEGORIES.find(c => c.id === selectedCategoryId)?.activities.map(act => (
                                    <option key={act.id} value={act.id}>{act.icon} {act.name}</option>
                                ))}
                            </select>
                        )}

                        <button
                            onClick={handleSaveRule}
                            disabled={!pkgInput || !selectedActivityId}
                            className={`w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${!pkgInput || !selectedActivityId
                                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                                    : 'bg-primary-600 text-white hover:bg-primary-700 active:scale-95 shadow-md shadow-primary-500/20'
                                }`}
                        >
                            <Plus size={18} />
                            <span>添加规则</span>
                        </button>
                    </div>
                </section>

                {/* Existing Rules List */}
                <section className="space-y-3">
                    <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 px-1 uppercase tracking-wider">已配置规则 ({Object.keys(rules).length})</h2>

                    <div className="space-y-2">
                        {Object.entries(rules).length === 0 && (
                            <div className="text-center py-8 text-slate-400 text-sm">
                                暂无规则
                            </div>
                        )}
                        {Object.entries(rules).map(([pkg, actId]) => {
                            const activity = findActivity(actId);
                            return (
                                <div key={pkg} className="bg-white dark:bg-slate-800 p-3 rounded-xl flex items-center justify-between shadow-sm border border-slate-100 dark:border-slate-700">
                                    <div className="min-w-0">
                                        <div className="font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
                                            {activity ? `${activity.icon} ${activity.name}` : actId}
                                        </div>
                                        <div className="text-xs text-slate-400 truncate font-mono">
                                            {pkg}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteRule(pkg)}
                                        className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg active:scale-95 transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </section>

            </main>
        </div>
    );
};

export default AutoRecordSettingsView;
