import React, { useState, useRef, useEffect } from 'react';
import { Smile, Plus } from 'lucide-react';
import confetti from 'canvas-confetti';

// Updated emoji list for different effects
export const REACTIONS = ['🎉', '❤️', '⭐', '🔥', '❄️', '🚀'];

interface ReactionPickerProps {
    onSelect: (emoji: string) => void;
    currentReactions?: string[];
    align?: 'left' | 'right' | 'center' | 'screen-center' | 'inline-slide' | 'inline-slide-left';
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

    // Determine layout mode based on align prop
    const isInlineSlide = align === 'inline-slide';
    const isInlineSlideLeft = align === 'inline-slide-left';

    // Popup positioning classes
    let popupClasses = "absolute top-8 z-50 animate-in fade-in zoom-in-95 duration-200 bg-white border border-stone-100 shadow-xl rounded-full p-1.5 flex gap-0.5 items-center min-w-max";
    if (align === 'right') {
        popupClasses += " right-0";
    } else if (align === 'center') {
        popupClasses += " left-1/2 -translate-x-1/2";
    } else if (align === 'screen-center') {
        popupClasses = "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] shadow-2xl origin-center bg-white/90 backdrop-blur-sm border-stone-200 p-1.5 rounded-full flex gap-1 items-center";
    } else {
        popupClasses += " left-0";
    }

    const triggerConfetti = (emoji: string, rect: DOMRect) => {
        // Normalized coordinates (0-1)
        const x = (rect.left + rect.width / 2) / window.innerWidth;
        const y = (rect.top + rect.height / 2) / window.innerHeight;

        const origin = { x, y };

        switch (emoji) {
            case '🎉': // Realistic Look (Mixed bursts)
                const count = 100; // Reduced from 200
                const defaults = { origin, zIndex: 9999 };

                const fire = (particleRatio: number, opts: any) => {
                    confetti({
                        ...defaults,
                        ...opts,
                        particleCount: Math.floor(count * particleRatio)
                    });
                };

                fire(0.25, { spread: 26, startVelocity: 55 });
                fire(0.2, { spread: 60 });
                fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
                fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
                fire(0.1, { spread: 120, startVelocity: 45 });
                break;

            case '❤️': // Hearts (Custom Shape for Coloring)
                const heartPath = 'M167 72c19,-38 37,-56 75,-56 42,0 76,33 76,75 0,76 -76,151 -151,227 -76,-76 -151,-151 -151,-227 0,-42 33,-75 75,-75 38,0 57,18 76,56z';
                const heart = confetti.shapeFromPath({ path: heartPath });
                confetti({
                    origin,
                    particleCount: 15,
                    spread: 60,
                    startVelocity: 30,
                    scalar: 2,
                    shapes: [heart],
                    colors: ['#ffffff', '#ffc0cb', '#ff69b4', '#ff1493', '#ff0000'],
                    zIndex: 9999
                });
                break;

            case '⭐': // Stars (Star Shape)
                confetti({
                    origin,
                    spread: 360,
                    ticks: 80,
                    gravity: 0,
                    decay: 0.96,
                    startVelocity: 20,
                    shapes: ['star'],
                    colors: ['#FFE400', '#FFBD00', '#E89400', '#FFCA6C', '#FDFFB8'],
                    zIndex: 9999,
                    particleCount: 30,
                    scalar: 1.2
                });
                // Secondary burst
                confetti({
                    origin,
                    spread: 360,
                    ticks: 60,
                    gravity: 0,
                    decay: 0.96,
                    startVelocity: 20,
                    shapes: ['circle'],
                    colors: ['#FFE400', '#FFBD00', '#E89400', '#FFCA6C', '#FDFFB8'],
                    zIndex: 9999,
                    particleCount: 10,
                    scalar: 0.75,
                    flat: true
                });
                break;

            case '🔥': // Fire (Directional + Colors)
                confetti({
                    origin,
                    particleCount: 50,
                    spread: 30,
                    startVelocity: 40,
                    gravity: 0.8,
                    ticks: 60,
                    colors: ['#ff0000', '#ff4500', '#ffa500', '#ffff00'],
                    zIndex: 9999,
                    drift: 0,
                    scalar: 1.1
                });
                break;

            case '❄️': // Snow (Gentle falling across screen)
                const duration = 5 * 1000;
                const animationEnd = Date.now() + duration;
                let skew = 1;
                const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

                (function frame() {
                    const timeLeft = animationEnd - Date.now();
                    const ticks = Math.max(200, 500 * (timeLeft / duration));
                    skew = Math.max(0.8, skew - 0.001);

                    confetti({
                        particleCount: 1,
                        startVelocity: 0,
                        ticks: ticks,
                        origin: {
                            x: Math.random(),
                            y: (Math.random() * skew) - 0.2
                        },
                        colors: ['#ffffff', '#87CEEB', '#00BFFF', '#1E90FF'],
                        shapes: ['circle'],
                        gravity: randomInRange(0.4, 0.6),
                        scalar: randomInRange(0.4, 1),
                        drift: randomInRange(-0.4, 0.4),
                        disableForReducedMotion: true,
                        zIndex: 9999
                    });

                    if (timeLeft > 0) {
                        requestAnimationFrame(frame);
                    }
                }());
                break;

            case '🚀': // Rocket (School Pride Style)
                const end = Date.now() + (2 * 1000);
                const colors = ['#bb0000', '#ffffff'];
                (function frame() {
                    confetti({
                        particleCount: 2,
                        angle: 60,
                        spread: 55,
                        origin: { x: 0 },
                        colors: colors,
                        zIndex: 9999
                    });
                    confetti({
                        particleCount: 2,
                        angle: 120,
                        spread: 55,
                        origin: { x: 1 },
                        colors: colors,
                        zIndex: 9999
                    });

                    if (Date.now() < end) {
                        requestAnimationFrame(frame);
                    }
                }());
                break;

            default:
                const genericShape = confetti.shapeFromText ? confetti.shapeFromText({ text: emoji, scalar: 2 }) : 'circle';
                confetti({
                    origin,
                    particleCount: 20,
                    spread: 50,
                    startVelocity: 25,
                    shapes: [genericShape],
                    zIndex: 9999
                });
        }
    };

