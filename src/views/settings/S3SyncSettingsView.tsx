/**
 * @file S3SyncSettingsView.tsx
 * @description S3 (腾讯云 COS) 云同步配置页面
 */
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Cloud, User, Globe, Database, Server, Save, RefreshCw, Upload, Download, CheckCircle2, LogOut, Trash2 } from 'lucide-react';
import { s3Service, S3Config } from '../../services/s3Service';
import { ToastType } from '../../components/Toast';

interface S3SyncSettingsViewProps {
    onBack: () => void;
    onToast: (type: ToastType, message: string) => void;
    s3Config: S3Config | null;
    setS3Config: (config: S3Config | null) => void;
    onS3SyncUpload: () => Promise<void>;
    onS3SyncDownload: () => Promise<void>;
}

export const S3SyncSettingsView: React.FC<S3SyncSettingsViewProps> = ({
    onBack,
    onToast,
    s3Config,
    setS3Config,
    onS3SyncUpload,
    onS3SyncDownload
}) => {
    const [s3ConfigForm, setS3ConfigForm] = useState<S3Config>({ bucketName: '', region: '', secretId: '', secretKey: '', endpoint: '' });
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        const loadS3Config = () => {
            const config = s3Service.getConfig();
            if (config) {
                setS3ConfigForm(config);
            } else {
                const bucketName = localStorage.getItem('lumos_cos_bucket');
                const region = localStorage.getItem('lumos_cos_region');
                const secretId = localStorage.getItem('lumos_cos_secret_id');
                const secretKey = localStorage.getItem('lumos_cos_secret_key');
                const endpoint = localStorage.getItem('lumos_cos_endpoint');

                if (bucketName && region && secretId && secretKey) {
                    const fallbackConfig = { bucketName, region, secretId, secretKey, endpoint: endpoint || '' };
                    setS3ConfigForm(fallbackConfig);
                }
            }
        };
        loadS3Config();
    }, []);

    useEffect(() => {
        if (s3ConfigForm.bucketName || s3ConfigForm.region || s3ConfigForm.secretId || s3ConfigForm.secretKey) {
            localStorage.setItem('lumos_s3_draft_bucket', s3ConfigForm.bucketName);
            localStorage.setItem('lumos_s3_draft_region', s3ConfigForm.region);
            localStorage.setItem('lumos_s3_draft_secret_id', s3ConfigForm.secretId);
            localStorage.setItem('lumos_s3_draft_secret_key', s3ConfigForm.secretKey);
            localStorage.setItem('lumos_s3_draft_endpoint', s3ConfigForm.endpoint || '');
        }
    }, [s3ConfigForm]);

    const handleS3SaveConfig = async () => {
        if (!s3ConfigForm.bucketName || !s3ConfigForm.region || !s3ConfigForm.secretId || !s3ConfigForm.secretKey) {
            onToast('error', '请填写所有必填项');
            return;
        }

        if (s3ConfigForm.secretId === s3ConfigForm.secretKey) {
            onToast('error', 'SecretId 和 SecretKey 不能相同！请输入正确的 SecretKey');
            return;
        }

        setIsSyncing(true);

        const cleanConfig = {
            bucketName: s3ConfigForm.bucketName.trim(),
            region: s3ConfigForm.region.trim(),
            secretId: s3ConfigForm.secretId.trim(),
            secretKey: s3ConfigForm.secretKey.trim(),
            endpoint: s3ConfigForm.endpoint ? s3ConfigForm.endpoint.trim() : ''
        };
        s3Service.saveConfig(cleanConfig);

        const { success, message } = await s3Service.checkConnection();

        if (success) {
            setS3Config(s3ConfigForm);
            localStorage.removeItem('lumos_s3_manual_disconnect');
            localStorage.removeItem('lumos_s3_draft_bucket');
            localStorage.removeItem('lumos_s3_draft_region');
            localStorage.removeItem('lumos_s3_draft_secret_id');
            localStorage.removeItem('lumos_s3_draft_secret_key');
            localStorage.removeItem('lumos_s3_draft_endpoint');
            onToast('success', '腾讯云 COS 连接成功');
        } else {
            s3Service.disconnect();
            onToast('error', message || 'COS 连接失败，请检查凭据');
        }
        setIsSyncing(false);
    };

    const handleS3Disconnect = () => {
        s3Service.disconnect();
        setS3Config(null);
        localStorage.setItem('lumos_s3_manual_disconnect', 'true');
        onToast('info', '已断开与腾讯云 COS 的连接 (配置已保存)');
    };

    const handleSyncUpload = async () => {
        setIsSyncing(true);
        await onS3SyncUpload();
        setIsSyncing(false);
    };

    const handleSyncDownload = async () => {
        setIsSyncing(true);
        await onS3SyncDownload();
        setIsSyncing(false);
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0">
                <button onClick={onBack} className="text-stone-400 hover:text-stone-600 p-1">
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
                                    onClick={handleSyncUpload}
                                    disabled={isSyncing}
                                    className="flex flex-col items-center justify-center gap-2 py-4 bg-stone-800 text-white rounded-xl font-medium active:scale-[0.98] transition-transform disabled:opacity-70"
                                >
                                    <Upload size={20} className={isSyncing ? "animate-pulse" : ""} />
                                    <span>Upload to COS</span>
                                </button>

                                <button
                                    onClick={handleSyncDownload}
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

                                <button
                                    onClick={() => {
                                        if (confirm('确定要完全清理S3配置吗？这将删除所有保存的配置信息，下次需要重新输入。')) {
                                            s3Service.clearConfig();
                                            setS3Config(null);
                                            setS3ConfigForm({ bucketName: '', region: '', secretId: '', secretKey: '', endpoint: '' });
                                            localStorage.removeItem('lumos_s3_draft_bucket');
                                            localStorage.removeItem('lumos_s3_draft_region');
                                            localStorage.removeItem('lumos_s3_draft_secret_id');
                                            localStorage.removeItem('lumos_s3_draft_secret_key');
                                            localStorage.removeItem('lumos_s3_draft_endpoint');
                                            onToast('info', 'S3 configuration completely cleared');
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
                                            placeholder="请输入 SecretId"
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
                                            placeholder="请输入 SecretKey"
                                            className="flex-1 bg-transparent border-none outline-none text-stone-700 placeholder:text-stone-300 text-sm"
                                            value={s3ConfigForm.secretKey}
                                            onChange={e => setS3ConfigForm(prev => ({ ...prev, secretKey: e.target.value }))}
                                        />
                                    </div>
                                    {s3ConfigForm.secretId && s3ConfigForm.secretKey &&
                                        s3ConfigForm.secretId === s3ConfigForm.secretKey && (
                                            <p className="text-xs text-red-500 mt-1 ml-1">
                                                ⚠️ SecretId和SecretKey不能相同！请输入不同的SecretKey
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

                                {(s3ConfigForm.bucketName || s3ConfigForm.region || s3ConfigForm.secretId || s3ConfigForm.secretKey) && !s3Config && (
                                    <button
                                        onClick={() => {
                                            setS3ConfigForm({ bucketName: '', region: '', secretId: '', secretKey: '', endpoint: '' });
                                            localStorage.removeItem('lumos_s3_draft_bucket');
                                            localStorage.removeItem('lumos_s3_draft_region');
                                            localStorage.removeItem('lumos_s3_draft_secret_id');
                                            localStorage.removeItem('lumos_s3_draft_secret_key');
                                            localStorage.removeItem('lumos_s3_draft_endpoint');
                                            onToast('info', '已清理配置草稿');
                                        }}
                                        className="flex items-center justify-center gap-2 w-full py-2 mt-1 text-stone-500 hover:text-stone-600 hover:bg-stone-50 rounded-lg transition-colors text-xs"
                                    >
                                        <Trash2 size={14} />
                                        清理草稿
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
};
