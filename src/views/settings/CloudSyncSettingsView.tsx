/**
 * @file CloudSyncSettingsView.tsx
 * @description WebDAV 云同步配置页面
 */
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Server, User, Globe, Save, RefreshCw, Upload, Download, CheckCircle2, LogOut, Trash2 } from 'lucide-react';
import { webdavService, WebDAVConfig } from '../../services/webdavService';
import { ToastType } from '../../components/Toast';

interface CloudSyncSettingsViewProps {
    onBack: () => void;
    onToast: (type: ToastType, message: string) => void;
    webdavConfig: WebDAVConfig | null;
    setWebdavConfig: (config: WebDAVConfig | null) => void;
    onSyncUpload: () => Promise<void>;
    onSyncDownload: () => Promise<void>;
}

export const CloudSyncSettingsView: React.FC<CloudSyncSettingsViewProps> = ({
    onBack,
    onToast,
    webdavConfig,
    setWebdavConfig,
    onSyncUpload,
    onSyncDownload
}) => {
    const [configForm, setConfigForm] = useState<WebDAVConfig>({ url: '', username: '', password: '' });
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        const config = webdavService.getConfig();
        if (config) {
            setConfigForm(config);
        }
    }, []);

    const handleSaveConfig = async () => {
        if (!configForm.url) {
            onToast('error', 'Please enter a URL');
            return;
        }
        setIsSyncing(true);
        const config = { ...configForm };
        if (!config.url.startsWith('http')) {
            config.url = 'https://' + config.url;
        }

        webdavService.saveConfig(config);
        localStorage.removeItem('lumos_webdav_manual_disconnect');

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
        webdavService.clearConfig();
        setWebdavConfig(null);
        localStorage.setItem('lumos_webdav_manual_disconnect', 'true');
        onToast('info', '已断开 WebDAV 服务器连接 (配置已保存)');
    };

    const handleSyncUpload = async () => {
        setIsSyncing(true);
        await onSyncUpload();
        setIsSyncing(false);
    };

    const handleSyncDownload = async () => {
        setIsSyncing(true);
        await onSyncDownload();
        setIsSyncing(false);
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0">
                <button onClick={onBack} className="text-stone-400 hover:text-stone-600 p-1">
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

                                <button
                                    onClick={() => {
                                        if (confirm('确定要完全清理WebDAV配置吗？这将删除所有保存的配置信息，下次需要重新输入。')) {
                                            webdavService.clearAllConfig();
                                            setWebdavConfig(null);
                                            setConfigForm({ url: '', username: '', password: '' });
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
};
