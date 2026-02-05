/**
 * @file AISettingsView.tsx
 * @description AI API 配置页面
 */
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Save, CheckCircle2, AlertCircle, Bot } from 'lucide-react';
import { aiService, AIConfig } from '../../services/aiService';
import { ToastType } from '../../components/Toast';

const AI_PRESETS = {
    gemini: {
        name: 'Gemini',
        config: { provider: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models', modelName: 'gemini-2.5-flash' }
    },
    deepseek: {
        name: 'DeepSeek',
        config: { provider: 'openai', baseUrl: 'https://api.deepseek.com', modelName: 'deepseek-chat' }
    },
    siliconflow: {
        name: '硅基流动',
        config: { provider: 'openai', baseUrl: 'https://api.siliconflow.cn/v1', modelName: 'deepseek-ai/deepseek-v3' }
    },
    openai: {
        name: 'OpenAI (兼容)',
        config: { provider: 'openai', baseUrl: 'https://api.openai.com/v1', modelName: 'gpt-4o-mini' }
    }
};

interface AISettingsViewProps {
    onBack: () => void;
    onToast: (type: ToastType, message: string) => void;
}

export const AISettingsView: React.FC<AISettingsViewProps> = ({ onBack, onToast }) => {
    const [aiConfigForm, setAiConfigForm] = useState<AIConfig>({ provider: 'openai', apiKey: '', baseUrl: '', modelName: '' });
    const [activePreset, setActivePreset] = useState<string>('openai');
    const [aiTestStatus, setAiTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

    useEffect(() => {
        const aiConfig = aiService.getConfig();
        if (aiConfig) {
            setAiConfigForm(aiConfig);
        }
    }, []);

    useEffect(() => {
        if (aiTestStatus !== 'idle') setAiTestStatus('idle');
    }, [aiConfigForm]);

    const handlePresetChange = (key: string) => {
        setActivePreset(key);
        const savedProfile = aiService.getProfile(key);
        if (savedProfile) {
            setAiConfigForm(savedProfile);
        } else {
            const preset = AI_PRESETS[key as keyof typeof AI_PRESETS];
            if (preset) {
                setAiConfigForm({
                    ...preset.config as AIConfig,
                    apiKey: ''
                });
            }
        }
    };

    const handleSaveAIConfig = async () => {
        if (!aiConfigForm.apiKey) {
            onToast('error', 'API Key is required');
            return;
        }

        setAiTestStatus('testing');
        aiService.saveProfile(activePreset, aiConfigForm);
        aiService.saveConfig(aiConfigForm);

        try {
            const success = await aiService.checkConnection(aiConfigForm);
            setAiTestStatus(success ? 'success' : 'error');
            if (success) {
                setTimeout(() => setAiTestStatus(prev => prev === 'success' ? 'idle' : prev), 2000);
            }
        } catch (e) {
            setAiTestStatus('error');
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0">
                <button onClick={onBack} className="text-stone-400 hover:text-stone-600 p-1">
                    <ChevronLeft size={24} />
                </button>
                <span className="text-stone-800 font-bold text-lg">AI API</span>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto pb-40">
                <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 text-stone-600 mb-2">
                        <Bot size={24} />
                        <h3 className="font-bold text-lg">AI Provider</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        {Object.entries(AI_PRESETS).map(([key, preset]) => (
                            <button
                                key={key}
                                onClick={() => handlePresetChange(key)}
                                className={`px-4 py-3 rounded-xl text-sm font-bold transition-all ${activePreset === key
                                    ? 'bg-stone-800 text-white shadow-lg'
                                    : 'bg-stone-50 text-stone-600 hover:bg-stone-100'
                                    }`}
                            >
                                {preset.name}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-3 pt-4">
                        <div>
                            <label className="text-xs font-bold text-stone-400 uppercase ml-1">API Key</label>
                            <input
                                type="password"
                                placeholder="Enter your API key"
                                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-700 outline-none focus:border-stone-400 mt-1"
                                value={aiConfigForm.apiKey}
                                onChange={e => setAiConfigForm(prev => ({ ...prev, apiKey: e.target.value }))}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-stone-400 uppercase ml-1">Base URL</label>
                            <input
                                type="text"
                                placeholder="API endpoint"
                                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-700 outline-none focus:border-stone-400 mt-1"
                                value={aiConfigForm.baseUrl}
                                onChange={e => setAiConfigForm(prev => ({ ...prev, baseUrl: e.target.value }))}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-stone-400 uppercase ml-1">Model Name</label>
                            <input
                                type="text"
                                placeholder="Model identifier"
                                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-700 outline-none focus:border-stone-400 mt-1"
                                value={aiConfigForm.modelName}
                                onChange={e => setAiConfigForm(prev => ({ ...prev, modelName: e.target.value }))}
                            />
                        </div>

                        <button
                            onClick={handleSaveAIConfig}
                            disabled={aiTestStatus === 'testing'}
                            className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium active:scale-[0.98] transition-all shadow-lg mt-4 ${aiTestStatus === 'testing'
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

                            {aiTestStatus === 'testing' && "测试中..."}
                            {aiTestStatus === 'success' && "连接成功"}
                            {aiTestStatus === 'error' && "连接失败 - 请检查配置"}
                            {aiTestStatus === 'idle' && "保存并测试连接"}
                        </button>
                        <p className="text-[10px] text-center text-stone-400 mt-3">
                            隐私说明：您的输入和标签将发送至配置的 AI 服务商，本地服务器不存储任何数据。
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
