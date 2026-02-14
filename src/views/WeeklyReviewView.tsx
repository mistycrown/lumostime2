/**
 * @file WeeklyReviewView.tsx
 * @input WeeklyReview Data, Logs, Stats, Templates
 * @output Review Updates, Narrative Generation
 * @pos View (Review Modal)
 * @description The interface for conducting Weekly Reviews. Integrates statistics visualization, guided reflection templates, and AI-assisted narrative generation.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, Trash2, Sparkles, Edit3, RefreshCw, X, Calendar } from 'lucide-react';
import { WeeklyReview, ReviewTemplate, ReviewAnswer, Category, Log, TodoCategory, TodoItem, Scope, ReviewQuestion, NarrativeTemplate, DailyReview } from '../types';
import { COLOR_OPTIONS } from '../constants';
import * as LucideIcons from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { NarrativeStyleSelectionModal } from '../components/NarrativeStyleSelectionModal';
import { StatsView } from './StatsView';
import { FloatingButton } from '../components/FloatingButton';
import { UIIcon } from '../components/UIIcon';
import { IconRenderer } from '../components/IconRenderer';
import { 
    useReviewState, 
    ReviewGuideTab, 
    ReviewNarrativeTab,
    formatWeeklyTitleDate,
    formatDuration,
    getTemplateDisplayInfo
} from '../components/ReviewView';
import { 
    calculateMonthlyStats,
    generateCheckItemStatsText,
    formatDuration as utilFormatDuration
} from '../utils/reviewStatsUtils';

interface WeeklyReviewViewProps {
    review: WeeklyReview;
    weekStartDate: Date;
    weekEndDate: Date;
    templates: ReviewTemplate[];
    categories: Category[];
    logs: Log[];
    todos: TodoItem[];
    todoCategories: TodoCategory[];
    scopes: Scope[];
    dailyReviews: DailyReview[];
    customNarrativeTemplates?: NarrativeTemplate[];
    onDelete: () => void;
    onUpdateReview: (review: WeeklyReview) => void;
    onGenerateNarrative: (review: WeeklyReview, statsText: string, promptTemplate?: string) => Promise<string>;
    onClose: () => void;
    addToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

type TabType = 'data' | 'guide' | 'narrative';

export const WeeklyReviewView: React.FC<WeeklyReviewViewProps> = ({
    review,
    weekStartDate,
    weekEndDate,
    templates,
    categories,
    logs,
    todos,
    todoCategories,
    scopes,
    dailyReviews,
    customNarrativeTemplates,
    onDelete,
    onUpdateReview,
    onGenerateNarrative,
    onClose,
    addToast
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('data');
    
    // Use shared review state hook
    const {
        answers,
        setAnswers,
        narrative,
        setNarrative,
        isEditing,
        setIsEditing,
        isGenerating,
        setIsGenerating,
        editedNarrative,
        setEditedNarrative,
        isStyleModalOpen,
        setIsStyleModalOpen,
        isDeleteConfirmOpen,
        setIsDeleteConfirmOpen,
        isReadingMode,
        toggleReadingMode
    } = useReviewState({
        initialAnswers: review.answers || [],
        initialNarrative: review.narrative || '',
        storageKey: 'dailyReview_guideMode'
    });

    const [isReloadConfirmOpen, setIsReloadConfirmOpen] = useState(false);

    // 获取本周的logs
    const weekLogs = useMemo(() => {
        const start = new Date(weekStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(weekEndDate);
        end.setHours(23, 59, 59, 999);

        return logs.filter(log =>
            log.startTime >= start.getTime() &&
            log.endTime <= end.getTime()
        );
    }, [logs, weekStartDate, weekEndDate]);

    // 统计本周数据（用于AI叙事生成）
    const stats = useMemo(() => 
        calculateMonthlyStats(weekLogs, categories, todos, todoCategories, scopes),
        [weekLogs, categories, todos, todoCategories, scopes]
    );

    // 获取用于显示的模板列表 (用于渲染模板卡片)
    const templatesForDisplay = useMemo(() => {
        return review.templateSnapshot ||
            templates
                .filter(t => t.isWeeklyTemplate)
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

    // 重新从模板导入
    const confirmReloadFromTemplate = () => {
        // 从当前模板重新生成 templateSnapshot
        const newTemplateSnapshot = templates
            .filter(t => t.isWeeklyTemplate)
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
        setIsReloadConfirmOpen(false);
        onToast?.('success', '已重新导入模板');
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
            // 生成每日详细统计
            const dailyStatsText = (() => {
                const daysOfWeek = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                let text = '每日统计详情：\n';

                // 为了按顺序显示（假设周一开始），需要根据 weekStartDate
                const startDay = new Date(weekStartDate);
                startDay.setHours(0, 0, 0, 0);

                for (let i = 0; i < 7; i++) {
                    const currentDay = new Date(startDay);
                    currentDay.setDate(startDay.getDate() + i);
                    const dayStart = currentDay.getTime();
                    const dayEnd = dayStart + 86400000 - 1;

                    const dayLogs = weekLogs.filter(log =>
                        log.startTime >= dayStart && log.endTime <= dayEnd
                    );

                    if (dayLogs.length === 0) continue;

                    const dayDuration = dayLogs.reduce((acc, log) => acc + (log.endTime - log.startTime) / 1000, 0);
                    const dayLabel = `${currentDay.getMonth() + 1}/${currentDay.getDate()} ${daysOfWeek[currentDay.getDay()]}`;

                    text += `\n【${dayLabel}】 总时长：${formatDuration(dayDuration)}\n`;

                    // 当天的分类统计
                    const dayCategories = new Map<string, number>();
                    dayLogs.forEach(log => {
                        const catName = categories.find(c => c.id === log.categoryId)?.name || '未知';
                        const duration = (log.endTime - log.startTime) / 1000;
                        dayCategories.set(catName, (dayCategories.get(catName) || 0) + duration);
                    });

                    // 排序并添加到文本
                    Array.from(dayCategories.entries())
                        .sort((a, b) => b[1] - a[1]) // 按时长降序
                        .forEach(([name, duration]) => {
                            text += `  - ${name}: ${formatDuration(duration)}\n`;
                        });
                }
                return text;
            })();

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
                ).join('\n')}\n\n` +
                dailyStatsText;

            // 生成本周 check 项汇总统计
            const checkText = generateCheckItemStatsText(dailyReviews, weekStartDate, weekEndDate);

            const generated = await onGenerateNarrative(review, statsText + checkText, template.prompt);
            setNarrative(generated);
            setEditedNarrative(generated); // Sync to edit box

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

    // 保存编辑的叙事
    const handleSaveNarrative = () => {
        setNarrative(editedNarrative);
        setIsEditing(false);

        const updatedReview = {
            ...review,
            narrative: editedNarrative,
            narrativeUpdatedAt: Date.now(),
            isEdited: true,
            updatedAt: Date.now()
        };
        onUpdateReview(updatedReview);
    };

    const handleDeleteNarrative = () => {
        setIsDeleteConfirmOpen(true);
    };

    const confirmDeleteNarrative = async () => {
        try {
            const updatedReview = {
                ...review,
                narrative: '',
                narrativeUpdatedAt: undefined,
                updatedAt: Date.now()
            };
            // update local state
            await onUpdateReview(updatedReview);
            setNarrative('');
            setEditedNarrative('');
            setIsEditing(false); // reset to false to show empty state options
            addToast('success', '叙事已删除');
        } catch (error) {
            console.error('Failed to delete narrative', error);
            addToast('error', '删除失败');
        } finally {
            setIsDeleteConfirmOpen(false);
        }
    };

    return (
        <div className="h-full bg-[#faf9f6] flex flex-col overflow-hidden px-7 pt-4">
            {/* Date Display Section */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-3">
                        <span className="text-stone-300 font-normal">&</span>
                        {formatWeeklyTitleDate(weekStartDate, weekEndDate)}
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
            <div className="flex gap-6 border-b border-stone-200 mb-3 overflow-x-auto no-scrollbar">
                {(['data', 'guide', 'narrative'] as TabType[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-3 text-sm font-serif tracking-wide whitespace-nowrap transition-colors ${activeTab === tab
                            ? 'text-stone-900 border-b-2 border-stone-900 font-bold'
                            : 'text-stone-400 hover:text-stone-600'
                            }`}
                    >
                        {{ data: '数据', guide: '引导', narrative: '叙事' }[tab]}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden flex flex-col -mx-7">
                {/* Tab 1: Data - 使用 StatsView 组件 */}
                {activeTab === 'data' && (
                    <div className="flex-1 overflow-hidden animate-in fade-in duration-300">
                        <StatsView
                            logs={logs}
                            categories={categories}
                            currentDate={weekStartDate}
                            onBack={() => { }} // Weekly Review 不需要返回按钮
                            isFullScreen={false}
                            onToggleFullScreen={() => { }}
                            todos={todos}
                            todoCategories={todoCategories}
                            scopes={scopes}
                            dailyReviews={dailyReviews}
                            forcedRange="week"   // 强制为周视图
                            hideRangeControls={true} // 隐藏左侧时间范围切换
                            hideDateNavigation={true} // 隐藏前后切换
                            allowedViews={['pie', 'line', 'schedule', 'check']} // 添加 check 视图
                        />
                    </div>
                )}

                {/* Tab 2: Guide */}
                {activeTab === 'guide' && (
                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 animate-in fade-in duration-300 pb-40 px-7">
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
                                onClick={() => setIsReloadConfirmOpen(true)}
                                className="flex items-center gap-2 text-stone-400 hover:text-stone-600 transition-colors text-sm"
                            >
                                <RefreshCw size={14} />
                                <span>重新从模板导入</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Tab 3: Narrative */}
                {activeTab === 'narrative' && (
                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 animate-in fade-in duration-300 pb-40 px-7">
                        <ReviewNarrativeTab
                            narrative={narrative}
                            isEditing={isEditing}
                            isGenerating={isGenerating}
                            editedNarrative={editedNarrative}
                            onEditedNarrativeChange={setEditedNarrative}
                            onStartEditing={() => {
                                setEditedNarrative('');
                                setIsEditing(true);
                            }}
                            onGenerateNarrative={handleGenerateNarrative}
                            onDeleteNarrative={handleDeleteNarrative}
                        />
                    </div>
                )}
            </div>

            {/* Floating Action Button for Guide Tab */}
            {activeTab === 'guide' && templates.filter(t => t.isWeeklyTemplate).length > 0 && (
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
            {activeTab === 'narrative' && (narrative || isEditing) && (
                <FloatingButton
                    onClick={() => {
                        if (isEditing) handleSaveNarrative();
                        else {
                            setEditedNarrative(narrative);
                            setIsEditing(true);
                        }
                    }}
                    position="custom"
                    className="fixed bottom-16 right-6"
                >
                    <UIIcon 
                        type={isEditing ? "editing" : "reading"}
                        fallbackIcon={isEditing ? LucideIcons.Check : Edit3}
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
                period="weekly"
            />

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={confirmDeleteNarrative}
                title="删除叙事？"
                description="确定要删除当前生成的叙事吗？此操作无法撤销，需要重新生成。"
                confirmText="确认删除"
                type="danger"
            />

            {/* Reload Template Confirmation Modal */}
            <ConfirmModal
                isOpen={isReloadConfirmOpen}
                onClose={() => setIsReloadConfirmOpen(false)}
                onConfirm={confirmReloadFromTemplate}
                title="重新导入模板"
                description="将从最新的模板重新生成引导问题。当前的所有回答将被清空。确定要继续吗？"
                confirmText="确认导入"
                type="warning"
            />
        </div>
    );
};

