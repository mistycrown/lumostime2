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
import { Search, Menu, PenLine, ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal, Image as ImageIcon, AlignLeft, X } from 'lucide-react';

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

    // Default to Today
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Filter States
    const [filterHasMedia, setFilterHasMedia] = useState(false);
    const [filterMinLength, setFilterMinLength] = useState(0);

    const filterRef = useRef<HTMLDivElement>(null);
    const monthPickerRef = useRef<HTMLDivElement>(null);

    // Close popups when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
            if (monthPickerRef.current && !monthPickerRef.current.contains(event.target as Node)) {
                setIsMonthPickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
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
            const { title, content } = parseNarrative(review.narrative || '', 'Daily Reflection');
            const finalContent = content === '...' && review.answers
                ? JSON.stringify(review.answers)
                : content;

            diaryEntries.push({
                id: review.id,
                type: 'daily_summary',
                date: `${review.date}T23:59:59`,
                title: title,
                content: finalContent || 'Tap to view details...',
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

            diaryEntries.push({
                id: review.id,
                type: 'weekly_summary',
                date: `${review.weekEndDate}T23:59:59`, // End of week
                title: title,
                content: content || 'Weekly review details...',
                comments: []
            });
        });

        // 5. Filter and Sort
        const sorted = diaryEntries.filter(entry => {
            const d = new Date(entry.date);
            const matchesDate = d.getMonth() === selectedDate.getMonth() &&
                d.getFullYear() === selectedDate.getFullYear();

            const matchesMedia = filterHasMedia ? (entry.media && entry.media.length > 0) : true;
            const matchesLength = filterMinLength > 0 ? entry.content.length >= filterMinLength : true;

            return matchesDate && matchesMedia && matchesLength;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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

    }, [logs, dailyReviews, weeklyReviews, monthlyReviews, categories, selectedDate, filterHasMedia, filterMinLength, todos, scopes]);

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

    return (
        <div className="flex flex-col h-full bg-white overflow-y-auto overflow-x-hidden pb-safe scrollbar-hide font-sans selection:bg-gray-200 selection:text-black">
            {/* Main Content Area */}
            <main className="max-w-2xl mx-auto px-4 md:px-6 pt-[10px] pb-24 min-h-[80vh] w-full">

                {/* Intro / Stats Area / Month Selector */}
                <div className="mb-12 pl-2 pr-0 relative">
                    <div className="flex justify-between items-end border-b border-gray-200 pb-4 mb-8">
                        <div className="relative" ref={monthPickerRef}>


                            {/* Month Trigger */}
                            <button
                                onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                                className="flex items-center gap-2 group hover:opacity-70 transition-opacity"
                            >
                                <h2 className="text-4xl font-serif text-gray-900">{MONTHS[selectedDate.getMonth()]}</h2>
                                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isMonthPickerOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Month Picker Dropdown */}
                            {isMonthPickerOpen && (
                                <div className="absolute top-full left-0 mt-4 bg-white shadow-xl border border-gray-100 rounded-xl p-4 z-40 w-72 animate-in fade-in zoom-in-95 duration-200">
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

                        {/* Stats Display Removed */}
                        <div className="text-right">
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
                            className="bg-white p-6 md:p-8 rounded-xl shadow-[0_2px_20px_rgba(0,0,0,0.03)] border border-gray-100 mb-8 cursor-pointer hover:shadow-md transition-shadow group"
                        >
                            <p className="font-serif text-lg md:text-xl text-gray-600 italic leading-relaxed group-hover:text-gray-900 transition-colors">
                                "Every moment is a memory waiting to happen."
                            </p>
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
                            {(filterHasMedia || filterMinLength > 0) && (
                                <button
                                    onClick={() => { setFilterHasMedia(false); setFilterMinLength(0); }}
                                    className="mt-4 text-xs font-bold uppercase tracking-widest text-ink border-b border-ink"
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    )
                    }
                </div >
            </main >

            {/* Floating Action Button - Mock */}
            < div className="fixed bottom-24 right-6 z-40 md:hidden" >
                <button className="bg-ink text-white p-4 rounded-full shadow-lg hover:scale-105 transition-transform flex items-center justify-center" onClick={() => onOpenDailyReview(new Date())}>
                    <PenLine className="w-6 h-6" />
                </button>
            </div >
        </div >
    );
};