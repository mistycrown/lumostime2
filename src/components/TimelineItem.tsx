import React, { useState, useEffect } from 'react';
import { DiaryEntry } from '../views/journalTypes';
import { MessageSquarePlus, AudioLines, MessageCircle, Heart, Share2, Bookmark, Moon, Star, Send } from 'lucide-react';
import { imageService } from '../services/imageService';
import { ImagePreviewModal } from './ImagePreviewModal';
import { usePrivacy } from '../contexts/PrivacyContext';
import { IconRenderer } from './IconRenderer';
import { CollapsibleText } from './CollapsibleText';

import { ReactionPicker, ReactionList } from './ReactionComponents';

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

// Helper function to parse and render tag text with icons
const renderTagContent = (tagText: string) => {
    // Split by " / " to handle category/activity format
    const parts = tagText.split(' / ');
    
    return parts.map((part, index) => {
        // Match pattern: "icon text" where icon could be emoji or "ui:iconType"
        const match = part.match(/^(ui:\w+|[^\s]+)\s+(.+)$/);
        
        if (match) {
            const [, icon, text] = match;
            return (
                <React.Fragment key={index}>
                    {index > 0 && <span className="mx-1 text-stone-300">/</span>}
                    <IconRenderer icon={icon} className="text-xs" />
                    <span className="ml-1">{text}</span>
                </React.Fragment>
            );
        }
        
        // If no match, just return the text
        return (
            <React.Fragment key={index}>
                {index > 0 && <span className="mx-1 text-stone-300">/</span>}
                <span>{part}</span>
            </React.Fragment>
        );
    });
};

interface TimelineItemProps {
    entry: DiaryEntry;
    isLast: boolean;
    isFirstOfDay?: boolean;  // 是否是当天第一条
    onAddComment: (entryId: string, text: string) => void;
    onToggleReaction?: (entryId: string, emoji: string) => void;
    onClick?: () => void;
    collapseThreshold?: number; // 折叠字数阈值
}

