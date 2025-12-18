import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, Trash2, Sparkles, Edit3, RefreshCw } from 'lucide-react';
import { DailyReview, ReviewTemplate, ReviewAnswer, Category, Log, TodoCategory, TodoItem, Scope, ReviewQuestion, NarrativeTemplate } from '../types';
import { COLOR_OPTIONS } from '../constants';
import * as LucideIcons from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { ConfirmModal } from '../components/ConfirmModal';
import { NarrativeStyleSelectionModal } from '../components/NarrativeStyleSelectionModal';
import { StatsView } from './StatsView';

interface DailyReviewViewProps {
    review: DailyReview;
    date: Date;
    templates: ReviewTemplate[];
    categories: Category[];
    logs: Log[];
    todos: TodoItem[];
    todoCategories: TodoCategory[];
    scopes: Scope[];
    customNarrativeTemplates?: NarrativeTemplate[];
    onDelete: () => void;
    onUpdateReview: (review: DailyReview) => void;
    onGenerateNarrative: (review: DailyReview, statsText: string, timelineText: string, promptTemplate?: string) => Promise<string>;
    addToast: (message: string, type: 'success' | 'error' | 'info') => void; // Assuming ToastType is 'success' | 'error' | 'info'
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

export const DailyReviewView: React.FC<DailyReviewViewProps> = ({
    review,
    date,
    templates,
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
    const [activeTab, setActiveTab] = useState<TabType>('data');
    const [answers, setAnswers] = useState<ReviewAnswer[]>(review.answers || []);
    const [narrative, setNarrative] = useState(review.narrative || '');
    const [isEditing, setIsEditing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [editedNarrative, setEditedNarrative] = useState('');
    const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);

    // 初始化阅读模式状态
    const [isReadingMode, setIsReadingMode] = useState(() => {
        return localStorage.getItem('dailyReview_guideMode') === 'reading';
    });

    // 切换阅读模式
    const toggleReadingMode = () => {
        const newMode = !isReadingMode;
        setIsReadingMode(newMode);
        localStorage.setItem('dailyReview_guideMode', newMode ? 'reading' : 'editing');
    };

    // 格式化日期
    const formatDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}/${month}/${day}`;
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
    const stats = useMemo(() => {
        const totalDuration = dayLogs.reduce((acc, log) => acc + (log.duration || 0), 0);

        const categoryStats = categories.map(cat => {
            const catLogs = dayLogs.filter(l => l.categoryId === cat.id);
            const duration = catLogs.reduce((acc, l) => acc + (l.duration || 0), 0);
            const percentage = totalDuration > 0 ? (duration / totalDuration) * 100 : 0;
            return { ...cat, duration, percentage };
        }).filter(c => c.duration > 0);

        const todoStats = todoCategories.map(cat => {
            const catTodos = todos.filter(t => t.categoryId === cat.id);
            const linkedLogs = dayLogs.filter(l =>
                l.linkedTodoId && catTodos.some(t => t.id === l.linkedTodoId)
            );
            const duration = linkedLogs.reduce((acc, l) => acc + (l.duration || 0), 0);
            const percentage = totalDuration > 0 ? (duration / totalDuration) * 100 : 0;
            return { ...cat, duration, percentage };
        }).filter(c => c.duration > 0);

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

    // 格式化时长（用于AI叙事生成）
    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}小时${m}分钟`;
        return `${m}分钟`;
    };

    // 获取日报模板questions
    const enabledQuestions = useMemo(() => {
        const questions: Array<ReviewTemplate['questions'][0] & { templateTitle: string }> = [];
        templates
            .filter(t => t.isDailyTemplate)
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

            // 生成时间轴文本
            const timelineText = dayLogs.map(log => {
                const cat = categories.find(c => c.id === log.categoryId);
                const act = cat?.activities.find(a => a.id === log.activityId);
                const startTime = new Date(log.startTime);
                const endTime = new Date(log.endTime);
                return `${startTime.getHours()}:${String(startTime.getMinutes()).padStart(2, '0')}-${endTime.getHours()}:${String(endTime.getMinutes()).padStart(2, '0')} ${act?.name || ''} ${log.note ? '- ' + log.note : ''}`;
            }).join('\n');

            const generated = await onGenerateNarrative(review, statsText, timelineText, template.prompt);
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
            addToast('生成叙事失败', 'error');
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
            // update local state
            await onUpdateReview(updatedReview);
            setNarrative('');
            setEditedNarrative('');
            setIsEditing(false); // reset to false to show empty state options
            addToast('叙事已删除', 'success');
        } catch (error) {
            console.error('Failed to delete narrative', error);
            addToast('删除失败', 'error');
        } finally {
            setIsDeleteConfirmOpen(false);
        }
    };

