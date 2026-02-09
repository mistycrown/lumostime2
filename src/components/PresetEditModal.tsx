/**
 * @file PresetEditModal.tsx
 * @description Full-screen modal for editing custom theme presets
 * @input preset data
 * @output Updated preset or delete action
 * @pos Component (Modal)
 */
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { ThemePreset } from '../hooks/useCustomPresets';
import { ColorSchemeSelector } from './ColorSchemeSelector';
import { BackgroundSelector } from './BackgroundSelector';
import { NavigationDecorationSelector } from './NavigationDecorationSelector';
import { ConfirmModal } from './ConfirmModal';
import { TIMEPAL_OPTIONS, TimePalType, getTimePalEmoji } from '../constants/timePalConfig';
import { Check } from 'lucide-react';
import { ToastType } from './Toast';

interface PresetEditModalProps {
    isOpen: boolean;
    preset: ThemePreset | null;
    onClose: () => void;
    onSave: (updatedPreset: ThemePreset) => void;
    onDelete: () => void;
    onToast: (type: ToastType, message: string) => void;
}

export const PresetEditModal: React.FC<PresetEditModalProps> = ({
    isOpen,
    preset,
    onClose,
    onSave,
    onDelete,
    onToast
}) => {
    const [editedPreset, setEditedPreset] = useState<ThemePreset | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    // Initialize edited preset when modal opens
    useEffect(() => {
        if (isOpen && preset) {
            setEditedPreset({ ...preset });
            setHasChanges(false);
            setIsDeleteConfirmOpen(false);
        }
    }, [isOpen, preset]);

    if (!isOpen || !editedPreset) return null;

    const handleFieldChange = (field: keyof ThemePreset, value: string) => {
        setEditedPreset(prev => prev ? { ...prev, [field]: value } : null);
        setHasChanges(true);
    };

    const handleSave = () => {
        if (editedPreset) {
            onSave(editedPreset);
        }
    };

    const handleCancel = () => {
        if (hasChanges) {
            if (confirm('有未保存的更改，确定要放弃吗？')) {
                onClose();
            }
        } else {
            onClose();
        }
    };
    
    const handleDeleteClick = () => {
        setIsDeleteConfirmOpen(true);
    };
    
    const handleConfirmDelete = () => {
        setIsDeleteConfirmOpen(false);
        onDelete();
    };

    // UI 主题选项
    const uiThemeOptions = [
        { id: 'default', name: '默认' },
        { id: 'purple', name: 'Purple' },
        { id: 'color', name: 'Color' },
        { id: 'prince', name: 'Prince' },
        { id: 'cat', name: 'Cat' },
        { id: 'forest', name: 'Forest' },
        { id: 'plant', name: 'Plant' },
        { id: 'water', name: 'Water' }
    ];

    return (
        <div className="fixed inset-0 z-[110] bg-[#fdfbf7] flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0 z-10">
                <button
                    onClick={handleCancel}
                    className="text-stone-400 hover:text-stone-600 p-1"
                    aria-label="返回"
                >
                    <ChevronLeft size={24} />
                </button>
                <span className="text-stone-800 font-bold text-lg">编辑方案</span>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto px-5 py-6 pb-32">
                <div className="space-y-6 max-w-2xl mx-auto">
                    {/* 方案名称 */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
                        <label className="block text-sm font-medium text-stone-700">
                            方案名称
                        </label>
                        <input
                            type="text"
                            value={editedPreset.name}
                            onChange={(e) => handleFieldChange('name', e.target.value)}
                            maxLength={50}
                            className="w-full bg-stone-50 border-2 border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-200 transition-all"
                            placeholder="输入方案名称..."
                        />
                        <div className="text-xs text-stone-400 text-right">
                            {editedPreset.name.length}/50
                        </div>
                    </div>

                    {/* 方案描述 */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
                        <label className="block text-sm font-medium text-stone-700">
                            方案描述 <span className="text-stone-400 font-normal">(可选)</span>
                        </label>
                        <textarea
                            value={editedPreset.description}
                            onChange={(e) => handleFieldChange('description', e.target.value)}
                            maxLength={200}
                            rows={3}
                            className="w-full bg-stone-50 border-2 border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-200 transition-all resize-none"
                            placeholder="输入方案描述..."
                        />
                        <div className="text-xs text-stone-400 text-right">
                            {editedPreset.description.length}/200
                        </div>
                    </div>

                    {/* UI 图标主题 */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
                        <label className="block text-sm font-medium text-stone-700">
                            UI 图标主题
                        </label>
                        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(64px, 1fr))' }}>
                            {uiThemeOptions.map((option) => {
                                const isSelected = editedPreset.uiTheme === option.id;
                                return (
                                    <button
                                        key={option.id}
                                        onClick={() => handleFieldChange('uiTheme', option.id)}
                                        className={`relative rounded-lg border-2 transition-all overflow-hidden ${
                                            isSelected
                                                ? 'border-stone-400 ring-2 ring-stone-200'
                                                : 'border-stone-200 hover:border-stone-300'
                                        }`}
                                        style={{ aspectRatio: '4/5' }}
                                    >
                                        <div className="w-full h-full flex items-center justify-center bg-white">
                                            {option.id === 'default' ? (
                                                <span className="text-xs text-stone-400">默认</span>
                                            ) : (
                                                <div className="w-full h-full grid grid-cols-2 gap-0.5 p-1">
                                                    {[1, 2, 3, 4].map((num) => (
                                                        <div key={num} className="bg-stone-50 rounded flex items-center justify-center">
                                                            <img
                                                                src={`/uiicon/${option.id}/${String(num).padStart(2, '0')}.webp`}
                                                                alt={`icon-${num}`}
                                                                className="w-full h-full object-contain p-0.5"
                                                                onError={(e) => {
                                                                    e.currentTarget.src = `/uiicon/${option.id}/${String(num).padStart(2, '0')}.png`;
                                                                }}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        {isSelected && (
                                            <div className="absolute top-1 right-1 w-5 h-5 bg-stone-800 rounded-full flex items-center justify-center shadow-lg">
                                                <Check size={12} className="text-white" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 配色方案 */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
                        <label className="block text-sm font-medium text-stone-700">
                            配色方案
                        </label>
                        <ColorSchemeSelector
                            currentScheme={editedPreset.colorScheme as any}
                            onSchemeChange={(scheme) => handleFieldChange('colorScheme', scheme)}
                        />
                    </div>

                    {/* 背景图片 */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
                        <label className="block text-sm font-medium text-stone-700">
                            背景图片
                        </label>
                        <BackgroundSelector 
                            onToast={onToast}
                            currentBackground={editedPreset.background}
                            onBackgroundChange={(bg) => handleFieldChange('background', bg)}
                        />
                    </div>

                    {/* 导航栏装饰 */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
                        <label className="block text-sm font-medium text-stone-700">
                            导航栏装饰
                        </label>
                        <NavigationDecorationSelector 
                            onToast={onToast}
                            currentDecoration={editedPreset.navigation}
                            onDecorationChange={(nav) => handleFieldChange('navigation', nav)}
                        />
                    </div>

                    {/* 时间小友 */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
                        <label className="block text-sm font-medium text-stone-700">
                            时间小友
                        </label>
                        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(64px, 1fr))' }}>
                            {/* 不使用选项 */}
                            <button
                                onClick={() => handleFieldChange('timePal', 'none')}
                                className={`relative rounded-lg border-2 transition-all overflow-hidden ${
                                    editedPreset.timePal === 'none'
                                        ? 'border-stone-400 ring-2 ring-stone-200'
                                        : 'border-stone-200 hover:border-stone-300'
                                }`}
                                style={{ aspectRatio: '4/5' }}
                            >
                                <div className="w-full h-full flex items-center justify-center p-1">
                                    <span className="text-xs text-stone-400">不使用</span>
                                </div>
                                {editedPreset.timePal === 'none' && (
                                    <div className="absolute top-1 right-1 w-5 h-5 bg-stone-800 rounded-full flex items-center justify-center shadow-lg">
                                        <Check size={12} className="text-white" />
                                    </div>
                                )}
                            </button>
                            
                            {/* TimePal 选项 */}
                            {TIMEPAL_OPTIONS.map((option) => {
                                const isSelected = editedPreset.timePal === option.type;
                                return (
                                    <button
                                        key={option.type}
                                        onClick={() => handleFieldChange('timePal', option.type)}
                                        className={`relative rounded-lg border-2 transition-all overflow-hidden ${
                                            isSelected
                                                ? 'border-stone-400 ring-2 ring-stone-200'
                                                : 'border-stone-200 hover:border-stone-300'
                                        }`}
                                        style={{ aspectRatio: '4/5' }}
                                    >
                                        <div className="w-full h-full flex items-center justify-center p-1">
                                            <img
                                                src={option.preview}
                                                alt={option.name}
                                                className="w-full h-full object-contain"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    const parent = e.currentTarget.parentElement;
                                                    if (parent) {
                                                        parent.innerHTML = `<span class="text-3xl">${getTimePalEmoji(option.type)}</span>`;
                                                    }
                                                }}
                                            />
                                        </div>
                                        {isSelected && (
                                            <div className="absolute top-1 right-1 w-5 h-5 bg-stone-800 rounded-full flex items-center justify-center shadow-lg">
                                                <Check size={12} className="text-white" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer - Fixed at bottom */}
            <div className="border-t border-stone-100 bg-white p-5 space-y-3">
                <div className="flex gap-3 max-w-2xl mx-auto">
                    <button
                        onClick={handleCancel}
                        className="flex-1 py-3.5 bg-white border border-stone-200 text-stone-600 rounded-2xl font-bold hover:bg-stone-50 transition-colors"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges || !editedPreset.name.trim()}
                        className={`flex-1 py-3.5 rounded-2xl font-bold transition-all ${
                            hasChanges && editedPreset.name.trim()
                                ? 'bg-stone-800 text-white hover:bg-stone-900 hover:scale-[1.01] active:scale-[0.99] shadow-lg'
                                : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                        }`}
                    >
                        保存
                    </button>
                </div>
                <button
                    onClick={handleDeleteClick}
                    className="w-full max-w-2xl mx-auto py-3 text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                    <Trash2 size={16} />
                    删除此方案
                </button>
            </div>
            
            {/* 删除确认对话框 - 在 PresetEditModal 内部 */}
            <ConfirmModal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="删除自定义方案"
                description={`确定要删除方案"${editedPreset?.name}"吗？此操作无法撤销。`}
                confirmText="确认删除"
                cancelText="取消"
                type="danger"
            />
        </div>
    );
};
