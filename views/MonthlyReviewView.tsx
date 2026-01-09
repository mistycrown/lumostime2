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
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { ConfirmModal } from '../components/ConfirmModal';
import { NarrativeStyleSelectionModal } from '../components/NarrativeStyleSelectionModal';
import { StatsView } from './StatsView';

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
    addToast: (message: string, type: 'success' | 'error' | 'info') => void;
    onClose?: () => void;
}

type TabType = 'data' | 'guide' | 'narrative';

// Helper to extract emoji
const getTemplateDisplayInfo = (title: string) => {
    const emojiRegex = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u;
    const match = title.match(emojiRegex);
    if (match) {
        return {
            emoji: match[0],
            text: title.substring(match[0].length).trim()
        };
    }
    return { emoji: null, text: title };
};

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
    const [answers, setAnswers] = useState<ReviewAnswer[]>(review.answers || []);
    const [narrative, setNarrative] = useState(review.narrative || '');
    const [isEditing, setIsEditing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [editedNarrative, setEditedNarrative] = useState('');
    const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);

    // Reuse dailyReview_guideMode for consistency
    const [isReadingMode, setIsReadingMode] = useState(() => {
        return localStorage.getItem('dailyReview_guideMode') === 'reading';
    });

    // Toggle reading mode
    const toggleReadingMode = () => {
        const newMode = !isReadingMode;
        setIsReadingMode(newMode);
        localStorage.setItem('dailyReview_guideMode', newMode ? 'reading' : 'editing');
    };

    // Format Title Date (YYYY/MM)
    const formatTitleDate = (start: Date) => {
        const year = start.getFullYear();
        const month = String(start.getMonth() + 1).padStart(2, '0');
        return `${year}/${month}`;
    };

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
    const stats = useMemo(() => {
        const totalDuration = monthLogs.reduce((acc, log) => acc + (log.duration || 0), 0);

        const categoryStats = categories.map(cat => {
            const catLogs = monthLogs.filter(l => l.categoryId === cat.id);
            const duration = catLogs.reduce((acc, l) => acc + (l.duration || 0), 0);
            const percentage = totalDuration > 0 ? (duration / totalDuration) * 100 : 0;
            return { ...cat, duration, percentage };
        }).filter(c => c.duration > 0);

        const todoStats = todoCategories.map(cat => {
            const catTodos = todos.filter(t => t.categoryId === cat.id);
            const linkedLogs = monthLogs.filter(l =>
                l.linkedTodoId && catTodos.some(t => t.id === l.linkedTodoId)
            );
            const duration = linkedLogs.reduce((acc, l) => acc + (l.duration || 0), 0);
            const percentage = totalDuration > 0 ? (duration / totalDuration) * 100 : 0;
            return { ...cat, duration, percentage };
        }).filter(c => c.duration > 0);

        const scopeStats = scopes.map(scope => {
            const scopeLogs = monthLogs.filter(l =>
                l.scopeIds && l.scopeIds.includes(scope.id)
            );
            const duration = scopeLogs.reduce((acc, l) => acc + (l.duration || 0), 0);
            const percentage = totalDuration > 0 ? (duration / totalDuration) * 100 : 0;
            return { ...scope, duration, percentage };
        }).filter(s => s.duration > 0);

        return { totalDuration, categoryStats, todoStats, scopeStats };
    }, [monthLogs, categories, todos, todoCategories, scopes]);

    // Format Duration
    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}小时${m}分钟`;
        return `${m}分钟`;
    };

    // 获取月报模板questions
    const enabledQuestions = useMemo(() => {
        // 优先使用快照 (创建即归档)
        // 如果快照不存在,回退到全局templates (兼容旧数据)
        const templatesToUse = review.templateSnapshot ||
            templates
                .filter(t => t.enabled && t.isMonthlyTemplate)
                .sort((a, b) => a.order - b.order);

        return templatesToUse.flatMap(t => t.questions);
    }, [review.templateSnapshot, templates]);

    // 获取用于显示的模板列表 (用于渲染模板卡片)
    const templatesForDisplay = useMemo(() => {
        return review.templateSnapshot ||
            templates
                .filter(t => t.enabled && t.isMonthlyTemplate)
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

    // Generate Narrative - Open Modal
    const handleGenerateNarrative = () => {
        setIsStyleModalOpen(true);
    };

    // Generate Narrative - Execute
    const handleSelectStyle = async (template: NarrativeTemplate) => {
        setIsStyleModalOpen(false);
        setIsGenerating(true);
        try {
            // Generate Weekly Stats Layout
            const weeklyStatsText = (() => {
                let text = '每周详细统计：\n';
                const start = new Date(monthStartDate);
                const end = new Date(monthEndDate);

                // Helper to get week ranges within the month
                const getWeeks = () => {
                    const weeks: { start: Date, end: Date }[] = [];
                    let current = new Date(start);
                    current.setHours(0, 0, 0, 0);

                    while (current <= end) {
                        const weekStart = new Date(current);
                        const weekEnd = new Date(current);
                        // Advance to end of week (Sat) or end of month
                        const dayOfWeek = current.getDay();
                        const daysToSat = 6 - dayOfWeek;
                        weekEnd.setDate(current.getDate() + daysToSat);

                        if (weekEnd > end) {
                            weekEnd.setTime(end.getTime());
                        }
                        weekEnd.setHours(23, 59, 59, 999);

                        weeks.push({ start: weekStart, end: weekEnd });

                        // Advance to next week's Sunday
                        current.setDate(current.getDate() + daysToSat + 1);
                    }
                    return weeks;
                };

                const weeks = getWeeks();

                weeks.forEach((week, index) => {
                    const weekLogs = monthLogs.filter(l =>
                        l.startTime >= week.start.getTime() &&
                        l.endTime <= week.end.getTime()
                    );

                    if (weekLogs.length === 0) return;

                    const dateRange = `${week.start.getMonth() + 1}/${week.start.getDate()} - ${week.end.getMonth() + 1}/${week.end.getDate()}`;
                    text += `\n【第${index + 1}周 (${dateRange})】\n`;

                    // 1. Tags (Categories)
                    const catDurations = new Map<string, number>();
                    weekLogs.forEach(l => {
                        const catName = categories.find(c => c.id === l.categoryId)?.name || '未知';
                        catDurations.set(catName, (catDurations.get(catName) || 0) + (l.endTime - l.startTime) / 1000);
                    });
                    text += `  标签分布：\n`;
                    Array.from(catDurations.entries())
                        .sort((a, b) => b[1] - a[1]) // Sort by duration desc
                        .forEach(([name, duration]) => {
                            text += `    - ${name}: ${formatDuration(duration)}\n`;
                        });

                    // 2. Scopes
                    const scopeDurations = new Map<string, number>();
                    weekLogs.forEach(l => {
                        if (l.scopeIds && l.scopeIds.length > 0) {
                            // Split duration among scopes? Or count full duration for each?
                            // Usually full duration adds up to > total time.
                            // Let's use simple check: log belongs to scope.
                            const duration = (l.endTime - l.startTime) / 1000;
                            l.scopeIds.forEach(sid => {
                                const sName = scopes.find(s => s.id === sid)?.name || '未知';
                                scopeDurations.set(sName, (scopeDurations.get(sName) || 0) + duration);
                            });
                        }
                    });
                    if (scopeDurations.size > 0) {
                        text += `  领域分布：\n`;
                        Array.from(scopeDurations.entries())
                            .sort((a, b) => b[1] - a[1])
                            .forEach(([name, duration]) => {
                                text += `    - ${name}: ${formatDuration(duration)}\n`;
                            });
                    }

                    // 3. Todo Total Duration
                    const todoLogs = weekLogs.filter(l => l.linkedTodoId);
                    const todoTotal = todoLogs.reduce((acc, l) => acc + (l.endTime - l.startTime) / 1000, 0);
                    if (todoTotal > 0) {
                        text += `  待办投入总时长：${formatDuration(todoTotal)}\n`;
                    }
                });

                return text;
            })();

            const statsText = `月度总览：\n` +
                `总时长：${formatDuration(stats.totalDuration)}\n` +
                `标签统计：\n${stats.categoryStats.map(c =>
                    `- ${c.name}: ${formatDuration(c.duration)} (${c.percentage.toFixed(1)}%)`
                ).join('\n')}\n` +
                `领域统计：\n${stats.scopeStats.map(s =>
                    `- ${s.name}: ${formatDuration(s.duration)} (${s.percentage.toFixed(1)}%)`
                ).join('\n')}\n\n` +
                weeklyStatsText;

            // 生成本月 check 项汇总统计
            const checkText = (() => {
                // 筛选本月的 dailyReviews
                const monthStart = new Date(monthStartDate);
                monthStart.setHours(0, 0, 0, 0);
                const monthEnd = new Date(monthEndDate);
                monthEnd.setHours(23, 59, 59, 999);

                const monthDailyReviews = dailyReviews.filter(r => {
                    const reviewDate = new Date(r.date);
                    return reviewDate >= monthStart && reviewDate <= monthEnd;
                });

                // 统计每个 check 项的完成情况
                const checkStats: Record<string, { category: string, total: number, completed: number }> = {};

                monthDailyReviews.forEach(review => {
                    if (review.checkItems) {
                        review.checkItems.forEach(item => {
                            if (!item.category) return; // 跳过无分类项
                            const key = `${item.category}|${item.content}`;
                            if (!checkStats[key]) {
                                checkStats[key] = { category: item.category, total: 0, completed: 0 };
                            }
                            checkStats[key].total++;
                            if (item.isCompleted) checkStats[key].completed++;
                        });
                    }
                });

                if (Object.keys(checkStats).length === 0) return '';

                // 按分类分组
                const byCategory: Record<string, Array<{ content: string, total: number, completed: number, rate: number }>> = {};
                Object.entries(checkStats).forEach(([key, stats]) => {
                    const content = key.split('|')[1];
                    const rate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
                    if (!byCategory[stats.category]) byCategory[stats.category] = [];
                    byCategory[stats.category].push({ content, total: stats.total, completed: stats.completed, rate });
                });

                let text = '\n\n检查清单完成情况（本月汇总）：\n';
                Object.entries(byCategory).forEach(([category, items]) => {
                    text += `\n${category}：\n`;
                    items.forEach(item => {
                        text += `  ${item.content}: ${item.completed}/${item.total} (${item.rate.toFixed(0)}%)\n`;
                    });
                });

                return text;
            })();

            const generated = await onGenerateNarrative(review, statsText + checkText, template.prompt);
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
            addToast('生成叙事失败', 'error');
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

    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

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
            addToast('叙事已删除', 'success');
        } catch (error) {
            console.error('Failed to delete narrative', error);
            addToast('删除失败', 'error');
        } finally {
            setIsDeleteConfirmOpen(false);
        }
    };

    // Render Question (Edit Mode)
    const renderQuestion = (q: ReviewQuestion) => {
        const answer = answers.find(a => a.questionId === q.id);

        if (q.type === 'text') {
            return (
                <div key={q.id} className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">{q.question}</label>
                    <textarea
                        value={answer?.answer || ''}
                        onChange={(e) => updateAnswer(q.id, q.question, e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 outline-none focus:border-stone-400 transition-colors resize-none"
                        rows={2}
                        placeholder="输入你的回答..."
                    />
                </div>
            );
        }

        if (q.type === 'choice' && q.choices) {
            return (
                <div key={q.id} className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">{q.question}</label>
                    <div className="flex gap-2 flex-wrap">
                        {q.choices.map(choice => (
                            <button
                                key={choice}
                                onClick={() => updateAnswer(q.id, q.question, choice)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${answer?.answer === choice
                                    ? 'bg-stone-900 text-white shadow-md'
                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                    }`}
                            >
                                {choice}
                            </button>
                        ))}
                    </div>
                </div>
            );
        }

        if (q.type === 'rating') {
            const getIcon = (iconName?: string) => {
                if (!iconName) return LucideIcons.Star;
                const Icon = (LucideIcons as any)[iconName] || (LucideIcons as any)[iconName.charAt(0).toUpperCase() + iconName.slice(1)];
                return Icon || LucideIcons.Star;
            };
            const RatingIcon = getIcon(q.icon);
            const currentRating = parseInt(answer?.answer || '0');

            return (
                <div key={q.id} className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">{q.question}</label>
                    <div className="grid grid-cols-5 gap-1">
                        {[1, 2, 3, 4, 5].map((rating) => {
                            const colorOption = COLOR_OPTIONS.find(c => c.id === q.colorId) || COLOR_OPTIONS.find(c => c.id === 'amber')!;
                            const isActive = currentRating >= rating;

                            return (
                                <button
                                    key={rating}
                                    onClick={() => updateAnswer(q.id, q.question, rating.toString())}
                                    className={`p-2 rounded-xl transition-all flex items-center justify-center aspect-square max-w-14 w-full mx-auto ${isActive
                                        ? `${colorOption.text} ${colorOption.bg} scale-105`
                                        : 'text-stone-200 hover:text-stone-300'
                                        }`}
                                >
                                    <RatingIcon
                                        size={28}
                                        className="shrink-0"
                                        fill={isActive ? "currentColor" : "none"}
                                        strokeWidth={isActive ? 0 : 2}
                                    />
                                </button>
                            );
                        })}
                    </div>
                </div>
            );
        }

        return null;
    };

    // Render Question (Reading Mode)
    const renderReadingQuestion = (q: ReviewQuestion) => {
        const answer = answers.find(a => a.questionId === q.id);
        const hasAnswer = answer?.answer && answer.answer.trim().length > 0;

        return (
            <div key={q.id}>
                <p className="text-[15px] font-bold text-stone-800 mb-2">{q.question}</p>

                <div className="pl-3 border-l-2 border-stone-200">
                    {q.type === 'text' && (
                        <div className={`text-sm leading-relaxed whitespace-pre-wrap ${!hasAnswer ? 'text-stone-400 italic' : 'text-stone-600'}`}>
                            {hasAnswer ? answer.answer : '未填写'}
                        </div>
                    )}

                    {q.type === 'choice' && (
                        <div className="flex gap-2 flex-wrap pt-1">
                            {q.choices?.map(choice => (
                                <span
                                    key={choice}
                                    className={`px-3 py-1 rounded text-xs font-medium border ${answer?.answer === choice
                                        ? 'bg-stone-800 text-white border-stone-800'
                                        : 'text-stone-400 border-stone-200'
                                        }`}
                                >
                                    {choice}
                                </span>
                            ))}
                        </div>
                    )}

                    {q.type === 'rating' && (
                        <div className="flex gap-1 pt-1">
                            {[1, 2, 3, 4, 5].map((rating) => {
                                const currentRating = parseInt(answer?.answer || '0');
                                const getIcon = (iconName?: string) => {
                                    if (!iconName) return LucideIcons.Star;
                                    const Icon = (LucideIcons as any)[iconName] || (LucideIcons as any)[iconName.charAt(0).toUpperCase() + iconName.slice(1)];
                                    return Icon || LucideIcons.Star;
                                };
                                const RatingIcon = getIcon(q.icon);
                                const colorOption = COLOR_OPTIONS.find(c => c.id === q.colorId) || COLOR_OPTIONS.find(c => c.id === 'amber')!;
                                const isActive = currentRating >= rating;

                                return (
                                    <RatingIcon
                                        key={rating}
                                        size={18}
                                        className={isActive ? colorOption.text : "text-stone-200"}
                                        fill={isActive ? "currentColor" : "none"}
                                        strokeWidth={isActive ? 0 : 2}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const dateRange = `${monthStartDate.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })} - ${monthEndDate.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}`;

    return (
        <div className="h-full bg-[#faf9f6] overflow-y-auto no-scrollbar pb-24 px-7 pt-4">
            {/* Top Header (User Requested Style) */}
            <header className="h-14 flex items-center justify-between px-5 bg-[#fdfbf7] border-b border-stone-100 shrink-0 z-30 mb-4 -mx-7 -mt-4">
                <div className="w-8 flex items-center">
                    <button
                        onClick={onClose} // Use onClose passed from props or define it
                        className="text-stone-400 hover:text-stone-600 transition-colors"
                    >
                        <ChevronLeft size={24} />
                    </button>
                </div>
                <h1 className="text-lg font-bold text-stone-700 tracking-wide">Monthly Review</h1>
                <div className="w-8"></div>
            </header>

            {/* Date Display Section */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-3">
                        <span className="text-stone-300 font-normal">&</span>
                        {formatTitleDate(monthStartDate)}
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

                {/* 2. Guide Tab */}
                {activeTab === 'guide' && (
                    <div className="space-y-6 animate-in fade-in duration-300 pb-40">
                        {enabledQuestions.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-stone-400">暂无配置的月报模板</p>
                                <p className="text-xs text-stone-300 mt-2">请在设置中添加月报模板</p>
                            </div>
                        ) : (
                            isReadingMode ? (
                                // Reading Mode (Optimized Receipt Style) - 无开关
                                <div className="space-y-8 px-1">
                                    {templatesForDisplay.map((template, idx, arr) => {
                                        const { emoji, text } = getTemplateDisplayInfo(template.title);
                                        return (
                                            <div key={template.id}>
                                                <div className="space-y-6 mb-8">
                                                    <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                                                        {emoji && <span className="text-xl">{emoji}</span>}
                                                        <span>{text}</span>
                                                    </h3>
                                                    <div className="space-y-8 pl-1">
                                                        {template.questions.map(q => renderReadingQuestion(q))}
                                                    </div>
                                                </div>
                                                {/* Divider */}
                                                {idx < arr.length - 1 && (
                                                    <div className="h-px bg-stone-100" />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                // Edit Mode (Card Style)
                                templatesForDisplay.map(template => {
                                    const { emoji, text } = getTemplateDisplayInfo(template.title);
                                    return (
                                        <div key={template.id} className="bg-white rounded-2xl p-5 shadow-sm">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                                                    {emoji && <span className="text-xl">{emoji}</span>}
                                                    <span>{text}</span>
                                                </h3>
                                                {/* syncToTimeline 开关 */}
                                                <button
                                                    onClick={() => toggleTemplateSyncToTimeline(template.id)}
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${template.syncToTimeline
                                                        ? 'bg-stone-800 text-white'
                                                        : 'bg-stone-100 text-stone-400'
                                                        }`}
                                                    title={template.syncToTimeline ? '已同步到时间轴' : '未同步到时间轴'}
                                                >
                                                    <Calendar size={16} />
                                                </button>
                                            </div>
                                            <div className="space-y-6">
                                                {template.questions.map(q => (
                                                    <div key={q.id}>
                                                        {renderQuestion(q)}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })
                            )
                        )}
                    </div>
                )}

                {/* 3. Narrative Tab */}
                {activeTab === 'narrative' && (
                    <div className="space-y-4 animate-in fade-in duration-300 relative min-h-[50vh] pb-40">
                        {!narrative && !isEditing ? (
                            <div className="flex flex-col gap-1 py-8">
                                {/* Option 1: New Narrative */}
                                <button
                                    onClick={() => {
                                        setEditedNarrative('');
                                        setIsEditing(true);
                                    }}
                                    className="w-full py-4 text-stone-400 hover:text-stone-600 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                                >
                                    <Edit3 size={16} />
                                    <span>新建叙事</span>
                                </button>

                                {/* Option 2: AI Create */}
                                <button
                                    onClick={handleGenerateNarrative}
                                    disabled={isGenerating}
                                    className="w-full py-4 text-stone-600 hover:text-stone-900 transition-colors flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isGenerating ? (
                                        <>
                                            <RefreshCw size={16} className="animate-spin" />
                                            AI正在撰写中...
                                        </>
                                    ) : (
                                        <>
                                            <div className="bg-stone-800 text-white p-1.5 rounded-lg">
                                                <Sparkles size={14} />
                                            </div>
                                            <span>与AI共创叙事</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <>
                                {isEditing ? (
                                    <div className="mb-24">
                                        <textarea
                                            value={editedNarrative}
                                            onChange={(e) => setEditedNarrative(e.target.value)}
                                            className="w-full bg-white border border-stone-200 rounded-2xl p-6 text-stone-800 outline-none resize-none text-[15px] leading-relaxed shadow-sm block"
                                            rows={24}
                                            placeholder="在此开始写作..."
                                        />
                                    </div>
                                ) : (
                                    <div className="px-1 prose prose-stone max-w-none text-[15px] leading-relaxed prose-headings:font-bold prose-headings:text-stone-800 prose-headings:my-5 prose-strong:text-stone-900 mb-24">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm, remarkBreaks]}
                                            components={{
                                                h1: ({ node, ...props }) => <h1 className="text-xl font-bold text-stone-900 mt-8 mb-4 flex items-center gap-2" {...props} />,
                                                h2: ({ node, ...props }) => <h2 className="text-lg font-bold text-stone-800 mt-6 mb-3 flex items-center gap-2" {...props} />,
                                                h3: ({ node, ...props }) => <h3 className="text-base font-bold text-stone-800 mt-5 mb-2" {...props} />,
                                                p: ({ node, ...props }) => <p className="mb-6 last:mb-0" {...props} />,
                                                blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-stone-300 pl-4 italic text-stone-600 my-6 font-serif bg-stone-50 py-2 pr-2 rounded-r" {...props} />,
                                                ul: ({ node, ...props }) => <ul className="list-disc pl-5 my-4 space-y-1 text-stone-700" {...props} />,
                                                ol: ({ node, ...props }) => <ol className="list-decimal pl-5 my-4 space-y-1 text-stone-700" {...props} />,
                                                li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                                hr: ({ node, ...props }) => <hr className="my-10 border-stone-300" {...props} />
                                            }}
                                        >
                                            {narrative}
                                        </ReactMarkdown>
                                    </div>
                                )}

                                {/* Delete Narrative Button */}
                                <div className="flex justify-center pt-4 opacity-50 hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={handleDeleteNarrative}
                                        className="text-red-400 hover:text-red-500 text-xs flex items-center gap-1 px-4 py-2"
                                    >
                                        <Trash2 size={14} />
                                        <span>删除叙事</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Floating Action Button for Guide Tab */}
            {activeTab === 'guide' && enabledQuestions.length > 0 && (
                <button
                    onClick={toggleReadingMode}
                    className="fixed bottom-16 right-6 w-14 h-14 bg-stone-900 rounded-full text-white shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-40 border border-stone-800"
                >
                    {isReadingMode ? <Edit3 size={24} /> : <LucideIcons.BookOpen size={24} />}
                </button>
            )}

            {/* Floating Action Button for Narrative Tab */}
            {activeTab === 'narrative' && (narrative || isEditing) && (
                <button
                    onClick={() => {
                        if (isEditing) handleSaveNarrative();
                        else {
                            setEditedNarrative(narrative);
                            setIsEditing(true);
                        }
                    }}
                    className="fixed bottom-16 right-6 w-14 h-14 bg-stone-900 rounded-full text-white shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-40 border border-stone-800"
                >
                    {isEditing ? <LucideIcons.Check size={24} /> : <Edit3 size={24} />}
                </button>
            )}

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

            {/* Narrative Style Selection Modal */}
            <NarrativeStyleSelectionModal
                isOpen={isStyleModalOpen}
                onClose={() => setIsStyleModalOpen(false)}
                onSelect={handleSelectStyle}
                customTemplates={customNarrativeTemplates}
            />
        </div>
    );
};


