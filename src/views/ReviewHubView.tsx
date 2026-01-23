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

    // Parse Narrative: Extract Title (First Line) and Body
    const parseNarrative = (narrative: string | undefined): { title: string; body: string } => {
        if (!narrative) return { title: '暂无叙事标题', body: '...' };

        // Remove Markdown headers if any (for title extraction mainly)
        const cleanNarrative = narrative.replace(/^#+\s*/, '').trim();
        const lines = cleanNarrative.split('\n');

        // 1. Get Title (First Line)
        let title = lines[0].trim();

        // 2. Try to find blockquote content for Body
        // Look for lines starting with >
        // We match all blockquotes and take the last one, or combine them?
        // User said "read the quote at the end".
        const blockquoteMatch = narrative.match(/>\s*([^>]+)$/m) || narrative.match(/>\s*(.+)/g);

        let body = '';

        if (blockquoteMatch) {
            // If regex matched last one specifically or global matches
            // Let's filter for the last block of quotes
            const quotes = narrative.split('\n').filter(line => line.trim().startsWith('>'));
            if (quotes.length > 0) {
                // Join them and remove >
                body = quotes[quotes.length - 1].replace(/^>\s*/, '').trim();
                // If there are multiple lines in the last quote block? 
                // Simple approach: grab the last line starting with > or try to grab the whole block.
                // Better regex for multi-line blockquote at end:
            }
        }

        // Improved Blockquote Extraction:
        // Find the last occurrence of a blockquote section
        const quoteRegex = /(?:^|\n)>\s*(.*?)(?=(?:\n\n|$))/gs;
        const matches = [...narrative.matchAll(quoteRegex)];

        if (matches.length > 0) {
            // Use the content of the last blockquote found
            body = matches[matches.length - 1][1].replace(/\n>\s*/g, '\n').trim();
        }

        // 3. Fallback to normal body (rest of text) if no quote found
        if (!body) {
            body = lines.slice(1).join('\n').trim();
        }

        return { title, body: body || 'Tap to view details...' };
    };

    // Deterministic Style Generator based on Date/ID
    const getDailyStyle = (dateStr: string) => {
        const styles = ['stoic', 'director', 'game', 'simple'];
        let hash = 0;
        for (let i = 0; i < dateStr.length; i++) {
            hash = dateStr.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % styles.length;
        return styles[index];
    };

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
            <header className={`sticky top-0 z-40 transition-all duration-300 ${isScrolled
                ? 'bg-[#faf9f6]/90 backdrop-blur-md shadow-sm py-2'
                : 'bg-transparent py-4'
                }`}>
                <div className="max-w-xl mx-auto px-6">
                    <div className="flex flex-col items-center">
                        <h1 className={`font-serif text-stone-800 font-bold transition-all duration-300 ${isScrolled ? 'text-[16px]' : 'text-[18px] mb-1'
                            }`}>
                            Chronicle
                        </h1>
                    </div>
                </div>
            </header>

            {/* Scrollable Content Area */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto overflow-x-hidden pb-safe scrollbar-hide"
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
                        <div className="flex overflow-x-auto gap-4 pb-5 -mr-5 pr-5 snap-x snap-mandatory scrollbar-hide">
                            {sortedMonthlyReviews.map((m) => {
                                const mDate = new Date(m.monthStartDate);
                                const monthName = mDate.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
                                const { title, body } = parseNarrative(m.narrative);
                                const isCurrentMonth = new Date().getMonth() === mDate.getMonth() && new Date().getFullYear() === mDate.getFullYear();

                                return (
                                    <article
                                        key={m.id}
                                        onClick={() => onOpenMonthlyReview(new Date(m.monthStartDate), new Date(m.monthEndDate))}
                                        className="flex-none w-[90%] snap-center bg-white border border-stone-900 border-t-[4px] border-t-stone-900 rounded-lg p-6 relative shadow-[2px_2px_10px_rgba(0,0,0,0.05)] active:scale-[0.98] transition-transform"
                                    >
                                        <div className="mb-4">
                                            <div className="flex justify-between items-center mb-1">
                                                <h3 className="font-serif text-2xl font-extrabold text-stone-900 m-0">{monthName}</h3>
                                                <div className={`border border-stone-900 px-2 py-1 text-[10px] font-bold uppercase rounded flex whitespace-nowrap ${!isCurrentMonth ? 'bg-stone-900 text-white' : 'bg-transparent text-stone-900'}`}>
                                                    {isCurrentMonth ? 'CURRENT' : 'PAST'}
                                                </div>
                                            </div>
                                            <span className="text-[11px] uppercase text-stone-500 block tracking-wider">{title.slice(0, 30)}...</span>
                                        </div>

                                        <div className="text-sm text-stone-600 leading-relaxed border-l-2 border-stone-200 pl-3 mb-4 line-clamp-3">
                                            {body}
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
                        <div className="flex overflow-x-auto gap-3 -mr-5 pr-5 pb-5 snap-x snap-mandatory scrollbar-hide">
                            {sortedWeeklyReviews.map((w, idx) => {
                                const startDate = new Date(w.weekStartDate);
                                const endDate = new Date(w.weekEndDate);

                                // Use a date in the middle of the week (e.g. Wednesday/Thursday) to determine Week Number
                                // This handles cases where startDate might be Sunday (technically end of previous ISO week)
                                // but conceptually represents the start of the new week in user data.
                                // Adding 3 days (approx 72h) gets us safely into the week.
                                const midWeekDate = new Date(startDate.getTime() + 3 * 24 * 60 * 60 * 1000);
                                const weekNum = getWeekNumber(midWeekDate);

                                const { title } = parseNarrative(w.narrative);
                                // Alternating dark/light style roughly based on index
                                const isDark = idx % 2 === 0;

                                // Format: 2025/12/08-12/14
                                const dateRangeStr = `${startDate.getFullYear()}/${(startDate.getMonth() + 1).toString().padStart(2, '0')}/${startDate.getDate().toString().padStart(2, '0')}-${(endDate.getMonth() + 1).toString().padStart(2, '0')}/${endDate.getDate().toString().padStart(2, '0')}`;

                                // Check if current week
                                const now = new Date();
                                // Normalize to start of days for comparison?
                                // Simple check: is now between start and end?
                                const isCurrentWeek = now.getTime() >= startDate.getTime() && now.getTime() <= endDate.getTime();

                                return (
                                    <div
                                        key={w.id}
                                        onClick={() => onOpenWeeklyReview(new Date(w.weekStartDate), new Date(w.weekEndDate))}
                                        className={`snap-start flex-none w-[calc(50%-6px)] rounded-2xl p-4 h-[140px] flex flex-col justify-between relative overflow-hidden border transition-all active:scale-95
                 ${isDark
                                                ? 'bg-stone-900 text-white border-stone-900'
                                                : 'bg-white text-stone-900 border-stone-200'}
               `}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-serif text-lg font-bold">W{weekNum}</span>
                                            <span className={`text-[9px] uppercase opacity-60 border px-1 py-0.5 rounded ${isDark ? 'border-white' : 'border-stone-900'}`}>
                                                {isCurrentWeek ? 'CURRENT' : 'PAST'}
                                            </span>
                                        </div>

                                        <div className="font-serif text-[13px] leading-snug font-semibold line-clamp-3">
                                            {title}
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
                                const { title, body } = parseNarrative(d.narrative);
                                const dateObj = new Date(d.date);
                                const dayStr = dateObj.getDate().toString();
                                const monthStr = dateObj.toLocaleDateString('en-US', { month: 'short' });
                                const weekdayStr = dateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(); // Short weekday (THU)

                                const style = getDailyStyle(d.date);
                                let contentClass = "bg-white border border-stone-100 shadow-sm";
                                let tagClass = "border border-stone-900 bg-white text-stone-900";

                                // Tag label now shows Weekday instead of Style Name
                                let tagLabel = weekdayStr;

                                if (style === 'stoic') {
                                    contentClass = "bg-white border-4 border-double border-stone-900";
                                } else if (style === 'director') {
                                    contentClass = "bg-white border-2 border-stone-900 shadow-[4px_4px_0_rgba(0,0,0,1)]";
                                    tagClass = "bg-stone-900 text-white border-stone-900";
                                } else if (style === 'game') {
                                    contentClass = "bg-white border-2 border-dashed border-stone-300 shadow-sm";
                                }

                                return (
                                    <div key={d.id} className="flex gap-4 pb-4 border-b border-stone-100 last:border-0" onClick={() => onOpenDailyReview(new Date(d.date))}>
                                        {/* Date Column */}
                                        <div className="flex flex-col items-center min-w-[40px] pt-1">
                                            <span className="font-serif text-2xl font-bold leading-none text-stone-900">{dayStr}</span>
                                            <span className="text-[10px] font-semibold uppercase text-stone-500 mt-1">{monthStr}</span>
                                        </div>

                                        {/* Content Card */}
                                        <div className={`flex-1 min-w-0 rounded-lg p-4 ${contentClass}`}>
                                            <div className="flex justify-between items-start mb-1.5 gap-2">
                                                <div className="font-serif text-[17px] font-bold leading-snug text-stone-900 flex-1 min-w-0 truncate">
                                                    {title}
                                                </div>
                                                <span className={`text-[10px] font-bold uppercase inline-block px-1.5 py-0.5 rounded-sm shrink-0 whitespace-nowrap ${tagClass}`}>
                                                    {tagLabel}
                                                </span>
                                            </div>
                                            <div className="text-[13px] text-stone-500 line-clamp-2 leading-relaxed">
                                                {body}
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
