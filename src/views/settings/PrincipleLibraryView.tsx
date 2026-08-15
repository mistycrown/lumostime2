/**
 * @file PrincipleLibraryView.tsx
 * @description 原则库设置页面 - 管理核心原则卡片和自我认知描述库
 * @updated 2026-07-06: Added the self-belief tab with manual identity/description CRUD backed by localStorage.
 */
import React, { useState } from 'react';
import { ChevronLeft, Plus, Trash2, Edit2, RotateCcw } from 'lucide-react';
import { ConfirmModal } from '../../components/ConfirmModal';
import { PrincipleEditModal, type PrincipleEditFormData } from '../../components/PrincipleEditModal';
import { SelfBeliefEditModal, type SelfBeliefDescriptionDraft, type SelfBeliefDescriptionSource } from '../../components/SelfBeliefEditModal';
import { DEFAULT_PRINCIPLE_PRESETS } from '../../constants/principlePresets';
import { updateLocalDataTimestamp } from '../../utils/localDataTimestamp';

const PRINCIPLES_STORAGE_KEY = 'lumostime_principles';
const SELF_BELIEFS_STORAGE_KEY = 'lumostime_self_beliefs';
const SELF_BELIEF_LIBRARY_CHANGED_EVENT = 'selfBeliefLibraryChanged';
const PRINCIPLE_LIBRARY_CHANGED_EVENT = 'principleLibraryChanged';

// 原则数据结构
export interface Principle {
    id: string;
    title: string;
    frontText: string;
    backText: string;
    descriptions?: SelfBeliefDescription[];
}

export type SelfBeliefDescription = SelfBeliefDescriptionDraft;

export interface SelfBelief {
    id: string;
    title: string;
    descriptions: SelfBeliefDescription[];
    createdAt: string;
    updatedAt: string;
}

interface PrincipleLibraryViewProps {
    onBack: () => void;
}

type PrincipleLibraryTab = 'principles' | 'selfBeliefs';

