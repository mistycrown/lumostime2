/**
 * @file ReviewNarrativeTab.tsx
 * @description Shared Narrative Tab component for Review Views with Reading/Editing modes
 */
import React, { useEffect, useRef } from 'react';
import { RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { MoodPicker } from '../MoodPicker';

interface ReviewNarrativeTabProps {
    summary: string;
    narrative: string;
    isGenerating: boolean;
    isReadingMode: boolean;
    moodEmoji?: string;
    onSummaryChange: (value: string) => void;
    onNarrativeChange: (value: string) => void;
    onMoodChange?: (emoji: string) => void;
    onMoodClear?: () => void;
    onGenerateNarrative: () => void;
    onDeleteSummary: () => void;
    onDeleteNarrative: () => void;
}

export const ReviewNarrativeTab: React.FC<ReviewNarrativeTabProps> = ({
    summary,
    narrative,
    isGenerating,
    isReadingMode,
    moodEmoji,
    onSummaryChange,
    onNarrativeChange,
    onMoodChange,
    onMoodClear,
    onGenerateNarrative,
    onDeleteSummary,
    onDeleteNarrative
}) => {
    // 自动保存的防抖处理
    const summaryTimeoutRef = useRef<NodeJS.Timeout>();
    const narrativeTimeoutRef = useRef<NodeJS.Timeout>();

    const handleSummaryChange = (value: string) => {
        onSummaryChange(value);
        
        // 清除之前的定时器
        if (summaryTimeoutRef.current) {
            clearTimeout(summaryTimeoutRef.current);
        }
        
        // 设置新的定时器，500ms 后自动保存
        summaryTimeoutRef.current = setTimeout(() => {
            // 自动保存逻辑已经在 onSummaryChange 中处理
        }, 500);
    };

    const handleNarrativeChange = (value: string) => {
        onNarrativeChange(value);
        
        // 清除之前的定时器
        if (narrativeTimeoutRef.current) {
            clearTimeout(narrativeTimeoutRef.current);
        }
        
        // 设置新的定时器，500ms 后自动保存
        narrativeTimeoutRef.current = setTimeout(() => {
            // 自动保存逻辑已经在 onNarrativeChange 中处理
        }, 500);
    };

    // 清理定时器
    useEffect(() => {
        return () => {
            if (summaryTimeoutRef.current) {
                clearTimeout(summaryTimeoutRef.current);
            }
            if (narrativeTimeoutRef.current) {
                clearTimeout(narrativeTimeoutRef.current);
            }
        };
    }, []);

    return (
        <div className="space-y-8">
            {/* Section 1: 手动叙事（一句话总结） */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-stone-600">一句话总结</h3>
                    {summary && isReadingMode && (
                        <button
                            onClick={onDeleteSummary}
                            className="text-red-400 hover:text-red-500 text-xs flex items-center gap-1 px-2 py-1"
                        >
                            <Trash2 size={12} />
                        </button>
                    )}
                </div>

                {isReadingMode ? (
                    // 阅读模式：显示内容或空状态
                    summary ? (
                        <div className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 text-[15px] leading-relaxed">
                            {summary}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-stone-400 text-sm border border-dashed border-stone-200 rounded-xl">
                            暂无内容
                        </div>
                    )
                ) : (
                    // 编辑模式：显示输入框和心情选择器
                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            value={summary}
                            onChange={(e) => handleSummaryChange(e.target.value)}
                            className="flex-1 bg-white border border-stone-200 rounded-xl px-4 py-3 text-stone-800 outline-none text-[15px] leading-relaxed shadow-sm focus:border-stone-400 transition-colors"
                            placeholder="用一句话总结..."
                        />
                        {onMoodChange && (
                            <MoodPicker
                                selectedMood={moodEmoji}
                                onSelect={onMoodChange}
                                onClear={onMoodClear}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Divider */}
            <div className="border-t border-stone-200"></div>

            {/* Section 2: AI 生成的叙事 */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-stone-600">AI 叙事</h3>
                    {narrative ? (
                        // 有内容时显示删除按钮
                        <button
                            onClick={onDeleteNarrative}
                            className="text-red-400 hover:text-red-500 text-xs flex items-center gap-1 px-2 py-1"
                        >
                            <Trash2 size={12} />
                        </button>
                    ) : (
                        // 无内容时显示 AI 生成按钮
                        <button
                            onClick={onGenerateNarrative}
                            disabled={isGenerating}
                            className="text-stone-400 hover:text-stone-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed p-1"
                            title="与 AI 共创叙事"
                        >
                            {isGenerating ? (
                                <RefreshCw size={14} className="animate-spin" />
                            ) : (
                                <Sparkles size={14} />
                            )}
                        </button>
                    )}
                </div>

                {isReadingMode ? (
                    // 阅读模式：显示 Markdown 内容或空状态
                    narrative ? (
                        <div className="px-1 prose prose-stone max-w-none text-[15px] leading-relaxed prose-headings:font-bold prose-headings:text-stone-800 prose-headings:my-5 prose-strong:text-stone-900">
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
                    ) : (
                        <div className="text-center py-8 text-stone-400 text-sm border border-dashed border-stone-200 rounded-xl">
                            暂无内容
                        </div>
                    )
                ) : (
                    // 编辑模式：显示输入框
                    <textarea
                        value={narrative}
                        onChange={(e) => handleNarrativeChange(e.target.value)}
                        className="w-full bg-white border border-stone-200 rounded-2xl p-6 text-stone-800 outline-none resize-none text-[15px] leading-relaxed shadow-sm block focus:border-stone-400 transition-colors"
                        rows={16}
                        placeholder="在此开始写作..."
                    />
                )}
            </div>
        </div>
    );
};
