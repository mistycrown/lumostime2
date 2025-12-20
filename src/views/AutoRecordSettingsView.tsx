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
            const result = await AppUsage.checkPermissions();
            setHasPermission(result.granted);
        } catch (error) {
            console.error('Error checking permission:', error);
        }
    };

    const handlePermissionClick = async () => {
        if (hasPermission) {
            // Show toast (simulated for now, or use a toast component if available)
            alert("已获得权限");
            return;
        }

        try {
            await AppUsage.requestPermissions();
            // We don't immediately set true here because we need to wait for user action
            // The resume listener will handle the re-check
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
                                    访问使用记录权限
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {hasPermission ? '已授权，可以正常工作' : '需要授权以检测运行中的应用'}
                                </div>
                            </div>
                        </div>

                        <div className="text-sm font-medium text-primary-600 dark:text-primary-400">
                            {hasPermission ? '已开启' : '去授权'}
                        </div>
                    </div>
                </section>

            </main>
        </div>
    );
};

export default AutoRecordSettingsView;