const createId = (prefix: string): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `${prefix}-${crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const getTodayDateKey = (): string => {
    const date = new Date();
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0')
    ].join('-');
};

const normalizeDescriptionSource = (value: unknown): SelfBeliefDescriptionSource => (
    value === 'ai' ? 'ai' : 'manual'
);

const normalizeDescriptions = (value: unknown): SelfBeliefDescription[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    const now = new Date().toISOString();
    return value.flatMap((rawDescription): SelfBeliefDescription[] => {
        if (!rawDescription || typeof rawDescription !== 'object') {
            return [];
        }

        const descriptionCandidate = rawDescription as Partial<SelfBeliefDescription>;
        const text = typeof descriptionCandidate.text === 'string' ? descriptionCandidate.text.trim() : '';
        if (!text) {
            return [];
        }

        return [{
            id: typeof descriptionCandidate.id === 'string' && descriptionCandidate.id.trim()
                ? descriptionCandidate.id.trim()
                : createId('description'),
            text,
            ...(typeof descriptionCandidate.date === 'string' && descriptionCandidate.date.trim()
                ? { date: descriptionCandidate.date.trim() }
                : {}),
            source: normalizeDescriptionSource(descriptionCandidate.source),
            createdAt: typeof descriptionCandidate.createdAt === 'string' && descriptionCandidate.createdAt.trim()
                ? descriptionCandidate.createdAt.trim()
                : now,
            updatedAt: typeof descriptionCandidate.updatedAt === 'string' && descriptionCandidate.updatedAt.trim()
                ? descriptionCandidate.updatedAt.trim()
                : now
        }];
    });
};

const normalizePrinciples = (value: unknown): Principle[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.flatMap((item): Principle[] => {
        if (!item || typeof item !== 'object') {
            return [];
        }

        const candidate = item as Partial<Principle>;
        const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
        const frontText = typeof candidate.frontText === 'string' ? candidate.frontText.trim() : '';
        if (!title || !frontText) {
            return [];
        }

        const descriptions = normalizeDescriptions(candidate.descriptions);
        return [{
            id: typeof candidate.id === 'string' && candidate.id.trim()
                ? candidate.id.trim()
                : createId('principle'),
            title,
            frontText,
            backText: typeof candidate.backText === 'string' ? candidate.backText.trim() : '',
            ...(descriptions.length > 0 ? { descriptions } : {})
        }];
    });
};

const normalizeSelfBeliefs = (value: unknown): SelfBelief[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.flatMap((item): SelfBelief[] => {
        if (!item || typeof item !== 'object') {
            return [];
        }

        const candidate = item as Partial<SelfBelief>;
        const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
        if (!title) {
            return [];
        }

        const now = new Date().toISOString();
        const rawDescriptions = Array.isArray(candidate.descriptions)
            ? candidate.descriptions
            : Array.isArray((candidate as Partial<SelfBelief> & { evidence?: unknown[] }).evidence)
                ? (candidate as Partial<SelfBelief> & { evidence: unknown[] }).evidence
                : [];
        const descriptions = normalizeDescriptions(rawDescriptions);

        return [{
            id: typeof candidate.id === 'string' && candidate.id.trim()
                ? candidate.id.trim()
                : createId('self-belief'),
            title,
            descriptions,
            createdAt: typeof candidate.createdAt === 'string' && candidate.createdAt.trim()
                ? candidate.createdAt.trim()
                : now,
            updatedAt: typeof candidate.updatedAt === 'string' && candidate.updatedAt.trim()
                ? candidate.updatedAt.trim()
                : now
        }];
    });
};

const loadSelfBeliefs = (): SelfBelief[] => {
    const stored = localStorage.getItem(SELF_BELIEFS_STORAGE_KEY);
    if (!stored) {
        return [];
    }

    try {
        return normalizeSelfBeliefs(JSON.parse(stored));
    } catch (error) {
        console.error('[PrincipleLibraryView] Failed to parse self-beliefs', error);
        return [];
    }
};

export const PrincipleLibraryView: React.FC<PrincipleLibraryViewProps> = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState<PrincipleLibraryTab>('principles');

    // 从 localStorage 读取原则（如果没有则使用默认预设）
    const [principles, setPrinciples] = useState<Principle[]>(() => {
        const stored = localStorage.getItem(PRINCIPLES_STORAGE_KEY);
        if (stored) {
            return normalizePrinciples(JSON.parse(stored));
        }
        // 首次加载，使用默认预设并立即保存到 localStorage
        const defaultPrinciples = [...DEFAULT_PRINCIPLE_PRESETS];
        localStorage.setItem(PRINCIPLES_STORAGE_KEY, JSON.stringify(defaultPrinciples));
        return defaultPrinciples;
    });
    const [selfBeliefs, setSelfBeliefs] = useState<SelfBelief[]>(loadSelfBeliefs);

    const [isCreating, setIsCreating] = useState(false);
    const [editingPrincipleId, setEditingPrincipleId] = useState<string | null>(null);
    const [formData, setFormData] = useState<PrincipleEditFormData>({
        title: '',
        frontText: '',
        backText: ''
    });
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
    const [isSelfBeliefModalOpen, setIsSelfBeliefModalOpen] = useState(false);
    const [editingSelfBeliefId, setEditingSelfBeliefId] = useState<string | null>(null);
    const [selfBeliefTitleDraft, setSelfBeliefTitleDraft] = useState('');
    const [deleteSelfBeliefId, setDeleteSelfBeliefId] = useState<string | null>(null);
    const [selfBeliefDescriptionDrafts, setSelfBeliefDescriptionDrafts] = useState<SelfBeliefDescription[]>([]);
    const [newDescriptionTextDraft, setNewDescriptionTextDraft] = useState('');
    const [editingDescriptionId, setEditingDescriptionId] = useState<string | null>(null);
    const [editingDescriptionTextDraft, setEditingDescriptionTextDraft] = useState('');

    // 保存原则到 localStorage
    const savePrinciples = (newPrinciples: Principle[]) => {
        const normalized = normalizePrinciples(newPrinciples);
        setPrinciples(normalized);
        localStorage.setItem(PRINCIPLES_STORAGE_KEY, JSON.stringify(normalized));
        updateLocalDataTimestamp();
        // 触发事件通知其他组件
        window.dispatchEvent(new Event(PRINCIPLE_LIBRARY_CHANGED_EVENT));
    };

    const saveSelfBeliefs = (newSelfBeliefs: SelfBelief[]) => {
        const normalized = normalizeSelfBeliefs(newSelfBeliefs);
        setSelfBeliefs(normalized);
        localStorage.setItem(SELF_BELIEFS_STORAGE_KEY, JSON.stringify(normalized));
        updateLocalDataTimestamp();
        window.dispatchEvent(new Event(SELF_BELIEF_LIBRARY_CHANGED_EVENT));
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

    const handleStartCreateSelfBelief = () => {
        setEditingSelfBeliefId(null);
        setSelfBeliefTitleDraft('');
        setSelfBeliefDescriptionDrafts([]);
        setNewDescriptionTextDraft('');
        setEditingDescriptionId(null);
        setEditingDescriptionTextDraft('');
        setIsSelfBeliefModalOpen(true);
    };

    const handleStartEditSelfBelief = (selfBelief: SelfBelief) => {
        setEditingSelfBeliefId(selfBelief.id);
        setSelfBeliefTitleDraft(selfBelief.title);
        setSelfBeliefDescriptionDrafts(selfBelief.descriptions);
        setNewDescriptionTextDraft('');
        setEditingDescriptionId(null);
        setEditingDescriptionTextDraft('');
        setIsSelfBeliefModalOpen(true);
    };

    const handleCancelSelfBeliefModal = () => {
        setIsSelfBeliefModalOpen(false);
        setEditingSelfBeliefId(null);
        setSelfBeliefTitleDraft('');
        setSelfBeliefDescriptionDrafts([]);
        setNewDescriptionTextDraft('');
        setEditingDescriptionId(null);
        setEditingDescriptionTextDraft('');
    };

    const handleSaveSelfBelief = () => {
        const title = selfBeliefTitleDraft.trim();
        if (!title) {
            return;
        }

        const now = new Date().toISOString();
        if (editingSelfBeliefId) {
            saveSelfBeliefs(selfBeliefs.map((item) => (
                item.id === editingSelfBeliefId
                    ? { ...item, title, descriptions: selfBeliefDescriptionDrafts, updatedAt: now }
                    : item
            )));
        } else {
            saveSelfBeliefs([
                ...selfBeliefs,
                {
                    id: createId('self-belief'),
                    title,
                    descriptions: selfBeliefDescriptionDrafts,
                    createdAt: now,
                    updatedAt: now
                }
            ]);
        }

        handleCancelSelfBeliefModal();
    };

    const confirmDeleteSelfBelief = () => {
        if (!deleteSelfBeliefId) {
            return;
        }

        saveSelfBeliefs(selfBeliefs.filter((item) => item.id !== deleteSelfBeliefId));
        setDeleteSelfBeliefId(null);
    };

    const handleAddDescriptionDraft = () => {
        const text = newDescriptionTextDraft.trim();
        if (!text) {
            return;
        }

        const now = new Date().toISOString();
        const newDescription: SelfBeliefDescription = {
            id: createId('description'),
            text,
            date: getTodayDateKey(),
            source: 'manual',
            createdAt: now,
            updatedAt: now
        };

        setSelfBeliefDescriptionDrafts((current) => [...current, newDescription]);
        setNewDescriptionTextDraft('');
    };

    const handleStartEditDescriptionDraft = (description: SelfBeliefDescription) => {
        setEditingDescriptionId(description.id);
        setEditingDescriptionTextDraft(description.text);
    };

    const handleSaveDescriptionDraftEdit = () => {
        if (!editingDescriptionId) {
            return;
        }

        const text = editingDescriptionTextDraft.trim();
        if (!text) {
            return;
        }

        const now = new Date().toISOString();
        setSelfBeliefDescriptionDrafts((current) => current.map((description) => (
            description.id === editingDescriptionId
                ? { ...description, text, updatedAt: now }
                : description
        )));
        setEditingDescriptionId(null);
        setEditingDescriptionTextDraft('');
    };

    const handleCancelDescriptionDraftEdit = () => {
        setEditingDescriptionId(null);
        setEditingDescriptionTextDraft('');
    };

    const handleDeleteDescriptionDraft = (descriptionId: string) => {
        setSelfBeliefDescriptionDrafts((current) => current.filter((description) => description.id !== descriptionId));
        if (editingDescriptionId === descriptionId) {
            handleCancelDescriptionDraftEdit();
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-stone-50 flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[var(--app-safe-area-top)] pb-[env(safe-area-inset-bottom)]">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-white/80 backdrop-blur-md sticky top-0">
                <button
                    onClick={onBack}
                    className="text-stone-400 hover:text-stone-600 p-1"
                >
                    <ChevronLeft size={24} />
                </button>
                <span className="text-stone-800 font-bold text-lg flex-1">原则库</span>
                {activeTab === 'principles' && (
                    <button
                        onClick={() => setIsResetConfirmOpen(true)}
                        className="p-2 text-stone-400 hover:text-red-500 transition-colors"
                        title="重置为默认"
                    >
                        <RotateCcw size={20} />
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="grid grid-cols-2 rounded-lg bg-stone-200/70 p-1 text-sm font-medium text-stone-500">
                    <button
                        type="button"
                        onClick={() => setActiveTab('principles')}
                        className={`rounded-md py-2 transition-colors ${
                            activeTab === 'principles'
                                ? 'bg-white text-stone-800 shadow-sm'
                                : 'hover:text-stone-700'
                        }`}
                    >
                        原则
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('selfBeliefs')}
                        className={`rounded-md py-2 transition-colors ${
                            activeTab === 'selfBeliefs'
                                ? 'bg-white text-stone-800 shadow-sm'
                                : 'hover:text-stone-700'
                        }`}
                    >
                        自我认知
                    </button>
                </div>

                {activeTab === 'principles' ? (
                    <>
                        {/* 创建按钮 */}
                        <button
                            onClick={handleStartCreate}
                            className="w-full py-3 border-2 border-dashed border-stone-300 rounded-xl text-stone-500 hover:border-stone-400 hover:text-stone-600 transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus size={18} />
                            <span className="text-sm font-medium">添加新原则</span>
                        </button>

                        {/* 说明 */}
                        <div className="bg-white rounded-xl p-4 shadow-sm">
                            <p className="text-xs text-stone-500">
                                原则库用于存储需要时时自己确认的核心原则，这些原则可以在场景中的原则卡片中引用。
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
                                        {principle.descriptions && principle.descriptions.length > 0 && (
                                            <div className="border-t border-stone-100 pt-2">
                                                <p className="text-xs text-stone-400 mb-1">描述</p>
                                                <div className="border-t border-stone-100">
                                                    {principle.descriptions.map((description) => (
                                                        <div key={description.id} className="py-2 border-b border-stone-100 last:border-b-0">
                                                            <p className="text-sm leading-6 text-stone-700">{description.text}</p>
                                                            {description.date && (
                                                                <p className="mt-1 text-xs text-stone-400">{description.date}</p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <button
                            onClick={handleStartCreateSelfBelief}
                            className="w-full py-3 border-2 border-dashed border-stone-300 rounded-xl text-stone-500 hover:border-stone-400 hover:text-stone-600 transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus size={18} />
                            <span className="text-sm font-medium">添加自我认知</span>
                        </button>

                        <div className="bg-white rounded-xl p-4 shadow-sm">
                            <p className="text-xs text-stone-500">
                                自我认知用于保存“我是一个什么样的人”以及支撑它的具体描述，帮助你在需要时重新确认自己的能力和经验。
                            </p>
                        </div>

                        <div className="space-y-3">
                            {selfBeliefs.length === 0 ? (
                                <div className="bg-white rounded-xl border border-stone-100 p-6 text-center shadow-sm">
                                    <p className="text-sm font-medium text-stone-700">还没有自我认知</p>
                                    <p className="mt-1 text-xs text-stone-400">先写下一句“我是一个什么样的人”。</p>
                                </div>
                            ) : (
                                selfBeliefs.map((selfBelief) => (
                                    <div
                                        key={selfBelief.id}
                                        className="bg-white rounded-xl p-4 shadow-sm border border-stone-100"
                                    >
                                        <div className="mb-3 flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <h3 className="text-base font-bold text-stone-800">{selfBelief.title}</h3>
                                                <p className="mt-1 text-xs text-stone-400">
                                                    {selfBelief.descriptions.length} 条描述
                                                </p>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-2">
                                                <button
                                                    onClick={() => handleStartEditSelfBelief(selfBelief)}
                                                    className="p-1.5 hover:bg-blue-50 rounded transition-colors"
                                                    title="编辑"
                                                >
                                                    <Edit2 size={16} className="text-blue-500" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteSelfBeliefId(selfBelief.id)}
                                                    className="p-1.5 hover:bg-red-50 rounded transition-colors"
                                                    title="删除"
                                                >
                                                    <Trash2 size={16} className="text-red-500" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="border-t border-stone-100">
                                            {selfBelief.descriptions.length === 0 ? (
                                                <p className="pt-3 text-xs text-stone-400">还没有描述</p>
                                            ) : (
                                                selfBelief.descriptions.slice(0, 3).map((description) => (
                                                    <div key={description.id} className="py-3 border-b border-stone-100 last:border-b-0">
                                                        <p className="line-clamp-2 text-sm leading-6 text-stone-700">{description.text}</p>
                                                        <p className="mt-1 text-xs text-stone-400">{description.date || '未记录日期'}</p>
                                                    </div>
                                                ))
                                            )}
                                            {selfBelief.descriptions.length > 3 && (
                                                <p className="pt-2 text-xs text-stone-400">还有 {selfBelief.descriptions.length - 3} 条描述，点击编辑查看。</p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}
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

            {isSelfBeliefModalOpen && (
                <SelfBeliefEditModal
                    isEditing={!!editingSelfBeliefId}
                    title={selfBeliefTitleDraft}
                    descriptionDrafts={selfBeliefDescriptionDrafts}
                    newDescriptionText={newDescriptionTextDraft}
                    editingDescriptionId={editingDescriptionId}
                    editingDescriptionText={editingDescriptionTextDraft}
                    onChange={setSelfBeliefTitleDraft}
                    onNewDescriptionTextChange={setNewDescriptionTextDraft}
                    onAddDescription={handleAddDescriptionDraft}
                    onStartEditDescription={handleStartEditDescriptionDraft}
                    onEditingDescriptionTextChange={setEditingDescriptionTextDraft}
                    onSaveDescriptionEdit={handleSaveDescriptionDraftEdit}
                    onCancelDescriptionEdit={handleCancelDescriptionDraftEdit}
                    onDeleteDescription={handleDeleteDescriptionDraft}
                    onSave={handleSaveSelfBelief}
                    onCancel={handleCancelSelfBeliefModal}
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

            <ConfirmModal
                isOpen={deleteSelfBeliefId !== null}
                title="删除自我认知"
                description="确定要删除这条自我认知吗？它下面的所有描述也会一起删除。"
                onConfirm={confirmDeleteSelfBelief}
                onClose={() => setDeleteSelfBeliefId(null)}
                confirmText="删除"
                cancelText="取消"
                type="danger"
            />
        </div>
    );
};

