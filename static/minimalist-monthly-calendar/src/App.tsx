import React, { useEffect, useRef, useState, useMemo } from 'react';
import { cn } from './utils';
import { AnimatePresence, motion } from 'motion/react';
import { 
  eachDayOfInterval, 
  eachWeekOfInterval, 
  endOfWeek, 
  format, 
  isSameMonth, 
  isToday, 
  startOfMonth, 
  subMonths, 
  addMonths,
  endOfMonth,
  startOfWeek,
  getDate
} from 'date-fns';

const MOCK_TODOS = [
  "Review spec",
  "Team sync",
  "Dentist",
  "Gym",
  "Groceries",
  "Read",
  "Call Mom",
  "Pay bills",
  "Design QA",
  "Release",
  "Yoga",
  "Coffee"
];

// Seeded random-ish function based on date string
const generateMockTodos = (dateStr: string) => {
  const hash = dateStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const numTodos = (hash % 3); // 0 to 2 todos per day
  const dailyTodos = [];
  
  for (let i = 0; i < numTodos; i++) {
    const todoIndex = (hash + i * 3) % MOCK_TODOS.length;
    let text = MOCK_TODOS[todoIndex];
    dailyTodos.push({ id: `todo-${dateStr}-${i}`, text, isDone: false }); 
  }
  return dailyTodos;
};

