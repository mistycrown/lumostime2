/**
 * @file FocusScoreSelector.tsx
 * @input value (number), onChange
 * @output Focus Score Input UI (1-5 Lightning Bolts)
 * @pos Component (Input)
 * @description A 5-point rating selector for logging focus intensity. Supports keyboard navigation (1-5 keys, arrow keys).
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useEffect, useRef } from 'react';
import { Zap } from 'lucide-react';

interface FocusScoreSelectorProps {
    value?: number;
    onChange: (score: number | undefined) => void;
}

export const FocusScoreSelector: React.FC<FocusScoreSelectorProps> = ({ value, onChange }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Number keys 1-5
            if (e.key >= '1' && e.key <= '5') {
                const score = parseInt(e.key);
                onChange(score === value ? undefined : score);
                e.preventDefault();
            }
            // Arrow keys
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                const newScore = Math.max(1, (value || 1) - 1);
                onChange(newScore);
                e.preventDefault();
            }
            else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                const newScore = Math.min(5, (value || 0) + 1);
                onChange(newScore);
                e.preventDefault();
            }
            // Backspace/Delete to clear
            else if (e.key === 'Backspace' || e.key === 'Delete') {
                onChange(undefined);
                e.preventDefault();
            }
        };

        const container = containerRef.current;
        if (container) {
            container.addEventListener('keydown', handleKeyDown);
            return () => container.removeEventListener('keydown', handleKeyDown);
        }
    }, [value, onChange]);

    return (
        <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-widest px-1">Focus Score</span>
            <div 
                ref={containerRef}
                className="flex items-center justify-between px-6 pt-[10px]"
                tabIndex={0}
                role="radiogroup"
                aria-label="Focus Score"
            >
                {[1, 2, 3, 4, 5].map((score) => (
                    <button
                        key={score}
                        onClick={() => onChange(score === value ? undefined : score)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${(value || 0) >= score
                            ? 'btn-template-filled scale-110'
                            : 'bg-transparent border border-stone-100 text-stone-200 hover:border-stone-200'
                            }`}
                        title={`Focus Level ${score} (Press ${score})`}
                        role="radio"
                        aria-checked={value === score}
                    >
                        <Zap size={18} fill={(value || 0) >= score ? "currentColor" : "none"} />
                    </button>
                ))}
            </div>
        </div>
    );
};