const TimelineItem: React.FC<TimelineItemProps> = ({ entry, isLast, isFirstOfDay = true, onAddComment, onToggleReaction, onClick, collapseThreshold = 9999 }) => {
    const [isCommenting, setIsCommenting] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const dateObj = new Date(entry.date);
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = dateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase();

    // Format Time Range (24h)
    const formatTime24 = (isoString: string) => {
        const d = new Date(isoString);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const startTimeStr = formatTime24(entry.date);
    const endTimeStr = entry.endDate ? formatTime24(entry.endDate) : '';

    // e.g. "09:00 - 10:30" or just "09:00" if no end date
    const timeDisplay = endTimeStr ? `${startTimeStr} - ${endTimeStr}` : startTimeStr;

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
                <div
                    className="mt-4 rounded-lg overflow-hidden shadow-sm border border-gray-100 cursor-zoom-in"
                    onClick={async (e) => {
                        e.stopPropagation();
                        // Resolve URL before showing
                        const url = await imageService.getImageUrl(entry.media![0].url);
                        if (url) setPreviewImage(url);
                    }}
                >
                    <TimelineImage
                        src={entry.media[0].url}
                        alt="memory"
                        className="w-full h-auto max-h-[500px] object-cover transition-transform hover:scale-105 duration-700 cursor-zoom-in"
                    />
                </div>
            );
        }

        if (entry.media.length === 2) {
            return (
                <div className="mt-4 grid grid-cols-2 gap-2">
                    {entry.media.map((m, i) => (
                        <div
                            key={i}
                            className="rounded-lg overflow-hidden aspect-[3/4] shadow-sm border border-gray-100 cursor-zoom-in"
                            onClick={async (e) => {
                                e.stopPropagation();
                                const url = await imageService.getImageUrl(m.url);
                                if (url) setPreviewImage(url);
                            }}
                        >
                            <TimelineImage src={m.url} alt={`memory-${i}`} className="w-full h-full object-cover" />
                        </div>
                    ))}
                </div>
            );
        }

        return (
            <div className="mt-4 grid grid-cols-3 gap-1.5">
                {entry.media.map((m, i) => (
                    <div
                        key={i}
                        className="rounded-md overflow-hidden aspect-square shadow-sm border border-gray-100 cursor-zoom-in"
                        onClick={async (e) => {
                            e.stopPropagation();
                            const url = await imageService.getImageUrl(m.url);
                            if (url) setPreviewImage(url);
                        }}
                    >
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
                return <Moon className="w-4 h-4 p-0.5 ml-0.5 mt-1.5 text-purple-600 fill-current z-10" />;
            case 'weekly_summary':
                return <Star className="w-4 h-4 p-0.5 ml-0.5 mt-1.5 text-amber-500 fill-current z-10" />;
            default:
                // Normal dot
                return <div className="w-2.5 h-2.5 mt-1.5 ml-1.5 rounded-full bg-stone-900 border-2 border-[#faf9f6] z-10" />;
        }
    };

    const { isPrivacyMode } = usePrivacy();

    // Background style for summary cards
    const containerClasses = isSummary
        ? "bg-paper-dark/60 rounded-xl p-5 border border-dashed border-gray-300 relative w-full"
        : "flex flex-col gap-1 w-full pl-[5px] min-w-0";

    const hasMetadata = (entry.relatedTodos?.length || 0) + (entry.tags?.length || 0) + (entry.domains?.length || 0) > 0;

    return (
        <div
            className={`flex w-full group relative mb-8 pl-4 md:pl-6 transition-colors rounded-lg ${onClick ? 'cursor-pointer' : ''}`}
            onClick={(e) => {
                // Prevent click if clicking on comment form or interactive elements
                if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
                onClick?.();
            }}
        >
            {/* Node Icon (positioned absolutely on the left edge of parent group) */}
            <div className="absolute -left-[11px] top-0 z-20 flex items-center justify-center">
                {renderNodeIcon()}
            </div>

            {/* Content */}
            <div className={containerClasses}>
                {/* Header info */}
                <div className="flex items-baseline justify-between">
                    <div className="flex items-center gap-3 text-stone-400 text-[10px] font-sans tracking-wide">
                        {!isSummary && <span>{timeDisplay}</span>}
                    </div>
                </div>

                {/* Title (Optional or Parsed) */}
                {(() => {
                    const titleMatch = entry.content.match(/#([^#]+)#/);
                    const displayTitle = titleMatch ? titleMatch[1] : (entry.title || entry.tags?.[0]);

                    if (!displayTitle) return null;

                    return (
                        <h3 className={`text-gray-900 font-bold leading-tight ${isSummary ? 'text-[16px]' : 'text-[16px]'} transition-all duration-500`}>
                            {displayTitle}
                        </h3>
                    );
                })()}

                {/* Body Text */}
                <CollapsibleText
                    text={entry.content}
                    threshold={collapseThreshold}
                    className={`text-sm text-stone-500 leading-relaxed font-light ${isSummary ? 'mt-2' : 'mb-1'} ${isPrivacyMode ? 'blur-sm select-none transition-all duration-500' : 'transition-all duration-500'}`}
                />

                {/* Metadata Chips: @ (Todo), # (Tags), % (Domain) - HIDDEN FOR SUMMARIES */}
                {!isSummary && hasMetadata && (
                    <div className="flex flex-wrap items-center gap-2">
                        {/* @ Todos / Mentions */}
                        {entry.relatedTodos?.map((todo, i) => (
                            <span key={`todo-${i}`} className="text-[10px] font-medium text-stone-500 border border-stone-200 px-2 py-0.5 rounded flex items-center gap-1 bg-stone-50/30">
                                <span className="text-stone-400 font-bold">@</span>
                                <span className="line-clamp-1">{todo.title}</span>
                                {todo.isProgress && todo.progressIncrement && todo.progressIncrement > 0 && (
                                    <span className="font-mono text-stone-400 ml-0.5">+{todo.progressIncrement}</span>
                                )}
                            </span>
                        ))}

                        {/* # Tags */}
                        {entry.tags?.map((tag, i) => (
                            <span key={`tag-${i}`} className="text-[10px] font-medium text-stone-500 border border-stone-200 px-2 py-0.5 rounded flex items-center gap-1 bg-stone-50/30">
                                <span className="font-bold">#</span>
                                {renderTagContent(tag)}
                            </span>
                        ))}

                        {/* % Domains */}
                        {entry.domains?.map((domain, i) => (
                            <span key={`domain-${i}`} className="text-[10px] font-medium text-stone-500 border border-stone-200 px-2 py-0.5 rounded flex items-center gap-1 bg-stone-50/30">
                                <span className="text-stone-400 font-bold">%</span>
                                {renderTagContent(domain)}
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
                        <div className="w-full border-t border-dashed border-gray-200 mt-2" />

                        {/* Action Buttons */}
                        {/* Action Buttons & Reactions */}
                        <div className="flex items-center justify-start gap-2 pt-1 flex-wrap">
                            <button
                                onClick={() => setIsCommenting(!isCommenting)}
                                className="text-stone-300 hover:text-stone-600 transition-colors"
                            >
                                <AudioLines className="w-4 h-4" />
                            </button>
                            <ReactionPicker
                                onSelect={(emoji) => onToggleReaction?.(entry.id, emoji)}
                                currentReactions={entry.reactions}
                                align="inline-slide"
                            />

                            {/* Reactions List Inline */}
                            <ReactionList
                                reactions={entry.reactions}
                                onToggle={(emoji) => onToggleReaction?.(entry.id, emoji)}
                                className="ml-0"
                            />
                        </div>
                    </>
                )}

                {/* Append/Comment Input Area - HIDDEN FOR SUMMARIES */}
                {!isSummary && isCommenting && (
                    <form onSubmit={handleSubmitComment} className="mt-2 flex gap-2 animate-in fade-in slide-in-from-top-2 duration-200 w-[90%] max-w-[90%]">
                        <input
                            autoFocus
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Add a timestamped note..."
                            className="flex-1 min-w-0 bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-gray-900 transition-colors font-sans"
                        />
                        <button
                            type="submit"
                            disabled={!commentText.trim()}
                            className="bg-gray-900 text-white w-[36px] h-[36px] flex items-center justify-center rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
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
                                <div className="flex flex-col gap-1">
                                    <p className="text-sm text-stone-500 leading-relaxed font-light">{comment.text}</p>
                                    <span className="text-[10px] text-stone-300 font-sans tracking-wide mt-0.5">
                                        {(() => {
                                            const d = new Date(comment.createdAt);
                                            // Format: YYYY/MM/DD HH:mm
                                            const datePart = d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }).replace('/', '-');
                                            const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                                            // Determine format to use. If it's today, maybe just time? User asked for date.
                                            // User said: "It currently only shows time point, not date".
                                            // So I will show "MM-DD HH:mm".
                                            return `${datePart} ${timePart}`;
                                        })()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ImagePreviewModal
                imageUrl={previewImage}
                onClose={() => setPreviewImage(null)}
            />
        </div>
    );
};

export default TimelineItem;
