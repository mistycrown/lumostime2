import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { DiaryEntry, Comment } from './types';
import { MOCK_ENTRIES } from './constants';
import TimelineItem from './components/TimelineItem';
import { Search, Menu, PenLine, ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal, Image as ImageIcon, AlignLeft, X } from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June', 
  'July', 'August', 'September', 'October', 'November', 'December'
];

const App: React.FC = () => {
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
    <div className="min-h-screen bg-paper font-sans selection:bg-gray-200 selection:text-black">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-paper/95 backdrop-blur-md border-b border-gray-100 transition-all duration-300">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
           <div className="w-10">
              <Menu className="w-6 h-6 text-ink cursor-pointer hover:text-gray-600" />
           </div>
           
           <div className="flex flex-col items-center">
             <h1 className="font-display text-2xl text-ink tracking-tight font-semibold cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
                My Chronicle
             </h1>
           </div>

           <div className="w-10 flex justify-end gap-4">
              <Search className="w-5 h-5 text-ink cursor-pointer hover:text-gray-600" />
           </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-2xl mx-auto px-4 md:px-6 pt-10 pb-24 min-h-[80vh]">
        
        {/* Intro / Stats Area / Month Selector */}
        <div className="mb-12 px-2 relative">
           <div className="flex justify-between items-end border-b border-gray-200 pb-4 mb-8">
              <div className="relative" ref={monthPickerRef}>
                <span className="text-xs font-bold text-gray-400 tracking-[0.2em] uppercase block mb-1">Timeline</span>
                
                {/* Month Trigger */}
                <button 
                  onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                  className="flex items-center gap-2 group hover:opacity-70 transition-opacity"
                >
                  <h2 className="text-4xl font-serif text-ink">{MONTHS[selectedDate.getMonth()]}</h2>
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
                      <span className="font-serif text-lg font-bold text-ink">{selectedDate.getFullYear()}</span>
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
                          className={`text-sm py-2 px-1 rounded-md transition-colors ${
                            selectedDate.getMonth() === idx 
                              ? 'bg-ink text-white font-bold' 
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
                    <span className="text-3xl font-serif text-ink leading-none">{filteredEntries.length}</span>
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
                      <button onClick={() => setIsFilterOpen(false)} className="text-gray-400 hover:text-ink">
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
                        className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${filterHasMedia ? 'bg-ink' : 'bg-gray-200'}`}
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
                        className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-ink"
                      />
                    </div>
                  </div>
                )}
              </div>
           </div>

           {/* Quote or Summary Card */}
           {filteredEntries.length > 0 && (
             <div className="bg-white p-6 md:p-8 rounded-xl shadow-[0_2px_20px_rgba(0,0,0,0.03)] border border-gray-100 relative overflow-hidden mb-8">
                <div className="absolute top-0 left-0 w-1 h-full bg-ink"></div>
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

      {/* Floating Action Button */}
      <div className="fixed bottom-24 right-6 z-40 md:hidden">
        <button className="bg-ink text-white p-4 rounded-full shadow-lg hover:scale-105 transition-transform flex items-center justify-center">
          <PenLine className="w-6 h-6" />
        </button>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur border-t border-gray-100 py-4 z-50">
         <div className="max-w-md mx-auto flex justify-between px-8 text-xs font-bold tracking-widest uppercase text-gray-400">
            <button className="hover:text-ink transition-colors flex flex-col items-center gap-1">
               <span>Log</span>
            </button>
            <button className="hover:text-ink transition-colors flex flex-col items-center gap-1">
               <span>Todo</span>
            </button>
            <button className="text-ink flex flex-col items-center gap-1 relative">
               <span>Timeline</span>
               <span className="absolute -bottom-2 w-1 h-1 bg-ink rounded-full"></span>
            </button>
            <button className="hover:text-ink transition-colors flex flex-col items-center gap-1">
               <span>Archive</span>
            </button>
             <button className="hover:text-ink transition-colors flex flex-col items-center gap-1">
               <span>Index</span>
            </button>
         </div>
      </nav>
    </div>
  );
};

export default App;