/**
 * @file DailyReviewView.tsx
 * @input Daily Review Data, Logs, Templates
 * @output Updated Review Data, Generated Narrative
 * @pos View (Review System)
 * @description The interface for conducting a daily review. Supports answering template questions (Data/Guide tabs) and generating/editing an AI-assisted narrative summary.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, Trash2, Sparkles, Edit3, RefreshCw, Calendar } from 'lucide-react';
import { DailyReview, ReviewTemplate, ReviewAnswer, Category, Log, TodoCategory, TodoItem, Scope, ReviewQuestion, NarrativeTemplate, CheckTemplate, CheckItem } from '../types';
import { COLOR_OPTIONS, DEFAULT_CHECK_TEMPLATES } from '../constants';
import * as LucideIcons from 'lucide-react';
import { IconRenderer } from '../components/IconRenderer';
import { useSettings } from '../contexts/SettingsContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { NarrativeStyleSelectionModal } from '../components/NarrativeStyleSelectionModal';
import { StatsView } from './StatsView';
import { FloatingButton } from '../components/FloatingButton';
import { UIIcon } from '../components/UIIcon';
import { 
    useReviewState, 
    ReviewGuideTab, 
    ReviewNarrativeTab,
    formatDate,
    formatDuration,
    getTemplateDisplayInfo
} from '../components/ReviewView';
import { calculateMonthlyStats } from '../utils/reviewStatsUtils';
import { updateAutoCheckItems } from '../utils/autoCheckUtils';

interface DailyReviewViewProps {
    review: DailyReview;
    date: Date;
    templates: ReviewTemplate[];
    checkTemplates: CheckTemplate[];
    categories: Category[];
    logs: Log[];
    todos: TodoItem[];
    todoCategories: TodoCategory[];
    scopes: Scope[];
    customNarrativeTemplates?: NarrativeTemplate[];
    onDelete: () => void;
    onUpdateReview: (review: DailyReview) => void;
    onGenerateNarrative: (review: DailyReview, statsText: string, timelineText: string, promptTemplate?: string) => Promise<string>;
    addToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

type TabType = 'check' | 'data' | 'guide' | 'narrative';

export const DailyReviewView: React.FC<DailyReviewViewProps> = ({
    review,
    date,
    templates,
    checkTemplates,
    categories,
    logs,
    todos,
    todoCategories,
    scopes,
    customNarrativeTemplates,
    onDelete,
    onUpdateReview,
    onGenerateNarrative,
    addToast
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('check');
    
    // Use shared review state hook
    const {
        answers,
        setAnswers,
        summary,
        setSummary,
        narrative,
        setNarrative,
        isGenerating,
        setIsGenerating,
        isStyleModalOpen,
        setIsStyleModalOpen,
        isDeleteSummaryConfirmOpen,
        setIsDeleteSummaryConfirmOpen,
        isDeleteNarrativeConfirmOpen,
        setIsDeleteNarrativeConfirmOpen,
        isReadingMode,
        toggleReadingMode
    } = useReviewState({
        initialAnswers: review.answers || [],
        initialSummary: review.summary || '',
        initialNarrative: review.narrative || '',
        storageKey: 'dailyReview_guideMode'
    });

    // Check Items Logic
    const [checkItems, setCheckItems] = useState<CheckItem[]>(() => {
        // 数据迁移：为旧数据添加 type 字段
        return (review.checkItems || []).map(item => ({
            ...item,
            type: item.type || 'manual' // 如果没有 type 字段，默认为 manual
        }));
    });
    const [newCheckItemText, setNewCheckItemText] = useState('');
    const [isAddCheckItemOpen, setIsAddCheckItemOpen] = useState(false);
    const [editingCheckItemId, setEditingCheckItemId] = useState<string | null>(null);
    const [editingCheckItemText, setEditingCheckItemText] = useState('');
    const [isClearCheckConfirmOpen, setIsClearCheckConfirmOpen] = useState(false);
    const [isReloadConfirmOpen, setIsReloadConfirmOpen] = useState(false);
    const [isReloadGuideConfirmOpen, setIsReloadGuideConfirmOpen] = useState(false);

    // Sync state when review prop changes (e.g. deletion and re-creation)
    useEffect(() => {
        // 数据迁移：为旧数据添加 type 字段
        const migratedItems = (review.checkItems || []).map(item => ({
            ...item,
            type: item.type || 'manual'
        }));
        setCheckItems(migratedItems);
        setAnswers(review.answers || []);
        setSummary(review.summary || '');
        setNarrative(review.narrative || '');
    }, [review]);

    // 更新自动日课状态（当切换到日课标签或数据变化时）
    useEffect(() => {
        if (activeTab === 'check' && checkItems.length > 0) {
            const context = {
                categories,
                scopes,
                todos,
                todoCategories
            };
            const updatedItems = updateAutoCheckItems(checkItems, logs, context, date);
            
            // 只有当状态真的改变时才更新
            const hasChanges = updatedItems.some((item, index) => 
                item.isCompleted !== checkItems[index].isCompleted
            );
            
            if (hasChanges) {
                setCheckItems(updatedItems);
                onUpdateReview({ ...review, checkItems: updatedItems, updatedAt: Date.now() });
            }
        }
    }, [activeTab, logs, categories, scopes, todos, todoCategories, date]);

    // Check for "Today"
    const isToday = useMemo(() => {
        const now = new Date();
        return date.getDate() === now.getDate() &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear();
    }, [date]);

    const handleToggleCheckItem = (id: string) => {
        const item = checkItems.find(i => i.id === id);
        console.log('[DailyReview] 点击日课:', { id, type: item?.type, content: item?.content });
        // 自动类型的日课不允许手动切换
        if (item?.type === 'auto') {
            console.log('[DailyReview] 阻止自动日课切换');
            return;
        }
        
        const newItems = checkItems.map(item =>
            item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
        );
        setCheckItems(newItems);
        onUpdateReview({ ...review, checkItems: newItems, updatedAt: Date.now() });
    };

    const handleAddCheckItem = () => {
        if (!newCheckItemText.trim()) return;
        const newItem: CheckItem = {
            id: crypto.randomUUID(),
            content: newCheckItemText.trim(),
            isCompleted: false
        };
        const newItems = [...checkItems, newItem];
        setCheckItems(newItems);
        onUpdateReview({ ...review, checkItems: newItems, updatedAt: Date.now() });
        setNewCheckItemText('');
        setIsAddCheckItemOpen(false);
    };

    const handleDeleteCheckItem = (id: string) => {
        const newItems = checkItems.filter(item => item.id !== id);
        setCheckItems(newItems);
        onUpdateReview({ ...review, checkItems: newItems, updatedAt: Date.now() });
    };

    const startEditingCheckItem = (item: CheckItem) => {
        setEditingCheckItemId(item.id);
        setEditingCheckItemText(item.content);
    };

    const saveEditingCheckItem = () => {
        if (!editingCheckItemId || !editingCheckItemText.trim()) return;
        const newItems = checkItems.map(item =>
            item.id === editingCheckItemId ? { ...item, content: editingCheckItemText.trim() } : item
        );
        setCheckItems(newItems);
        onUpdateReview({ ...review, checkItems: newItems, updatedAt: Date.now() });
        setEditingCheckItemId(null);
        setEditingCheckItemText('');
    };

    const handleClearCheckItems = () => {
        setCheckItems([]);
        onUpdateReview({ ...review, checkItems: [], updatedAt: Date.now() });
        setIsClearCheckConfirmOpen(false);
        addToast('success', '日课已清空');
    };

    const confirmReloadFromTemplate = () => {
        // 1. Get functional templates
        const dailyTemplates = checkTemplates
            .filter(t => t.enabled && t.isDaily)
            .sort((a, b) => a.order - b.order);

        console.log('[DailyReview] 日课模板:', dailyTemplates);

        // 2. Map to CheckItems
        const newItems: CheckItem[] = [];
        dailyTemplates.forEach(template => {
            template.items.forEach(item => {
                console.log('[DailyReview] 模板项:', { content: item.content, type: item.type, autoConfig: item.autoConfig });
                newItems.push({
                    id: crypto.randomUUID(),
                    category: template.title,
                    content: item.content,
                    icon: item.icon,
                    uiIcon: item.uiIcon,
                    isCompleted: false,
                    type: item.type || 'manual',
                    autoConfig: item.autoConfig
                });
            });
        });

        console.log('[DailyReview] 创建的日课项:', newItems);

        // 3. 更新自动日课状态
        const context = {
            categories,
            scopes,
            todos,
            todoCategories
        };
        const updatedItems = updateAutoCheckItems(newItems, logs, context, date);

        // 4. Update state
        setCheckItems(updatedItems);
        onUpdateReview({ ...review, checkItems: updatedItems, updatedAt: Date.now() });
        setIsReloadConfirmOpen(false);
        addToast('success', '已重新导入模板');
    };

    // 获取当天的logs（保留以便可能在其他地方使用）
    const dayLogs = useMemo(() => {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        return logs.filter(log =>
            log.startTime >= start.getTime() &&
            log.endTime <= end.getTime()
        );
    }, [logs, date]);

    // 注意：以下stats计算仅用于AI叙事生成，数据展示由StatsView处理
    const stats = useMemo(() => 
        calculateMonthlyStats(dayLogs, categories, todos, todoCategories, scopes),
        [dayLogs, categories, todos, todoCategories, scopes]
    );

    // 获取用于显示的模板列表 (用于渲染模板卡片)
    const templatesForDisplay = useMemo(() => {
        return review.templateSnapshot ||
            templates
                .filter(t => t.isDailyTemplate)
                .sort((a, b) => a.order - b.order);
    }, [review.templateSnapshot, templates]);

    // 更新答案
    const updateAnswer = (questionId: string, question: string, answer: string) => {
        const newAnswers = [...answers];
        const existingIndex = newAnswers.findIndex(a => a.questionId === questionId);

        if (existingIndex >= 0) {
            newAnswers[existingIndex] = { questionId, question, answer };
        } else {
            newAnswers.push({ questionId, question, answer });
        }

        setAnswers(newAnswers);

        // 实时保存
        const updatedReview = {
            ...review,
            answers: newAnswers,
            updatedAt: Date.now()
        };
        onUpdateReview(updatedReview);
    };

    // 重新从模板导入引导问题
    const confirmReloadGuideFromTemplate = () => {
        // 从当前模板重新生成 templateSnapshot
        const newTemplateSnapshot = templates
            .filter(t => t.isDailyTemplate)
            .sort((a, b) => a.order - b.order)
            .map(t => ({
                id: t.id,
                title: t.title,
                questions: t.questions,
                order: t.order,
                syncToTimeline: t.syncToTimeline
            }));

        // 清空现有答案（因为问题可能已经改变）
        const updatedReview = {
            ...review,
            templateSnapshot: newTemplateSnapshot,
            answers: [],
            updatedAt: Date.now()
        };
        
        onUpdateReview(updatedReview);
        setAnswers([]);
        setIsReloadGuideConfirmOpen(false);
        addToast('success', '已重新导入模板');
    };

    // 切换模板的syncToTimeline状态
    const toggleTemplateSyncToTimeline = (templateId: string) => {
        if (!review.templateSnapshot) return;

        const updatedSnapshot = review.templateSnapshot.map(t =>
            t.id === templateId
                ? { ...t, syncToTimeline: !t.syncToTimeline }
                : t
        );

        const updatedReview = {
            ...review,
            templateSnapshot: updatedSnapshot,
            updatedAt: Date.now()
        };
        onUpdateReview(updatedReview);
    };

    // 切换日课分组的syncToTimeline状态
    const toggleCheckCategorySyncToTimeline = (category: string) => {
        const currentSyncState = review.checkCategorySyncToTimeline || {};
        const newSyncState = {
            ...currentSyncState,
            [category]: !currentSyncState[category]
        };

        const updatedReview = {
            ...review,
            checkCategorySyncToTimeline: newSyncState,
            updatedAt: Date.now()
        };
        onUpdateReview(updatedReview);
    };

    // 生成叙事 - Step 1: Open Modal
    const handleGenerateNarrative = () => {
        setIsStyleModalOpen(true);
    };

    // 生成叙事 - Step 2: Execute with Selected Template
    const handleSelectStyle = async (template: NarrativeTemplate) => {
        setIsStyleModalOpen(false);
        setIsGenerating(true);
        try {
            // 生成统计文本
            const statsText = `总时长：${formatDuration(stats.totalDuration)}\n\n` +
                `标签统计：\n${stats.categoryStats.map(c =>
                    `- ${c.name}: ${formatDuration(c.duration)} (${c.percentage.toFixed(1)}%)`
                ).join('\n')}\n\n` +
                `待办统计：\n${stats.todoStats.map(t =>
                    `- ${t.name}: ${formatDuration(t.duration)} (${t.percentage.toFixed(1)}%)`
                ).join('\n')}\n\n` +
                `领域统计：\n${stats.scopeStats.map(s =>
                    `- ${s.name}: ${formatDuration(s.duration)} (${s.percentage.toFixed(1)}%)`
                ).join('\n')}`;

            // 生成 check 项统计文本
            const checkText = (() => {
                if (!checkItems || checkItems.length === 0) return '';

                const completed = checkItems.filter(item => item.isCompleted);
                const total = checkItems.length;
                const percentage = total > 0 ? ((completed.length / total) * 100).toFixed(1) : '0.0';

                // 按分类分组
                const byCategory: Record<string, CheckItem[]> = {};
                checkItems.forEach(item => {
                    const cat = item.category || '其他';
                    if (!byCategory[cat]) byCategory[cat] = [];
                    byCategory[cat].push(item);
                });

                let text = `\n\n日课完成情况：\n总完成率：${completed.length}/${total} (${percentage}%)\n\n`;

                Object.entries(byCategory).forEach(([category, items]) => {
                    text += `${category}：\n`;
                    items.forEach(item => {
                        const status = item.isCompleted ? '✓' : '✗';
                        text += `  ${status} ${item.content}\n`;
                    });
                    text += '\n';
                });

                return text;
            })();

            // 生成时间轴文本
            const timelineText = dayLogs.map(log => {
                const cat = categories.find(c => c.id === log.categoryId);
                const act = cat?.activities.find(a => a.id === log.activityId);
                const startTime = new Date(log.startTime);
                const endTime = new Date(log.endTime);
                return `${startTime.getHours()}:${String(startTime.getMinutes()).padStart(2, '0')}-${endTime.getHours()}:${String(endTime.getMinutes()).padStart(2, '0')} ${act?.name || ''} ${log.note ? '- ' + log.note : ''}`;
            }).join('\n');

            const generated = await onGenerateNarrative(review, statsText + checkText, timelineText, template.prompt);
            setNarrative(generated);

            const updatedReview = {
                ...review,
                narrative: generated,
                narrativeUpdatedAt: Date.now(),
                isEdited: false,
                updatedAt: Date.now()
            };
            onUpdateReview(updatedReview);
        } catch (error) {
            console.error('生成叙事失败:', error);
            addToast('error', '生成叙事失败');
        } finally {
            setIsGenerating(false);
        }
    };

    // 自动保存手动叙事
    const handleSummaryChange = (value: string) => {
        setSummary(value);
        
        const updatedReview = {
            ...review,
            summary: value,
            summaryUpdatedAt: Date.now(),
            updatedAt: Date.now()
        };
        onUpdateReview(updatedReview);
    };

    // 删除手动叙事
    const handleDeleteSummary = () => {
        setIsDeleteSummaryConfirmOpen(true);
    };

    const confirmDeleteSummary = async () => {
        try {
            const updatedReview = {
                ...review,
                summary: '',
                summaryUpdatedAt: undefined,
                updatedAt: Date.now()
            };
            await onUpdateReview(updatedReview);
            setSummary('');
            addToast('success', '手动叙事已删除');
        } catch (error) {
            console.error('Failed to delete summary', error);
            addToast('error', '删除失败');
        } finally {
            setIsDeleteSummaryConfirmOpen(false);
        }
    };

    // 自动保存 AI 叙事
    const handleNarrativeChange = (value: string) => {
        setNarrative(value);

        const updatedReview = {
            ...review,
            narrative: value,
            narrativeUpdatedAt: Date.now(),
            isEdited: true,
            updatedAt: Date.now()
        };
        onUpdateReview(updatedReview);
    };

    const handleDeleteNarrative = () => {
        setIsDeleteNarrativeConfirmOpen(true);
    };

    const confirmDeleteNarrative = async () => {
        try {
            const updatedReview = {
                ...review,
                narrative: '',
                narrativeUpdatedAt: undefined,
                updatedAt: Date.now()
            };
            await onUpdateReview(updatedReview);
            setNarrative('');
            addToast('success', 'AI 叙事已删除');
        } catch (error) {
            console.error('Failed to delete narrative', error);
            addToast('error', '删除失败');
        } finally {
            setIsDeleteNarrativeConfirmOpen(false);
        }
    };

    return (
        <div className="h-full bg-[#faf9f6] overflow-y-auto no-scrollbar pb-24 px-7 pt-4">
            {/* Date Display Section */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-3">
                        <span className="text-stone-300 font-normal">&amp;</span>
                        {formatDate(date)}
                    </h1>
                </div>
                <button
                    onClick={onDelete}
                    className="text-stone-400 hover:text-red-600 p-1 transition-colors"
                >
                    <Trash2 size={20} />
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-6 border-b border-stone-200 mb-8 overflow-x-auto no-scrollbar">
                {(['check', 'data', 'guide', 'narrative'] as TabType[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-3 text-sm font-serif tracking-wide whitespace-nowrap transition-colors ${activeTab === tab
                            ? 'text-stone-900 border-b-2 border-stone-900 font-bold'
                            : 'text-stone-400 hover:text-stone-600'
                            }`}
                    >
                        {{ check: '日课', data: '数据', guide: '引导', narrative: '叙事' }[tab]}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
                {/* Tab 0: Check - Daily Checklist */}
                {/* Tab 0: Check - Daily Checklist (Grouped & Printing Style) */}
                {activeTab === 'check' && (
                    <div className="animate-in fade-in duration-300 pb-40">
                        {checkItems.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-stone-400">今日无日课</p>
                                <p className="text-xs text-stone-300 mt-2">点击右下角添加，或在设置中配置每日模板</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {(() => {
                                    // Group items by category (or '默认' if none)
                                    const groupedItems: { [key: string]: CheckItem[] } = {};
                                    // Preserve order: first by templates order (if implicit in list), then unclassified
                                    checkItems.forEach(item => {
                                        const cat = item.category || '默认';
                                        if (!groupedItems[cat]) groupedItems[cat] = [];
                                        groupedItems[cat].push(item);
                                    });

                                    return Object.entries(groupedItems).map(([category, items]) => (
                                        <div key={category} className="space-y-2">
                                            {/* Category Header */}
                                            {category !== '默认' && items.length > 0 && (
                                                <div className="flex items-center justify-between border-b border-stone-200 pb-1 mb-2">
                                                    <h3 className="text-sm font-bold text-stone-900 font-serif">
                                                        {category}
                                                    </h3>
                                                    {/* syncToTimeline toggle */}
                                                    <button
                                                        onClick={() => toggleCheckCategorySyncToTimeline(category)}
                                                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                                                            review.checkCategorySyncToTimeline?.[category]
                                                                ? 'bg-stone-800 text-white'
                                                                : 'bg-stone-100 text-stone-400'
                                                        }`}
                                                        title={review.checkCategorySyncToTimeline?.[category] ? '已同步到时间轴' : '未同步到时间轴'}
                                                    >
                                                        <Calendar size={14} />
                                                    </button>
                                                </div>
                                            )}

                                            {/* Items List - No background card, printing style */}
                                            <div className="space-y-1 pl-1">
                                                {items.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className={`flex items-start gap-4 py-2 px-1 group transition-opacity ${item.isCompleted ? 'opacity-50' : ''} ${item.type === 'auto' ? 'cursor-default' : 'cursor-pointer'}`}
                                                        onClick={(e) => {
                                                            if (item.type === 'auto') {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                console.log('[DailyReview] 阻止自动日课点击');
                                                                return;
                                                            }
                                                            handleToggleCheckItem(item.id);
                                                        }}
                                                    >
                                                        {/* Checkbox: Black/White, small, aligned */}
                                                        <button
                                                            className={`mt-[5px] w-4 h-4 rounded-full border flex items-center justify-center transition-all shrink-0 pointer-events-none ${
                                                                item.type === 'auto' 
                                                                    ? item.isCompleted
                                                                        ? 'bg-blue-600 border-blue-600 text-white'
                                                                        : 'border-blue-400 text-transparent'
                                                                    : item.isCompleted
                                                                        ? 'bg-stone-900 border-stone-900 text-white'
                                                                        : 'border-stone-400 text-transparent'
                                                            }`}
                                                        >
                                                            <LucideIcons.Check size={10} strokeWidth={3} />
                                                        </button>

                                                        <div className="flex-1 min-w-0 flex items-start gap-2">
                                                            {editingCheckItemId === item.id ? (
                                                                <div className="flex-1 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                                    <input
                                                                        type="text"
                                                                        value={editingCheckItemText}
                                                                        onChange={(e) => setEditingCheckItemText(e.target.value)}
                                                                        className="flex-1 bg-transparent border-b border-stone-800 py-0.5 text-[15px] font-serif text-stone-900 outline-none rounded-none"
                                                                        autoFocus
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') saveEditingCheckItem();
                                                                            if (e.key === 'Escape') setEditingCheckItemId(null);
                                                                        }}
                                                                    />
                                                                    <button onClick={saveEditingCheckItem} className="text-stone-800 p-1"><LucideIcons.Check size={16} /></button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex-1 flex items-center gap-2">
                                                                    <p className={`flex-1 text-[15px] font-serif leading-relaxed transition-all ${item.isCompleted ? 'text-stone-400 line-through decoration-stone-300' : 'text-stone-900'}`}>
                                                                        {item.content}
                                                                    </p>
                                                                    {item.type === 'auto' && (
                                                                        <span className="text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full shrink-0">
                                                                            自动
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {!editingCheckItemId && !item.category && item.type !== 'auto' && (
                                                            <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                                <button
                                                                    onClick={() => startEditingCheckItem(item)}
                                                                    className="text-stone-300 hover:text-stone-600"
                                                                >
                                                                    <Edit3 size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteCheckItem(item.id)}
                                                                    className="text-stone-300 hover:text-stone-600"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        )}

                        {/* Add New Item UI - Simplified to match style */}
                        {isAddCheckItemOpen && (
                            <div className="mt-8 bg-stone-50 rounded-xl p-4 border border-stone-100 animate-in fade-in slide-in-from-bottom-2">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="text"
                                        value={newCheckItemText}
                                        onChange={(e) => setNewCheckItemText(e.target.value)}
                                        className="flex-1 bg-transparent border-b border-stone-300 px-2 py-2 text-sm font-serif outline-none focus:border-stone-800 transition-colors"
                                        placeholder="输入新日课 (默认为通用)..."
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleAddCheckItem();
                                            if (e.key === 'Escape') setIsAddCheckItemOpen(false);
                                        }}
                                    />
                                    <button
                                        onClick={handleAddCheckItem}
                                        className="p-2 bg-stone-900 text-white rounded-lg shadow-sm active:scale-95 transition-all"
                                    >
                                        <LucideIcons.Plus size={18} />
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="mt-12 mb-8 flex flex-col items-center gap-4">
                            <button
                                onClick={() => setIsReloadConfirmOpen(true)}
                                className="flex items-center gap-2 text-stone-400 hover:text-stone-600 transition-colors text-sm"
                            >
                                <RefreshCw size={14} />
                                <span>重新从模板导入</span>
                            </button>

                            {checkItems.length > 0 && (
                                <button
                                    onClick={() => setIsClearCheckConfirmOpen(true)}
                                    className="flex items-center gap-2 text-stone-400 hover:text-red-500 transition-colors text-sm"
                                >
                                    <Trash2 size={14} />
                                    <span>清空当日日课</span>
                                </button>
                            )}
                        </div>

                        <ConfirmModal
                            isOpen={isClearCheckConfirmOpen}
                            onClose={() => setIsClearCheckConfirmOpen(false)}
                            onConfirm={handleClearCheckItems}
                            title="清空日课"
                            description="确定要清空当前的所有日课条目吗？此操作无法撤销。"
                            confirmText="清空"
                            cancelText="取消"
                            type="danger"
                        />

                        <ConfirmModal
                            isOpen={isReloadConfirmOpen}
                            onClose={() => setIsReloadConfirmOpen(false)}
                            onConfirm={confirmReloadFromTemplate}
                            title="重新导入模板"
                            description="确定要重新导入日课模板吗？这将覆盖当前的所有日课条目（包括已完成状态）。"
                            confirmText="重新导入"
                            cancelText="取消"
                            type="info"
                        />
                    </div>
                )}

                {/* Tab 1: Data - 使用 StatsView 组件 */}
                {activeTab === 'data' && (
                    <div className="animate-in fade-in duration-300 -mx-7 -mt-4 pb-6">
                        <StatsView
                            logs={logs}
                            categories={categories}
                            currentDate={date}
                            onBack={() => { }} // Daily Review 不需要返回按钮
                            isFullScreen={false}
                            onToggleFullScreen={() => { }}
                            todos={todos}
                            todoCategories={todoCategories}
                            scopes={scopes}
                            hideControls={false}  // 显示控制栏 (用于切换视图)
                            hideRangeControls={true} // 隐藏左侧时间范围切换 (日/周/月/年) - 保持日视图简单
                            hideDateNavigation={true} // 隐藏日期导航 - 页面已有
                            forcedRange="day"    // 强制为日视图
                            allowedViews={['pie', 'schedule']} // 仅允许切换：环形图 & 日程
                        />
                    </div>
                )}

                {/* Tab 2: Guide */}
                {activeTab === 'guide' && (
                    <div className="space-y-6 animate-in fade-in duration-300 pb-40">
                        <ReviewGuideTab
                            templates={templatesForDisplay}
                            answers={answers}
                            isReadingMode={isReadingMode}
                            onUpdateAnswer={updateAnswer}
                            onToggleSyncToTimeline={toggleTemplateSyncToTimeline}
                        />
                        
                        {/* 重新从模板导入按钮 */}
                        <div className="mt-12 mb-8 flex flex-col items-center gap-4">
                            <button
                                onClick={() => setIsReloadGuideConfirmOpen(true)}
                                className="flex items-center gap-2 text-stone-400 hover:text-stone-600 transition-colors text-sm"
                            >
                                <RefreshCw size={14} />
                                <span>重新从模板导入</span>
                            </button>
                        </div>

                        {/* 重新导入引导模板确认对话框 */}
                        <ConfirmModal
                            isOpen={isReloadGuideConfirmOpen}
                            onClose={() => setIsReloadGuideConfirmOpen(false)}
                            onConfirm={confirmReloadGuideFromTemplate}
                            title="重新导入模板"
                            description="将从最新的模板重新生成引导问题。当前的所有回答将被清空。确定要继续吗？"
                            confirmText="确认导入"
                            type="warning"
                        />
                    </div>
                )}

                {/* Tab 3: Narrative */}
                {activeTab === 'narrative' && (
                    <div className="space-y-4 animate-in fade-in duration-300 relative min-h-[50vh] pb-40">
                        <ReviewNarrativeTab
                            summary={summary}
                            narrative={narrative}
                            isGenerating={isGenerating}
                            isReadingMode={isReadingMode}
                            onSummaryChange={handleSummaryChange}
                            onNarrativeChange={handleNarrativeChange}
                            onGenerateNarrative={handleGenerateNarrative}
                            onDeleteSummary={handleDeleteSummary}
                            onDeleteNarrative={handleDeleteNarrative}
                        />
                    </div>
                )}
            </div>

            {/* Floating Action Button for Check Tab */}
            {activeTab === 'check' && !isAddCheckItemOpen && (
                <FloatingButton
                    onClick={() => setIsAddCheckItemOpen(true)}
                    position="custom"
                    className="fixed bottom-16 right-6"
                >
                    <UIIcon type="add-record" fallbackIcon={LucideIcons.Plus} size={24} className="text-white" />
                </FloatingButton>
            )}

            {/* Floating Action Button for Guide Tab */}
            {activeTab === 'guide' && templates.filter(t => t.isDailyTemplate).length > 0 && (
                <FloatingButton
                    onClick={toggleReadingMode}
                    position="custom"
                    className="fixed bottom-16 right-6"
                >
                    <UIIcon 
                        type={isReadingMode ? "editing" : "reading"}
                        fallbackIcon={isReadingMode ? Edit3 : LucideIcons.BookOpen}
                        size={24}
                        className="text-white"
                    />
                </FloatingButton>
            )}

            {/* Floating Action Button for Narrative Tab */}
            {activeTab === 'narrative' && (
                <FloatingButton
                    onClick={toggleReadingMode}
                    position="custom"
                    className="fixed bottom-16 right-6"
                >
                    <UIIcon 
                        type={isReadingMode ? "editing" : "reading"}
                        fallbackIcon={isReadingMode ? Edit3 : LucideIcons.BookOpen}
                        size={24}
                        className="text-white"
                    />
                </FloatingButton>
            )}
            {/* Narrative Style Selection Modal */}
            <NarrativeStyleSelectionModal
                isOpen={isStyleModalOpen}
                onClose={() => setIsStyleModalOpen(false)}
                onSelect={handleSelectStyle}
                customTemplates={customNarrativeTemplates}
                period="daily"
            />

            {/* Delete Summary Confirmation Modal */}
            <ConfirmModal
                isOpen={isDeleteSummaryConfirmOpen}
                onClose={() => setIsDeleteSummaryConfirmOpen(false)}
                onConfirm={confirmDeleteSummary}
                title="删除手动叙事？"
                description="确定要删除这条总结吗？此操作无法撤销。"
                confirmText="确认删除"
                type="danger"
            />

            {/* Delete Narrative Confirmation Modal */}
            <ConfirmModal
                isOpen={isDeleteNarrativeConfirmOpen}
                onClose={() => setIsDeleteNarrativeConfirmOpen(false)}
                onConfirm={confirmDeleteNarrative}
                title="删除 AI 叙事？"
                description="确定要删除当前生成的 AI 叙事吗？此操作无法撤销，需要重新生成。"
                confirmText="确认删除"
                type="danger"
            />
        </div>
    );
};

