/**
 * @file MonthlyReviewView.tsx
 * @input Month Log Data, Review Data, Templates
 * @output Update Review Data, Generate Narrative
 * @pos View (Review System)
 * @description A comprehensive view for conducting monthly reviews. Includes tabs for statistical data, guided questions (Review Guide), and an AI-assisted narrative editor.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState, useMemo } from 'react';
import { ChevronLeft, Trash2, Sparkles, Edit3, RefreshCw, X, Calendar } from 'lucide-react';
import { MonthlyReview, ReviewTemplate, ReviewAnswer, Category, Log, TodoCategory, TodoItem, Scope, ReviewQuestion, NarrativeTemplate, DailyReview } from '../types';
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
    formatMonthlyTitleDate,
    formatDuration,
    getTemplateDisplayInfo
} from '../components/ReviewView';
import { 
    calculateMonthlyStats,
    generateCompleteMonthlyStatsText
} from '../utils/reviewStatsUtils';

interface MonthlyReviewViewProps {
    review: MonthlyReview;
    monthStartDate: Date;
    monthEndDate: Date;
    templates: ReviewTemplate[];
    categories: Category[];
    logs: Log[];
    todos: TodoItem[];
    todoCategories: TodoCategory[];
    scopes: Scope[];
    dailyReviews: DailyReview[];
    customNarrativeTemplates?: NarrativeTemplate[];
    onDelete: () => void;
    onUpdateReview: (review: MonthlyReview) => void;
    onGenerateNarrative: (review: MonthlyReview, statsText: string, promptTemplate?: string) => Promise<string>;
    addToast: (type: 'success' | 'error' | 'info', message: string) => void;
    onClose?: () => void;
}

type TabType = 'data' | 'guide' | 'narrative' | 'cite';

export const MonthlyReviewView: React.FC<MonthlyReviewViewProps> = ({
    review,
    monthStartDate,
    monthEndDate,
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
    addToast,
    onClose
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('data');
    const [cite, setCite] = useState(review.cite || '');
    
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

    // Get logs for the month
    const monthLogs = useMemo(() => {
        const start = new Date(monthStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(monthEndDate);
        end.setHours(23, 59, 59, 999);

        return logs.filter(log =>
            log.startTime >= start.getTime() &&
            log.endTime <= end.getTime()
        );
    }, [logs, monthStartDate, monthEndDate]);

    // Stats calculation for AI Narrative
    const stats = useMemo(() => 
        calculateMonthlyStats(monthLogs, categories, todos, todoCategories, scopes),
        [monthLogs, categories, todos, todoCategories, scopes]
    );

    // 获取月报模板questions
    const enabledQuestions = useMemo(() => {
        // 优先使用快照 (创建即归档)
        // 如果快照不存在,回退到全局templates (兼容旧数据)
        const templatesToUse = review.templateSnapshot ||
            templates
                .filter(t => t.isMonthlyTemplate)
                .sort((a, b) => a.order - b.order);

        return templatesToUse.flatMap(t => t.questions);
    }, [review.templateSnapshot, templates]);

    // 获取用于显示的模板列表 (用于渲染模板卡片)
    const templatesForDisplay = useMemo(() => {
        return review.templateSnapshot ||
            templates
                .filter(t => t.isMonthlyTemplate)
                .sort((a, b) => a.order - b.order);
    }, [review.templateSnapshot, templates]);

    // Update Answer
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
            .filter(t => t.isMonthlyTemplate)
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

    // Update Cite
    const handleCiteChange = (newCite: string) => {
        setCite(newCite);
        const updatedReview = {
            ...review,
            cite: newCite,
            updatedAt: Date.now()
        };
        onUpdateReview(updatedReview);
    };

    // Generate Narrative - Open Modal
    const handleGenerateNarrative = () => {
        setIsStyleModalOpen(true);
    };

    // Generate Narrative - Execute
    const handleSelectStyle = async (template: NarrativeTemplate) => {
        setIsStyleModalOpen(false);
        setIsGenerating(true);
        try {
            // 使用统一的统计文本生成函数
            const statsText = generateCompleteMonthlyStatsText(
                monthLogs,
                categories,
                todos,
                todoCategories,
                scopes,
                dailyReviews,
                monthStartDate,
                monthEndDate
            );

            const generated = await onGenerateNarrative(review, statsText, template.prompt);
            setNarrative(generated);
            setEditedNarrative(generated);

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

    // Save Edited Narrative
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
            await onUpdateReview(updatedReview);
            setNarrative('');
            setEditedNarrative('');
            setIsEditing(false);
            addToast('success', '叙事已删除');
        } catch (error) {
            console.error('Failed to delete narrative', error);
            addToast('error', '删除失败');
        } finally {
            setIsDeleteConfirmOpen(false);
        }
    };

    const dateRange = `${monthStartDate.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })} - ${monthEndDate.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}`;

    return (
        <div className="h-full bg-[#faf9f6] overflow-y-auto no-scrollbar pb-24 px-7 pt-4">
            {/* Date Display Section */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-3">
                        <span className="text-stone-300 font-normal">&</span>
                        {formatMonthlyTitleDate(monthStartDate)}
                    </h1>
                </div>
                <button
                    onClick={onDelete}
                    className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="删除此回顾"
                >
                    <Trash2 size={20} />
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-6 border-b border-stone-200 mb-8 overflow-x-auto no-scrollbar">
                {(['data', 'guide', 'narrative', 'cite'] as TabType[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-3 text-sm font-serif tracking-wide whitespace-nowrap transition-colors ${activeTab === tab
                            ? 'text-stone-900 border-b-2 border-stone-900 font-bold'
                            : 'text-stone-400 hover:text-stone-600'
                            }`}
                    >
                        {{ data: '数据', guide: '引导', narrative: '叙事', cite: '引言' }[tab]}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
                {/* 1. Data Tab */}
                {activeTab === 'data' && (
                    <div className="animate-in fade-in duration-300 -mx-7 -mt-4 pb-6">
                        <StatsView
                            logs={logs}
                            categories={categories}
                            currentDate={monthStartDate} // Start of month
                            onBack={() => { }} // No back implemented inside
                            isFullScreen={false}
                            onToggleFullScreen={() => { }}
                            todos={todos}
                            todoCategories={todoCategories}
                            scopes={scopes}
                            dailyReviews={dailyReviews}
                            onToast={addToast}
                            onTitleChange={() => { }}
                            onDateChange={() => { }}
                            hideRangeControls={true} // Hide range selector (day/week/month)
                            hideDateNavigation={true} // Hide date navigation
                            // forcedView="pie"  <- User wants to switch views
                            forcedRange="month" // Force month range
                            allowedViews={['pie', 'line', 'schedule', 'check']} // 添加 check 视图
                        />
                    </div>
                )}

                {/* 4. Cite Tab */}
                {activeTab === 'cite' && (
                    <div className="animate-in fade-in duration-300 pb-24">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
                            <label className="block text-sm font-bold text-stone-700 mb-4">
                                本月引言 / 主题
                            </label>
                            <textarea
                                value={cite}
                                onChange={(e) => handleCiteChange(e.target.value)}
                                className="w-full bg-[#faf9f6] border border-stone-200 rounded-xl p-4 text-stone-800 outline-none focus:border-stone-400 focus:bg-white transition-all resize-none text-lg font-serif italic leading-relaxed text-center placeholder-stone-300"
                                rows={6}
                                placeholder="输入一句能代表这个月的话..."
                            />
                            <p className="text-xs text-stone-400 mt-4 text-center">
                                这句话将显示在 Memoir 页面顶部的引用卡片中
                            </p>
                        </div>
                    </div>
                )}

                {/* 2. Guide Tab */}
                {
                    activeTab === 'guide' && (
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
                                    onClick={() => setIsReloadConfirmOpen(true)}
                                    className="flex items-center gap-2 text-stone-400 hover:text-stone-600 transition-colors text-sm"
                                >
                                    <RefreshCw size={14} />
                                    <span>重新从模板导入</span>
                                </button>
                            </div>
                        </div>
                    )
                }

                {/* 3. Narrative Tab */}
                {
                    activeTab === 'narrative' && (
                        <div className="space-y-4 animate-in fade-in duration-300 relative min-h-[50vh] pb-40">
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
                    )
                }
            </div >

            {/* Floating Action Button for Guide Tab */}
            {
                activeTab === 'guide' && enabledQuestions.length > 0 && (
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
                )
            }

            {/* Floating Action Button for Narrative Tab */}
            {
                activeTab === 'narrative' && (narrative || isEditing) && (
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
                )
            }

            {/* Confirm Delete Modal */}
            <ConfirmModal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={confirmDeleteNarrative}
                title="删除叙事"
                description="确定要删除生成的 AI 叙事吗？此操作无法撤销。"
                confirmText="删除"
                cancelText="取消"
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

            {/* Narrative Style Selection Modal */}
            <NarrativeStyleSelectionModal
                isOpen={isStyleModalOpen}
                onClose={() => setIsStyleModalOpen(false)}
                onSelect={handleSelectStyle}
                customTemplates={customNarrativeTemplates}
                period="monthly"
            />
        </div >
    );
};


