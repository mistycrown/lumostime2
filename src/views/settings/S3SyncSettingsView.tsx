/**
 * @file S3SyncSettingsView.tsx
 * @description Cloud sync settings for Tencent Cloud COS and generic compatible S3 storage.
 * @updated 2026-07-21: Replaced COS and compatible-S3 configuration clearing with in-app confirmation modals.
 * @updated 2026-07-21: Added semantic dark-mode states for providers, sync actions, and status feedback.
 */
import React, { useEffect, useState } from 'react';
import {
  ChevronLeft,
  Cloud,
  Database,
  Download,
  Eye,
  EyeOff,
  Globe,
  CheckCircle2,
  LogOut,
  RefreshCw,
  Save,
  Server,
  Trash2,
  Upload,
  User
} from 'lucide-react';
import { s3Service, S3Config } from '../../services/s3Service';
import { compatibleS3Service, CompatibleS3Config } from '../../services/compatibleS3Service';
import { ToastType } from '../../components/Toast';
import { ConfirmModal } from '../../components/ConfirmModal';

interface S3SyncSettingsViewProps {
  onBack: () => void;
  onToast: (type: ToastType, message: string) => void;
  s3Config: S3Config | null;
  setS3Config: (config: S3Config | null) => void;
  compatibleS3Config: CompatibleS3Config | null;
  setCompatibleS3Config: (config: CompatibleS3Config | null) => void;
  onS3SyncUpload: () => Promise<void>;
  onS3SyncDownload: () => Promise<void>;
  onCompatibleS3SyncUpload: () => Promise<void>;
  onCompatibleS3SyncDownload: () => Promise<void>;
}

type SyncTab = 'cos' | 'compatible-s3';

const COS_DRAFT_KEYS = {
  bucketName: 'lumos_s3_draft_bucket',
  region: 'lumos_s3_draft_region',
  secretId: 'lumos_s3_draft_secret_id',
  secretKey: 'lumos_s3_draft_secret_key',
  endpoint: 'lumos_s3_draft_endpoint'
} as const;

const COMPATIBLE_DRAFT_KEYS = {
  bucketName: 'lumos_compatible_s3_draft_bucket',
  region: 'lumos_compatible_s3_draft_region',
  endpoint: 'lumos_compatible_s3_draft_endpoint',
  accessKeyId: 'lumos_compatible_s3_draft_access_key_id',
  secretAccessKey: 'lumos_compatible_s3_draft_secret_access_key',
  forcePathStyle: 'lumos_compatible_s3_draft_force_path_style'
} as const;

const LEGACY_COMPATIBLE_PROVIDER_DRAFT_KEY = 'lumos_compatible_s3_draft_provider';

const DEFAULT_COMPATIBLE_CONFIG = (): CompatibleS3Config => ({
  bucketName: '',
  region: '',
  endpoint: '',
  accessKeyId: '',
  secretAccessKey: '',
  forcePathStyle: true
});

const clearDraftKeys = (keys: Record<string, string>) => {
  Object.values(keys).forEach((key) => localStorage.removeItem(key));
};

