/**
 * @file ReviewTemplateManageView.tsx
 * @input Existing Review Templates
 * @output Created/Updated/Deleted Templates
 * @pos View (Settings Sub-page)
 * @description A dedicated interface for managing review templates. Allows users to create, edit, reorder, and delete templates and their associated questions.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState } from 'react';
import { ReviewTemplate, ReviewQuestion, QuestionType } from '../types';
import { DEFAULT_REVIEW_TEMPLATES, COLOR_OPTIONS } from '../constants';
import { ChevronLeft, Plus, Trash2, Edit3, List, ArrowUp, ArrowDown, RotateCcw, ToggleLeft, ToggleRight } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { useSettings } from '../contexts/SettingsContext';
import { UIIconSelector } from '../components/UIIconSelector';
import { IconRenderer } from '../components/IconRenderer';

interface ReviewTemplateManageViewProps {
    templates: ReviewTemplate[];
    onUpdateTemplates: (templates: ReviewTemplate[]) => void;
    onBack: () => void;
}

export const ReviewTemplateManageView: React.FC<ReviewTemplateManageViewProps> = ({ templates, onUpdateTemplates, onBack }) => {
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
    return (
        <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            if (editingTemplateId) setEditingTemplateId(null);
                            else onBack();
                        }}
                        className="text-stone-400 hover:text-stone-600 p-1"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <span className="text-stone-800 font-bold text-lg">
                        {editingTemplateId ? '编辑模板' : '回顾模板'}
                    </span>
                </div>
                {!editingTemplateId && (
                    <button
                        onClick={() => setIsResetConfirmOpen(true)}
                        className="p-2 text-stone-400 hover:text-red-500 transition-colors"
                        title="重置为默认"
                    >
                        <RotateCcw size={20} />
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto pb-40">
                {editingTemplateId ? (
                    <TemplateEditor
                        template={templates.find(t => t.id === editingTemplateId)!}
                        onUpdate={(updated) => {
                            onUpdateTemplates(templates.map(t => t.id === updated.id ? updated : t));
                        }}
                        onClose={() => setEditingTemplateId(null)}
                    />
                ) : (
                    <TemplateList
                        templates={templates}
                        onUpdateTemplates={onUpdateTemplates}
                        onEdit={(id) => setEditingTemplateId(id)}
                    />
                )}
            </div>

            <ConfirmModal
                isOpen={isResetConfirmOpen}
                onClose={() => setIsResetConfirmOpen(false)}
                onConfirm={() => {
                    onUpdateTemplates(DEFAULT_REVIEW_TEMPLATES);
                    setIsResetConfirmOpen(false);
                }}
                title="重置回顾模板"
                description="确定要重置所有回顾模板为默认状态吗？这将覆盖您当前的修改，且无法撤销。"
                confirmText="重置"
                type="danger"
            />
        </div>
    );
};

// --- Sub-components ---

const TemplateList: React.FC<{
    templates: ReviewTemplate[],
    onUpdateTemplates: (t: ReviewTemplate[]) => void,
    onEdit: (id: string) => void
}> = ({ templates, onUpdateTemplates, onEdit }) => {
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const confirmDelete = () => {
        if (!deleteId) return;
        onUpdateTemplates(templates.filter(t => t.id !== deleteId));
        setDeleteId(null);
    };

    const handleAdd = () => {
        const newTemplate: ReviewTemplate = {
            id: crypto.randomUUID(),
            title: '📝 新模板',
            questions: [],
            isSystem: false,
            order: templates.length + 1,
            isDailyTemplate: false, // Default to false
            syncToTimeline: false // Default to false
        };
        onUpdateTemplates([...templates, newTemplate]);
        onEdit(newTemplate.id);
    };

    // Helper to extract emoji or UI icon
    const getDisplayInfo = (template: ReviewTemplate) => {
        // 从 title 中提取 emoji 和纯文本
        const emojiRegex = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u;
        const match = template.title.match(emojiRegex);
        
        let emoji: string | null = null;
        let text: string = template.title;
        
        if (match) {
            emoji = match[1];
            text = template.title.substring(match[0].length).trim();
        }
        
        // 优先使用 uiIcon 字段作为显示图标
        if (template.uiIcon) {
            emoji = template.uiIcon;
        }
        
        // Fallback: check defaults
        if (!emoji) {
            const defaultTmpl = DEFAULT_REVIEW_TEMPLATES.find(t => t.id === template.id);
            if (defaultTmpl) {
                const defaultMatch = defaultTmpl.title.match(emojiRegex);
                if (defaultMatch) {
                    emoji = defaultMatch[1];
                }
            }
        }

        return { emoji, text };
    };

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-end px-1">
                <button
                    onClick={handleAdd}
                    className="flex items-center gap-1 text-sm font-medium text-stone-600 bg-white border border-stone-200 shadow-sm px-3 py-1.5 rounded-lg hover:bg-stone-50 transition-colors"
                >
                    <Plus size={16} />
                    <span>新建</span>
                </button>
            </div>

            <div className="space-y-3">
                {templates.map(template => {
                    const { emoji, text } = getDisplayInfo(template);
                    return (
                        <div key={template.id} className="flex items-center justify-between p-4 bg-white border border-stone-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] rounded-2xl hover:bg-stone-50 transition-colors group">
                            <div className="flex items-center gap-4 flex-1" onClick={() => onEdit(template.id)}>
                                <div className="w-10 h-10 flex items-center justify-center bg-stone-50 rounded-xl border border-stone-100">
                                    {emoji ? (
                                        <IconRenderer icon={emoji} size={24} />
                                    ) : (
                                        <List size={20} className="text-stone-400" />
                                    )}
                                </div>
                                <div>
                                    <h4 className="font-bold text-stone-800 text-[15px]">{text}</h4>
                                    <p className="text-xs text-stone-400 mt-0.5">{template.questions.length} 个问题</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setDeleteId(template.id)}
                                    className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                                <button
                                    onClick={() => onEdit(template.id)}
                                    className="p-2 text-stone-400 hover:text-stone-600 rounded-lg transition-colors"
                                >
                                    <ChevronLeft size={18} className="rotate-180" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <ConfirmModal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={confirmDelete}
                title="删除模板"
                description="确定要删除这个回顾模板吗？此操作无法撤销。"
                confirmText="删除"
                type="danger"
            />
        </div>
    );
};

const TemplateEditor: React.FC<{
    template: ReviewTemplate,
    onUpdate: (t: ReviewTemplate) => void,
    onClose: () => void
}> = ({ template, onUpdate }) => {
    const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
    const { uiIconTheme } = useSettings();
    
    // 检查是否开启了自定义图标功能
    const isCustomIconEnabled = uiIconTheme !== 'default';

    // 处理模板名称变化（自动提取第一个字符作为 emoji）
    const handleTitleChange = (val: string) => {
        const firstChar = Array.from(val)[0] || '';
        const icon = firstChar;
        const name = val.slice(firstChar.length).trim();
        // 更新 title 为完整的 "emoji + 名称"
        onUpdate({ ...template, title: icon + ' ' + name });
    };

    const handleAddQuestion = () => {
        const newQuestion: ReviewQuestion = {
            id: crypto.randomUUID(),
            question: '新问题',
            type: 'text',
            choices: []
        };
        onUpdate({
            ...template,
            questions: [...template.questions, newQuestion]
        });
        setEditingQuestionId(newQuestion.id);
    };

    const updateQuestion = (q: ReviewQuestion) => {
        onUpdate({
            ...template,
            questions: template.questions.map(qt => qt.id === q.id ? q : qt)
        });
    };

    const deleteQuestion = (id: string) => {
        onUpdate({
            ...template,
            questions: template.questions.filter(qt => qt.id !== id)
        });
    };

    const moveQuestion = (idx: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === template.questions.length - 1)) return;
        const newQuestions = [...template.questions];
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        [newQuestions[idx], newQuestions[swapIdx]] = [newQuestions[swapIdx], newQuestions[idx]];
        onUpdate({ ...template, questions: newQuestions });
    };
    
    // 处理 UI 图标选择 - 只更新 uiIcon 字段，不修改 title
    const handleIconSelect = (emoji: string, uiIcon: string) => {
        // 只更新 uiIcon 字段，不修改 title
        onUpdate({ ...template, uiIcon });
    };

    // 从 title 中提取 emoji
    const getEmojiFromTitle = () => {
        const emojiRegex = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u;
        const match = template.title.match(emojiRegex);
        return match ? match[1] : '';
    };

    return (
        <div className="p-4 space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                <div>
                    <label className="text-xs font-bold text-stone-400 uppercase ml-1">模板名称 (第一个字符是 emoji)</label>
                    <input
                        className="w-full text-lg font-bold text-stone-800 bg-transparent border-b border-stone-200 py-2 outline-none focus:border-stone-400 transition-colors"
                        value={template.title}
                        onChange={e => handleTitleChange(e.target.value)}
                        placeholder="📝 请输入模板名称"
                    />
                </div>
                
                {/* UI Icon Selector - 仅在启用自定义主题时显示 */}
                {isCustomIconEnabled && (
                    <div>
                        <label className="text-xs text-stone-400 font-medium mb-2 block">
                            UI 图标
                            <span className="text-stone-300 ml-1">(可选)</span>
                        </label>
                        <UIIconSelector
                            currentIcon={getEmojiFromTitle()}
                            currentUiIcon={template.uiIcon}
                            onSelectDual={handleIconSelect}
                        />
                    </div>
                )}
                <div className="flex items-center justify-between pt-2">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-stone-700">同步到时间轴</span>
                        <span className="text-[10px] text-stone-400">开启后，此模板的问答将显示在时间轴底部</span>
                    </div>
                    <button
                        onClick={() => onUpdate({ ...template, syncToTimeline: !template.syncToTimeline })}
                        className={`p-2 rounded-lg transition-colors ${template.syncToTimeline ? 'text-[#2F4F4F]' : 'text-stone-300'}`}
                    >
                        {template.syncToTimeline ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                    </button>
                </div>
                <div className="flex items-center justify-between pt-2">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-stone-700">设置为日报模板</span>
                        <span className="text-[10px] text-stone-400">开启后，此模板将在日报中使用</span>
                    </div>
                    <button
                        onClick={() => onUpdate({
                            ...template,
                            isDailyTemplate: !template.isDailyTemplate,
                        })}
                        className={`p-2 rounded-lg transition-colors ${template.isDailyTemplate ? 'text-[#2F4F4F]' : 'text-stone-300'}`}
                    >
                        {template.isDailyTemplate ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                    </button>
                </div>
                <div className="flex items-center justify-between pt-2">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-stone-700">设置为周报模板</span>
                        <span className="text-[10px] text-stone-400">开启后，此模板将在周报中使用</span>
                    </div>
                    <button
                        onClick={() => onUpdate({
                            ...template,
                            isWeeklyTemplate: !template.isWeeklyTemplate,
                        })}
                        className={`p-2 rounded-lg transition-colors ${template.isWeeklyTemplate ? 'text-[#2F4F4F]' : 'text-stone-300'}`}
                    >
                        {template.isWeeklyTemplate ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                    </button>
                </div>
                <div className="flex items-center justify-between pt-2">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-stone-700">设置为月报模板</span>
                        <span className="text-[10px] text-stone-400">开启后，此模板将在月报中使用</span>
                    </div>
                    <button
                        onClick={() => onUpdate({
                            ...template,
                            isMonthlyTemplate: !template.isMonthlyTemplate,
                        })}
                        className={`p-2 rounded-lg transition-colors ${template.isMonthlyTemplate ? 'text-[#2F4F4F]' : 'text-stone-300'}`}
                    >
                        {template.isMonthlyTemplate ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                    </button>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                    <label className="text-xs font-bold text-stone-400 uppercase">当前问题 ({template.questions.length})</label>
                    <button onClick={handleAddQuestion} className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100">
                        <Plus size={14} /> 添加问题
                    </button>
                </div>

                {template.questions.map((q, idx) => (
                    <div key={q.id} className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
                        {editingQuestionId === q.id ? (
                            <QuestionEditor
                                question={q}
                                onUpdate={updateQuestion}
                                onDone={() => setEditingQuestionId(null)}
                                onDelete={() => {
                                    deleteQuestion(q.id);
                                    setEditingQuestionId(null);
                                }}
                            />
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col gap-1 text-stone-300">
                                    <button onClick={() => moveQuestion(idx, 'up')} className="hover:text-stone-500"><ArrowUp size={14} /></button>
                                    <button onClick={() => moveQuestion(idx, 'down')} className="hover:text-stone-500"><ArrowDown size={14} /></button>
                                </div>
                                <div className="flex-1" onClick={() => setEditingQuestionId(q.id)}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${q.type === 'text' ? 'bg-stone-100 text-stone-500' :
                                            q.type === 'rating' ? 'bg-orange-50 text-orange-500' : 'bg-purple-50 text-purple-500'
                                            }`}>
                                            {q.type === 'text' ? '文本' : q.type === 'rating' ? '评分' : '单选'}
                                        </span>
                                        {q.icon && <span className="text-sm">{q.icon}</span>}
                                    </div>
                                    <p className="font-bold text-stone-800 text-sm">{q.question}</p>
                                </div>
                                <button onClick={() => setEditingQuestionId(q.id)} className="p-2 text-stone-400 hover:text-stone-600"><Edit3 size={16} /></button>
                            </div>
                        )}
                    </div>
                ))}

                {template.questions.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-stone-200">
                        <p className="text-stone-400 text-sm">暂无问题，点击右上角添加</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const QuestionEditor: React.FC<{
    question: ReviewQuestion,
    onUpdate: (q: ReviewQuestion) => void,
    onDone: () => void,
    onDelete: () => void
}> = ({ question, onUpdate, onDone, onDelete }) => {
    return (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase">问题内容</label>
                <input
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-400 mt-1"
                    value={question.question}
                    onChange={e => onUpdate({ ...question, question: e.target.value })}
                />
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase">类型</label>
                <div className="flex bg-stone-100 p-1 rounded-xl">
                    {(['text', 'rating', 'choice'] as QuestionType[]).map(t => (
                        <button
                            key={t}
                            onClick={() => onUpdate({ ...question, type: t })}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${question.type === t
                                ? 'bg-white text-stone-800 shadow-sm'
                                : 'text-stone-400 hover:text-stone-600'
                                }`}
                        >
                            {{ text: '文本', rating: '评分', choice: '单选' }[t]}
                        </button>
                    ))}
                </div>
            </div>

            {question.type === 'rating' && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div>
                        <label className="text-[10px] font-bold text-stone-400 uppercase">图标 (Lucide Icon Name)</label>
                        <input
                            className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-400 mt-1"
                            value={question.icon || ''}
                            onChange={e => onUpdate({ ...question, icon: e.target.value })}
                            placeholder="e.g. star, heart, zap"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-stone-400 uppercase mb-2 block">颜色</label>
                        <div className="flex flex-wrap gap-2">
                            {COLOR_OPTIONS.map(color => (
                                <button
                                    key={color.id}
                                    onClick={() => onUpdate({ ...question, colorId: color.id })}
                                    className={`w-6 h-6 rounded-full transition-all border ${question.colorId === color.id
                                        ? `ring-2 ring-offset-1 ring-stone-300 scale-110 ${(color as any).picker} ${color.border}`
                                        : `hover:scale-105 opacity-60 hover:opacity-100 ${(color as any).picker} border-transparent`
                                        }`}
                                    title={color.label}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Options editor for choice type */}
            {question.type === 'choice' && (
                <div className="space-y-2 pt-2 border-t border-stone-100 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="text-[10px] font-bold text-stone-400 uppercase">选项 (每行一个)</label>
                    <textarea
                        className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-400"
                        rows={3}
                        value={question.choices?.join('\n') || ''}
                        onChange={e => onUpdate({ ...question, choices: e.target.value.split('\n') })}
                        placeholder="选项1\n选项2"
                    />
                </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-stone-100">
                <button onClick={onDelete} className="text-red-500 text-xs font-bold hover:bg-red-50 px-3 py-2 rounded-lg transition-colors">删除</button>
                <button onClick={onDone} className="bg-stone-800 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-stone-700 transition-colors">完成</button>
            </div>
        </div>
    );
};
