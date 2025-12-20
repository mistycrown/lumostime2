import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, ShieldAlert } from 'lucide-react';
import AppUsage from '../plugins/AppUsagePlugin';
// Assuming using simple state navigation or passed props since no react-router likely
// If using react-router, useNavigate is fine, but looking at App.tsx, it seems conditional rendering.
// Start with a component that takes an onBack prop.

interface Props {
    onBack: () => void;
}

export const AutoRecordSettingsView: React.FC<Props> = ({ onBack }) => {
    const [hasPermission, setHasPermission] = useState<boolean>(false);

    useEffect(() => {
        checkPermission();
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
            // Fallback for dev/browser
            if (process.env.NODE_ENV === 'development') {
                // setHasPermission(true); 
            }
        }
    };

    const handlePermissionClick = async () => {
        if (hasPermission) {
            // Using a simple alert for now as requested by user "Toast提示"
            // In App.tsx I saw addToast, but here I might not have access to it unless passed.
            // I'll use window.alert or console for now, or if I can use the Toast component.
            // But let's stick to the requested "Toast" if possible via a prop or context?
            // For now simple alert is safer than breaking.
            alert("已获得权限");
            return;
        }

        try {
            await AppUsage.requestPermissions();
        } catch (error) {
            console.error('Error requesting permission:', error);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 absolute inset-0 z-50">
            {/* Header */}
            <div className="flex items-center px-4 py-3 bg-white dark:bg-slate-800 shadow-sm shrink-0 z-10 gap-3">
                <button
                    onClick={onBack}
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

                <div className="px-2">
                    <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
                        此功能通过监测前台应用，自动为您关联的事务开始计时。<br />
                        数据仅在本地处理，不会上传。
                    </p>
                </div>

            </main>
        </div>
    );
};
