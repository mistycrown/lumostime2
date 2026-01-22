/**
 * @file MemoirSettingsView.tsx
 * @input SettingsContext (memoirFilterConfig), Category/Scope Data
 * @output Global Memoir Filter Updates
 * @pos View (Settings Sub-page)
 * @description Provides a UI to configure global filters for the Memoir (Journal) view: Has Image, Min Length, Related Tags, Related Domains.
 */
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ImageIcon, AlignLeft, Tag, Crosshair, Check, X } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { CustomSelect } from '../components/CustomSelect'; // Assuming this exists or using native select if not suitable

interface MemoirSettingsViewProps {
    onBack: () => void;
}

export const MemoirSettingsView: React.FC<MemoirSettingsViewProps> = ({ onBack }) => {
    const { memoirFilterConfig, setMemoirFilterConfig } = useSettings();
    const { categories, scopes } = useCategoryScope();

    // Local state for immediate feedback, though we sync directly to context
    const [config, setConfig] = useState(memoirFilterConfig);

    useEffect(() => {
        setMemoirFilterConfig(config);
    }, [config, setMemoirFilterConfig]);

    // Helpers to toggle array items
    const toggleTag = (activityId: string) => {
        setConfig(prev => {
            const exists = prev.relatedTagIds.includes(activityId);
            return {
                ...prev,
                relatedTagIds: exists
                    ? prev.relatedTagIds.filter(id => id !== activityId)
                    : [...prev.relatedTagIds, activityId]
            };
        });
    };

    const toggleScope = (scopeId: string) => {
        setConfig(prev => {
            const exists = prev.relatedScopeIds.includes(scopeId);
            return {
                ...prev,
                relatedScopeIds: exists
                    ? prev.relatedScopeIds.filter(id => id !== scopeId)
                    : [...prev.relatedScopeIds, scopeId]
            };
        });
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0 z-10">
                <button
                    onClick={onBack}
                    className="text-stone-400 hover:text-stone-600 p-1"
                >
                    <ChevronLeft size={24} />
                </button>
                <span className="text-stone-800 font-bold text-lg">Memoir 筛选条件</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* 1. Has Image */}
                <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
                            <ImageIcon size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-stone-800">是否带有图片</h4>
                            <p className="text-xs text-stone-400">仅显示包含图片的专注记录</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={config.hasImage}
                            onChange={(e) => setConfig({ ...config, hasImage: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-stone-800"></div>
                    </label>
                </div>

                {/* 2. Min Length */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
                            <AlignLeft size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-stone-800">备注最小字数</h4>
                            <p className="text-xs text-stone-400">仅显示备注字数超过此值的记录 (0 为不限制)</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min="0"
                            max="500"
                            step="10"
                            value={config.minNoteLength}
                            onChange={(e) => setConfig({ ...config, minNoteLength: parseInt(e.target.value) })}
                            className="flex-1 h-2 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-stone-800"
                        />
                        <input
                            type="number"
                            min="0"
                            value={config.minNoteLength}
                            onChange={(e) => setConfig({ ...config, minNoteLength: parseInt(e.target.value) || 0 })}
                            className="w-16 bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 text-center font-mono text-stone-800 focus:outline-none focus:border-stone-400"
                        />
                    </div>
                </div>

                {/* 3. Related Tags */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
                            <Tag size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-stone-800">关联标签</h4>
                            <p className="text-xs text-stone-400">仅显示属于所选标签的记录 (留空为不筛选)</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto pr-1">
                        {categories.map(cat => (
                            cat.activities.map(act => {
                                const isSelected = config.relatedTagIds.includes(act.id);
                                return (
                                    <button
                                        key={act.id}
                                        onClick={() => toggleTag(act.id)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${isSelected
                                            ? 'bg-stone-800 text-white shadow-md'
                                            : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-100'
                                            }`}
                                    >
                                        <span>{act.icon}</span>
                                        <span>{act.name}</span>
                                        {isSelected && <Check size={12} />}
                                    </button>
                                );
                            })
                        ))}
                    </div>
                </div>

                {/* 4. Related Domains (Scopes) */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
                            <Crosshair size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-stone-800">关联领域</h4>
                            <p className="text-xs text-stone-400">仅显示关联到所选领域的记录 (留空为不筛选)</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {scopes.map(scope => {
                            const isSelected = config.relatedScopeIds.includes(scope.id);
                            return (
                                <button
                                    key={scope.id}
                                    onClick={() => toggleScope(scope.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${isSelected
                                        ? 'bg-stone-800 text-white shadow-md'
                                        : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-100'
                                        }`}
                                >
                                    <span className="text-sm">{scope.icon}</span>
                                    <span>{scope.name}</span>
                                    {isSelected && <Check size={12} />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="text-center text-xs text-stone-400 pt-4 pb-8">
                    只有同时满足以上四个条件的专注记录，才会在 Memoir 界面显示。
                </div>

            </div>
        </div>
    );
};
