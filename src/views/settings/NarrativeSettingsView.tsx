import React, { useState, useEffect } from 'react';
import { ChevronLeft, User, Sparkles, PlusCircle, Edit2, Trash2, X } from 'lucide-react';
import { ToastType } from '../../components/Toast';
import { NarrativeTemplate } from '../../types';
import { ConfirmModal } from '../../components/ConfirmModal';
import { usePrivacy } from '../../contexts/PrivacyContext';

interface NarrativeSettingsViewProps {
    onBack: () => void;
    onToast: (type: ToastType, message: string) => void;
    userPersonalInfo?: string;
    onSetUserPersonalInfo?: (info: string) => void;
    customNarrativeTemplates?: NarrativeTemplate[];
    onUpdateCustomNarrativeTemplates?: (templates: NarrativeTemplate[]) => void;
}

export const NarrativeSettingsView: React.FC<NarrativeSettingsViewProps> = ({
    onBack,
    onToast,
    userPersonalInfo,
    onSetUserPersonalInfo,
    customNarrativeTemplates,
    onUpdateCustomNarrativeTemplates
}) => {
    const { isPrivacyMode } = usePrivacy();

    // Local states
    const [localUserInfo, setLocalUserInfo] = useState(userPersonalInfo || '');
    const [showAddTemplateModal, setShowAddTemplateModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<NarrativeTemplate | null>(null);
    const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

    // Modal form states
    const [modalTitle, setModalTitle] = useState('');
    const [modalDesc, setModalDesc] = useState('');
    const [modalPrompt, setModalPrompt] = useState('');
    const [modalIsDaily, setModalIsDaily] = useState(true);
    const [modalIsWeekly, setModalIsWeekly] = useState(false);
    const [modalIsMonthly, setModalIsMonthly] = useState(false);
    const [modalError, setModalError] = useState('');

    useEffect(() => {
        setLocalUserInfo(userPersonalInfo || '');
    }, [userPersonalInfo]);

    const handleSaveUserInfo = () => {
        onSetUserPersonalInfo?.(localUserInfo);
        onToast('success', '个人信息已保存');
    };

    const handleAddTemplate = () => {
        setEditingTemplate(null);
        setModalTitle('');
        setModalDesc('');
        setModalPrompt('');
        setModalIsDaily(true);
        setModalIsWeekly(false);
        setModalIsMonthly(false);
        setModalError('');
        setShowAddTemplateModal(true);
    };

    const handleEditTemplate = (template: NarrativeTemplate) => {
        setEditingTemplate(template);
        setModalTitle(template.title);
        setModalDesc(template.description);
        setModalPrompt(template.prompt);
        setModalIsDaily(template.isDaily !== false);
        setModalIsWeekly(template.isWeekly === true);
        setModalIsMonthly(template.isMonthly === true);
        setModalError('');
        setShowAddTemplateModal(true);
    };

    const handleDeleteTemplate = (id: string) => {
        setDeletingTemplateId(id);
    };

    const confirmDeleteTemplate = () => {
        if (!deletingTemplateId) return;

        const newTemplates = (customNarrativeTemplates || []).filter(t => t.id !== deletingTemplateId);
        onUpdateCustomNarrativeTemplates?.(newTemplates);
        setDeletingTemplateId(null);
        onToast('success', '模板已删除');
    };

    const handleSaveTemplate = () => {
        if (!modalTitle.trim()) {
            setModalError('标题不能为空');
            return;
        }
        if (!modalPrompt.trim()) {
            setModalError('提示词不能为空');
            return;
        }

        const newTemplate: NarrativeTemplate = {
            id: editingTemplate ? editingTemplate.id : `custom_${Date.now()}`,
            title: modalTitle.trim(),
            description: modalDesc.trim(),
            prompt: modalPrompt,
            isCustom: true,
            isDaily: modalIsDaily,
            isWeekly: modalIsWeekly,
            isMonthly: modalIsMonthly
        };

        let updatedTemplates = [...(customNarrativeTemplates || [])];
        if (editingTemplate) {
            updatedTemplates = updatedTemplates.map(t => t.id === editingTemplate.id ? newTemplate : t);
        } else {
            updatedTemplates.push(newTemplate);
        }

        onUpdateCustomNarrativeTemplates?.(updatedTemplates);
        setShowAddTemplateModal(false);
        onToast('success', editingTemplate ? '模板已更新' : '新模板已创建');
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0 z-10">
                <button
                    onClick={onBack}
                    className="text-stone-400 hover:text-stone-600 p-1"
                >
                    <ChevronLeft size={24} />
                </button>
                <span className="text-stone-800 font-bold text-lg">AI 叙事设定</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 pb-40">
                {/* User Personal Info Section */}
                <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                            <User size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-stone-800 text-[15px]">个人信息</h4>
                            <p className="text-xs text-stone-400 mt-0.5">让 AI 了解你的背景，生成更贴合的叙事</p>
                        </div>
                    </div>

                    <textarea
                        className={`w-full h-32 bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs text-stone-600 outline-none focus:border-stone-400 resize-none leading-relaxed ${isPrivacyMode ? 'blur-sm select-none transition-all duration-500' : 'transition-all duration-500'}`}
                        value={localUserInfo}
                        onChange={(e) => setLocalUserInfo(e.target.value)}
                        placeholder="例如：我是一名正在攻读博士学位的研究生..."
                        maxLength={2000}
                    />

                    <div className="flex justify-end">
                        <button
                            onClick={handleSaveUserInfo}
                            disabled={localUserInfo === (userPersonalInfo || '')}
                            className={`text-sm font-bold px-4 py-2 rounded-lg transition-colors ${localUserInfo !== (userPersonalInfo || '')
                                ? 'bg-stone-800 text-white'
                                : 'bg-stone-100 text-stone-400'
                                }`}
                        >
                            保存信息
                        </button>
                    </div>
                </div>

                {/* Custom Templates List */}
                <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                                <Sparkles size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-stone-800 text-[15px]">自定义叙事模板</h4>
                                <p className="text-xs text-stone-400 mt-0.5">管理你自己创建的叙事风格</p>
                            </div>
                        </div>
                        <button
                            onClick={handleAddTemplate}
                            className="px-3 py-1.5 bg-stone-800 text-white text-xs font-bold rounded-lg flex items-center gap-1 hover:bg-stone-700 transition-colors"
                        >
                            <PlusCircle size={14} />
                            新建模板
                        </button>
                    </div>

                    <div className="space-y-3">
                        {(!customNarrativeTemplates || customNarrativeTemplates.length === 0) && (
                            <div className="text-center py-8 text-stone-400 text-xs bg-stone-50 rounded-xl border border-dashed border-stone-200">
                                还没有创建自定义模板<br />点击右上角创建你的专属风格
                            </div>
                        )}

                        {customNarrativeTemplates?.map(template => (
                            <div key={template.id} className="p-4 bg-stone-50 rounded-xl border border-stone-100 flex items-start justify-between group hover:border-stone-300 transition-colors">
                                <div>
                                    <h5 className="font-bold text-stone-800 text-sm">{template.title}</h5>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {/* Legacy compatibility: default to Daily if undefined */}
                                        {(template.isDaily !== false) && (
                                            <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded border border-stone-200">每日</span>
                                        )}
                                        {template.isWeekly && (
                                            <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded border border-stone-200">每周</span>
                                        )}
                                        {template.isMonthly && (
                                            <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded border border-stone-200">每月</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-stone-500 mt-1 line-clamp-2">{template.description}</p>
                                </div>
                                <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleEditTemplate(template)}
                                        className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-200 rounded-lg"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteTemplate(template.id)}
                                        className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Add/Edit Modal Overlay */}
            {showAddTemplateModal && (
                <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-4 border-b border-stone-100">
                            <h3 className="font-bold text-lg text-stone-800">
                                {editingTemplate ? '编辑模板' : '创建新模板'}
                            </h3>
                            <button onClick={() => setShowAddTemplateModal(false)} className="p-1 text-stone-400 hover:text-stone-600">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-4 space-y-4 overflow-y-auto flex-1">
                            <div>
                                <label className="block text-xs font-bold text-stone-600 mb-1.5">模板名称</label>
                                <input
                                    type="text"
                                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-800 outline-none focus:border-stone-400"
                                    placeholder="例如：发朋友圈风格"
                                    value={modalTitle}
                                    onChange={e => setModalTitle(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-stone-600 mb-1.5">简短描述</label>
                                <input
                                    type="text"
                                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-800 outline-none focus:border-stone-400"
                                    placeholder="例如：emoji多一点，语气轻松"
                                    value={modalDesc}
                                    onChange={e => setModalDesc(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-stone-600 mb-1.5">适用周期 (Applicability)</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setModalIsDaily(!modalIsDaily)}
                                        className={`px-2 py-3 rounded-xl text-xs font-bold text-center border transition-all flex items-center justify-center gap-1.5 truncate ${modalIsDaily
                                            ? 'bg-stone-900 text-white border-stone-900 shadow-md transform scale-[1.02]'
                                            : 'bg-stone-50 text-stone-500 border-stone-100 hover:bg-stone-100'
                                            }`}
                                    >
                                        <span className="text-sm">☀️</span>
                                        <span className="truncate">每日</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setModalIsWeekly(!modalIsWeekly)}
                                        className={`px-2 py-3 rounded-xl text-xs font-bold text-center border transition-all flex items-center justify-center gap-1.5 truncate ${modalIsWeekly
                                            ? 'bg-stone-900 text-white border-stone-900 shadow-md transform scale-[1.02]'
                                            : 'bg-stone-50 text-stone-500 border-stone-100 hover:bg-stone-100'
                                            }`}
                                    >
                                        <span className="text-sm">📅</span>
                                        <span className="truncate">每周</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setModalIsMonthly(!modalIsMonthly)}
                                        className={`px-2 py-3 rounded-xl text-xs font-bold text-center border transition-all flex items-center justify-center gap-1.5 truncate ${modalIsMonthly
                                            ? 'bg-stone-900 text-white border-stone-900 shadow-md transform scale-[1.02]'
                                            : 'bg-stone-50 text-stone-500 border-stone-100 hover:bg-stone-100'
                                            }`}
                                    >
                                        <span className="text-sm">🌙</span>
                                        <span className="truncate">每月</span>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="block text-xs font-bold text-stone-600">叙事风格描述 (Narrative Persona)</label>
                                </div>
                                <textarea
                                    className={`w-full h-48 bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs font-mono text-stone-600 outline-none focus:border-stone-400 resize-none leading-relaxed ${isPrivacyMode ? 'blur-sm select-none transition-all duration-500' : 'transition-all duration-500'}`}
                                    placeholder="例如：你是一个幽默的脱口秀演员，请用夸张和调侃的语气点评我今天的时间记录..."
                                    value={modalPrompt}
                                    onChange={e => setModalPrompt(e.target.value)}
                                />
                            </div>

                            {modalError && (
                                <div className="text-red-500 text-xs font-bold px-1">{modalError}</div>
                            )}
                        </div>

                        <div className="p-4 border-t border-stone-100 flex justify-end gap-3">
                            <button
                                onClick={() => setShowAddTemplateModal(false)}
                                className="px-4 py-2 text-sm font-bold text-stone-500 hover:bg-stone-100 rounded-xl transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSaveTemplate}
                                className="px-6 py-2 text-sm font-bold text-white bg-stone-800 hover:bg-stone-700 rounded-xl shadow-md transition-colors"
                            >
                                保存
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={!!deletingTemplateId}
                onClose={() => setDeletingTemplateId(null)}
                onConfirm={confirmDeleteTemplate}
                title="删除自定义叙事"
                description="确定要删除这个叙事风格吗？此操作无法撤销。"
                confirmText="删除"
                cancelText="取消"
                type="danger"
            />
        </div>
    );
};