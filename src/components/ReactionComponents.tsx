import React, { useState, useRef, useEffect } from 'react';
import { Smile, Plus } from 'lucide-react';

export const REACTIONS = ['👍', '❤️', '🎉', '🚀', '👀', '🔥', '👏', '💯'];

interface ReactionPickerProps {
    onSelect: (emoji: string) => void;
    currentReactions?: string[];
    align?: 'left' | 'right' | 'center';
}

export const ReactionPicker: React.FC<ReactionPickerProps> = ({ onSelect, currentReactions = [], align = 'left' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    let positionClasses = "absolute top-8 z-50";
    if (align === 'right') {
        positionClasses += " right-0";
    } else if (align === 'center') {
        positionClasses += " left-1/2 -translate-x-1/2";
    } else {
        positionClasses += " left-0";
    }

    return (
        <div className="relative inline-block" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors flex items-center justify-center"
                title="Add Reaction"
            >
                <Smile size={16} />
            </button>

            {isOpen && (
                <div className={`${positionClasses} bg-white border border-stone-100 shadow-xl rounded-full p-1.5 flex gap-1 items-center animate-in fade-in zoom-in-95 duration-200 min-w-max`}>
                    {REACTIONS.map(emoji => (
                        <button
                            key={emoji}
                            onClick={() => {
                                onSelect(emoji);
                                setIsOpen(false);
                            }}
                            className={`w-8 h-8 flex items-center justify-center text-lg hover:scale-125 transition-transform rounded-full hover:bg-stone-50 ${currentReactions.includes(emoji) ? 'bg-stone-100' : ''
                                }`}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

interface ReactionListProps {
    reactions?: string[];
    onToggle: (emoji: string) => void;
    className?: string;
}

export const ReactionList: React.FC<ReactionListProps> = ({ reactions = [], onToggle, className = "" }) => {
    if (!reactions || reactions.length === 0) return null;

    // Group reactions by type
    const counts: Record<string, number> = {};
    reactions.forEach(r => {
        counts[r] = (counts[r] || 0) + 1;
    });

    return (
        <div className={`flex flex-wrap gap-1.5 ${className}`}>
            {Object.entries(counts).map(([emoji, count]) => (
                <button
                    key={emoji}
                    onClick={() => onToggle(emoji)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-stone-50 border border-stone-200 rounded-full text-xs hover:bg-stone-100 transition-colors cursor-pointer group select-none"
                    title="Remove reaction"
                >
                    <span className="text-sm group-hover:scale-110 transition-transform block">{emoji}</span>
                    {count > 1 && <span className="font-bold text-stone-500">{count}</span>}
                </button>
            ))}
        </div>
    );
};
