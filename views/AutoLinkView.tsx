/**
 * @file AutoLinkView.tsx
 * @input Categories, Scopes
 * @output User Interaction (Rules Configuration)
 * @pos View (Settings Sub-page)
 * @description Provides a UI for managing automatic association rules between Tags (Activities) and Scopes (Domains), allowing users to define default scopes for specific activities.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState } from 'react';
import { ChevronLeft, Plus, Trash2, Link, X } from 'lucide-react';
import { AutoLinkRule, Category, Scope, Activity } from '../types';

interface AutoLinkViewProps {
    onClose: () => void;
    rules: AutoLinkRule[];
    onUpdateRules: (rules: AutoLinkRule[]) => void;
    categories: Category[];
    scopes: Scope[];
}

export const AutoLinkView: React.FC<AutoLinkViewProps> = ({
    onClose,
    rules,
    onUpdateRules,
    categories,
    scopes
}) => {
    const [isAdding, setIsAdding] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
    const [selectedActivityId, setSelectedActivityId] = useState<string>('');
    const [selectedScopeId, setSelectedScopeId] = useState<string>('');

    // 获取 Activity 信息
    const getActivityInfo = (activityId: string) => {
        for (const category of categories) {
            const activity = category.activities.find(a => a.id === activityId);
            if (activity) {
                return { activity, category };
            }
        }
        return null;
    };

    // 获取 Scope 信息
    const getScopeInfo = (scopeId: string) => {
        return scopes.find(s => s.id === scopeId);
    };

    // 添加规则
    const handleAddRule = () => {
        if (!selectedActivityId || !selectedScopeId) return;

        const newRule: AutoLinkRule = {
            id: crypto.randomUUID(),
            activityId: selectedActivityId,
            scopeId: selectedScopeId
        };

        onUpdateRules([...rules, newRule]);
        setIsAdding(false);
        setSelectedCategoryId('');
        setSelectedActivityId('');
        setSelectedScopeId('');
    };

    // 删除规则
    const handleDeleteRule = (ruleId: string) => {
        onUpdateRules(rules.filter(r => r.id !== ruleId));
    };

    // 获取选中分类下的活动
    const getActivitiesForCategory = (categoryId: string): Activity[] => {
        const category = categories.find(c => c.id === categoryId);
        return category?.activities || [];
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0">
                <button
                    onClick={onClose}
                    className="text-stone-400 hover:text-stone-600 p-1"
                >
                    <ChevronLeft size={24} />
                </button>
                <span className="text-stone-800 font-bold text-lg">标签关联领域规则</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-40">
                {/* 说明 */}
                <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700 leading-relaxed">
                    <p className="font-bold mb-1">💡 功能说明</p>
                    <p>为标签设置默认的关联的领域，开始计时或者补计时系统会提醒您应用这些规则。</p>
                </div>

                {/* 规则列表 */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider pl-2">
                            已配置规则 ({rules.length})
                        </h3>
                        <button
                            onClick={() => setIsAdding(true)}
                            className="flex items-center gap-1 text-xs font-bold text-stone-600 hover:text-stone-800 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors"
                        >
                            <Plus size={14} />
                            添加规则
                        </button>
                    </div>

                    {rules.length === 0 && !isAdding && (
                        <div className="bg-white rounded-2xl p-8 text-center text-stone-400">
                            <Link size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">暂无自动关联规则</p>
                            <p className="text-xs mt-1">点击上方"添加规则"按钮开始配置</p>
                        </div>
                    )}

                    {/* 添加规则表单 */}
                    {isAdding && (
                        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-stone-700 flex items-center gap-2">
                                    <Plus size={16} />
                                    新建规则
                                </h4>
                                <button
                                    onClick={() => {
                                        setIsAdding(false);
                                        setSelectedCategoryId('');
                                        setSelectedActivityId('');
                                        setSelectedScopeId('');
                                    }}
                                    className="text-stone-400 hover:text-stone-600"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* 选择分类 (Category Tags) - 复制自 AddLogModal */}
                            <div>
                                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3 block">
                                    选择分类
                                </label>
                                {/* Category Grid */}
                                <div className="grid grid-cols-4 gap-2">
                                    {categories.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => {
                                                setSelectedCategoryId(cat.id);
                                                setSelectedActivityId(''); // 重置活动选择
                                            }}
                                            className={`
                                                px-2 py-2 rounded-lg text-[10px] font-medium text-center border transition-colors flex items-center justify-center gap-1.5 truncate
                                                ${selectedCategoryId === cat.id
                                                    ? 'bg-stone-900 text-white border-stone-900'
                                                    : 'bg-stone-50 text-stone-500 border-stone-100 hover:bg-stone-100'}
                                            `}
                                        >
                                            <span>{cat.icon}</span>
                                            <span className="truncate">{cat.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 选择 Activity (圆形图标卡片) - 复制自 AddLogModal */}
                            {selectedCategoryId && (
                                <div>
                                    <label className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3 block">
                                        选择活动
                                    </label>
                                    {/* Activity Grid */}
                                    <div className="grid grid-cols-4 gap-3 pt-2">
                                        {getActivitiesForCategory(selectedCategoryId).map(act => {
                                            const isActive = selectedActivityId === act.id;
                                            return (
                                                <button
                                                    key={act.id}
                                                    onClick={() => setSelectedActivityId(act.id)}
                                                    className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 active:scale-95 hover:bg-stone-50"
                                                >
                                                    <div className={`
                                                        w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all
                                                        ${isActive ? 'ring-1 ring-stone-300 ring-offset-1 scale-110' : ''}
                                                        ${act.color}
                                                    `}>
                                                        {act.icon}
                                                    </div>
                                                    <span className={`text-xs text-center font-medium leading-tight ${isActive ? 'text-stone-900 font-bold' : 'text-stone-400'}`}>
                                                        {act.name}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* 选择 Scope (横向按钮) */}
                            {selectedActivityId && (
                                <div>
                                    <label className="text-xs font-bold text-stone-400 uppercase mb-3 block">
                                        自动关联到领域
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {scopes
                                            .filter(s => !s.isArchived)
                                            .map(scope => (
                                                <button
                                                    key={scope.id}
                                                    onClick={() => setSelectedScopeId(scope.id)}
                                                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${selectedScopeId === scope.id
                                                        ? 'bg-stone-800 text-white shadow-md'
                                                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                                        }`}
                                                >
                                                    <span>{scope.icon}</span>
                                                    <span>{scope.name}</span>
                                                </button>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* 确认按钮 */}
                            {selectedActivityId && selectedScopeId && (
                                <div className="pt-2">
                                    <button
                                        onClick={handleAddRule}
                                        className="w-full py-3 bg-stone-800 text-white rounded-xl font-medium active:scale-[0.98] transition-all shadow-lg"
                                    >
                                        确认添加
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 已有规则列表 (按领域分组) */}
                    {(() => {
                        // Group rules by Scope
                        const rulesByScope = scopes
                            .map(scope => ({
                                scope,
                                rules: rules.filter(r => r.scopeId === scope.id)
                            }))
                            .filter(group => group.rules.length > 0);

                        if (rulesByScope.length === 0) return null;

                        return (
                            <div className="space-y-6">
                                {rulesByScope.map(group => (
                                    <div key={group.scope.id} className="space-y-3">
                                        {/* Scope Header */}
                                        <div className="flex items-center gap-2 px-1">
                                            <span className="text-lg">{group.scope.icon}</span>
                                            <span className="font-bold text-stone-700">{group.scope.name}</span>
                                            <span className="text-xs text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-full">
                                                {group.rules.length}
                                            </span>
                                        </div>

                                        {/* Rules in this Scope */}
                                        <div className="grid grid-cols-1 gap-2">
                                            {group.rules.map(rule => {
                                                const activityInfo = getActivityInfo(rule.activityId);
                                                if (!activityInfo) return null;

                                                return (
                                                    <div
                                                        key={rule.id}
                                                        className="bg-white rounded-xl p-3 shadow-sm flex items-center justify-between border border-stone-100"
                                                    >
                                                        {/* Activity Info */}
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${activityInfo.activity.color} bg-opacity-10`}>
                                                                {activityInfo.activity.icon}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-stone-700 text-sm leading-tight">
                                                                    {activityInfo.activity.name}
                                                                </p>
                                                                <p className="text-[10px] text-stone-400 mt-0.5">
                                                                    {activityInfo.category.name}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Delete Button */}
                                                        <button
                                                            onClick={() => handleDeleteRule(rule.id)}
                                                            className="p-1.5 text-stone-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
};
