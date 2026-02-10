/**
 * @file ReviewNarrativeTab.tsx
 * @description Shared Narrative Tab component for Review Views
 */
import React from 'react';
import { Edit3, RefreshCw, Sparkles, Trash2, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

interface ReviewNarrativeTabProps {
    narrative: string;
    isEditing: boolean;
    isGenerating: boolean;
    editedNarrative: string;
    onEditedNarrativeChange: (value: string) => void;
    onStartEditing: () => void;
    onGenerateNarrative: () => void;
    onDeleteNarrative: () => void;
}

export const ReviewNarrativeTab: React.FC<ReviewNarrativeTabProps> = ({
    narrative,
    isEditing,
    isGenerating,
    editedNarrative,
    onEditedNarrativeChange,
    onStartEditing,
    onGenerateNarrative,
    onDeleteNarrative
}) => {
    if (!narrative && !isEditing) {
        return (
            <div className="flex flex-col gap-1 py-8">
                {/* Option 1: New Narrative */}
                <button
                    onClick={onStartEditing}
                    className="w-full py-4 text-stone-400 hover:text-stone-600 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                >
                    <Edit3 size={16} />
                    <span>新建叙事</span>
                </button>

                {/* Option 2: AI Create */}
                <button
                    onClick={onGenerateNarrative}
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
        );
    }

    return (
        <>
            {isEditing ? (
                <div className="mb-24">
                    <textarea
                        value={editedNarrative}
                        onChange={(e) => onEditedNarrativeChange(e.target.value)}
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
                    onClick={onDeleteNarrative}
                    className="text-red-400 hover:text-red-500 text-xs flex items-center gap-1 px-4 py-2"
                >
                    <Trash2 size={14} />
                    <span>删除叙事</span>
                </button>
            </div>
        </>
    );
};