export const S3SyncSettingsView: React.FC<S3SyncSettingsViewProps> = ({
  onBack,
  onToast,
  s3Config,
  setS3Config,
  compatibleS3Config,
  setCompatibleS3Config,
  onS3SyncUpload,
  onS3SyncDownload,
  onCompatibleS3SyncUpload,
  onCompatibleS3SyncDownload
}) => {
  const [activeTab, setActiveTab] = useState<SyncTab>('cos');
  const [cosForm, setCosForm] = useState<S3Config>({
    bucketName: '',
    region: '',
    secretId: '',
    secretKey: '',
    endpoint: ''
  });
  const [compatibleForm, setCompatibleForm] = useState<CompatibleS3Config>(DEFAULT_COMPATIBLE_CONFIG);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showCosPassword, setShowCosPassword] = useState(false);
  const [showCompatiblePassword, setShowCompatiblePassword] = useState(false);
  const [pendingClearConfig, setPendingClearConfig] = useState<'cos' | 'compatible' | null>(null);

  const confirm = () => {
    setPendingClearConfig(activeTab === 'cos' ? 'cos' : 'compatible');
    return false;
  };
  const window = { confirm };

  const handleConfirmClearConfig = () => {
    if (pendingClearConfig === 'cos') {
      s3Service.clearStorage();
      setS3Config(null);
      setCosForm({
        bucketName: '',
        region: '',
        secretId: '',
        secretKey: '',
        endpoint: ''
      });
      clearDraftKeys(COS_DRAFT_KEYS);
      onToast('info', '腾讯云 COS 配置已清空');
    }

    if (pendingClearConfig === 'compatible') {
      compatibleS3Service.clearStorage();
      setCompatibleS3Config(null);
      setCompatibleForm(DEFAULT_COMPATIBLE_CONFIG());
      localStorage.removeItem(LEGACY_COMPATIBLE_PROVIDER_DRAFT_KEY);
      clearDraftKeys(COMPATIBLE_DRAFT_KEYS);
      onToast('info', '兼容 S3 配置已清空');
    }

    setPendingClearConfig(null);
  };

  useEffect(() => {
    if (s3Config) {
      setCosForm(s3Config);
      return;
    }

    const draftBucket = localStorage.getItem(COS_DRAFT_KEYS.bucketName);
    const draftRegion = localStorage.getItem(COS_DRAFT_KEYS.region);
    const draftSecretId = localStorage.getItem(COS_DRAFT_KEYS.secretId);
    const draftSecretKey = localStorage.getItem(COS_DRAFT_KEYS.secretKey);
    const draftEndpoint = localStorage.getItem(COS_DRAFT_KEYS.endpoint);

    if (draftBucket || draftRegion || draftSecretId || draftSecretKey || draftEndpoint) {
      setCosForm({
        bucketName: draftBucket || '',
        region: draftRegion || '',
        secretId: draftSecretId || '',
        secretKey: draftSecretKey || '',
        endpoint: draftEndpoint || ''
      });
    }
  }, [s3Config]);

  useEffect(() => {
    if (compatibleS3Config) {
      setCompatibleForm(compatibleS3Config);
      return;
    }

    const draftBucketName = localStorage.getItem(COMPATIBLE_DRAFT_KEYS.bucketName);
    const draftRegion = localStorage.getItem(COMPATIBLE_DRAFT_KEYS.region);
    const draftEndpoint = localStorage.getItem(COMPATIBLE_DRAFT_KEYS.endpoint);
    const draftAccessKeyId = localStorage.getItem(COMPATIBLE_DRAFT_KEYS.accessKeyId);
    const draftSecretAccessKey = localStorage.getItem(COMPATIBLE_DRAFT_KEYS.secretAccessKey);
    const draftForcePathStyle = localStorage.getItem(COMPATIBLE_DRAFT_KEYS.forcePathStyle);

    if (draftBucketName || draftRegion || draftEndpoint || draftAccessKeyId || draftSecretAccessKey) {
      setCompatibleForm({
        bucketName: draftBucketName || '',
        region: draftRegion || '',
        endpoint: draftEndpoint || '',
        accessKeyId: draftAccessKeyId || '',
        secretAccessKey: draftSecretAccessKey || '',
        forcePathStyle: draftForcePathStyle !== 'false'
      });
    }
  }, [compatibleS3Config]);

  useEffect(() => {
    if (cosForm.bucketName || cosForm.region || cosForm.secretId || cosForm.secretKey || cosForm.endpoint) {
      localStorage.setItem(COS_DRAFT_KEYS.bucketName, cosForm.bucketName);
      localStorage.setItem(COS_DRAFT_KEYS.region, cosForm.region);
      localStorage.setItem(COS_DRAFT_KEYS.secretId, cosForm.secretId);
      localStorage.setItem(COS_DRAFT_KEYS.secretKey, cosForm.secretKey);
      localStorage.setItem(COS_DRAFT_KEYS.endpoint, cosForm.endpoint || '');
    }
  }, [cosForm]);

  useEffect(() => {
    if (
      compatibleForm.bucketName ||
      compatibleForm.region ||
      compatibleForm.endpoint ||
      compatibleForm.accessKeyId ||
      compatibleForm.secretAccessKey
    ) {
      localStorage.removeItem(LEGACY_COMPATIBLE_PROVIDER_DRAFT_KEY);
      localStorage.setItem(COMPATIBLE_DRAFT_KEYS.bucketName, compatibleForm.bucketName);
      localStorage.setItem(COMPATIBLE_DRAFT_KEYS.region, compatibleForm.region);
      localStorage.setItem(COMPATIBLE_DRAFT_KEYS.endpoint, compatibleForm.endpoint);
      localStorage.setItem(COMPATIBLE_DRAFT_KEYS.accessKeyId, compatibleForm.accessKeyId);
      localStorage.setItem(COMPATIBLE_DRAFT_KEYS.secretAccessKey, compatibleForm.secretAccessKey);
      localStorage.setItem(COMPATIBLE_DRAFT_KEYS.forcePathStyle, String(compatibleForm.forcePathStyle));
    }
  }, [compatibleForm]);

  const handleCosSaveConfig = async () => {
    if (!cosForm.bucketName || !cosForm.region || !cosForm.secretId || !cosForm.secretKey) {
      onToast('error', '请填写腾讯云 COS 的全部必填项');
      return;
    }

    if (cosForm.secretId === cosForm.secretKey) {
      onToast('error', 'SecretId 和 SecretKey 不能相同');
      return;
    }

    setIsSyncing(true);

    const cleanConfig = {
      bucketName: cosForm.bucketName.trim(),
      region: cosForm.region.trim(),
      secretId: cosForm.secretId.trim(),
      secretKey: cosForm.secretKey.trim(),
      endpoint: cosForm.endpoint ? cosForm.endpoint.trim() : ''
    };

    s3Service.saveConfig(cleanConfig);
    const { success, message } = await s3Service.checkConnection();

    if (success) {
      setS3Config(cleanConfig);
      localStorage.removeItem('lumos_s3_manual_disconnect');
      clearDraftKeys(COS_DRAFT_KEYS);
      onToast('success', '腾讯云 COS 连接成功');
    } else {
      s3Service.disconnect();
      onToast('error', message || '腾讯云 COS 连接失败，请检查配置');
    }

    setIsSyncing(false);
  };

  const handleCompatibleSaveConfig = async () => {
    if (
      !compatibleForm.bucketName ||
      !compatibleForm.region ||
      !compatibleForm.endpoint ||
      !compatibleForm.accessKeyId ||
      !compatibleForm.secretAccessKey
    ) {
      onToast('error', '请填写兼容 S3 的全部必填项');
      return;
    }

    if (compatibleForm.accessKeyId === compatibleForm.secretAccessKey) {
      onToast('error', 'Access Key ID 和 Secret Access Key 不能相同');
      return;
    }

    setIsSyncing(true);

    const cleanConfig: CompatibleS3Config = {
      bucketName: compatibleForm.bucketName.trim(),
      region: compatibleForm.region.trim(),
      endpoint: compatibleForm.endpoint.trim(),
      accessKeyId: compatibleForm.accessKeyId.trim(),
      secretAccessKey: compatibleForm.secretAccessKey.trim(),
      forcePathStyle: compatibleForm.forcePathStyle
    };

    compatibleS3Service.saveConfig(cleanConfig);
    const { success, message } = await compatibleS3Service.checkConnection();

    if (success) {
      setCompatibleS3Config(cleanConfig);
      localStorage.removeItem('lumos_compatible_s3_manual_disconnect');
      localStorage.removeItem(LEGACY_COMPATIBLE_PROVIDER_DRAFT_KEY);
      clearDraftKeys(COMPATIBLE_DRAFT_KEYS);
      onToast('success', '兼容 S3 连接成功');
    } else {
      compatibleS3Service.disconnect();
      onToast('error', message || '兼容 S3 连接失败，请检查配置');
    }

    setIsSyncing(false);
  };

  const handleCosDisconnect = () => {
    s3Service.disconnect();
    setS3Config(null);
    localStorage.setItem('lumos_s3_manual_disconnect', 'true');
    onToast('info', '已断开腾讯云 COS 连接，配置仍保留在本地');
  };

  const handleCompatibleDisconnect = () => {
    compatibleS3Service.disconnect();
    setCompatibleS3Config(null);
    localStorage.setItem('lumos_compatible_s3_manual_disconnect', 'true');
    onToast('info', '已断开兼容 S3 连接，配置仍保留在本地');
  };

  const renderConnectedActions = (
    label: string,
    region: string,
    onUpload: () => Promise<void>,
    onDownload: () => Promise<void>,
    onDisconnect: () => void,
    onClear: () => void
  ) => (
    <div className="sync-connected-actions space-y-6">
      <div className="sync-connected-status flex items-center gap-3 rounded-xl border border-green-100 bg-green-50 p-3 text-green-700">
        <CheckCircle2 size={20} className="shrink-0" />
        <div className="overflow-hidden">
          <p className="truncate font-medium">{label}</p>
          <p className="text-xs opacity-80">Region: {region}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={async () => {
            setIsSyncing(true);
            await onUpload();
            setIsSyncing(false);
          }}
          disabled={isSyncing}
          className="sync-upload-action flex flex-col items-center justify-center gap-2 rounded-xl bg-stone-800 py-4 font-medium text-white transition-transform active:scale-[0.98] disabled:opacity-70"
        >
          <Upload size={20} className={isSyncing ? 'animate-pulse' : ''} />
          <span>上传</span>
        </button>

        <button
          onClick={async () => {
            setIsSyncing(true);
            await onDownload();
            setIsSyncing(false);
          }}
          disabled={isSyncing}
          className="sync-restore-action flex flex-col items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white py-4 font-medium text-stone-700 transition-transform hover:bg-stone-50 active:scale-[0.98] disabled:opacity-70"
        >
          <Download size={20} className={isSyncing ? 'animate-pulse' : ''} />
          <span>恢复</span>
        </button>
      </div>

      <div className="border-t border-stone-100 pt-4">
        <button
          onClick={onDisconnect}
          className="sync-danger-action flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm text-red-400 transition-colors hover:bg-red-50 hover:text-red-500"
        >
          <LogOut size={16} />
          断开连接
        </button>

        <button
          onClick={onClear}
          className="sync-danger-action mt-1 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs text-red-300 transition-colors hover:bg-red-50 hover:text-red-400"
        >
          <Trash2 size={14} />
          清空配置
        </button>
      </div>
    </div>
  );

  const renderCosSection = () => {
    if (s3Config) {
      return renderConnectedActions(
        s3Config.bucketName,
        s3Config.region,
        onS3SyncUpload,
        onS3SyncDownload,
        handleCosDisconnect,
        () => {
          if (window.confirm('确定要完全清空腾讯云 COS 配置吗？下次需要重新输入。')) {
            s3Service.clearStorage();
            setS3Config(null);
            setCosForm({
              bucketName: '',
              region: '',
              secretId: '',
              secretKey: '',
              endpoint: ''
            });
            clearDraftKeys(COS_DRAFT_KEYS);
            onToast('info', '腾讯云 COS 配置已清空');
          }
        }
      );
    }

    return (
      <div className="space-y-4">
        <div className="space-y-3">
          <label className="block">
            <span className="ml-1 text-xs font-bold uppercase text-stone-400">Bucket Name</span>
            <div className="mt-1 flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2 focus-within:ring-2 focus-within:ring-stone-200">
              <Database size={18} className="text-stone-400" />
              <input
                type="text"
                placeholder="your-bucket-name-1250000000"
                className="flex-1 bg-transparent text-sm text-stone-700 outline-none placeholder:text-stone-300"
                value={cosForm.bucketName}
                onChange={(event) => setCosForm((previous) => ({ ...previous, bucketName: event.target.value }))}
              />
            </div>
          </label>

          <label className="block">
            <span className="ml-1 text-xs font-bold uppercase text-stone-400">Region</span>
            <div className="mt-1 flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2 focus-within:ring-2 focus-within:ring-stone-200">
              <Globe size={18} className="text-stone-400" />
              <input
                type="text"
                placeholder="ap-beijing"
                className="flex-1 bg-transparent text-sm text-stone-700 outline-none placeholder:text-stone-300"
                value={cosForm.region}
                onChange={(event) => setCosForm((previous) => ({ ...previous, region: event.target.value }))}
              />
            </div>
          </label>

          <label className="block">
            <span className="ml-1 text-xs font-bold uppercase text-stone-400">SecretId</span>
            <div className="mt-1 flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2 focus-within:ring-2 focus-within:ring-stone-200">
              <User size={18} className="text-stone-400" />
              <input
                type="text"
                placeholder="请输入 SecretId"
                className="flex-1 bg-transparent text-sm text-stone-700 outline-none placeholder:text-stone-300"
                value={cosForm.secretId}
                onChange={(event) => setCosForm((previous) => ({ ...previous, secretId: event.target.value }))}
              />
            </div>
          </label>

          <label className="block">
            <span className="ml-1 text-xs font-bold uppercase text-stone-400">SecretKey</span>
            <div className="mt-1 flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2 focus-within:ring-2 focus-within:ring-stone-200">
              <Server size={18} className="text-stone-400" />
              <input
                type={showCosPassword ? 'text' : 'password'}
                placeholder="请输入 SecretKey"
                className="flex-1 bg-transparent text-sm text-stone-700 outline-none placeholder:text-stone-300"
                value={cosForm.secretKey}
                onChange={(event) => setCosForm((previous) => ({ ...previous, secretKey: event.target.value }))}
              />
              <button
                type="button"
                onClick={() => setShowCosPassword((previous) => !previous)}
                className="p-1 text-stone-400 transition-colors hover:text-stone-600"
                aria-label={showCosPassword ? 'Hide password' : 'Show password'}
              >
                {showCosPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>
        </div>

        <button
          onClick={handleCosSaveConfig}
          disabled={isSyncing}
          className="sync-save-action flex w-full items-center justify-center gap-2 rounded-xl bg-stone-800 py-3 font-medium text-white shadow-lg shadow-stone-200 transition-transform active:scale-[0.98] disabled:opacity-70"
        >
          {isSyncing ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
          {isSyncing ? '连接中...' : '保存并连接'}
        </button>
      </div>
    );
  };

  const renderCompatibleSection = () => {
    if (compatibleS3Config) {
      return (
        <div className="space-y-4">
          {renderConnectedActions(
            compatibleS3Config.bucketName,
            compatibleS3Config.region,
            onCompatibleS3SyncUpload,
            onCompatibleS3SyncDownload,
            handleCompatibleDisconnect,
            () => {
              if (window.confirm('确定要完全清空兼容 S3 配置吗？下次需要重新输入。')) {
                compatibleS3Service.clearStorage();
                setCompatibleS3Config(null);
                setCompatibleForm(DEFAULT_COMPATIBLE_CONFIG());
                localStorage.removeItem(LEGACY_COMPATIBLE_PROVIDER_DRAFT_KEY);
                clearDraftKeys(COMPATIBLE_DRAFT_KEYS);
                onToast('info', '兼容 S3 配置已清空');
              }
            }
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="space-y-3">
          <label className="block">
            <span className="ml-1 text-xs font-bold uppercase text-stone-400">Bucket</span>
            <div className="mt-1 flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2 focus-within:ring-2 focus-within:ring-stone-200">
              <Database size={18} className="text-stone-400" />
              <input
                type="text"
                placeholder="your-bucket-name"
                className="flex-1 bg-transparent text-sm text-stone-700 outline-none placeholder:text-stone-300"
                value={compatibleForm.bucketName}
                onChange={(event) => setCompatibleForm((previous) => ({ ...previous, bucketName: event.target.value }))}
              />
            </div>
          </label>

          <label className="block">
            <span className="ml-1 text-xs font-bold uppercase text-stone-400">Region</span>
            <div className="mt-1 flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2 focus-within:ring-2 focus-within:ring-stone-200">
              <Globe size={18} className="text-stone-400" />
              <input
                type="text"
                placeholder="cn-east-1"
                className="flex-1 bg-transparent text-sm text-stone-700 outline-none placeholder:text-stone-300"
                value={compatibleForm.region}
                onChange={(event) => setCompatibleForm((previous) => ({ ...previous, region: event.target.value }))}
              />
            </div>
          </label>

          <label className="block">
            <span className="ml-1 text-xs font-bold uppercase text-stone-400">Endpoint</span>
            <div className="mt-1 flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2 focus-within:ring-2 focus-within:ring-stone-200">
              <Cloud size={18} className="text-stone-400" />
              <input
                type="text"
                placeholder="https://your-s3-endpoint.example.com"
                className="flex-1 bg-transparent text-sm text-stone-700 outline-none placeholder:text-stone-300"
                value={compatibleForm.endpoint}
                onChange={(event) => setCompatibleForm((previous) => ({ ...previous, endpoint: event.target.value }))}
              />
            </div>
          </label>

          <label className="block">
            <span className="ml-1 text-xs font-bold uppercase text-stone-400">Access Key ID</span>
            <div className="mt-1 flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2 focus-within:ring-2 focus-within:ring-stone-200">
              <User size={18} className="text-stone-400" />
              <input
                type="text"
                placeholder="请输入 Access Key ID"
                className="flex-1 bg-transparent text-sm text-stone-700 outline-none placeholder:text-stone-300"
                value={compatibleForm.accessKeyId}
                onChange={(event) => setCompatibleForm((previous) => ({ ...previous, accessKeyId: event.target.value }))}
              />
            </div>
          </label>

          <label className="block">
            <span className="ml-1 text-xs font-bold uppercase text-stone-400">Secret Access Key</span>
            <div className="mt-1 flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2 focus-within:ring-2 focus-within:ring-stone-200">
              <Server size={18} className="text-stone-400" />
              <input
                type={showCompatiblePassword ? 'text' : 'password'}
                placeholder="请输入 Secret Access Key"
                className="flex-1 bg-transparent text-sm text-stone-700 outline-none placeholder:text-stone-300"
                value={compatibleForm.secretAccessKey}
                onChange={(event) => setCompatibleForm((previous) => ({ ...previous, secretAccessKey: event.target.value }))}
              />
              <button
                type="button"
                onClick={() => setShowCompatiblePassword((previous) => !previous)}
                className="p-1 text-stone-400 transition-colors hover:text-stone-600"
                aria-label={showCompatiblePassword ? 'Hide password' : 'Show password'}
              >
                {showCompatiblePassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          <button
            type="button"
            onClick={() => setCompatibleForm((previous) => ({ ...previous, forcePathStyle: !previous.forcePathStyle }))}
            className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-white px-3 py-3 text-left text-sm text-stone-700"
          >
            <div>
              <div className="font-medium">Force Path Style</div>
              <div className="mt-1 text-xs text-stone-500">需要时按对象存储服务商要求调整。</div>
            </div>
            <div className={`sync-force-path-switch h-6 w-10 rounded-full transition-colors ${compatibleForm.forcePathStyle ? 'sync-force-path-switch-on bg-green-500' : 'bg-stone-200'}`}>
              <div className={`relative top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${compatibleForm.forcePathStyle ? 'left-5' : 'left-1'}`} />
            </div>
          </button>
        </div>

        <button
          onClick={handleCompatibleSaveConfig}
          disabled={isSyncing}
          className="sync-save-action flex w-full items-center justify-center gap-2 rounded-xl bg-stone-800 py-3 font-medium text-white shadow-lg shadow-stone-200 transition-transform active:scale-[0.98] disabled:opacity-70"
        >
          {isSyncing ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
          {isSyncing ? '连接中...' : '保存并连接'}
        </button>
      </div>
    );
  };

  return (
    <div className="sync-settings-view fixed inset-0 z-50 flex flex-col bg-[#fdfbf7] pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] font-serif animate-in slide-in-from-right duration-300">
      <div className="sticky top-0 flex h-14 items-center gap-3 border-b border-stone-100 bg-[#fdfbf7]/80 px-4 backdrop-blur-md">
        <button onClick={onBack} className="p-1 text-stone-400 hover:text-stone-600">
          <ChevronLeft size={24} />
        </button>
        <span className="text-lg font-bold text-stone-800">S3 Sync</span>
      </div>

      <div className="overflow-y-auto p-4 pb-40">
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-stone-100 p-1">
          <button
            onClick={() => setActiveTab('cos')}
            className={`sync-provider-tab ${activeTab === 'cos' ? 'sync-provider-tab-selected bg-white text-stone-800 shadow-sm' : 'text-stone-500'} rounded-xl px-3 py-2 text-sm font-medium transition-colors`}
          >
            腾讯云 COS
          </button>
          <button
            onClick={() => setActiveTab('compatible-s3')}
            className={`sync-provider-tab ${activeTab === 'compatible-s3' ? 'sync-provider-tab-selected bg-white text-stone-800 shadow-sm' : 'text-stone-500'} rounded-xl px-3 py-2 text-sm font-medium transition-colors`}
          >
            兼容 S3
          </button>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3 text-stone-600">
            <Cloud size={24} />
            <div>
              <h3 className="font-bold text-lg">
                {activeTab === 'cos' ? '腾讯云 COS' : '兼容 S3'}
              </h3>
            </div>
          </div>

          {activeTab === 'cos' ? renderCosSection() : renderCompatibleSection()}
        </div>

        <div className="sync-advice mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-medium">使用建议</p>
          <p className="mt-1">1. 自动同步还不是很稳定，建议使用手动同步</p>
          <p className="mt-1">2. 上传之后不能马上下载，需要等一会儿</p>
        </div>
      </div>
      <ConfirmModal
        isOpen={pendingClearConfig !== null}
        onClose={() => setPendingClearConfig(null)}
        onConfirm={handleConfirmClearConfig}
        title={pendingClearConfig === 'cos' ? '清空腾讯云 COS 配置' : '清空兼容 S3 配置'}
        description="将删除本设备保存的连接配置。下次同步需要重新填写。"
        confirmText="清空配置"
        cancelText="取消"
        type="danger"
      />
    </div>
  );
};
