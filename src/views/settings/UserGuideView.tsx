/**
 * @file UserGuideView.tsx
 * @description Renders the in-app guide chapter list and Markdown reading view.
 * @updated 2026-07-21: Added semantic dark-mode surfaces for guide cards and text emphasis.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// @ts-ignore
import gettingStarted from '../../../docs/user-guide/01-getting-started.md?raw';
// @ts-ignore
import todoManagement from '../../../docs/user-guide/02-todo-management.md?raw';
// @ts-ignore
import tagsManagement from '../../../docs/user-guide/03-tags-management.md?raw';
// @ts-ignore
import scopeAndGoals from '../../../docs/user-guide/04-scope-and-goals.md?raw';
// @ts-ignore
import dataStatistics from '../../../docs/user-guide/05-data-statistics.md?raw';
// @ts-ignore
import dailyReview from '../../../docs/user-guide/06-daily-review.md?raw';
// @ts-ignore
import search from '../../../docs/user-guide/07-search.md?raw';
// @ts-ignore
import dataSync from '../../../docs/user-guide/08-data-sync.md?raw';
// @ts-ignore
import personalization from '../../../docs/user-guide/09-personalization.md?raw';
// @ts-ignore
import sceneSettings from '../../../docs/user-guide/10-scene-settings.md?raw';
// @ts-ignore
import timeTrackingMethods from '../../../docs/user-guide/00-time-tracking-methods.md?raw';

interface UserGuideViewProps {
    onBack: () => void;
}

// 处理高亮语法的辅助函数
const processHighlight = (text: string) => {
    const parts = text.split(/(==.+?==)/g);
    return parts.map((part, index) => {
        if (part.startsWith('==') && part.endsWith('==')) {
            return (
                <span
                    key={index}
                    className="guide-highlight text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-sm font-mono border border-amber-100"
                >
                    {part.slice(2, -2)}
                </span>
            );
        }
        return part;
    });
};

interface GuideSection {
    id: string;
    title: string;
    content: string;
    icon: string;
}

const guideSections: GuideSection[] = [
    { id: '00', title: '时间记录的理论与方法', content: timeTrackingMethods, icon: '📖' },
    { id: '01', title: '开始记录你的时间', content: gettingStarted, icon: '⏱️' },
    { id: '02', title: '待办管理', content: todoManagement, icon: '✅' },
    { id: '03', title: '标签管理', content: tagsManagement, icon: '🏷️' },
    { id: '04', title: '领域与目标', content: scopeAndGoals, icon: '🎯' },
    { id: '05', title: '数据统计', content: dataStatistics, icon: '📊' },
    { id: '06', title: '回顾与复盘', content: dailyReview, icon: '📝' },
    { id: '07', title: '搜索与数据管理', content: search, icon: '🔍' },
    { id: '08', title: '数据同步与导出', content: dataSync, icon: '☁️' },
    { id: '09', title: '个性化设置', content: personalization, icon: '🎨' },
    { id: '10', title: '场景设置', content: sceneSettings, icon: '🎬' },
];

export const UserGuideView: React.FC<UserGuideViewProps> = ({ onBack }) => {
    const [selectedSection, setSelectedSection] = useState<string | null>(null);
    const listScrollRef = useRef<HTMLDivElement>(null);
    const articleScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (selectedSection) {
            if (articleScrollRef.current) {
                articleScrollRef.current.scrollTop = 0;
            }
            return;
        }
        if (listScrollRef.current) {
            listScrollRef.current.scrollTop = 0;
        }
    }, [selectedSection]);

    // 如果选择了某个章节，显示章节内容
    if (selectedSection) {
        const section = guideSections.find(s => s.id === selectedSection);
        if (!section) return null;

        return (
            <div className="user-guide-view fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
                <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0 z-10">
                    <button
                        onClick={() => setSelectedSection(null)}
                        className="text-stone-400 hover:text-stone-600 p-1"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <span className="text-stone-800 font-bold text-lg">{section.title}</span>
                </div>

                <div ref={articleScrollRef} className="flex-1 overflow-y-auto overscroll-contain pb-40">
                    <div className="max-w-2xl mx-auto px-6 py-8">
                        <div className="guide-markdown markdown-content prose prose-stone">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    h1: ({ node, ...props }) => (
                                        <h1 className="text-3xl font-bold text-stone-900 mb-6 mt-0 leading-tight" {...props} />
                                    ),
                                    h2: ({ node, ...props }) => (
                                        <h2 className="text-xl font-bold text-stone-800 mt-10 mb-4 pb-2 border-b border-stone-200" {...props} />
                                    ),
                                    h3: ({ node, ...props }) => (
                                        <h3 className="text-lg font-bold text-stone-700 mt-8 mb-3" {...props} />
                                    ),
                                    p: ({ node, children, ...props }) => (
                                        <p className="text-stone-600 leading-[1.8] my-4 text-[15px] break-words" {...props}>
                                            {React.Children.map(children, child => 
                                                typeof child === 'string' ? processHighlight(child) : child
                                            )}
                                        </p>
                                    ),
                                    ul: ({ node, ...props }) => (
                                        <ul className="my-4 space-y-2.5 pl-6 list-disc break-words" {...props} />
                                    ),
                                    ol: ({ node, ...props }) => (
                                        <ol className="my-4 space-y-2.5 pl-6 list-decimal break-words" {...props} />
                                    ),
                                    li: ({ node, children, ...props }) => (
                                        <li className="text-stone-600 text-[15px] leading-relaxed break-words" {...props}>
                                            {React.Children.map(children, child => 
                                                typeof child === 'string' ? processHighlight(child) : child
                                            )}
                                        </li>
                                    ),
                                    strong: ({ node, ...props }) => (
                                        <strong className="guide-strong text-stone-900 font-bold bg-amber-50 px-1 rounded" {...props} />
                                    ),
                                    code: ({ node, inline, className, children, ...props }: any) =>
                                        inline ? (
                                            <span 
                                                className="guide-inline-code text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-sm font-mono border border-amber-100 whitespace-nowrap"
                                                {...props}
                                            >
                                                {children}
                                            </span>
                                        ) : (
                                            <code className="guide-code-block block bg-stone-50 border border-stone-200 rounded-xl p-5 text-sm font-mono leading-relaxed shadow-sm overflow-x-auto" style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }} {...props}>
                                                {children}
                                            </code>
                                        ),
                                    blockquote: ({ node, ...props }) => (
                                        <blockquote className="guide-blockquote border-l-4 border-amber-400 bg-amber-50/50 pl-5 pr-4 py-3 italic text-stone-600 my-6 rounded-r-lg" {...props} />
                                    ),
                                    hr: ({ node, ...props }) => (
                                        <hr className="border-stone-200 my-8" {...props} />
                                    ),
                                    img: ({ node, alt, src, ...props }) => (
                                        <div className="my-6">
                                            <img
                                                src={src}
                                                alt={alt || ''}
                                                className="w-full rounded-xl shadow-lg border border-stone-200"
                                                loading="lazy"
                                                {...props}
                                            />
                                            {alt && (
                                                <p className="text-center text-xs text-stone-400 mt-2 italic">
                                                    {alt}
                                                </p>
                                            )}
                                        </div>
                                    ),
                                }}
                            >
                                {section.content}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 显示章节列表
    return (
        <div className="user-guide-view fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0 z-10">
                <button
                    onClick={onBack}
                    className="text-stone-400 hover:text-stone-600 p-1"
                >
                    <ChevronLeft size={24} />
                </button>
                <span className="text-stone-800 font-bold text-lg">用户指南</span>
            </div>

            <div ref={listScrollRef} className="flex-1 overflow-y-auto overscroll-contain p-4 pb-40">
                <div className="space-y-4">
                    {/* 欢迎语 */}
                    <div className="guide-welcome bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 mb-2 border border-amber-100/50">
                        <h2 className="text-xl font-bold text-stone-800 mb-2">欢迎使用 LumosTime ✨</h2>
                        <p className="text-sm text-stone-600 leading-relaxed">
                            LumosTime是一个结合柳比歇夫时间记录法和间歇日志方法的记录工具，让我们一起将被动的时间流逝转化为主动生命积累吧！
                        </p>
                    </div>

                    {/* 章节列表 */}
                    <div className="space-y-2">
                        {guideSections.map((section) => (
                            <div
                                key={section.id}
                                onClick={() => setSelectedSection(section.id)}
                                className="guide-section-card bg-white rounded-xl p-4 active:scale-[0.98] transition-all cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] border border-stone-100"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="guide-section-icon w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-2xl flex-shrink-0">
                                            {section.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs text-stone-400 font-medium mb-0.5">第 {section.id} 章</div>
                                            <div className="text-[15px] font-bold text-stone-800">{section.title}</div>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="text-stone-300 flex-shrink-0 ml-2" />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 底部标语 */}
                    <div className="text-center pt-6 pb-8">
                        <p className="text-xs text-stone-400 leading-relaxed">
                            Illuminate your time, illuminate your life
                        </p>
                        <p className="text-xs text-stone-300 mt-1">
                            开始掌控你的时间吧！
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
