import React from 'react';

interface MatrixItem {
    id: string;
    label: string;
    value: number; // Duration in seconds
    color?: string; // Hex or Tailwind class (requires mapping)
    icon?: React.ReactNode;
}

interface MatrixAnalysisChartProps {
    items: MatrixItem[];
    totalDuration: number;
    title?: string;
}

export const MatrixAnalysisChart: React.FC<MatrixAnalysisChartProps> = ({ items, totalDuration, title }) => {
    // Sort by value desc
    const sortedItems = [...items].sort((a, b) => b.value - a.value);

    // Show top 10?
    const displayItems = sortedItems;

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    return (
        <div className="space-y-5">
            {title && <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest">{title}</h3>}

            <div className="space-y-4">
                {displayItems.map(item => {
                    const percentage = totalDuration > 0 ? (item.value / totalDuration) * 100 : 0;
                    return (
                        <div key={item.id} className="group">
                            <div className="flex items-end justify-between text-sm mb-1.5">
                                <div className="flex items-center gap-2">
                                    {item.icon && <span className="text-lg leading-none">{item.icon}</span>}
                                    <span className="font-bold text-stone-700">{item.label}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-stone-400 font-medium text-xs">{formatDuration(item.value)}</span>
                                    <span className="text-stone-900 font-bold font-mono text-sm min-w-[3rem] text-right">{percentage.toFixed(1)}%</span>
                                </div>
                            </div>
                            <div className="h-2.5 w-full bg-stone-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                                    style={{
                                        width: `${percentage}%`,
                                        backgroundColor: item.color || '#57534e' // stone-600
                                    }}
                                >
                                    <div className="absolute inset-0 bg-white/20 skew-x-[-20deg] translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {displayItems.length === 0 && (
                <div className="text-center py-12 text-stone-300 italic text-sm border-2 border-dashed border-stone-100 rounded-2xl">
                    No data available for analysis
                </div>
            )}
        </div>
    );
};
