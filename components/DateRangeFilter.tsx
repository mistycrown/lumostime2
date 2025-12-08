import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export type RangeType = 'Week' | 'Month' | 'Year' | 'All';

interface DateRangeFilterProps {
    rangeType: RangeType;
    date: Date;
    onRangeChange: (range: RangeType) => void;
    onDateChange: (date: Date) => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
    rangeType,
    date,
    onRangeChange,
    onDateChange
}) => {
    // Helper to format date range string
    const getRangeString = () => {
        if (rangeType === 'All') return 'All Time';

        const y = date.getFullYear();
        const m = date.getMonth() + 1;
        const d = date.getDate();

        if (rangeType === 'Year') return `${y}`;
        if (rangeType === 'Month') return `${y}/${String(m).padStart(2, '0')}`;

        if (rangeType === 'Week') {
            // Calculate start/end of week (assuming Mon start)
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
            const start = new Date(date);
            start.setDate(diff);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);

            return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`;
        }
        return '';
    };

    const handlePrev = () => {
        const newDate = new Date(date);
        if (rangeType === 'Week') newDate.setDate(date.getDate() - 7);
        if (rangeType === 'Month') newDate.setMonth(date.getMonth() - 1);
        if (rangeType === 'Year') newDate.setFullYear(date.getFullYear() - 1);
        onDateChange(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(date);
        if (rangeType === 'Week') newDate.setDate(date.getDate() + 7);
        if (rangeType === 'Month') newDate.setMonth(date.getMonth() + 1);
        if (rangeType === 'Year') newDate.setFullYear(date.getFullYear() + 1);
        onDateChange(newDate);
    };

    return (
        <div className="flex items-center justify-between mb-4">
            {/* Tabs */}
            <div className="flex bg-stone-100 p-0.5 rounded-lg">
                {(['Week', 'Month', 'Year', 'All'] as RangeType[]).map(r => (
                    <button
                        key={r}
                        onClick={() => onRangeChange(r)}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${rangeType === r
                            ? 'bg-white text-stone-900 shadow-sm'
                            : 'text-stone-400 hover:text-stone-600'
                            }`}
                    >
                        {r === 'Week' ? '周' : r === 'Month' ? '月' : r === 'Year' ? '年' : '总'}
                    </button>
                ))}
            </div>

            {/* Navigation Controls (Hidden if 'All') */}
            {rangeType !== 'All' && (
                <div className="flex items-center gap-1 bg-stone-50 p-0.5 rounded-lg border border-stone-100">
                    <button
                        onClick={handlePrev}
                        className="p-0.5 hover:bg-stone-200 rounded-md text-stone-400 hover:text-stone-600 transition-colors"
                    >
                        <ChevronLeft size={14} />
                    </button>
                    <span className="font-mono font-bold text-stone-700 text-[10px] min-w-[60px] text-center">
                        {getRangeString()}
                    </span>
                    <button
                        onClick={handleNext}
                        className="p-0.5 hover:bg-stone-200 rounded-md text-stone-400 hover:text-stone-600 transition-colors"
                    >
                        <ChevronRight size={14} />
                    </button>
                </div>
            )}
        </div>
    );
};
