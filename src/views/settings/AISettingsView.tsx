/**
 * @file AISettingsView.tsx
 * @description AI API configuration screen with preset management, provider templates, and model preset selection.
 * @updated 2026-05-14: Restyled the selectors to match the preference settings dropdown pattern and changed model selection to preset-first with a custom-input fallback.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Save,
  Trash2,
  X
} from 'lucide-react';
import { ConfirmModal } from '../../components/ConfirmModal';
import { ToastType } from '../../components/Toast';
import { aiService, AIConfig, AIPreset } from '../../services/aiService';

const DEFAULT_PRESET_ID = 'default';
const CUSTOM_MODEL_KEY = '__custom_model__';

const PROVIDER_OPTIONS = {
  deepseek: {
    name: 'DeepSeek',
    config: {
      provider: 'openai' as const,
      baseUrl: 'https://api.deepseek.com',
      modelName: 'deepseek-chat'
    }
  },
  gemini: {
    name: 'Gemini',
    config: {
      provider: 'gemini' as const,
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
      modelName: 'gemini-2.5-flash'
    }
  },
  siliconflow: {
    name: '硅基流动',
    config: {
      provider: 'openai' as const,
      baseUrl: 'https://api.siliconflow.cn/v1',
      modelName: 'deepseek-ai/deepseek-v3'
    }
  },
  zhipu: {
    name: '智谱',
    config: {
      provider: 'openai' as const,
      baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
      modelName: 'glm-5.1'
    }
  },
  kimi: {
    name: 'Kimi',
    config: {
      provider: 'openai' as const,
      baseUrl: 'https://api.moonshot.cn/v1',
      modelName: 'kimi-k2.5'
    }
  },
  qwen: {
    name: '千问',
    config: {
      provider: 'openai' as const,
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      modelName: 'qwen-plus'
    }
  },
  openai: {
    name: 'OpenAI',
    config: {
      provider: 'openai' as const,
      baseUrl: 'https://api.openai.com/v1',
      modelName: 'gpt-4o-mini'
    }
  },
  custom: {
    name: '自定义',
    config: null
  }
} as const;

const MODEL_PRESETS: Record<keyof typeof PROVIDER_OPTIONS, string[]> = {
  deepseek: [
    'deepseek-chat',
    'deepseek-reasoner',
    'deepseek-v4-pro',
    'deepseek-v4-flash'
  ],
  gemini: ['gemini-2.5-flash', 'gemini-2.5-pro'],
  siliconflow: ['deepseek-ai/deepseek-v3', 'Qwen/Qwen3-32B'],
  zhipu: ['glm-5.1', 'glm-4.7', 'glm-4.5'],
  kimi: ['kimi-k2.5', 'kimi-k2-0905-preview', 'moonshot-v1-32k'],
  qwen: ['qwen-plus', 'qwen-turbo', 'qwen-max'],
  openai: ['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4.1'],
  custom: []
};

type ProviderOptionKey = keyof typeof PROVIDER_OPTIONS;
type PresetModalMode = 'create' | 'rename' | null;
type OpenMenu = 'preset' | 'provider' | 'model' | null;

interface AISettingsViewProps {
  onBack: () => void;
  onToast: (type: ToastType, message: string) => void;
}

const cloneConfig = (config: AIConfig): AIConfig => ({
  provider: config.provider,
  apiKey: config.apiKey,
  baseUrl: config.baseUrl,
  modelName: config.modelName
});

const normalizeConfig = (config: AIConfig): AIConfig => ({
  provider: config.provider,
  apiKey: config.apiKey.trim(),
  baseUrl: (config.baseUrl || '').trim(),
  modelName: config.modelName.trim()
});

const detectProviderOption = (config: AIConfig): ProviderOptionKey => {
  const normalizedBaseUrl = (config.baseUrl || '').trim().toLowerCase();

  if (config.provider === 'gemini' || normalizedBaseUrl.includes('generativelanguage.googleapis.com')) {
    return 'gemini';
  }
  if (normalizedBaseUrl.includes('api.deepseek.com')) {
    return 'deepseek';
  }
  if (normalizedBaseUrl.includes('siliconflow.cn')) {
    return 'siliconflow';
  }
  if (normalizedBaseUrl.includes('bigmodel.cn')) {
    return 'zhipu';
  }
  if (normalizedBaseUrl.includes('moonshot.cn') || normalizedBaseUrl.includes('moonshot')) {
    return 'kimi';
  }
  if (normalizedBaseUrl.includes('dashscope') || normalizedBaseUrl.includes('aliyuncs.com')) {
    return 'qwen';
  }
  if (normalizedBaseUrl.includes('api.openai.com')) {
    return 'openai';
  }

  return 'custom';
};

const SettingsDropdownRow = ({
  title,
  value,
  isOpen,
  onToggle,
  options,
  onSelect,
  borderBottom = true
}: {
  title: string;
  value: string;
  isOpen: boolean;
  onToggle: () => void;
  options: Array<{ key: string; label: string }>;
  onSelect: (key: string) => void;
  borderBottom?: boolean;
}) => {
  return (
    <div className={`flex items-center justify-between gap-3 p-4 relative hover:bg-stone-50 transition-colors ${borderBottom ? 'border-b border-stone-100' : ''}`}>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-stone-700">{title}</h4>
      </div>
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-bold px-4 py-2 rounded-lg transition-colors"
        >
          <span className="max-w-[170px] truncate">{value}</span>
          <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-2 min-w-[220px] bg-white rounded-xl shadow-xl border border-stone-100 overflow-hidden z-[110] flex flex-col py-1 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
            {options.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => onSelect(option.key)}
                className={`px-4 py-2.5 text-left text-sm font-medium transition-colors hover:bg-stone-50 ${
                  value === option.label ? 'text-stone-900 bg-stone-50' : 'text-stone-500'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const AISettingsView: React.FC<AISettingsViewProps> = ({ onBack, onToast }) => {
  const [presets, setPresets] = useState<AIPreset[]>([]);
  const [currentPresetId, setCurrentPresetId] = useState<string>(DEFAULT_PRESET_ID);
  const [aiConfigForm, setAiConfigForm] = useState<AIConfig>({
    provider: 'openai',
    apiKey: '',
    baseUrl: '',
    modelName: ''
  });
  const [providerOption, setProviderOption] = useState<ProviderOptionKey>('openai');
  const [selectedModelPreset, setSelectedModelPreset] = useState<string>(CUSTOM_MODEL_KEY);
  const [aiTestStatus, setAiTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [showApiKey, setShowApiKey] = useState(false);
  const [presetModalMode, setPresetModalMode] = useState<PresetModalMode>(null);
  const [presetNameDraft, setPresetNameDraft] = useState('');
  const [presetNameError, setPresetNameError] = useState('');
  const [deletingPresetId, setDeletingPresetId] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);

  const currentPreset = useMemo(
    () => presets.find((preset) => preset.id === currentPresetId) || null,
    [presets, currentPresetId]
  );
  const isDefaultPreset = currentPresetId === DEFAULT_PRESET_ID;
  const currentProviderModels = MODEL_PRESETS[providerOption];
  const modelOptions = [
    ...currentProviderModels.map((modelName) => ({ key: modelName, label: modelName })),
    { key: CUSTOM_MODEL_KEY, label: '自定义' }
  ];

  const currentPresetLabel = currentPreset?.name || '默认预设';
  const currentProviderLabel = PROVIDER_OPTIONS[providerOption].name;
  const currentModelLabel = selectedModelPreset === CUSTOM_MODEL_KEY ? '自定义' : aiConfigForm.modelName || '自定义';

  useEffect(() => {
    const loadedPresets = aiService.getPresets();
    const loadedCurrentPreset = aiService.getCurrentPreset();
    const nextProvider = detectProviderOption(loadedCurrentPreset.config);
    const nextModelPreset = MODEL_PRESETS[nextProvider].includes(loadedCurrentPreset.config.modelName)
      ? loadedCurrentPreset.config.modelName
      : CUSTOM_MODEL_KEY;

    setPresets(loadedPresets);
    setCurrentPresetId(loadedCurrentPreset.id);
    setAiConfigForm(cloneConfig(loadedCurrentPreset.config));
    setProviderOption(nextProvider);
    setSelectedModelPreset(nextModelPreset);
  }, []);

  useEffect(() => {
    if (aiTestStatus !== 'idle') {
      setAiTestStatus('idle');
    }

    const nextProvider = detectProviderOption(aiConfigForm);
    setProviderOption(nextProvider);
    setSelectedModelPreset(
      MODEL_PRESETS[nextProvider].includes(aiConfigForm.modelName)
        ? aiConfigForm.modelName
        : CUSTOM_MODEL_KEY
    );
  }, [aiConfigForm]);

  useEffect(() => {
    if (presetModalMode || deletingPresetId) {
      setOpenMenu(null);
    }
  }, [presetModalMode, deletingPresetId]);

  const refreshPresetList = (nextCurrentPresetId?: string) => {
    const nextPresets = aiService.getPresets();
    const nextCurrentPreset = nextCurrentPresetId
      ? nextPresets.find((preset) => preset.id === nextCurrentPresetId) || aiService.getCurrentPreset()
      : aiService.getCurrentPreset();
    const nextProvider = detectProviderOption(nextCurrentPreset.config);
    const nextModelPreset = MODEL_PRESETS[nextProvider].includes(nextCurrentPreset.config.modelName)
      ? nextCurrentPreset.config.modelName
      : CUSTOM_MODEL_KEY;

    setPresets(nextPresets);
    setCurrentPresetId(nextCurrentPreset.id);
    setAiConfigForm(cloneConfig(nextCurrentPreset.config));
    setProviderOption(nextProvider);
    setSelectedModelPreset(nextModelPreset);
  };

  const validatePresetName = (rawName: string): string | null => {
    const trimmedName = rawName.trim();
    if (!trimmedName) {
      return '预设名称不能为空';
    }

    const duplicate = presets.some((preset) => preset.name.trim().toLowerCase() === trimmedName.toLowerCase());
    if (presetModalMode === 'create' && duplicate) {
      return '已经有同名预设了';
    }
    if (
      presetModalMode === 'rename'
      && duplicate
      && currentPreset?.name.trim().toLowerCase() !== trimmedName.toLowerCase()
    ) {
      return '已经有同名预设了';
    }

    return null;
  };

  const handlePresetChange = (presetId: string) => {
    const preset = aiService.setCurrentPreset(presetId);
    if (!preset) {
      onToast('error', '切换预设失败');
      return;
    }

    setOpenMenu(null);
    refreshPresetList(preset.id);
  };

  const handleProviderChange = (nextProviderKey: ProviderOptionKey) => {
    setOpenMenu(null);
    setProviderOption(nextProviderKey);

    if (nextProviderKey === 'custom') {
      return;
    }

    const template = PROVIDER_OPTIONS[nextProviderKey];
    const defaultModel = template.config?.modelName || '';

    setAiConfigForm((prev) => ({
      ...prev,
      provider: template.config?.provider || prev.provider,
      baseUrl: template.config?.baseUrl || prev.baseUrl,
      modelName: selectedModelPreset === CUSTOM_MODEL_KEY && prev.modelName.trim()
        ? prev.modelName
        : defaultModel
    }));
  };

  const handleModelPresetChange = (modelKey: string) => {
    setOpenMenu(null);
    setSelectedModelPreset(modelKey);

    if (modelKey === CUSTOM_MODEL_KEY) {
      return;
    }

    setAiConfigForm((prev) => ({
      ...prev,
      modelName: modelKey
    }));
  };

  const openCreatePresetModal = () => {
    setPresetModalMode('create');
    setPresetNameDraft('');
    setPresetNameError('');
  };

  const openRenamePresetModal = () => {
    if (!currentPreset || isDefaultPreset) {
      return;
    }
    setPresetModalMode('rename');
    setPresetNameDraft(currentPreset.name);
    setPresetNameError('');
  };

  const closePresetModal = () => {
    setPresetModalMode(null);
    setPresetNameDraft('');
    setPresetNameError('');
  };

  const handleSavePresetMeta = () => {
    const validationError = validatePresetName(presetNameDraft);
    if (validationError) {
      setPresetNameError(validationError);
      return;
    }

    if (presetModalMode === 'create') {
      const createdPreset = aiService.createPreset(presetNameDraft.trim(), normalizeConfig(aiConfigForm));
      refreshPresetList(createdPreset.id);
      closePresetModal();
      onToast('success', '已创建新预设');
      return;
    }

    if (presetModalMode === 'rename' && currentPreset) {
      const updatedPreset = aiService.updatePreset(currentPreset.id, { name: presetNameDraft.trim() });
      if (!updatedPreset) {
        setPresetNameError('重命名失败');
        return;
      }

      refreshPresetList(updatedPreset.id);
      closePresetModal();
      onToast('success', '预设名称已更新');
    }
  };

  const handleDeletePreset = () => {
    if (!deletingPresetId) {
      return;
    }

    const result = aiService.deletePreset(deletingPresetId);
    setDeletingPresetId(null);

    if (!result.deleted) {
      onToast('error', '默认预设不能删除');
      return;
    }

    refreshPresetList(result.currentPreset.id);
    onToast('success', '预设已删除');
  };

  const handleSaveAIConfig = async () => {
    const normalizedConfig = normalizeConfig(aiConfigForm);
    if (!normalizedConfig.apiKey) {
      onToast('error', '请填写 API Key');
      return;
    }
    if (!normalizedConfig.baseUrl) {
      onToast('error', '请填写 API 地址');
      return;
    }
    if (!normalizedConfig.modelName) {
      onToast('error', '请填写模型名称');
      return;
    }

    setAiTestStatus('testing');
    setAiConfigForm(normalizedConfig);
    aiService.saveConfig(normalizedConfig);
    setPresets(aiService.getPresets());

    try {
      const success = await aiService.checkConnection(normalizedConfig);
      setAiTestStatus(success ? 'success' : 'error');
      if (success) {
        onToast('success', '预设已保存并连接成功');
        setTimeout(() => setAiTestStatus((prev) => (prev === 'success' ? 'idle' : prev)), 2000);
      } else {
        onToast('error', '连接失败，请检查配置');
      }
    } catch (_error) {
      setAiTestStatus('error');
      onToast('error', '连接失败，请检查配置');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={onBack} className="text-stone-400 hover:text-stone-600 p-1">
          <ChevronLeft size={24} />
        </button>
        <span className="text-stone-800 font-bold text-lg">AI 接口</span>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto pb-40">
        <div className="bg-white rounded-2xl overflow-visible shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-3 p-4 border-b border-stone-100">
            <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-700">
              <Bot size={20} />
            </div>
            <h3 className="font-bold text-lg text-stone-800">AI API 配置</h3>
          </div>

          <SettingsDropdownRow
            title="配置预设"
            value={currentPresetLabel}
            isOpen={openMenu === 'preset'}
            onToggle={() => setOpenMenu((prev) => (prev === 'preset' ? null : 'preset'))}
            options={presets.map((preset) => ({ key: preset.id, label: preset.name }))}
            onSelect={handlePresetChange}
          />

          <div className="flex gap-2 p-4 border-b border-stone-100">
            <button
              type="button"
              onClick={openCreatePresetModal}
              className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-stone-100 text-stone-700 text-sm font-medium hover:bg-stone-200 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              新建
            </button>
            <button
              type="button"
              onClick={openRenamePresetModal}
              disabled={isDefaultPreset}
              className={`flex-1 min-w-0 px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                isDefaultPreset
                  ? 'bg-stone-100 text-stone-300 cursor-not-allowed'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <Pencil size={16} />
              重命名
            </button>
            <button
              type="button"
              onClick={() => !isDefaultPreset && setDeletingPresetId(currentPresetId)}
              disabled={isDefaultPreset}
              className={`flex-1 min-w-0 px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                isDefaultPreset
                  ? 'bg-stone-100 text-stone-300 cursor-not-allowed'
                  : 'bg-red-50 text-red-500 hover:bg-red-100'
              }`}
            >
              <Trash2 size={16} />
              删除
            </button>
          </div>

          <SettingsDropdownRow
            title="供应商"
            value={currentProviderLabel}
            isOpen={openMenu === 'provider'}
            onToggle={() => setOpenMenu((prev) => (prev === 'provider' ? null : 'provider'))}
            options={Object.entries(PROVIDER_OPTIONS).map(([key, option]) => ({ key, label: option.name }))}
            onSelect={(key) => handleProviderChange(key as ProviderOptionKey)}
          />

          <SettingsDropdownRow
            title="模型预设"
            value={currentModelLabel}
            isOpen={openMenu === 'model'}
            onToggle={() => setOpenMenu((prev) => (prev === 'model' ? null : 'model'))}
            options={modelOptions}
            onSelect={handleModelPresetChange}
            borderBottom={selectedModelPreset !== CUSTOM_MODEL_KEY}
          />

          {selectedModelPreset === CUSTOM_MODEL_KEY && (
            <div className="p-4 border-b border-stone-100">
              <input
                type="text"
                placeholder="请输入自定义模型名称"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-700 outline-none focus:border-stone-400"
                value={aiConfigForm.modelName}
                onChange={(event) => setAiConfigForm((prev) => ({ ...prev, modelName: event.target.value }))}
              />
            </div>
          )}

          <div className="p-4 border-b border-stone-100">
            <label className="text-xs font-bold text-stone-400 uppercase ml-1">API Key</label>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 focus-within:border-stone-400">
              <input
                type={showApiKey ? 'text' : 'password'}
                placeholder="请输入 API Key"
                className="flex-1 bg-transparent text-sm text-stone-700 outline-none placeholder:text-stone-300"
                value={aiConfigForm.apiKey}
                onChange={(event) => setAiConfigForm((prev) => ({ ...prev, apiKey: event.target.value }))}
              />
              <button
                type="button"
                onClick={() => setShowApiKey((prev) => !prev)}
                className="p-1 text-stone-400 transition-colors hover:text-stone-600"
                aria-label={showApiKey ? '隐藏 API Key' : '显示 API Key'}
              >
                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="p-4">
            <label className="text-xs font-bold text-stone-400 uppercase ml-1">API 地址</label>
            <input
              type="text"
              placeholder="请输入 API 地址"
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-700 outline-none focus:border-stone-400 mt-1"
              value={aiConfigForm.baseUrl}
              onChange={(event) => setAiConfigForm((prev) => ({ ...prev, baseUrl: event.target.value }))}
            />

            <button
              onClick={handleSaveAIConfig}
              disabled={aiTestStatus === 'testing'}
              className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium active:scale-[0.98] transition-all shadow-lg mt-4 ${
                aiTestStatus === 'testing'
                  ? 'bg-stone-400 text-white cursor-not-allowed'
                  : aiTestStatus === 'success'
                    ? 'bg-green-500 text-white shadow-green-200'
                    : aiTestStatus === 'error'
                      ? 'bg-red-500 text-white shadow-red-200'
                      : 'bg-stone-800 text-white shadow-stone-300 hover:bg-stone-900'
              }`}
            >
              {aiTestStatus === 'testing' && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {aiTestStatus === 'success' && <CheckCircle2 size={18} />}
              {aiTestStatus === 'error' && <AlertCircle size={18} />}
              {aiTestStatus === 'idle' && <Save size={18} />}

              {aiTestStatus === 'testing' && '测试中...'}
              {aiTestStatus === 'success' && '连接成功'}
              {aiTestStatus === 'error' && '连接失败，请检查配置'}
              {aiTestStatus === 'idle' && '保存并测试连接'}
            </button>
          </div>
        </div>
      </div>

      {presetModalMode && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-200 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-stone-100">
              <h3 className="font-bold text-lg text-stone-800">
                {presetModalMode === 'create' ? '新建预设' : '重命名预设'}
              </h3>
              <button onClick={closePresetModal} className="p-1 text-stone-400 hover:text-stone-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1.5">预设名称</label>
                <input
                  type="text"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-800 outline-none focus:border-stone-400"
                  placeholder="请输入预设名称"
                  value={presetNameDraft}
                  onChange={(event) => {
                    setPresetNameDraft(event.target.value);
                    if (presetNameError) {
                      setPresetNameError('');
                    }
                  }}
                />
              </div>

              {presetNameError && (
                <div className="text-red-500 text-xs font-bold px-1">{presetNameError}</div>
              )}
            </div>

            <div className="p-4 border-t border-stone-100 flex justify-end gap-3">
              <button
                onClick={closePresetModal}
                className="px-4 py-2 text-sm font-bold text-stone-500 hover:bg-stone-100 rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSavePresetMeta}
                className="px-6 py-2 text-sm font-bold text-white bg-stone-800 hover:bg-stone-700 rounded-xl shadow-md transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deletingPresetId}
        onClose={() => setDeletingPresetId(null)}
        onConfirm={handleDeletePreset}
        title="删除 AI 预设"
        description="确定要删除这个预设吗？删除后无法恢复。"
        confirmText="删除"
        cancelText="取消"
        type="danger"
      />

      {openMenu && (
        <button
          type="button"
          aria-label="关闭选择菜单"
          onClick={() => setOpenMenu(null)}
          className="fixed inset-0 z-[100]"
        />
      )}
    </div>
  );
};
