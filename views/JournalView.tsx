/**
 * @file JournalView.tsx
 * @input Daily Reviews, Logs
 * @output Journal Entry Navigation
 * @pos View (Main Tab)
 * @description A journal-style view for daily entries, providing an alternative perspective to the ReviewHubView.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { DailyReview, Log, WeeklyReview, MonthlyReview } from '../types';
import { DiaryEntry, MOCK_ENTRIES, MONTHS, Comment } from './journalTypes';
import TimelineItem from '../components/TimelineItem';
import { Search, Menu, PenLine, ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal, Image as ImageIcon, AlignLeft, X, FilterX, AudioWaveform } from 'lucide-react';

import { useSettings } from '../contexts/SettingsContext';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { useData } from '../contexts/DataContext';
import { Comment as GlobalComment, Scope } from '../types';

interface JournalViewProps {
    dailyReviews: DailyReview[];
    weeklyReviews: WeeklyReview[];   // Add WeeklyReview
    monthlyReviews: MonthlyReview[]; // Add MonthlyReview
    logs: Log[];
    onOpenDailyReview: (date: Date) => void;
    todos: any[];  // TodoItem[]
    scopes: Scope[];
    onEditLog: (log: Log) => void;
    onOpenWeeklyReview: (start: Date, end: Date) => void;
    onOpenMonthlyReview: (start: Date, end: Date) => void;
}

export const JournalView: React.FC<JournalViewProps> = ({
    dailyReviews,
    weeklyReviews,
    monthlyReviews,
    logs,
    onOpenDailyReview,
    todos,
    scopes,
    onEditLog,
    onOpenWeeklyReview,
    onOpenMonthlyReview
}) => {
    const { categories } = useCategoryScope();
    const { setLogs } = useData();
    const { memoirFilterConfig } = useSettings();

    // Default to Today
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false); // 滚动状态

    // DEPRECATED LOCAL FILTERS:
    // const [isFilterOpen, setIsFilterOpen] = useState(false);
    // const [filterHasMedia, setFilterHasMedia] = useState(false);
    // const [filterMinLength, setFilterMinLength] = useState(0);

    const monthPickerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null); // 滚动容器ref

    // Close popups when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (monthPickerRef.current && !monthPickerRef.current.contains(event.target as Node)) {
                setIsMonthPickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 滚动监听:标题栏缩小效果
    useEffect(() => {
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

    // Transform and Filter entries
    const filteredEntries = useMemo(() => {
        const diaryEntries: DiaryEntry[] = [];

        // 1. Process Logs
        logs.forEach(log => {
            // Resolve Title
            let title = log.title;
            let content = log.note || '';

            // Get category and activity
            const cat = categories.find(c => c.id === log.categoryId);
            const act = cat?.activities.find(a => a.id === log.activityId);

            // Check for #Title# in content
            const titleMatch = content.match(/#([^#]+)#/);
            if (titleMatch) {
                title = titleMatch[1];
                // 移除备注中的#标题#字符串
                content = content.replace(/#[^#]+#/, '').trim();
            } else if (act) {
                title = act.name;
            } else if (!title || title === 'Unknown') {
                if (cat) title = cat.name;
            }

            // Get linked todo
            const linkedTodo = todos.find(t => t.id === log.linkedTodoId);
            // Get linked scopes
            const linkedScopes = log.scopeIds?.map(id => scopes.find(s => s.id === id)).filter(Boolean) as Scope[] || [];

            diaryEntries.push({
                id: log.id,
                type: 'normal',
                date: new Date(log.startTime).toISOString(),
                endDate: new Date(log.endTime).toISOString(),
                title: title,
                content: content,
                media: log.images?.map(img => ({ type: 'image', url: img })),
                comments: log.comments?.map(c => ({
                    id: c.id,
                    text: c.content,
                    createdAt: new Date(c.createdAt).toISOString(),
                    author: 'Me'
                })) || [],
                tags: cat && act ? [`${cat.icon} ${cat.name} / ${act.icon} ${act.name}`] : [title || 'Log'],
                activityId: log.activityId, // Added for filtering
                scopeIds: log.scopeIds,     // Added for filtering
                relatedTodos: linkedTodo ? [linkedTodo.title] : undefined,
                domains: linkedScopes.length > 0 ? linkedScopes.map(s => `${s.icon} ${s.name}`) : undefined
            });
        });

        // Helper to parse narrative
        const parseNarrative = (narrative: string, defaultTitle: string) => {
            let title = defaultTitle;
            let content = '...';

            if (narrative) {
                // Get Title (First Line)
                const cleanNarrative = narrative.replace(/^#+\s*/, '').trim();
                const lines = cleanNarrative.split('\n');
                title = lines[0].trim() || defaultTitle;

                // Get Content (Last Blockquote or truncated body)
                const quoteRegex = /(?:^|\n)>\s*(.*?)(?=(?:\n\n|$))/gs;
                const matches = [...narrative.matchAll(quoteRegex)];

                if (matches.length > 0) {
                    content = matches[matches.length - 1][1].replace(/\n>\s*/g, '\n').trim();
                } else {
                    const bodyText = lines.slice(1).join('\n').trim();
                    content = bodyText.length > 100 ? bodyText.slice(0, 100) + '...' : bodyText;
                }
            }
            return { title, content };
        };

        // 2. Process Daily Reviews
        dailyReviews.forEach(review => {
            const { title, content } = parseNarrative(review.narrative || '', review.date);

            // User Policy: If no content (or just '...'), show '...'
            // Title should be the Date
            const finalContent = (!content || content === '...') ? '...' : content;

            diaryEntries.push({
                id: review.id,
                type: 'daily_summary',
                date: `${review.date}T23:59:59`,
                title: title === 'Daily Reflection' ? review.date : title, // Default title fallback to Date if it was just "Daily Reflection"
                content: finalContent,
                comments: []
            });
        });

        // 3. Process Weekly Reviews
        weeklyReviews.forEach(review => {
            // Calculate week number or just use date range for title default
            const d = new Date(review.weekStartDate);
            // Default Title: "Week of <Date>"
            const defaultTitle = `Week of ${d.toLocaleDateString()}`;
            const { title, content } = parseNarrative(review.narrative || '', defaultTitle);

            // User Policy: If no content, show date range
            const dateRange = `${review.weekStartDate} ~ ${review.weekEndDate}`;
            const finalContent = (!content || content === '...') ? dateRange : content;

            diaryEntries.push({
                id: review.id,
                type: 'weekly_summary',
                date: `${review.weekEndDate}T23:59:59`, // End of week
                title: title,
                content: finalContent,
                comments: []
            });
        });

        // 5. Filter and Sort
        const sorted = diaryEntries.filter(entry => {
            const d = new Date(entry.date);
            const matchesDate = d.getMonth() === selectedDate.getMonth() &&
                d.getFullYear() === selectedDate.getFullYear();

            // --- Apply Global Memoir Filter ---
            // User Request: Daily/Weekly reports should always be shown.
            // So if type is not 'normal', we bypass the filtering steps.
            if (entry.type !== 'normal') return matchesDate;

            const { hasImage, minNoteLength, relatedTagIds, relatedScopeIds } = memoirFilterConfig;

            // 1. Has Image
            if (hasImage && (!entry.media || entry.media.length === 0)) return false;

            // 2. Min Length
            if (minNoteLength > 0 && entry.content.length < minNoteLength) return false;

            // 3. Related Tags
            if (relatedTagIds && relatedTagIds.length > 0) {
                // @ts-ignore
                if (!entry.activityId || !relatedTagIds.includes(entry.activityId)) return false;
            }

            // 4. Related Scopes
            if (relatedScopeIds && relatedScopeIds.length > 0) {
                // @ts-ignore
                const ids = entry.scopeIds || [];
                const hasShared = ids.some(id => relatedScopeIds.includes(id));
                if (!hasShared) return false;
            }

            return matchesDate;
        }).sort((a, b) => {
            const timeDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
            if (timeDiff !== 0) return timeDiff;

            // Tie-breaker: Monthly > Weekly > Daily > Normal
            // Since we sort descending (b - a), higher priority should be larger value to appear first.
            const getPriority = (type?: string) => {
                if (type === 'monthly_summary') return 4;
                if (type === 'weekly_summary') return 3;
                if (type === 'daily_summary') return 2;
                return 1;
            };
            return getPriority(b.type) - getPriority(a.type);
        });

        // 6. Group by day
        const groupedByDay: { date: string; entries: DiaryEntry[] }[] = [];
        sorted.forEach(entry => {
            const dateStr = new Date(entry.date).toDateString();
            const lastGroup = groupedByDay[groupedByDay.length - 1];
            if (!lastGroup || lastGroup.date !== dateStr) {
                groupedByDay.push({ date: dateStr, entries: [entry] });
            } else {
                lastGroup.entries.push(entry);
            }
        });

        return groupedByDay;

    }, [logs, dailyReviews, weeklyReviews, monthlyReviews, categories, selectedDate, memoirFilterConfig, todos, scopes]);

    // Get Current Month's Cite
    const currentMonthCite = useMemo(() => {
        const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        // Find review that matches this month
        // MonthlyReview stores monthStartDate as YYYY-MM-DD string
        const review = monthlyReviews.find(r => {
            const rDate = new Date(r.monthStartDate);
            return rDate.getFullYear() === start.getFullYear() && rDate.getMonth() === start.getMonth();
        });
        return review?.cite;
    }, [monthlyReviews, selectedDate]);

    const handleAddComment = useCallback((entryId: string, text: string) => {
        const newComment: GlobalComment = {
            id: Date.now().toString(),
            content: text,
            createdAt: Date.now(),
        };

        setLogs(prev => prev.map(log => {
            if (log.id === entryId) {
                return {
                    ...log,
                    comments: [...(log.comments || []), newComment]
                };
            }
            return log;
        }));
    }, [setLogs]);

    // Handle Entry Click
    const handleEntryClick = (entry: DiaryEntry) => {
        if (entry.type === 'normal') {
            const log = logs.find(l => l.id === entry.id);
            if (log) {
                onEditLog(log);
            }
        } else if (entry.type === 'daily_summary') {
            // entry.date is set to T23:59:59, so we can use it
            onOpenDailyReview(new Date(entry.date));
        } else if (entry.type === 'weekly_summary') {
            const review = weeklyReviews.find(r => r.id === entry.id);
            if (review) {
                onOpenWeeklyReview(new Date(review.weekStartDate), new Date(review.weekEndDate));
            }
        }
    };

    const handleMonthSelect = (monthIndex: number) => {
        const newDate = new Date(selectedDate);
        newDate.setMonth(monthIndex);
        setSelectedDate(newDate);
        setIsMonthPickerOpen(false);
    };

    const changeYear = (offset: number) => {
        const newDate = new Date(selectedDate);
        newDate.setFullYear(newDate.getFullYear() + offset);
        setSelectedDate(newDate);
    };

    // --- Date Helpers for Switcher ---
    const addDays = (date: Date, days: number) => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    };

    const getWeekRange = (date: Date) => {
        const d = new Date(date);
        // Assuming Monday start (ISO 8601) or adjust based on preference
        // 0 is Sunday, 1 is Monday
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        const start = new Date(d.setDate(diff));
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);

        return { start, end };
    };

    // Calculate dynamic dates
    const today = new Date();
    const yesterday = addDays(today, -1);

    // Actions
    const openYesterday = () => onOpenDailyReview(yesterday);
    const openToday = () => onOpenDailyReview(today);

    const openLastWeek = () => {
        const lastWeek = addDays(today, -7);
        const { start, end } = getWeekRange(lastWeek);
        onOpenWeeklyReview(start, end);
    };

    const openThisWeek = () => {
        const { start, end } = getWeekRange(today);
        onOpenWeeklyReview(start, end);
    };

    return (
        <div className="flex flex-col h-full bg-[#faf9f6] relative">
            {/* Sticky Header - 标题栏随滚动缩小 */}
            <header className={`sticky top-0 z-40 transition-all duration-300 ${isScrolled
                ? 'bg-stone-50/90 backdrop-blur-md shadow-sm py-2'
                : 'bg-transparent py-4'
                }`}>
                <div className="max-w-xl mx-auto px-6">
                    <div className="flex flex-col items-center">
                        <h1 className={`font-serif text-stone-800 font-bold transition-all duration-300 ${isScrolled ? 'text-[16px]' : 'text-[18px] mb-1'
                            }`}>
                            Memoir
                        </h1>
                    </div>
                </div>
            </header>

            {/* Scrollable Content Area */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto overflow-x-hidden pb-safe scrollbar-hide font-sans selection:bg-gray-200 selection:text-black"
            >
                <main className="max-w-2xl mx-auto px-4 md:px-6 pt-[10px] pb-24 min-h-[80vh] w-full">

                    {/* Intro / Stats Area / Month Selector */}
                    <div className="mb-12 pl-2 pr-0 relative">
                        {/* New Month Picker UI */}
                        <div className="flex items-end gap-4 mb-8 pt-6 px-1 select-none">
                            <div className="flex flex-col relative group cursor-pointer" ref={monthPickerRef}>
                                <div
                                    onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                                    className="flex flex-col"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-stone-400 font-sans tracking-wide">{selectedDate.getFullYear()}年</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <h2 className="text-3xl font-serif font-bold text-stone-800 group-hover:text-stone-600 transition-colors">
                                            {selectedDate.getMonth() + 1}月
                                        </h2>
                                        <ChevronDown className={`w-5 h-5 text-stone-300 group-hover:text-stone-500 transition-colors mt-1.5 ${isMonthPickerOpen ? 'rotate-180' : ''}`} />
                                    </div>
                                </div>

                                {/* Month Picker Dropdown */}
                                {isMonthPickerOpen && (
                                    <div className="absolute top-full left-0 mt-4 bg-white shadow-xl border border-gray-100 rounded-xl p-4 z-40 w-72 animate-in fade-in zoom-in-95 duration-200 cursor-default" onClick={(e) => e.stopPropagation()}>
                                        {/* Year Switcher */}
                                        <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
                                            <button onClick={() => changeYear(-1)} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
                                                <ChevronLeft className="w-5 h-5" />
                                            </button>
                                            <span className="font-serif text-lg font-bold text-gray-900">{selectedDate.getFullYear()}</span>
                                            <button onClick={() => changeYear(1)} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
                                                <ChevronRight className="w-5 h-5" />
                                            </button>
                                        </div>
                                        {/* Month Grid */}
                                        <div className="grid grid-cols-3 gap-2">
                                            {MONTHS.map((m, idx) => (
                                                <button
                                                    key={m}
                                                    onClick={() => handleMonthSelect(idx)}
                                                    className={`text-sm py-2 px-1 rounded-md transition-colors ${selectedDate.getMonth() === idx
                                                        ? 'bg-gray-900 text-white font-bold'
                                                        : 'text-gray-600 hover:bg-gray-100'
                                                        }`}
                                                >
                                                    {m.slice(0, 3)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="h-px bg-stone-200 flex-1 mb-3"></div>

                            <div className="flex items-center gap-1 mb-1 shrink-0 bg-stone-100/60 p-1 rounded-lg border border-stone-100">
                                <button onClick={openYesterday} className="px-2.5 py-1 text-[11px] font-medium text-stone-500 hover:text-stone-800 hover:bg-white/80 rounded-md transition-all">昨日</button>
                                <button onClick={openToday} className="px-2.5 py-1 text-[11px] font-bold text-stone-800 bg-white shadow-sm border border-stone-200/50 rounded-md">今日</button>
                                <div className="w-px h-3 bg-stone-300/40 mx-0.5"></div>
                                <button onClick={openLastWeek} className="px-2.5 py-1 text-[11px] font-medium text-stone-500 hover:text-stone-800 hover:bg-white/80 rounded-md transition-all">上周</button>
                                <button onClick={openThisWeek} className="px-2.5 py-1 text-[11px] font-medium text-stone-500 hover:text-stone-800 hover:bg-white/80 rounded-md transition-all">本周</button>
                            </div>
                        </div>

                        {/* Quote or Summary Card - Click to Open Monthly Review */}
                        {filteredEntries.length > 0 && (
                            <div
                                onClick={() => {
                                    const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
                                    const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
                                    onOpenMonthlyReview(start, end);
                                }}
                                className="relative p-8 mb-10 overflow-hidden bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] border border-stone-100/50 cursor-pointer group"
                            >
                                <div className="absolute top-2 left-4 text-8xl font-serif text-stone-50 select-none pointer-events-none">“</div>
                                <p className="relative z-10 text-[17px] font-serif text-stone-600 italic text-center leading-relaxed">
                                    "{currentMonthCite || "Every moment is a memory waiting to happen."}"
                                </p>
                                <div className="w-8 h-0.5 bg-stone-200 mx-auto mt-6 rounded-full"></div>
                            </div>
                        )}
                    </div>

                    {/* Timeline Section */}
                    <div className="relative">
                        {filteredEntries.length > 0 ? (
                            <div className="flex flex-col">
                                {filteredEntries.map((dayGroup, groupIndex) => {
                                    const dateObj = new Date(dayGroup.date);
                                    const day = dateObj.getDate().toString();
                                    const month = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();

                                    return (
                                        <div key={dayGroup.date} className="flex w-full mb-6">
                                            {/* Left: Sticky Date */}
                                            <div className="relative w-12 flex-shrink-0">
                                                <div className="sticky top-6 pr-3 text-right">
                                                    <span className="block font-serif text-xl md:text-2xl text-gray-900 font-semibold leading-none">{day}</span>
                                                    <span className="block font-sans text-[10px] font-bold text-subtle tracking-widest mt-1">{month}</span>
                                                </div>
                                                {/* Vertical line */}
                                                <div className="absolute top-0 right-0 w-px bg-gray-200 h-full" />
                                            </div>

                                            {/* Right: Entries for this day */}
                                            <div className="flex-1 flex flex-col">
                                                {dayGroup.entries.map((entry, entryIndex) => (
                                                    <TimelineItem
                                                        key={entry.id}
                                                        entry={entry}
                                                        isLast={groupIndex === filteredEntries.length - 1 && entryIndex === dayGroup.entries.length - 1}
                                                        isFirstOfDay={entryIndex === 0}
                                                        onAddComment={handleAddComment}
                                                        onClick={() => handleEntryClick(entry)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* End of Feed Indicator */}
                                <div className="mt-12 flex flex-col items-center justify-center gap-2 text-gray-300">
                                    <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                                    <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                                    <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                                    <span className="text-xs font-serif italic mt-2">End of {MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                    <PenLine className="w-6 h-6 opacity-30" />
                                </div>
                                <p className="font-serif text-lg italic">No stories found for this period.</p>
                                <p className="font-serif text-lg italic">No stories found for this period.</p>

                                {(memoirFilterConfig.hasImage || memoirFilterConfig.minNoteLength > 0 || memoirFilterConfig.relatedTagIds.length > 0 || memoirFilterConfig.relatedScopeIds.length > 0) && (
                                    <div className="mt-4 flex flex-col items-center gap-2">
                                        <span className="text-xs text-stone-400">Filters are active</span>
                                        <div className="flex flex-wrap gap-1 justify-center">
                                            {memoirFilterConfig.hasImage && <span className="bg-stone-100 px-2 py-0.5 rounded text-[10px] text-stone-500">Image</span>}
                                            {memoirFilterConfig.minNoteLength > 0 && <span className="bg-stone-100 px-2 py-0.5 rounded text-[10px] text-stone-500">Min {memoirFilterConfig.minNoteLength} chars</span>}
                                            {memoirFilterConfig.relatedTagIds.length > 0 && <span className="bg-stone-100 px-2 py-0.5 rounded text-[10px] text-stone-500">Tags ({memoirFilterConfig.relatedTagIds.length})</span>}
                                            {memoirFilterConfig.relatedScopeIds.length > 0 && <span className="bg-stone-100 px-2 py-0.5 rounded text-[10px] text-stone-500">Domains ({memoirFilterConfig.relatedScopeIds.length})</span>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Floating Action Button - Mock */}
            <div className="fixed bottom-24 right-6 z-40 md:hidden">
                <button className="bg-ink text-white p-4 rounded-full shadow-lg hover:scale-105 transition-transform flex items-center justify-center" onClick={() => onOpenDailyReview(new Date())}>
                    <PenLine className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
};