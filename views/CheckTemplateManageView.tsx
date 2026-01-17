/**
 * @file CheckTemplateManageView.tsx
 * @input Check Templates List, onUpdate Callback
 * @output Updated Check Templates
 * @pos Settings > Daily Review > Check Templates
 * @description View for managing daily check templates (add, edit, delete, reorder).
 */
import React, { useState } from 'react';
import {
    ChevronLeft,
    PlusCircle,
    Edit2,
    Trash2,
    CheckCircle2,
    X,
    GripVertical,
    ArrowUp,
    ArrowDown,
    Save,
    Database,
    AlertCircle
} from 'lucide-react';
import { CheckTemplate } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';

interface CheckTemplateManageViewProps {
    templates: CheckTemplate[];
    onUpdateTemplates: (templates: CheckTemplate[]) => void;
    onBack: () => void;
    dailyReviews: any[]; // DailyReview[] - simplified for imports
    onBatchUpdateDailyReviewItems: (updates: any[]) => void;
}

export const CheckTemplateManageView: React.FC<CheckTemplateManageViewProps> = (props) => {
    const { templates, onUpdateTemplates, onBack } = props;
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
    const [templateForm, setTemplateForm] = useState<CheckTemplate | null>(null);
    const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

    // Batch Modify State
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [batchTab, setBatchTab] = useState<'rename' | 'delete'>('rename');
    const [batchTargetContent, setBatchTargetContent] = useState('');
    const [batchNewContent, setBatchNewContent] = useState('');
    const [batchResult, setBatchResult] = useState<string | null>(null);
    const [batchStep, setBatchStep] = useState<'input' | 'confirm'>('input');
    const [scanCount, setScanCount] = useState(0);

    // Reset when tab/modal changes
    React.useEffect(() => {
        setBatchStep('input');
        setScanCount(0);
        setBatchResult(null);
    }, [batchTab, showBatchModal]);

    // Validation
    const [errors, setErrors] = useState<{ title?: string }>({});

    // Start adding a new template
    const handleAddTemplate = () => {
        const newTemplate: CheckTemplate = {
            id: crypto.randomUUID(),
            title: '新日课',
            items: [{ id: crypto.randomUUID(), content: '日课 1', icon: '📝' }], // Default item
            enabled: true,
            order: (templates.length > 0 ? Math.max(...templates.map(t => t.order)) : 0) + 1,
            isDaily: true
        };
        setTemplateForm(newTemplate);
        setEditingTemplateId('NEW');
    };

    // Start editing an existing template
    const handleEditTemplate = (template: CheckTemplate) => {
        setTemplateForm({ ...template });
        setEditingTemplateId(template.id);
    };

    // Save changes (New or Edit)
    const handleSave = () => {
        if (!templateForm) return;

        // Validation
        if (!templateForm.title.trim()) {
            setErrors({ title: '标题不能为空' });
            return;
        }

        // Filter out empty items
        const cleanItems = templateForm.items.filter(i => !!i.content.trim());
        const finalTemplate = { ...templateForm, items: cleanItems };

        if (editingTemplateId === 'NEW') {
            onUpdateTemplates([...templates, finalTemplate]);
        } else {
            onUpdateTemplates(templates.map(t => t.id === finalTemplate.id ? finalTemplate : t));
        }

        setEditingTemplateId(null);
        setTemplateForm(null);
        setErrors({});
    };

    // Cancel edit
    const handleCancel = () => {
        setEditingTemplateId(null);
        setTemplateForm(null);
        setErrors({});
    };

    // Item management within the form
    const handleAddItem = () => {
        if (!templateForm) return;
        setTemplateForm({
            ...templateForm,
            ...templateForm,
            items: [...templateForm.items, { id: crypto.randomUUID(), content: '', icon: '⚡' }]
        });
    };

    const handleUpdateItem = (index: number, content: string) => {
        if (!templateForm) return;
        const newItems = [...templateForm.items];
        // Auto-update icon based on first char of content
        const icon = content.trim().slice(0, 1) || '📝';
        newItems[index] = { ...newItems[index], content, icon };
        setTemplateForm({ ...templateForm, items: newItems });
    };

    const handleDeleteItem = (index: number) => {
        if (!templateForm) return;
        const newItems = templateForm.items.filter((_, i) => i !== index);
        setTemplateForm({ ...templateForm, items: newItems });
    };

    // Template Deletion
    const confirmDelete = () => {
        if (deletingTemplateId) {
            onUpdateTemplates(templates.filter(t => t.id !== deletingTemplateId));
            setDeletingTemplateId(null);
        }
    };

    // Toggle Enabled
    const handleToggleEnabled = (template: CheckTemplate, e: React.MouseEvent) => {
        e.stopPropagation();
        const updated = { ...template, enabled: !template.enabled };
        onUpdateTemplates(templates.map(t => t.id === template.id ? updated : t));
    };

    // Batch Modification Logic
    const handleBatchProcess = () => {
        if (!batchTargetContent.trim()) return;

        // Step 1: Scan
        if (batchStep === 'input') {
            let count = 0;
            const target = batchTargetContent.trim();
            props.dailyReviews.forEach(review => {
                if (!review.checkItems) return;
                review.checkItems.forEach((item: any) => {
                    // Loose matching: includes
                    if (item.content.includes(target)) {
                        count++;
                    }
                });
            });

            setScanCount(count);
            if (count > 0) {
                setBatchStep('confirm');
                setBatchResult(`🔍 扫描到 ${count} 条包含 "${target}" 的记录，请点击执行以确认修改。`);
            } else {
                setBatchResult('❌ 未找到匹配的日课记录');
                setTimeout(() => setBatchResult(null), 2000);
            }
            return;
        }

        // Step 2: Execute
        let updatedCount = 0;
        // Iterate over props.dailyReviews
        const updatedReviews = props.dailyReviews.map(review => {
            if (!review.checkItems) return review;

            let hasChange = false;
            let newCheckItems = [...review.checkItems];
            const target = batchTargetContent.trim();

            if (batchTab === 'rename') {
                if (!batchNewContent.trim()) return review;
                newCheckItems = newCheckItems.map(item => {
                    if (item.content.includes(target)) {
                        hasChange = true;
                        updatedCount++;
                        // Replace the entire content with new content, or just replace the substring? 
                        // Usually user wants to replace the whole item content to standardize it.
                        return { ...item, content: batchNewContent.trim() };
                    }
                    return item;
                });
            } else if (batchTab === 'delete') {
                const initialLen = newCheckItems.length;
                newCheckItems = newCheckItems.filter(item => !item.content.includes(target));
                if (newCheckItems.length !== initialLen) {
                    hasChange = true;
                    updatedCount += (initialLen - newCheckItems.length);
                }
            }

            if (hasChange) {
                return { ...review, checkItems: newCheckItems };
            }
            return review;
        });

        if (updatedCount > 0) {
            props.onBatchUpdateDailyReviewItems(updatedReviews);
            setBatchResult(`✅ 成功${batchTab === 'rename' ? '重命名' : '删除'}了 ${updatedCount} 条日课记录`);
            setTimeout(() => {
                setShowBatchModal(false);
                setBatchResult(null);
                setBatchTargetContent('');
                setBatchNewContent('');
                setBatchStep('input');
                setScanCount(0);
            }, 1500);
        } else {
            setBatchResult('⚠️ 执行过程中未找到记录 (可能已被修改)');
            setBatchStep('input');
            setTimeout(() => setBatchResult(null), 2000);
        }
    };


    return (
        <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0 shrink-0 z-10">
                <button
                    onClick={onBack}
                    className="text-stone-400 hover:text-stone-600 p-1"
                >
                    <ChevronLeft size={24} />
                </button>
                <span className="text-stone-800 font-bold text-lg">日课模板</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 pb-20">
                {/* List Mode */}
                {!editingTemplateId && (
                    <div className="space-y-4">
                        <div className="flex justify-end">
                            <button
                                onClick={handleAddTemplate}
                                className="flex items-center gap-1 px-3 py-1.5 bg-stone-800 text-white text-xs font-bold rounded-lg hover:bg-stone-700 active:scale-95 transition-all"
                            >
                                <PlusCircle size={14} />
                                <span>新建模板</span>
                            </button>
                            <button
                                onClick={() => setShowBatchModal(true)}
                                className="ml-2 flex items-center gap-1 px-3 py-1.5 bg-white border border-stone-200 text-stone-600 text-xs font-bold rounded-lg hover:bg-stone-50 active:scale-95 transition-all"
                            >
                                <Database size={14} />
                                <span>批量修改数据</span>
                            </button>
                        </div>

                        {templates.length === 0 ? (
                            <div className="p-12 text-center text-stone-400 bg-white rounded-2xl shadow-sm border border-stone-100">
                                <CheckCircle2 size={32} className="mx-auto mb-3 opacity-30" />
                                <p className="text-sm">暂无日课模板</p>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {templates.map((template) => (
                                    <div
                                        key={template.id}
                                        className={`bg-white rounded-2xl p-4 shadow-sm border transition-all ${template.enabled ? 'border-stone-100' : 'border-stone-100 opacity-60'}`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h3 className="font-bold text-stone-800 text-base">{template.title}</h3>
                                                    {!template.enabled && (
                                                        <span className="px-1.5 py-0.5 bg-stone-100 text-stone-400 text-[10px] rounded">已停用</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {template.items.map((item, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="px-2 py-1.5 rounded-lg text-[10px] font-medium text-center border transition-colors flex items-center justify-center gap-1.5 bg-stone-50 text-stone-500 border-stone-100"
                                                        >
                                                            <span className="truncate">{item.content}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={(e) => handleEditTemplate(template)}
                                                    className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-50 rounded-lg"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={(e) => handleToggleEnabled(template, e)}
                                                    className={`p-2 rounded-lg transition-colors ${template.enabled ? 'text-green-500 bg-green-50 hover:bg-green-100' : 'text-stone-300 hover:bg-stone-50'}`}
                                                    title={template.enabled ? "点击停用" : "点击启用"}
                                                >
                                                    <CheckCircle2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setDeletingTemplateId(template.id)}
                                                    className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Edit Mode */}
                {editingTemplateId && templateForm && (
                    <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                            <h3 className="font-bold text-stone-800">
                                {editingTemplateId === 'NEW' ? '新建模板' : '编辑模板'}
                            </h3>
                            <button onClick={handleCancel} className="text-stone-400 hover:text-stone-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4 space-y-6">
                            {/* Title */}
                            <div>
                                <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase tracking-wider">模板标题</label>
                                <input
                                    type="text"
                                    value={templateForm.title}
                                    onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                                    className={`w-full bg-stone-50 border ${errors.title ? 'border-red-300 focus:border-red-500' : 'border-stone-200 focus:border-stone-400'} rounded-xl px-4 py-2.5 text-sm outline-none transition-colors`}
                                    placeholder="例如：早间流程"
                                />
                                {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
                            </div>

                            {/* Items */}
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider">日课列表</label>
                                    <button
                                        onClick={handleAddItem}
                                        className="text-xs text-stone-500 hover:text-stone-800 font-bold flex items-center gap-1 px-2 py-1 hover:bg-stone-100 rounded-lg transition-colors"
                                    >
                                        <PlusCircle size={12} />
                                        添加项
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {templateForm.items.map((item, idx) => (
                                        <div key={item.id || idx} className="flex items-center gap-2 group">
                                            <span className="text-stone-300 text-xs w-4 text-center">{idx + 1}</span>
                                            {/* Content Input (Combined) */}
                                            <input
                                                type="text"
                                                value={item.content}
                                                onChange={(e) => handleUpdateItem(idx, e.target.value)}
                                                className="flex-1 bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100 transition-all font-serif"
                                                placeholder="💧 输入检查内容 (首字符作为图标)..."
                                                autoFocus={templateForm.items.length > 1 && idx === templateForm.items.length - 1}
                                            />
                                            <button
                                                onClick={() => handleDeleteItem(idx)}
                                                className="p-2 text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                                tabIndex={-1}
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {templateForm.items.length === 0 && (
                                        <div className="text-center py-4 text-xs text-stone-300 border-2 border-dashed border-stone-100 rounded-lg">
                                            暂无日课
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-stone-50 border-t border-stone-100 flex justify-end gap-3">
                            <button
                                onClick={handleCancel}
                                className="px-4 py-2 text-sm font-bold text-stone-500 hover:bg-stone-200/50 rounded-xl transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-6 py-2 text-sm font-bold text-white bg-stone-800 hover:bg-stone-700 rounded-xl shadow-lg shadow-stone-200 active:scale-95 transition-all flex items-center gap-2"
                            >
                                <Save size={16} />
                                保存模板
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Batch Modify Modal */}
            {showBatchModal && (
                <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                            <h3 className="font-bold text-stone-800">批量修改历史日课</h3>
                            <button onClick={() => setShowBatchModal(false)} className="text-stone-400 hover:text-stone-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex border-b border-stone-100">
                            <button
                                onClick={() => setBatchTab('rename')}
                                className={`flex-1 py-3 text-sm font-bold transition-colors ${batchTab === 'rename' ? 'text-stone-800 border-b-2 border-stone-800' : 'text-stone-400 hover:text-stone-600'}`}
                            >
                                批量重命名
                            </button>
                            <button
                                onClick={() => setBatchTab('delete')}
                                className={`flex-1 py-3 text-sm font-bold transition-colors ${batchTab === 'delete' ? 'text-red-600 border-b-2 border-red-600' : 'text-stone-400 hover:text-stone-600'}`}
                            >
                                批量删除
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="bg-amber-50 text-amber-700 text-xs p-3 rounded-xl flex gap-2 items-start">
                                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                <p>此操作将遍历所有历史日报，修改或删除指定的日课条目。请谨慎操作，一旦修改无法批量撤销。</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase tracking-wider">
                                    目标日课名称
                                </label>
                                <input
                                    type="text"
                                    value={batchTargetContent}
                                    onChange={(e) => setBatchTargetContent(e.target.value)}
                                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-stone-400 transition-all font-serif"
                                    placeholder="例如：早起喝水"
                                    autoFocus
                                />
                            </div>

                            {batchTab === 'rename' && (
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase tracking-wider">
                                        重命名为
                                    </label>
                                    <input
                                        type="text"
                                        value={batchNewContent}
                                        onChange={(e) => setBatchNewContent(e.target.value)}
                                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-stone-400 transition-all font-serif"
                                        placeholder="例如：早起"
                                    />
                                </div>
                            )}

                            {batchResult && (
                                <div className={`text-center text-sm font-bold py-2 ${batchResult.includes('成功') ? 'text-green-600' : 'text-stone-400'}`}>
                                    {batchResult}
                                </div>
                            )}

                            <button
                                onClick={handleBatchProcess}
                                disabled={!batchTargetContent.trim() || (batchTab === 'rename' && !batchNewContent.trim())}
                                className={`w-full py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${batchTab === 'delete'
                                    ? 'bg-red-500 hover:bg-red-600 shadow-red-200'
                                    : 'bg-stone-800 hover:bg-stone-700 shadow-stone-200'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {batchStep === 'input' ? (
                                    <span>🔍 扫描匹配项</span>
                                ) : (
                                    <>
                                        {batchTab === 'rename' ? <Edit2 size={14} /> : <Trash2 size={14} />}
                                        {batchTab === 'rename' ? `确认重命名 (${scanCount})` : `确认删除 (${scanCount})`}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={!!deletingTemplateId}
                onClose={() => setDeletingTemplateId(null)}
                onConfirm={confirmDelete}
                title="删除模板"
                description="确定要删除这个日课模板吗？此操作不会影响已生成的历史记录。"
                confirmText="删除"
                cancelText="取消"
                type="danger"
            />
        </div>
    );
};
