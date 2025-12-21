import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, ShieldAlert } from 'lucide-react';
import AppUsage from '../plugins/AppUsagePlugin';
import { useNavigate } from 'react-router-dom';

const AutoRecordSettingsView: React.FC = () => {
    const navigate = useNavigate();
    const [hasPermission, setHasPermission] = useState<boolean>(false);

    useEffect(() => {
        checkPermission();
        // Add listener for app resume to re-check permission if user comes back from settings
        const handleResume = () => {
            checkPermission();
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

                {/* Test Section */}
                <section className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
                    <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">测试 & 调试</h2>

                    <button
                        onClick={async () => {
                            try {
                                const res = await AppUsage.getRunningApp();
                                alert(`当前应用包名: ${res.packageName || '未知'}`);
                            } catch (e: any) {
                                alert(`获取失败: ${e.message}`);
                            }
                        }}
                        className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium active:scale-95 transition-all text-left flex justify-between items-center"
                    >
                        <span>测试：检测当前应用</span>
                        <ArrowLeft className="rotate-180 text-slate-400" size={16} />
                    </button>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                        <div>
                            <div className="font-medium text-slate-800 dark:text-slate-200">
                                后台自动监听
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                开启后，在后台每3秒检测一次并通知
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => AppUsage.startMonitor()}
                                className="px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-lg shadow-sm active:scale-95 transition-transform"
                            >
                                开启
                            </button>
                            <button
                                onClick={() => AppUsage.stopMonitor()}
                                className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg shadow-sm active:scale-95 transition-transform"
                            >
                                关闭
                            </button>
                        </div>
                    </div>
                </section>

            </main>
        </div>
    );
};

export default AutoRecordSettingsView;
