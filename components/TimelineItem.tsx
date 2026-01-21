import React, { useState, useEffect } from 'react';
import { DiaryEntry } from '../views/journalTypes';
import { MessageSquarePlus, MoreHorizontal, Send, Moon, Star, Bookmark } from 'lucide-react';
import { imageService } from '../services/imageService';

// Helper component for async image loading
const TimelineImage: React.FC<{ src: string; alt: string; className: string }> = ({ src, alt, className }) => {
    const [imgUrl, setImgUrl] = useState<string>('');

    useEffect(() => {
        let isMounted = true;

        const load = async () => {
            if (src.startsWith('http') || src.startsWith('data:')) {
                setImgUrl(src);
                return;
            }

            // It's a local filename, fetch via service
            try {
                const url = await imageService.getImageUrl(src);
                if (isMounted && url) {
                    setImgUrl(url);
                }
            } catch (e) {
                console.error('Failed to load timeline image:', src, e);
            }
        };

        load();

        return () => { isMounted = false; };
    }, [src]);

    if (!imgUrl) return <div className={`bg-gray-100 ${className} animate-pulse`} />;

    return <img src={imgUrl} alt={alt} className={className} />;
};

interface TimelineItemProps {
    entry: DiaryEntry;
    isLast: boolean;
    isFirstOfDay?: boolean;  // 是否是当天第一条
    onAddComment: (entryId: string, text: string) => void;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ entry, isLast, isFirstOfDay = true, onAddComment }) => {
    const [isCommenting, setIsCommenting] = useState(false);
    const [commentText, setCommentText] = useState('');

    const dateObj = new Date(entry.date);
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = dateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const time = dateObj.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const type = entry.type || 'normal';
    const isSummary = type !== 'normal';

    const handleSubmitComment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        onAddComment(entry.id, commentText);
        setCommentText('');
        setIsCommenting(false);
    };



    // Helper to render media grid based on count
    const renderMedia = () => {
        if (!entry.media || entry.media.length === 0) return null;

        if (entry.media.length === 1) {
            return (
                <div className="mt-4 rounded-lg overflow-hidden shadow-sm border border-gray-100">
                    <TimelineImage
                        src={entry.media[0].url}
                        alt="memory"
                        className="w-full h-auto max-h-[500px] object-cover transition-transform hover:scale-105 duration-700"
                    />
                </div>
            );
        }

        if (entry.media.length === 2) {
            return (
                <div className="mt-4 grid grid-cols-2 gap-2">
                    {entry.media.map((m, i) => (
                        <div key={i} className="rounded-lg overflow-hidden aspect-[3/4] shadow-sm border border-gray-100">
                            <TimelineImage src={m.url} alt={`memory-${i}`} className="w-full h-full object-cover" />
                        </div>
                    ))}
                </div>
            );
        }

        return (
            <div className="mt-4 grid grid-cols-3 gap-1.5">
                {entry.media.map((m, i) => (
                    <div key={i} className="rounded-md overflow-hidden aspect-square shadow-sm border border-gray-100">
                        <TimelineImage src={m.url} alt={`memory-${i}`} className="w-full h-full object-cover" />
                    </div>
                ))}
            </div>
        );
    };

    // Helper to get Icon based on Type
    const renderNodeIcon = () => {
        switch (type) {
            case 'daily_summary':
                return <div className="bg-white z-10 p-1"><Moon className="w-3 h-3 text-gray-900 fill-current" /></div>;
            case 'weekly_summary':
                return <div className="bg-white z-10 p-1"><Star className="w-3 h-3 text-gray-900 fill-current" /></div>;
            case 'monthly_summary':
                return <div className="bg-white z-10 p-1"><Bookmark className="w-4 h-4 text-gray-900 fill-current" /></div>;
            default:
                // Normal dot
                return <div className="w-2 h-2 rounded-full bg-gray-900 ring-4 ring-white z-10"></div>;
        }
    };

    // Background style for summary cards
    const containerClasses = isSummary
        ? "bg-paper-dark/60 rounded-xl p-5 border border-dashed border-gray-300 relative"
        : "flex flex-col gap-2";

    const hasMetadata = (entry.relatedTodos?.length || 0) + (entry.tags?.length || 0) + (entry.domains?.length || 0) > 0;

    return (
        <div className="flex w-full group relative mb-8 pl-4 md:pl-6">
            {/* Node Icon (positioned absolutely on the left edge of parent group) */}
            <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-stone-900 border-2 border-white z-10" />

            {/* Content */}
            <div className={containerClasses}>
                {/* Header info */}
                <div className="flex items-baseline justify-between">
                    <div className="flex items-center gap-3 text-subtle text-xs font-sans tracking-wide">
                        {!isSummary && <span>{time}</span>}
                    </div>
                </div>

                {/* Title (Optional or Parsed) */}
                {(() => {
                    const titleMatch = entry.content.match(/#([^#]+)#/);
                    const displayTitle = titleMatch ? titleMatch[1] : (entry.title || entry.tags?.[0]);

                    if (!displayTitle) return null;

                    return (
                        <h3 className={`font-serif text-gray-900 font-medium leading-tight ${isSummary ? 'text-lg mt-1' : 'text-xl md:text-2xl mt-1'}`}>
                            {displayTitle}
                        </h3>
                    );
                })()}

                {/* Body Text */}
                <p className={`font-sans text-sm md:text-base text-gray-700 leading-relaxed whitespace-pre-line font-light ${isSummary ? 'mt-2 text-gray-600' : 'mt-1'}`}>
                    {entry.content}
                </p>

                {/* Metadata Chips: @ (Todo), # (Tags), % (Domain) - HIDDEN FOR SUMMARIES */}
                {!isSummary && hasMetadata && (
                    <div className="flex flex-wrap gap-2 mt-3">
                        {/* @ Todos / Mentions */}
                        {entry.relatedTodos?.map((todo, i) => (
                            <span key={`todo-${i}`} className="inline-flex items-center px-2.5 py-1 rounded-md border border-gray-200 bg-transparent text-xs text-gray-600 font-sans tracking-wide hover:border-gray-300 transition-colors cursor-pointer">
                                <span className="text-gray-400 mr-1.5 font-bold">@</span>
                                {todo}
                            </span>
                        ))}

                        {/* # Tags */}
                        {entry.tags?.map((tag, i) => (
                            <span key={`tag-${i}`} className="inline-flex items-center px-2.5 py-1 rounded-md border border-gray-200 bg-transparent text-xs text-gray-600 font-sans tracking-wide hover:border-gray-300 transition-colors cursor-pointer">
                                <span className="text-gray-400 mr-1.5 font-bold">#</span>
                                {tag}
                            </span>
                        ))}

                        {/* % Domains */}
                        {entry.domains?.map((domain, i) => (
                            <span key={`domain-${i}`} className="inline-flex items-center px-2.5 py-1 rounded-md border border-gray-200 bg-transparent text-xs text-gray-600 font-sans tracking-wide hover:border-gray-300 transition-colors cursor-pointer">
                                <span className="text-gray-400 mr-1.5 font-bold">%</span>
                                {domain}
                            </span>
                        ))}
                    </div>
                )}

                {/* Media */}
                {renderMedia()}

                {/* Action Bar - HIDDEN FOR SUMMARIES */}
                {!isSummary && (
                    <>
                        {/* Divider Line */}
                        <div className="w-full border-t border-dashed border-gray-200 mt-3" />

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end pt-2">
                            <button
                                onClick={() => setIsCommenting(!isCommenting)}
                                className="text-gray-300 hover:text-gray-900 transition-colors"
                            >
                                <MoreHorizontal className="w-5 h-5" />
                            </button>
                        </div>
                    </>
                )}

                {/* Append/Comment Input Area - HIDDEN FOR SUMMARIES */}
                {!isSummary && isCommenting && (
                    <form onSubmit={handleSubmitComment} className="mt-2 flex gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <input
                            autoFocus
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Add a timestamped note..."
                            className="flex-1 bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-gray-900 transition-colors font-sans"
                        />
                        <button
                            type="submit"
                            disabled={!commentText.trim()}
                            className="bg-gray-900 text-white p-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                )}

                {/* Existing Comments / Appended Notes - HIDDEN FOR SUMMARIES */}
                {!isSummary && entry.comments && entry.comments.length > 0 && (
                    <div className={`mt-0 rounded-lg flex flex-col gap-3 bg-paper-dark/50 pt-0 pl-3 pr-4 pb-4`}>
                        {entry.comments.map((comment) => (
                            <div key={comment.id} className="flex gap-3 text-sm group/comment">
                                <div className="w-1 h-auto bg-gray-300 rounded-full my-1 opacity-50"></div>
                                <div className="flex-1">
                                    <p className="text-gray-800 font-sans leading-relaxed">{comment.text}</p>
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mt-1 block">
                                        {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TimelineItem;