    // 渲染问题 (编辑模式)
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

    // 渲染问题 (阅读模式 - 小票风格)
    const renderReadingQuestion = (q: ReviewQuestion) => {
        const answer = answers.find(a => a.questionId === q.id);
        const hasAnswer = answer?.answer && answer.answer.trim().length > 0;

        return (
            <div key={q.id}>
                <p className="text-[15px] font-bold text-stone-800 mb-2">{q.question}</p>

                <div className="pl-3 border-l-2 border-stone-200">
                    {q.type === 'text' && (
                        <div className={`text-sm leading-relaxed ${!hasAnswer ? 'text-stone-400 italic' : 'text-stone-600'}`}>
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
                            hideControls={true}  // 隐藏控制栏
                            forcedView="pie"     // 强制为饼图视图
                            forcedRange="day"    // 强制为日视图
                        />
                    </div>
                )}

                {/* Tab 2: Guide */}
                {activeTab === 'guide' && (
                    <div className="space-y-6 animate-in fade-in duration-300 pb-40">
                        {templates.filter(t => t.isDailyTemplate).length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-stone-400">暂无启用的回顾模板</p>
                                <p className="text-xs text-stone-300 mt-2">请在设置中启用回顾模板</p>
                            </div>
                        ) : (
                            isReadingMode ? (
                                // 阅读模式 (小票风格 - 优化版)
                                <div className="space-y-8 px-1">
                                    {templates.filter(t => t.isDailyTemplate).map((template, idx, arr) => {
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
                                                {/* 模板分割线 (除了最后一个) */}
                                                {idx < arr.length - 1 && (
                                                    <div className="h-px bg-stone-100" />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                // 编辑模式 (卡片风格)
                                templates.filter(t => t.isDailyTemplate).map(template => {
                                    const { emoji, text } = getTemplateDisplayInfo(template.title);
                                    return (
                                        <div key={template.id} className="bg-white rounded-2xl p-5 shadow-sm">
                                            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2 mb-4">
                                                {emoji && <span className="text-xl">{emoji}</span>}
                                                <span>{text}</span>
                                            </h3>
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

                {/* Tab 3: Narrative */}
                {activeTab === 'narrative' && (
                    <div className="space-y-4 animate-in fade-in duration-300 relative min-h-[50vh] pb-40">
                        {!narrative && !isEditing ? (
                            <div className="flex flex-col gap-1 py-8">
                                {/* 选项1：新建空白叙事 */}
                                <button
                                    onClick={() => {
                                        setEditedNarrative('');
                                        setIsEditing(true);
                                    }}
                                    className="w-full py-4 text-stone-400 hover:text-stone-600 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pen-line" aria-hidden="true">
                                        <path d="M13 21h8"></path>
                                        <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"></path>
                                    </svg>
                                    <span>新建叙事</span>
                                </button>

                                {/* 选项2：与AI共创 */}
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
                                        {/* ... (in rendering) */}
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

                                {/* 删除叙事 - 仅在有内容时显示，且不占主要位置 */}
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
            {activeTab === 'guide' && templates.filter(t => t.isDailyTemplate).length > 0 && (
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
            {/* Narrative Style Selection Modal */}
            <NarrativeStyleSelectionModal
                isOpen={isStyleModalOpen}
                onClose={() => setIsStyleModalOpen(false)}
                onSelect={handleSelectStyle}
                customTemplates={customNarrativeTemplates}
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
        </div>
    );
};

