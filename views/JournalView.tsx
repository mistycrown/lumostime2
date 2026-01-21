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
import { DailyReview, Log } from '../types';
import { DiaryEntry, MOCK_ENTRIES, MONTHS, Comment } from './journalTypes';
import TimelineItem from '../components/TimelineItem';
import { Search, Menu, PenLine, ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal, Image as ImageIcon, AlignLeft, X } from 'lucide-react';

interface JournalViewProps {
    dailyReviews: DailyReview[];
    logs: Log[];
    onOpenDailyReview: (date: Date) => void;
}

export const JournalView: React.FC<JournalViewProps> = ({
    dailyReviews,
    logs,
    onOpenDailyReview,
}) => {
    // MOCK DATA STATE
    const [entries, setEntries] = useState<DiaryEntry[]>(MOCK_ENTRIES);
    // Default to January 2024 for demo purposes
    const [selectedDate, setSelectedDate] = useState(new Date(2024, 0, 1));
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

    // Filter entries based on selected Month/Year AND filter configs
    const filteredEntries = useMemo(() => {
        return entries.filter(entry => {
            const d = new Date(entry.date);
            const matchesDate = d.getMonth() === selectedDate.getMonth() &&
                d.getFullYear() === selectedDate.getFullYear();

            const matchesMedia = filterHasMedia ? (entry.media && entry.media.length > 0) : true;
            const matchesLength = filterMinLength > 0 ? entry.content.length >= filterMinLength : true;

            return matchesDate && matchesMedia && matchesLength;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [entries, selectedDate, filterHasMedia, filterMinLength]);

    const handleAddComment = useCallback((entryId: string, text: string) => {
        const newComment: Comment = {
            id: Date.now().toString(),
            text,
            createdAt: new Date().toISOString(),
            author: 'Me',
        };

        setEntries(prev => prev.map(entry => {
            if (entry.id === entryId) {
                return {
                    ...entry,
                    comments: [...(entry.comments || []), newComment]
                };
            }
            return entry;
        }));
    }, []);

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
            <main className="max-w-2xl mx-auto px-4 md:px-6 pt-10 pb-24 min-h-[80vh] w-full">

                {/* Intro / Stats Area / Month Selector */}
                <div className="mb-12 pl-2 pr-0 relative">
                    <div className="flex justify-between items-end border-b border-gray-200 pb-4 mb-8">
                        <div className="relative" ref={monthPickerRef}>
                            <span className="text-xs font-bold text-gray-400 tracking-[0.2em] uppercase block mb-1">Timeline</span>

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

                        {/* Stats & Filter Trigger */}
                        <div className="relative text-right" ref={filterRef}>
                            <button
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className="group flex items-center justify-end gap-2 hover:opacity-70 transition-opacity"
                            >
                                <div className="flex flex-col items-end">
                                    <span className="text-3xl font-serif text-gray-900 leading-none">{filteredEntries.length}</span>
                                    <div className="flex items-center gap-1 text-xs font-bold text-gray-400 tracking-wider uppercase mt-1">
                                        <span>Entries</span>
                                        <SlidersHorizontal className="w-3 h-3" />
                                    </div>
                                </div>
                            </button>

                            {/* Filter Popup */}
                            {isFilterOpen && (
                                <div className="absolute top-full right-0 mt-4 bg-white shadow-xl border border-gray-100 rounded-xl p-5 z-40 w-64 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-xs font-bold text-gray-400 tracking-widest uppercase">Filter</span>
                                        <button onClick={() => setIsFilterOpen(false)} className="text-gray-400 hover:text-gray-900">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Filter: Has Media */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2 text-sm text-gray-700">
                                            <ImageIcon className="w-4 h-4" />
                                            <span>With Photos</span>
                                        </div>
                                        <button
                                            onClick={() => setFilterHasMedia(!filterHasMedia)}
                                            className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${filterHasMedia ? 'bg-gray-900' : 'bg-gray-200'}`}
                                        >
                                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${filterHasMedia ? 'left-6' : 'left-1'}`}></div>
                                        </button>
                                    </div>

                                    {/* Filter: Min Length */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm text-gray-700">
                                            <AlignLeft className="w-4 h-4" />
                                            <span>Min. Words</span>
                                            <span className="ml-auto text-xs font-bold text-gray-500">{filterMinLength} chars</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="500"
                                            step="10"
                                            value={filterMinLength}
                                            onChange={(e) => setFilterMinLength(parseInt(e.target.value))}
                                            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-900"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quote or Summary Card */}
                    {filteredEntries.length > 0 && (
                        <div className="bg-white p-6 md:p-8 rounded-xl shadow-[0_2px_20px_rgba(0,0,0,0.03)] border border-gray-100 mb-8">
                            <p className="font-serif text-lg md:text-xl text-gray-600 italic leading-relaxed">
                                "Every moment is a memory waiting to happen."
                            </p>
                        </div>
                    )}
                </div>

                {/* Timeline Section */}
                <div className="relative">
                    {filteredEntries.length > 0 ? (
                        <div className="flex flex-col">
                            {filteredEntries.map((entry, index) => (
                                <TimelineItem
                                    key={entry.id}
                                    entry={entry}
                                    isLast={index === filteredEntries.length - 1}
                                    onAddComment={handleAddComment}
                                />
                            ))}

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
                    )}
                </div>
            </main>

            {/* Floating Action Button - Mock */}
            <div className="fixed bottom-24 right-6 z-40 md:hidden">
                <button className="bg-ink text-white p-4 rounded-full shadow-lg hover:scale-105 transition-transform flex items-center justify-center" onClick={() => onOpenDailyReview(new Date())}>
                    <PenLine className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
};