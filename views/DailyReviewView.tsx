import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, Trash2, Sparkles, Edit3, RefreshCw } from 'lucide-react';
import { DailyReview, ReviewTemplate, ReviewAnswer, Category, Log, TodoCategory, TodoItem, Scope } from '../types';
import * as LucideIcons from 'lucide-react';

interface DailyReviewViewProps {
    review: DailyReview;
    date: Date;
    templates: ReviewTemplate[];
    categories: Category[];
    logs: Log[];
    todos: TodoItem[];
    todoCategories: TodoCategory[];
    scopes: Scope[];
    onBack: () => void;
    onDelete: () => void;
    onUpdateReview: (review: DailyReview) => void;
    onGenerateNarrative: (review: DailyReview, statsText: string, timelineText: string) => Promise<string>;
}

type TabType = 'data' | 'guide' | 'narrative';

export const DailyReviewView: React.FC<DailyReviewViewProps> = ({
    review,
    date,
    templates,
    categories,
    logs,
    todos,
    todoCategories,
    scopes,
    onBack,
    onDelete,
    onUpdateReview,
    onGenerateNarrative
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('data');
    const [answers, setAnswers] = useState<ReviewAnswer[]>(review.answers || []);
    const [narrative, setNarrative] = useState(review.narrative || '');
    const [isEditing, setIsEditing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [editedNarrative, setEditedNarrative] = useState('');

    // 格式化日期
    const formatDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // 获取当天的logs
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

    // 计算统计数据
    const stats = useMemo(() => {
        const totalDuration = dayLogs.reduce((acc, log) => acc + (log.duration || 0), 0);

        // 标签统计
        const categoryStats = categories.map(cat => {
            const catLogs = dayLogs.filter(l => l.categoryId === cat.id);
            const duration = catLogs.reduce((acc, l) => acc + (l.duration || 0), 0);
            const percentage = totalDuration > 0 ? (duration / totalDuration) * 100 : 0;

            const activityStats = cat.activities.map(act => {
                const actLogs = catLogs.filter(l => l.activityId === act.id);
                const actDuration = actLogs.reduce((acc, l) => acc + (l.duration || 0), 0);
                return { ...act, duration: actDuration };
            }).filter(a => a.duration > 0);

            return { ...cat, duration, percentage, activities: activityStats };
        }).filter(c => c.duration > 0);

        // 待办统计
        const todoStats = todoCategories.map(cat => {
            const catTodos = todos.filter(t => t.categoryId === cat.id);
            const linkedLogs = dayLogs.filter(l =>
                l.linkedTodoId && catTodos.some(t => t.id === l.linkedTodoId)
            );
            const duration = linkedLogs.reduce((acc, l) => acc + (l.duration || 0), 0);
            const percentage = totalDuration > 0 ? (duration / totalDuration) * 100 : 0;

            return { ...cat, duration, percentage };
        }).filter(c => c.duration > 0);

        // 领域统计
        const scopeStats = scopes.map(scope => {
            const scopeLogs = dayLogs.filter(l =>
                l.scopeIds && l.scopeIds.includes(scope.id)
            );
            const duration = scopeLogs.reduce((acc, l) => acc + (l.duration || 0), 0);
            const percentage = totalDuration > 0 ? (duration / totalDuration) * 100 : 0;

            return { ...scope, duration, percentage };
        }).filter(s => s.duration > 0);

        return { totalDuration, categoryStats, todoStats, scopeStats };
    }, [dayLogs, categories, todos, todoCategories, scopes]);

    // 格式化时长
    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}小时${m}分钟`;
        return `${m}分钟`;
    };

    // 获取启用的模板questions
    const enabledQuestions = useMemo(() => {
        const questions: Array<ReviewTemplate['questions'][0] & { templateTitle: string }> = [];
        templates
            .filter(t => t.enabled)
            .sort((a, b) => a.order - b.order)
            .forEach(template => {
                template.questions.forEach(q => {
                    questions.push({ ...q, templateTitle: template.title });
                });
            });
        return questions;
    }, [templates]);

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

    // 生成叙事
    const handleGenerateNarrative = async () => {
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

            // 生成时间轴文本
            const timelineText = dayLogs.map(log => {
                const cat = categories.find(c => c.id === log.categoryId);
                const act = cat?.activities.find(a => a.id === log.activityId);
                const startTime = new Date(log.startTime);
                const endTime = new Date(log.endTime);
                return `${startTime.getHours()}:${String(startTime.getMinutes()).padStart(2, '0')}-${endTime.getHours()}:${String(endTime.getMinutes()).padStart(2, '0')} ${act?.name || ''} ${log.note ? '- ' + log.note : ''}`;
            }).join('\n');

            const generated = await onGenerateNarrative(review, statsText, timelineText);
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

    // 渲染问题
    const renderQuestion = (q: typeof enabledQuestions[0]) => {
        const answer = answers.find(a => a.questionId === q.id);

        if (q.type === 'text') {
            return (
                <div key={q.id} className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">{q.question}</label>
                    <textarea
                        value={answer?.answer || ''}
                        onChange={(e) => updateAnswer(q.id, q.question, e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 outline-none focus:border-stone-400 transition-colors resize-none"
                        rows={3}
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
            const IconComponent = q.icon ? (LucideIcons as any)[q.icon.charAt(0).toUpperCase() + q.icon.slice(1)] : LucideIcons.Star;
            const rating = answer?.answer ? parseInt(answer.answer) : 0;

            return (
                <div key={q.id} className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">{q.question}</label>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map(score => (
                            <button
                                key={score}
                                onClick={() => updateAnswer(q.id, q.question, String(score))}
                                className="transition-all hover:scale-110"
                            >
                                <IconComponent
                                    size={32}
                                    className={score <= rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}
                                />
                            </button>
                        ))}
                    </div>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col pt-[env(safe-area-inset-top)] animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="text-stone-400 hover:text-stone-600 p-1"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <span className="text-stone-800 font-bold text-lg">&amp; {formatDate(date)}</span>
                </div>
                <button
                    onClick={onDelete}
                    className="text-stone-400 hover:text-red-600 p-1 transition-colors"
                >
                    <Trash2 size={20} />
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-1 px-6 pt-4 pb-2 border-b border-stone-100">
                {(['data', 'guide', 'narrative'] as TabType[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab
                                ? 'bg-stone-900 text-white shadow-md'
                                : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100'
                            }`}
                    >
                        {{ data: '数据', guide: '引导', narrative: '叙事' }[tab]}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                {/* Tab 1: Data */}
                {activeTab === 'data' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* 标签统计 */}
                        {stats.categoryStats.length > 0 && (
                            <div className="bg-white rounded-2xl p-5 shadow-sm">
                                <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-4">标签统计</h3>
                                <div className="space-y-3">
                                    {stats.categoryStats.map(cat => (
                                        <div key={cat.id}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-base">{cat.icon}</span>
                                                    <span className="font-bold text-stone-700 text-sm">{cat.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-stone-400">{formatDuration(cat.duration)}</span>
                                                    <span className="text-xs font-bold px-2 py-0.5 bg-stone-100 rounded text-stone-500">
                                                        {cat.percentage.toFixed(0)}%
                                                    </span>
                                                </div>
                                            </div>
                                            {cat.activities.length > 0 && (
                                                <div className="ml-6 space-y-1">
                                                    {cat.activities.map(act => (
                                                        <div key={act.id} className="flex items-center justify-between text-xs">
                                                            <span className="text-stone-500">{act.icon} {act.name}</span>
                                                            <span className="text-stone-400">{formatDuration(act.duration)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 待办统计 */}
                        {stats.todoStats.length > 0 && (
                            <div className="bg-white rounded-2xl p-5 shadow-sm">
                                <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-4">待办统计</h3>
                                <div className="space-y-2">
                                    {stats.todoStats.map(todo => (
                                        <div key={todo.id} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-base">{todo.icon}</span>
                                                <span className="font-medium text-stone-700 text-sm">{todo.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-stone-400">{formatDuration(todo.duration)}</span>
                                                <span className="text-xs font-bold px-2 py-0.5 bg-stone-100 rounded text-stone-500">
                                                    {todo.percentage.toFixed(0)}%
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 领域统计 */}
                        {stats.scopeStats.length > 0 && (
                            <div className="bg-white rounded-2xl p-5 shadow-sm">
                                <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-4">领域统计</h3>
                                <div className="space-y-2">
                                    {stats.scopeStats.map(scope => (
                                        <div key={scope.id} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-base">{scope.icon}</span>
                                                <span className="font-medium text-stone-700 text-sm">{scope.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-stone-400">{formatDuration(scope.duration)}</span>
                                                <span className="text-xs font-bold px-2 py-0.5 bg-stone-100 rounded text-stone-500">
                                                    {scope.percentage.toFixed(0)}%
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab 2: Guide */}
                {activeTab === 'guide' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {enabledQuestions.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-stone-400">暂无启用的回顾模板</p>
                                <p className="text-xs text-stone-300 mt-2">请在设置中启用回顾模板</p>
                            </div>
                        ) : (
                            enabledQuestions.map((q, index) => (
                                <div key={q.id} className="bg-white rounded-2xl p-5 shadow-sm">
                                    {index === 0 || enabledQuestions[index - 1].templateTitle !== q.templateTitle ? (
                                        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">
                                            {q.templateTitle}
                                        </h3>
                                    ) : null}
                                    {renderQuestion(q)}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Tab 3: Narrative */}
                {activeTab === 'narrative' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        {!narrative && !isEditing ? (
                            <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
                                <Sparkles size={48} className="mx-auto text-amber-500 mb-4" />
                                <p className="text-stone-500 mb-6">让AI为你生成今天的叙事日记</p>
                                <button
                                    onClick={handleGenerateNarrative}
                                    disabled={isGenerating}
                                    className="px-6 py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                                >
                                    {isGenerating ? (
                                        <>
                                            <RefreshCw size={16} className="animate-spin" />
                                            生成中...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={16} />
                                            生成叙事
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="bg-white rounded-2xl p-5 shadow-sm">
                                    {isEditing ? (
                                        <textarea
                                            value={editedNarrative}
                                            onChange={(e) => setEditedNarrative(e.target.value)}
                                            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 outline-none focus:border-stone-400 transition-colors resize-none"
                                            rows={15}
                                        />
                                    ) : (
                                        <p className="text-stone-700 leading-relaxed whitespace-pre-wrap">{narrative}</p>
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    {isEditing ? (
                                        <>
                                            <button
                                                onClick={handleSaveNarrative}
                                                className="flex-1 px-4 py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-all"
                                            >
                                                保存
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsEditing(false);
                                                    setEditedNarrative('');
                                                }}
                                                className="flex-1 px-4 py-3 bg-stone-100 text-stone-600 rounded-xl font-medium hover:bg-stone-200 transition-all"
                                            >
                                                取消
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setIsEditing(true);
                                                    setEditedNarrative(narrative);
                                                }}
                                                className="flex-1 px-4 py-3 bg-stone-100 text-stone-600 rounded-xl font-medium hover:bg-stone-200 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Edit3 size={16} />
                                                编辑
                                            </button>
                                            <button
                                                onClick={handleGenerateNarrative}
                                                disabled={isGenerating}
                                                className="flex-1 px-4 py-3 bg-stone-100 text-stone-600 rounded-xl font-medium hover:bg-stone-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                <RefreshCw size={16} className={isGenerating ? 'animate-spin' : ''} />
                                                重新生成
                                            </button>
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
