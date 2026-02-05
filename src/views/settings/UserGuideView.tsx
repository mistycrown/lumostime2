import React from 'react';
import { ChevronLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
// @ts-ignore
import userGuideContent from '../../../USER_GUIDE.md?raw';

interface UserGuideViewProps {
    onBack: () => void;
}

export const UserGuideView: React.FC<UserGuideViewProps> = ({ onBack }) => {
    return (
        <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0 z-10">
                <button
                    onClick={onBack}
                    className="text-stone-400 hover:text-stone-600 p-1"
                >
                    <ChevronLeft size={24} />
                </button>
                <span className="text-stone-800 font-bold text-lg">用户指南</span>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-6 pb-40">
                <div className="markdown-content">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-stone-800 mb-4 mt-0" {...props} />,
                            h2: ({ node, ...props }) => <h2 className="text-xl font-bold text-stone-800 mt-8 mb-3" {...props} />,
                            h3: ({ node, ...props }) => <h3 className="text-base font-bold text-stone-800 mt-6 mb-2" {...props} />,
                            p: ({ node, ...props }) => <p className="text-stone-600 leading-relaxed my-3 text-sm" {...props} />,
                            ul: ({ node, ...props }) => <ul className="my-3 space-y-1.5 list-disc pl-6" {...props} />,
                            ol: ({ node, ...props }) => <ol className="my-3 space-y-1.5 list-decimal pl-6" {...props} />,
                            li: ({ node, ...props }) => <li className="text-stone-600 text-sm" {...props} />,
                            strong: ({ node, ...props }) => <strong className="text-stone-800 font-bold" {...props} />,
                            code: ({ node, inline, className, children, ...props }: any) =>
                                inline
                                    ? <code className="text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded text-xs" {...props}>{children}</code>
                                    : <code className="block bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs" {...props}>{children}</code>,
                            blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-stone-300 pl-4 italic text-stone-500 my-4" {...props} />,
                            hr: ({ node, ...props }) => <hr className="border-stone-100 my-6" {...props} />,
                        }}
                    >
                        {userGuideContent}
                    </ReactMarkdown>
                </div>
            </div>
        </div>
    );
};
