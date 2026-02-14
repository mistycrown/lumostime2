/**
 * @file ReviewHubView.tsx
 * @input Daily/Weekly/Monthly Review Lists
 * @output Navigation to Specific Review
 * @pos View (Main Tab)
 * @description The central dashboard for accessing past reviews. Displays summaries and entry points for Daily, Weekly, and Monthly reviews, often using carousels or lists.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { DailyReview, WeeklyReview, MonthlyReview, Log } from '../types';
import { parseNarrative } from '../utils/narrativeUtils';


interface ReviewHubViewProps {
    dailyReviews: DailyReview[];
    weeklyReviews: WeeklyReview[];
    monthlyReviews: MonthlyReview[];
    logs: Log[];
    onOpenDailyReview: (date: Date) => void;
    onOpenWeeklyReview: (start: Date, end: Date) => void;
    onOpenMonthlyReview: (start: Date, end: Date) => void;
}

export const ReviewHubView: React.FC<ReviewHubViewProps> = ({
    dailyReviews,
    weeklyReviews,
    monthlyReviews,
    logs,
    onOpenDailyReview,
    onOpenWeeklyReview,
    onOpenMonthlyReview,
}) => {
    // 滚动状态和容器ref
    const [isScrolled, setIsScrolled] = React.useState(false);
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);

    // 检测是否使用默认主题
    const getCardShadow = () => {
        const accentColor = getComputedStyle(document.documentElement)
            .getPropertyValue('--accent-color').trim();
        const isDefaultTheme = accentColor === '#1c1917' || accentColor === 'rgb(28, 25, 23)';
        
        if (isDefaultTheme) {
            // 默认黑色主题：使用更小、更淡的阴影
            return '0 2px 8px -1px rgba(0, 0, 0, 0.08), 0 4px 16px -2px rgba(0, 0, 0, 0.05)';
        } else {
            // 主题色：使用彩色光晕效果
            return '0 4px 16px -2px color-mix(in srgb, var(--progress-bar-fill) 12%, transparent), 0 12px 32px -4px color-mix(in srgb, var(--progress-bar-fill) 8%, transparent)';
        }
    };

    // 滚动监听:标题栏缩小效果
    React.useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const scrollTop = container.scrollTop;
            // 只要有任何滚动就触发收缩
            setIsScrolled(scrollTop > 0);
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, []);

    // --- Helpers ---

    // Get Week Number (ISO 8601: Week 1 is the week with the year's first Thursday)
    const getWeekNumber = (d: Date) => {
        // Copy date so we don't mutate the original
        const target = new Date(d.valueOf());
        const dayNum = (target.getDay() + 6) % 7; // Monday = 0, Sunday = 6
        target.setDate(target.getDate() - dayNum + 3); // Set to nearest Thursday
        const firstThursday = new Date(target.getFullYear(), 0, 4); // January 4th is always in week 1
        const firstThursdayDay = (firstThursday.getDay() + 6) % 7;
        firstThursday.setDate(firstThursday.getDate() - firstThursdayDay + 3); // Set to Thursday of week 1

        const weekDiff = (target.getTime() - firstThursday.getTime()) / 86400000;
        return 1 + Math.floor(weekDiff / 7);
    };

    // --- Data Mapping ---

    // 1. Monthly Data
    const sortedMonthlyReviews = useMemo(() => {
        return [...monthlyReviews].sort((a, b) => b.monthStartDate.localeCompare(a.monthStartDate));
    }, [monthlyReviews]);

    // 2. Weekly Data
    const sortedWeeklyReviews = useMemo(() => {
        return [...weeklyReviews].sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate));
    }, [weeklyReviews]);

    // 3. Daily Data
    const sortedDailyReviews = useMemo(() => {
        return [...dailyReviews].sort((a, b) => b.date.localeCompare(a.date));
    }, [dailyReviews]);

    // --- Render Helpers ---

    // Component: Section Title
    const SectionTitle = ({ title, onAdd, className = "mt-8" }: { title: string; onAdd?: () => void; className?: string }) => (
        <div className={`flex items-center mb-4 ${className}`}>
            <span className="text-xs font-bold text-stone-500 uppercase tracking-[2px]">{title}</span>
            <div className="flex-1 h-px bg-stone-200 ml-3" />
            {onAdd && (
                <button
                    onClick={onAdd}
                    className="ml-3 p-1.5 rounded-full text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                >
                    <LucideIcons.Plus size={16} />
                </button>
            )}
        </div>
    );

    // Date Helpers for "Add Current"
    const handleAddCurrentMonthly = () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        onOpenMonthlyReview(start, end);
    };

    const handleAddCurrentWeekly = () => {
        const now = new Date();
        const start = new Date(now);
        const day = start.getDay(); // 0 is Sunday
        // Assuming Monday start (default false in App.tsx)
        // If today is Sunday (0), and we want Monday start, we go back 6 days.
        // If today is Monday (1), we go back 0 days.
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);

        onOpenWeeklyReview(start, end);
    };

    const handleAddCurrentDaily = () => {
        onOpenDailyReview(new Date());
    };

    // --- Infinite Scroll Logic ---
    const [visibleCount, setVisibleCount] = React.useState(10);
    const observerTarget = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting) {
                    setVisibleCount(prev => Math.min(prev + 10, sortedDailyReviews.length));
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
        };
    }, [sortedDailyReviews.length]);

    // Derived visible list
    const visibleDailyReviews = useMemo(() => {
        return sortedDailyReviews.slice(0, visibleCount);
    }, [sortedDailyReviews, visibleCount]);

    return (
        <div className="flex flex-col h-full bg-[#faf9f6] relative">
            {/* Sticky Header - 标题栏随滚动缩小 */}
            <header className={`sticky top-0 z-40 transition-all duration-300 pt-[env(safe-area-inset-top)] ${isScrolled
                ? 'bg-[#faf9f6]/90 backdrop-blur-md shadow-sm h-[calc(3rem+env(safe-area-inset-top))]'
                : 'bg-[#faf9f6]/80 backdrop-blur-sm h-[calc(3.5rem+env(safe-area-inset-top))]'
                }`}>
                <div className="max-w-xl mx-auto px-6 h-full flex items-center justify-center">
                    <h1 className={`font-serif text-stone-800 font-bold transition-all duration-300 ${isScrolled ? 'text-[16px]' : 'text-[18px]'
                        }`}>
                        Chronicle
                    </h1>
                </div>
            </header>

            {/* Scrollable Content Area */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto overflow-x-hidden pb-safe scrollbar-hide"
                id="chronicle-content"
            >
                <div className="md:max-w-xl md:mx-auto w-full px-5 pt-2 pb-20">

                    {/* Section 1: Monthly Insight (Carousel) */}
                    <SectionTitle title="Monthly Reviews" onAdd={handleAddCurrentMonthly} className="mt-1" />

                    {sortedMonthlyReviews.length === 0 ? (
                        <div className="p-6 text-center border bg-stone-50 rounded-lg text-stone-400 text-sm">
                            No monthly reviews yet.
                        </div>
                    ) : (
                        /* Scroll Container */
                        <div className="flex overflow-x-auto gap-4 pb-5 pt-2 -mr-5 pr-5 snap-x snap-mandatory scrollbar-hide">
                            {sortedMonthlyReviews.map((m) => {
                                const mDate = new Date(m.monthStartDate);
                                const monthName = mDate.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
                                const isCurrentMonth = new Date().getMonth() === mDate.getMonth() && new Date().getFullYear() === mDate.getFullYear();

                                // 优先使用手动总结，如果没有才使用 AI 叙事
                                let displayTitle: string;
                                let displayContent: string;

                                if (m.summary && m.summary.trim()) {
                                    // 有手动总结：直接使用手动总结作为内容
                                    // 标题：如果手动总结没有标题，显示"暂无叙事标题"
                                    displayTitle = '暂无叙事标题';
                                    displayContent = m.summary;
                                } else if (m.narrative && m.narrative.trim()) {
                                    // 没有手动总结但有 AI 叙事：使用 AI 叙事的标题和引用
                                    const { title, content: body } = parseNarrative(m.narrative, '暂无叙事标题');
                                    displayTitle = title;
                                    displayContent = body;
                                } else {
                                    // 两者都没有
                                    displayTitle = '暂无叙事标题';
                                    displayContent = '...';
                                }

                                return (
                                    <article
                                        key={m.id}
                                        onClick={() => onOpenMonthlyReview(new Date(m.monthStartDate), new Date(m.monthEndDate))}
                                        className="flex-none w-[90%] snap-center bg-white/80 backdrop-blur-md border border-stone-100 rounded-lg p-6 relative active:scale-[0.98] transition-transform"
                                        style={{
                                            boxShadow: getCardShadow()
                                        }}
                                    >
                                        <div className="mb-4">
                                            <div className="flex justify-between items-center mb-1">
                                                <h3 className="font-serif text-2xl font-extrabold text-stone-900 m-0">{monthName}</h3>
                                                <div 
                                                    className={`px-2 py-1 text-[10px] font-bold uppercase rounded flex whitespace-nowrap ${
                                                        isCurrentMonth ? 'btn-template-filled' : 'btn-template-outlined'
                                                    }`}
                                                >
                                                    {isCurrentMonth ? 'CURRENT' : 'PAST'}
                                                </div>
                                            </div>
                                            <span className="text-[11px] uppercase text-stone-500 block tracking-wider">{displayTitle.slice(0, 30)}...</span>
                                        </div>

                                        <div className="text-sm text-stone-600 leading-relaxed border-l-2 border-stone-200 pl-3 mb-4 line-clamp-3">
                                            {displayContent}
                                        </div>

                                        <div className="flex justify-between text-[10px] text-stone-500 border-t border-stone-100 pt-3">
                                            <span>{mDate.getFullYear()}/{(mDate.getMonth() + 1).toString().padStart(2, '0')}</span>
                                            <span>Tap to read full report -&gt;</span>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}

                    {/* Section 2: Weekly Focus (2x2 Grid Scroll) */}
                    <SectionTitle title="Weekly History" onAdd={handleAddCurrentWeekly} />

                    {sortedWeeklyReviews.length === 0 ? (
                        <div className="p-6 text-center border bg-stone-50 rounded-lg text-stone-400 text-sm">
                            No weekly reviews yet.
                        </div>
                    ) : (
                        /* Weekly Grid Scroll Container */
                        <div className="flex overflow-x-auto gap-3 -mr-5 pr-5 pb-5 pt-2 snap-x snap-mandatory scrollbar-hide">
                            {sortedWeeklyReviews.map((w, idx) => {
                                const startDate = new Date(w.weekStartDate);
                                const endDate = new Date(w.weekEndDate);

                                // Use a date in the middle of the week (e.g. Wednesday/Thursday) to determine Week Number
                                // This handles cases where startDate might be Sunday (technically end of previous ISO week)
                                // but conceptually represents the start of the new week in user data.
                                // Adding 3 days (approx 72h) gets us safely into the week.
                                const midWeekDate = new Date(startDate.getTime() + 3 * 24 * 60 * 60 * 1000);
                                const weekNum = getWeekNumber(midWeekDate);

                                // 优先使用手动总结，如果没有才使用 AI 叙事
                                let displayTitle: string;

                                if (w.summary && w.summary.trim()) {
                                    // 有手动总结：显示"一句话总结"
                                    displayTitle = w.summary;
                                } else if (w.narrative && w.narrative.trim()) {
                                    // 没有手动总结但有 AI 叙事：使用 AI 叙事的标题
                                    const { title } = parseNarrative(w.narrative, '暂无标题');
                                    displayTitle = title;
                                } else {
                                    // 两者都没有
                                    displayTitle = '暂无标题';
                                }

                                // Format: 2025/12/08-12/14
                                const dateRangeStr = `${startDate.getFullYear()}/${(startDate.getMonth() + 1).toString().padStart(2, '0')}/${startDate.getDate().toString().padStart(2, '0')}-${(endDate.getMonth() + 1).toString().padStart(2, '0')}/${endDate.getDate().toString().padStart(2, '0')}`;

                                // Check if current week - 使用日期字符串比较避免时区问题
                                const now = new Date();
                                const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                                const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
                                const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
                                const isCurrentWeek = nowDateOnly >= startDateOnly && nowDateOnly <= endDateOnly;

                                return (
                                    <div
                                        key={w.id}
                                        onClick={() => onOpenWeeklyReview(new Date(w.weekStartDate), new Date(w.weekEndDate))}
                                        className="snap-start flex-none w-[calc(50%-6px)] rounded-2xl p-4 h-[140px] flex flex-col justify-between relative overflow-hidden border border-stone-100 bg-white/80 backdrop-blur-md text-stone-900 transition-all active:scale-95"
                                        style={{
                                            boxShadow: getCardShadow()
                                        }}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-serif text-lg font-bold">W{weekNum}</span>
                                            <span 
                                                className={`text-[9px] uppercase px-1 py-0.5 rounded ${
                                                    isCurrentWeek ? 'btn-template-filled' : 'btn-template-outlined'
                                                }`}
                                            >
                                                {isCurrentWeek ? 'CURRENT' : 'PAST'}
                                            </span>
                                        </div>

                                        {/* 溢出处理：最多显示两行，超过30字自动溢出 */}
                                        <div className="font-serif text-[13px] leading-snug font-semibold line-clamp-2 overflow-hidden">
                                            {displayTitle}
                                        </div>

                                        <div className="flex gap-2 text-[9px] opacity-80 font-mono">
                                            <span>{dateRangeStr}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Section 3: Daily Stream */}
                    <SectionTitle title="Latest Entries" onAdd={handleAddCurrentDaily} />

                    {sortedDailyReviews.length === 0 ? (
                        <div className="p-6 text-center border bg-stone-50 rounded-lg text-stone-400 text-sm">
                            No daily reviews yet. Start by reviewing today!
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {visibleDailyReviews.map((d, idx) => {
                                const dateObj = new Date(d.date);
                                const dayStr = dateObj.getDate().toString();
                                const monthStr = dateObj.toLocaleDateString('en-US', { month: 'short' });
                                const weekdayStr = dateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(); // Short weekday (THU)

                                // 优先使用手动总结，如果没有才使用 AI 叙事
                                let displayTitle: string;
                                let displayContent: string;

                                if (d.summary && d.summary.trim()) {
                                    // 有手动总结：标题为日期，内容为手动总结
                                    displayTitle = d.date; // 例如："2026-02-16"
                                    displayContent = d.summary;
                                } else if (d.narrative && d.narrative.trim()) {
                                    // 没有手动总结但有 AI 叙事：使用 AI 叙事的标题和引用
                                    const { title, content: body } = parseNarrative(d.narrative, '暂无标题');
                                    displayTitle = title;
                                    displayContent = body;
                                } else {
                                    // 两者都没有
                                    displayTitle = '暂无标题';
                                    displayContent = '...';
                                }

                                return (
                                    <div key={d.id} className="flex gap-4 pb-4 border-b border-stone-100 last:border-0" onClick={() => onOpenDailyReview(new Date(d.date))}>
                                        {/* Date Column */}
                                        <div className="flex flex-col items-center min-w-[40px] pt-1">
                                            <span className="font-serif text-2xl font-bold leading-none text-stone-900">{dayStr}</span>
                                            <span className="text-[10px] font-semibold uppercase text-stone-500 mt-1">{monthStr}</span>
                                        </div>

                                        {/* Content Card */}
                                        <div 
                                            className="flex-1 min-w-0 rounded-lg p-4 bg-white/80 backdrop-blur-md border border-stone-100"
                                            style={{
                                                boxShadow: getCardShadow()
                                            }}
                                        >
                                            <div className="flex justify-between items-start mb-1.5 gap-2">
                                                <div className="font-serif text-[17px] font-bold leading-snug text-stone-900 flex-1 min-w-0 truncate">
                                                    {displayTitle}
                                                </div>
                                                <span 
                                                    className="btn-template-filled text-[10px] font-bold uppercase inline-block px-1.5 py-0.5 rounded-sm shrink-0 whitespace-nowrap"
                                                >
                                                    {weekdayStr}
                                                </span>
                                            </div>
                                            <div className="text-[13px] text-stone-500 line-clamp-2 leading-relaxed">
                                                {displayContent}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {/* Intersection Observer Target */}
                            {visibleCount < sortedDailyReviews.length && (
                                <div ref={observerTarget} className="h-10 w-full flex items-center justify-center">
                                    <span className="loading loading-spinner text-stone-300">Loading...</span>
                                </div>
                            )}
                        </div>
                    )}

                    {visibleCount >= sortedDailyReviews.length && sortedDailyReviews.length > 0 && (
                        <div className="text-center mt-10 text-stone-300 text-xs">
                            End of Archive
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