    const renderButtons = () => (
        <>
            {REACTIONS.map(emoji => (
                <button
                    key={emoji}
                    onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        triggerConfetti(emoji, rect);
                        onSelect(emoji);
                        setIsOpen(false);
                    }}
                    className="w-7 h-7 flex-shrink-0 flex items-center justify-center text-base hover:scale-125 transition-transform rounded-full hover:bg-stone-50"
                >
                    {emoji}
                </button>
            ))}
        </>
    );

    return (
        <div className={`relative inline-flex items-center ${isInlineSlide || isInlineSlideLeft ? 'align-middle' : ''}`} ref={containerRef}>

            {/* Inline Slide Left Mode */}
            {isInlineSlideLeft && (
                <div
                    className={`
                        flex items-center gap-0.5 overflow-hidden transition-all duration-300 ease-out origin-right flex-row-reverse
                        ${isOpen ? 'w-auto opacity-100 mr-1.5' : 'w-0 opacity-0'}
                    `}
                >
                    <div className="flex items-center gap-0.5">
                        {renderButtons()}
                    </div>
                </div>
            )}

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors flex items-center justify-center ${isOpen && (isInlineSlide || isInlineSlideLeft) ? 'bg-stone-100 text-stone-600' : ''}`}
                title="Add Reaction"
            >
                <Smile size={16} />
            </button>

            {/* Inline Slide Mode (Right) */}
            {isInlineSlide && (
                <div
                    className={`
                        flex items-center gap-0.5 overflow-hidden transition-all duration-300 ease-out origin-left
                        ${isOpen ? 'w-auto opacity-100 ml-1.5' : 'w-0 opacity-0'}
                    `}
                >
                    {renderButtons()}
                </div>
            )}

            {/* Popup Mode (Fallback) */}
            {!isInlineSlide && !isInlineSlideLeft && isOpen && (
                <div className={popupClasses}>
                    {REACTIONS.map(emoji => (
                        <button
                            key={emoji}
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                triggerConfetti(emoji, rect);
                                onSelect(emoji);
                                setIsOpen(false);
                            }}
                            className={`w-7 h-7 flex items-center justify-center text-base hover:scale-125 transition-transform rounded-full hover:bg-stone-50 ${currentReactions.includes(emoji) ? 'bg-stone-100' : ''}`}
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
