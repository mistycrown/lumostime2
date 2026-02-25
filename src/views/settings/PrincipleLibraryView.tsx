/**
 * @file PrincipleLibraryView.tsx
 * @description 原则库设置页面 - 管理核心原则卡片的内容库
 */
import React, { useState } from 'react';
import { ChevronLeft, Plus, Trash2, Edit2, Check, X, RotateCcw } from 'lucide-react';
import { ConfirmModal } from '../../components/ConfirmModal';
import { DEFAULT_PRINCIPLE_PRESETS } from '../../constants/principlePresets';

// 原则数据结构
export interface Principle {
    id: string;
    title: string;
    frontText: string;
    backText: string;
}

interface PrincipleLibraryViewProps {
    onBack: () => void;
}

export const PrincipleLibraryView: React.FC<PrincipleLibraryViewProps> = ({ onBack }) => {
    // 从 localStorage 读取原则（如果没有则使用默认预设）
    const [principles, setPrinciples] = useState<Principle[]>(() => {
        const stored = localStorage.getItem('lumostime_principles');
        if (stored) {
            return JSON.parse(stored);
        }
        // 首次加载，使用默认预设
        return [...DEFAULT_PRINCIPLE_PRESETS];
    });

    const [isCreating, setIsCreating] = useState(false);
    const [editingPrincipleId, setEditingPrincipleId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        frontText: '',
        backText: ''
    });
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

    // 保存原则到 localStorage
    const savePrinciples = (newPrinciples: Principle[]) => {
        setPrinciples(newPrinciples);
        localStorage.setItem('lumostime_principles', JSON.stringify(newPrinciples));
        // 触发事件通知其他组件
        window.dispatchEvent(new Event('principleLibraryChanged'));
    };

    // 开始创建新原则
    const handleStartCreate = () => {
        setIsCreating(true);
        setEditingPrincipleId(null);
        setFormData({ title: '', frontText: '', backText: '' });
    };

    // 开始编辑原则
    const handleStartEdit = (principle: Principle) => {
        setIsCreating(true);
        setEditingPrincipleId(principle.id);
        setFormData({
            title: principle.title,
            frontText: principle.frontText,
            backText: principle.backText
        });
    };

    // 保存原则
    const handleSave = () => {
        if (!formData.title.trim() || !formData.frontText.trim()) {
            return;
        }

        if (editingPrincipleId) {
            // 编辑现有原则
            const updated = principles.map(p =>
                p.id === editingPrincipleId
                    ? { ...p, ...formData }
                    : p
            );
            savePrinciples(updated);
        } else {
            // 创建新原则
            const newPrinciple: Principle = {
                id: `principle-${Date.now()}`,
                ...formData
            };
            savePrinciples([...principles, newPrinciple]);
        }

        handleCancel();
    };

    // 取消编辑
    const handleCancel = () => {
        setIsCreating(false);
        setEditingPrincipleId(null);
        setFormData({ title: '', frontText: '', backText: '' });
    };

    // 删除原则
    const handleDelete = (id: string) => {
        setDeleteConfirmId(id);
    };

    const confirmDelete = () => {
        if (!deleteConfirmId) return;
        const updated = principles.filter(p => p.id !== deleteConfirmId);
        savePrinciples(updated);
        setDeleteConfirmId(null);
    };

    // 重置为默认预设
    const handleReset = () => {
        savePrinciples([...DEFAULT_PRINCIPLE_PRESETS]);
        setIsResetConfirmOpen(false);
    };

    return (
        <div className="fixed inset-0 z-50 bg-stone-50 flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-white/80 backdrop-blur-md sticky top-0">
                <button
                    onClick={onBack}
                    className="text-stone-400 hover:text-stone-600 p-1"
                >
                    <ChevronLeft size={24} />
                </button>
                <span className="text-stone-800 font-bold text-lg flex-1">原则库</span>
                <button
                    onClick={() => setIsResetConfirmOpen(true)}
                    className="p-2 text-stone-400 hover:text-red-500 transition-colors"
                    title="重置为默认"
                >
                    <RotateCcw size={20} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* 说明 */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                    <p className="text-xs text-stone-500">
                        原则库用于存储核心原则，这些原则可以在场景中的原则卡片中引用。每个原则包含标题、正面文字和反面文字。
                    </p>
                </div>

                {/* 原则列表 */}
                <div className="space-y-3">
                    {principles.map(principle => (
                        <div
                            key={principle.id}
                            className="bg-white rounded-xl p-4 shadow-sm border border-stone-100"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <h3 className="text-base font-bold text-stone-800">{principle.title}</h3>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleStartEdit(principle)}
                                        className="p-1.5 hover:bg-blue-50 rounded transition-colors"
                                        title="编辑"
                                    >
                                        <Edit2 size={16} className="text-blue-500" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(principle.id)}
                                        className="p-1.5 hover:bg-red-50 rounded transition-colors"
                                        title="删除"
                                    >
                                        <Trash2 size={16} className="text-red-500" />
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div>
                                    <p className="text-xs text-stone-400 mb-1">正面文字</p>
                                    <p className="text-sm text-stone-700">{principle.frontText}</p>
                                </div>
                                {principle.backText && (
                                    <div>
                                        <p className="text-xs text-stone-400 mb-1">反面文字</p>
                                        <p className="text-sm text-stone-700">{principle.backText}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* 创建按钮 */}
                <button
                    onClick={handleStartCreate}
                    className="w-full py-3 border-2 border-dashed border-stone-300 rounded-xl text-stone-500 hover:border-stone-400 hover:text-stone-600 transition-colors flex items-center justify-center gap-2"
                >
                    <Plus size={18} />
                    <span className="text-sm font-medium">添加新原则</span>
                </button>
            </div>

            {/* 编辑模态框 */}
            {isCreating && (
                <PrincipleEditModal
                    isEditing={!!editingPrincipleId}
                    formData={formData}
                    onChange={setFormData}
                    onSave={handleSave}
                    onCancel={handleCancel}
                />
            )}

            {/* 删除确认弹窗 */}
            <ConfirmModal
                isOpen={deleteConfirmId !== null}
                title="删除原则"
                description="确定要删除这个原则吗？此操作不可撤销。"
                onConfirm={confirmDelete}
                onClose={() => setDeleteConfirmId(null)}
                confirmText="删除"
                cancelText="取消"
                type="danger"
            />

            {/* 重置确认弹窗 */}
            <ConfirmModal
                isOpen={isResetConfirmOpen}
                title="重置原则库"
                description="确定要重置所有原则为默认状态吗？这将覆盖您当前的所有原则，且无法撤销。默认原则包含：拥抱现实、极度求真、五步流程。"
                onConfirm={handleReset}
                onClose={() => setIsResetConfirmOpen(false)}
                confirmText="重置"
                cancelText="取消"
                type="danger"
            />
        </div>
    );
};

// 原则编辑模态框组件
const PrincipleEditModal: React.FC<{
    isEditing: boolean;
    formData: { title: string; frontText: string; backText: string };
    onChange: (data: { title: string; frontText: string; backText: string }) => void;
    onSave: () => void;
    onCancel: () => void;
}> = ({ isEditing, formData, onChange, onSave, onCancel }) => {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <h2 className="text-lg sm:text-xl font-bold mb-4">
                    {isEditing ? '编辑原则' : '添加新原则'}
                </h2>

                <div className="space-y-3 sm:space-y-4">
                    {/* 标题 */}
                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-stone-700 mb-1">
                            标题 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => onChange({ ...formData, title: e.target.value })}
                            placeholder="例如：拥抱现实"
                            className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-800"
                        />
                    </div>

                    {/* 正面文字 */}
                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-stone-700 mb-1">
                            正面文字 <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={formData.frontText}
                            onChange={(e) => onChange({ ...formData, frontText: e.target.value })}
                            placeholder="例如：痛苦 + 反思 = 进步"
                            rows={3}
                            className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-800 resize-none"
                        />
                    </div>

                    {/* 反面文字 */}
                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-stone-700 mb-1">
                            反面文字
                        </label>
                        <textarea
                            value={formData.backText}
                            onChange={(e) => onChange({ ...formData, backText: e.target.value })}
                            placeholder="例如：接受现实，从中学习"
                            rows={3}
                            className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-800 resize-none"
                        />
                    </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-2 mt-6">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-2 border border-stone-300 rounded-lg text-sm text-stone-600 hover:bg-stone-50 transition-colors"
                    >
                        取消
                    </button>
                    <button
                        onClick={onSave}
                        disabled={!formData.title.trim() || !formData.frontText.trim()}
                        className="flex-1 py-2 bg-stone-800 text-white rounded-lg text-sm hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isEditing ? '保存' : '创建'}
                    </button>
                </div>
            </div>
        </div>
    );
};
