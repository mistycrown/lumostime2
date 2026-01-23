/**
 * @file FocusScoreSelector.tsx
 * @input value (number), onChange
 * @output Focus Score Input UI (1-5 Lightning Bolts)
 * @pos Component (Input)
 * @description A 5-point rating selector for logging focus intensity.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React from 'react';
import { Zap } from 'lucide-react';

interface FocusScoreSelectorProps {
    value?: number;
    onChange: (score: number | undefined) => void;
}

export const FocusScoreSelector: React.FC<FocusScoreSelectorProps> = ({ value, onChange }) => {
    return (
        <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-widest px-1">Focus Score</span>
            <div className="flex items-center justify-between px-6 pt-[10px]">
                {[1, 2, 3, 4, 5].map((score) => (
                    <button
                        key={score}
                        onClick={() => onChange(score === value ? undefined : score)} // Allow toggle off if clicking same
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border ${(value || 0) >= score
                            ? 'bg-transparent border-stone-300 text-[#2F4F4F] scale-110' // Selected: Outline, Dark Icon
                            : 'bg-transparent border-stone-100 text-stone-200 hover:border-stone-200' // Unselected: Faint
                            }`}
                        title={`Focus Level ${score}`}
                    >
                        <Zap size={18} fill={(value || 0) >= score ? "currentColor" : "none"} />
                    </button>
                ))}
            </div>
        </div>
    );
};