export default function App() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = useMemo(() => new Date(), []);
  const [activeMonth, setActiveMonth] = useState(format(today, 'MMMM yyyy'));
  const headerRef = useRef<HTMLDivElement>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const [modifiedTodos, setModifiedTodos] = useState<Record<string, {id: string, text: string, isDone: boolean}[]>>({});
  
  const scrollIntervalRef = useRef<number | null>(null);

  const startAutoScroll = (direction: 'up' | 'down') => {
    if (scrollIntervalRef.current) return;
    scrollIntervalRef.current = window.setInterval(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop += direction === 'down' ? 10 : -10;
      }
    }, 16);
  };

  const stopAutoScroll = () => {
    if (scrollIntervalRef.current !== null) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  const handleDragOverContainer = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!scrollRef.current) return;
    
    const rect = scrollRef.current.getBoundingClientRect();
    const edgeThreshold = 80;
    
    if (e.clientY - rect.top < edgeThreshold) {
      startAutoScroll('up');
    } else if (rect.bottom - e.clientY < edgeThreshold) {
      startAutoScroll('down');
    } else {
      stopAutoScroll();
    }
  };
  
  const getTodosForDate = (dateStr: string) => {
    if (modifiedTodos[dateStr]) {
      return modifiedTodos[dateStr];
    }
    return generateMockTodos(dateStr);
  };
  
  // To divide exactly by 5
  const [containerHeight, setContainerHeight] = useState(600); 

  // Generate continuous weeks grid
  const weeks = useMemo(() => {
    // Generate dates from 6 months ago to 12 months in the future
    const start = startOfWeek(startOfMonth(subMonths(today, 6)), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(addMonths(today, 12)), { weekStartsOn: 1 });
    
    const weekIntervals = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
    
    return weekIntervals.map(weekStart => {
      const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) });
      return { id: weekStart.toISOString(), days };
    });
  }, []);

  const observerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const updateHeight = () => {
      if (scrollRef.current) {
        setContainerHeight(scrollRef.current.clientHeight);
      }
    };
    
    window.addEventListener('resize', updateHeight);
    // Initial measurement after a short delay to ensure layout is complete
    setTimeout(updateHeight, 0);
    
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const hasScrolledRef = useRef(false);
  useEffect(() => {
    // Only scroll to current week once on initial load
    if (hasScrolledRef.current || containerHeight === 0) return;
    
    const todayStr = format(today, 'yyyy-MM-dd');
    const currentWeekEl = document.querySelector(`[data-week-contains="${todayStr}"]`);
    if (scrollRef.current && currentWeekEl) {
       // Offset slightly so it centers around current view
       scrollRef.current.scrollTop = (currentWeekEl as HTMLElement).offsetTop - (headerRef.current?.offsetHeight || 0);
       hasScrolledRef.current = true;
    }
  }, [containerHeight, today]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      let maxRatio = 0;
      let mostVisibleMonth = activeMonth;
      
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
          maxRatio = entry.intersectionRatio;
          const monthAttr = entry.target.getAttribute('data-month');
          if (monthAttr) {
            mostVisibleMonth = monthAttr;
          }
        }
      });
      
      if (mostVisibleMonth && maxRatio > 0.1) {
        setActiveMonth(mostVisibleMonth);
      }
    }, {
      root: scrollRef.current,
      threshold: [0.1, 0.4, 0.7]
    });

    Object.values(observerRefs.current).forEach(ref => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [weeks]);

  return (
    <div className="flex justify-center bg-[#E5E5E5] min-h-screen text-[#1A1A1A] font-sans sm:py-6 sm:px-4">
      <div className="w-full max-w-[420px] sm:rounded-[2rem] sm:border-[8px] sm:border-stone-800 bg-white h-[100dvh] sm:h-[850px] sm:max-h-[88dvh] shadow-2xl relative overflow-hidden flex flex-col select-none">
        
        {/* Sticky Global Header */}
        <div ref={headerRef} className="flex-none pt-12 sm:pt-0 z-20 bg-white">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-black bg-[#FDFCFB]">
            <div className="flex items-center space-x-1 select-none">
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  const [month, year] = activeMonth.split(' ');
                  const currentDate = new Date(`${month} 1, ${year}`);
                  const prevDate = subMonths(currentDate, 1);
                  const targetMonthStr = format(prevDate, 'MMMM yyyy');
                  const targetEl = document.querySelector(`[data-month="${targetMonthStr}"]`);
                  if (targetEl && scrollRef.current) {
                    scrollRef.current.scrollTop = (targetEl as HTMLElement).offsetTop - (headerRef.current?.offsetHeight || 0);
                  }
                }} 
                className="p-1.5 hover:bg-stone-200 rounded-full transition-colors opacity-50 hover:opacity-100"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              
              <div 
                className="flex items-baseline space-x-1.5 cursor-pointer px-1" 
                onClick={() => {
                  const todayStr = format(today, 'yyyy-MM-dd');
                  const currentWeekEl = document.querySelector(`[data-week-contains="${todayStr}"]`);
                  if (scrollRef.current && currentWeekEl) {
                    scrollRef.current.scrollTop = (currentWeekEl as HTMLElement).offsetTop - (headerRef.current?.offsetHeight || 0);
                  }
                }}
                title="Scroll to Today"
              >
                <h1 className="text-xl font-serif font-black italic leading-none hover:opacity-60 transition-opacity">
                  {activeMonth.split(' ')[0]} 
                </h1>
                <span className="text-sm font-serif italic font-light hover:opacity-60 transition-opacity">
                  {activeMonth.split(' ')[1]}
                </span>
              </div>

              <button 
                onClick={(e) => {
                  e.preventDefault();
                  const [month, year] = activeMonth.split(' ');
                  const currentDate = new Date(`${month} 1, ${year}`);
                  const nextDate = addMonths(currentDate, 1);
                  const targetMonthStr = format(nextDate, 'MMMM yyyy');
                  const targetEl = document.querySelector(`[data-month="${targetMonthStr}"]`);
                  if (targetEl && scrollRef.current) {
                    scrollRef.current.scrollTop = (targetEl as HTMLElement).offsetTop - (headerRef.current?.offsetHeight || 0);
                  }
                }} 
                className="p-1.5 hover:bg-stone-200 rounded-full transition-colors opacity-50 hover:opacity-100"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </div>
            
            <div className="flex items-center space-x-3 pointer-events-none pr-3">
              <span className="text-[0.45rem] font-bold tracking-[0.2em] uppercase opacity-40">Current Perspective</span>
              <div className="flex space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
                <span className="w-1.5 h-1.5 rounded-full border border-black"></span>
                <span className="w-1.5 h-1.5 rounded-full border border-black"></span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-7 border-b border-black text-[0.6rem] font-bold tracking-widest uppercase py-2 bg-white">
            <div className="text-center opacity-40">Mon</div>
            <div className="text-center opacity-40">Tue</div>
            <div className="text-center opacity-40">Wed</div>
            <div className="text-center opacity-40">Thu</div>
            <div className="text-center opacity-40">Fri</div>
            <div className="text-center opacity-40">Sat</div>
            <div className="text-center opacity-40">Sun</div>
          </div>
        </div>

        {/* Calendar Scrolling Grid */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto no-scrollbar pb-[10vh] bg-white relative"
          style={{ scrollBehavior: 'smooth' }}
          onDragOver={handleDragOverContainer}
          onDragLeave={stopAutoScroll}
          onDrop={stopAutoScroll}
        >
          {weeks.map((week) => {
            const middleDayOfWeek = week.days[3]; 
            const isWeekContainingToday = week.days.some(d => isToday(d));
            const monthTag = format(middleDayOfWeek, 'MMMM yyyy');
            
            return (
              <div 
                key={week.id} 
                className="flex flex-col"
                data-month={monthTag}
                data-week-contains={isWeekContainingToday ? format(today, 'yyyy-MM-dd') : undefined}
                ref={el => { observerRefs.current[week.id] = el; }}
              >
                <div 
                  className="grid grid-cols-7"
                  style={{ height: Math.max(containerHeight / 5, 110) + 'px' }} 
                >
                  {week.days.map((day) => {
                    const isCurrentMonth = isSameMonth(day, middleDayOfWeek);
                    const isFirst = getDate(day) === 1;
                    const isTdy = isToday(day);
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const todos = getTodosForDate(dateStr);
                    const isSelected = selectedDate === dateStr;
                    const isDragTarget = dragTarget === dateStr;

                    return (
                      <div 
                        key={day.toISOString()} 
                        onClick={() => setSelectedDate(prev => prev === dateStr ? null : dateStr)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (dragTarget !== dateStr) setDragTarget(dateStr);
                        }}
                        onDragLeave={() => {
                          if (dragTarget === dateStr) setDragTarget(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragTarget(null);
                          stopAutoScroll();
                          const dataStr = e.dataTransfer.getData('application/json');
                          if (!dataStr) return;
                          try {
                            const data = JSON.parse(dataStr);
                            if (data.sourceDateStr === dateStr) return;
                            
                            setModifiedTodos(prev => {
                              const sourceTodos = prev[data.sourceDateStr] || generateMockTodos(data.sourceDateStr);
                              const targetTodos = prev[dateStr] || generateMockTodos(dateStr);
                              
                              return {
                                ...prev,
                                [data.sourceDateStr]: sourceTodos.filter(t => t.id !== data.todo.id),
                                [dateStr]: [...targetTodos, data.todo]
                              };
                            });
                          } catch (err) {}
                        }}
                        className={cn(
                          "cursor-pointer border-r border-b border-gray-100 p-2 flex flex-col relative transition-colors duration-300",
                          !isCurrentMonth ? "opacity-30 bg-gray-50" : "bg-white",
                          isTdy && "ring-1 ring-inset ring-stone-400 z-10",
                          isSelected && !isTdy && "bg-gray-100",
                          isDragTarget && "bg-[#FDFCFB] ring-2 ring-inset ring-black z-20"
                        )}
                      >
                      {/* Date Header */}
                      <div className="flex justify-start">
                        <span className="font-serif text-xl italic leading-none">
                          {format(day, 'dd')}
                        </span>
                      </div>

                      {/* Mock Todos */}
                      <div className="mt-2 flex-1 w-full flex flex-col gap-1 overflow-hidden pointer-events-none">
                        {todos.map((todo, i) => (
                          <div 
                            key={i} 
                            className={cn(
                              "text-[0.55rem] font-medium leading-tight border-l-[1.5px] pl-1 truncate",
                              i % 2 === 0 ? "border-black" : "border-orange-500"
                            )}
                          >
                            {todo.text.toUpperCase()}
                          </div>
                        ))}
                      </div>

                      {isTdy && (
                        <div className="absolute bottom-1 right-1.5 text-[0.45rem] opacity-50 uppercase tracking-widest font-bold">
                          TODAY
                        </div>
                      )}
                      {isFirst && !isTdy && (
                        <div className="absolute bottom-1 right-1.5 text-[0.45rem] opacity-30 uppercase tracking-widest font-bold">
                          {format(day, 'MMM')}
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>
                <AnimatePresence>
                  {selectedDate && week.days.some(d => format(d, 'yyyy-MM-dd') === selectedDate) && (() => {
                    const selectedDay = week.days.find(d => format(d, 'yyyy-MM-dd') === selectedDate)!;
                    const dayTodos = getTodosForDate(selectedDate);
                    return (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-[#FDFCFB] flex-shrink-0"
                      >
                        <div className="px-6 py-4 flex flex-col gap-1.5 shadow-[inset_0_3px_6px_rgba(0,0,0,0.02)]">
                          {dayTodos.length > 0 ? dayTodos.map((todo, i) => (
                            <div 
                              key={todo.id} 
                              draggable
                              onDragStart={(e) => {
                                // Stop propagation so it doesn't trigger the grid cell's onClick
                                e.stopPropagation();
                                e.dataTransfer.setData('application/json', JSON.stringify({ 
                                  sourceDateStr: selectedDate, 
                                  todo 
                                }));
                              }}
                              onDragEnd={() => {
                                stopAutoScroll();
                              }}
                              className="flex items-baseline space-x-3 py-1.5 border-b border-gray-100 last:border-b-0 cursor-grab active:cursor-grabbing hover:bg-black/5 px-2 -mx-2 transition-colors rounded"
                            >
                              <span className={cn(
                                "text-[0.55rem] font-bold tracking-widest uppercase",
                                i % 2 === 0 ? "text-black" : "text-orange-500"
                              )}>
                                {String(i + 1).padStart(2, '0')}
                              </span>
                              <span className="text-[0.65rem] font-medium text-stone-800 uppercase tracking-widest leading-relaxed">
                                {todo.text}
                              </span>
                            </div>
                          )) : (
                            <div className="py-2 text-[0.65rem] tracking-widest uppercase font-bold opacity-30">
                              No Tasks Scheduled
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Decorative elements */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center space-x-1 opacity-20 pointer-events-none">
          <div className="w-1 h-8 bg-black rounded-full"></div>
          <div className="w-1 h-4 bg-black rounded-full"></div>
          <div className="w-1 h-2 bg-black rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
