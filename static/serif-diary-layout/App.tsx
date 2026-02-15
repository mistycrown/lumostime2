import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, 
  startOfMonth, endOfMonth, isSameMonth, getYear, getDay, 
  subWeeks, addWeeks, subMonths, addMonths, subYears, addYears 
} from 'date-fns';
import zhCN from 'date-fns/locale/zh-CN';
import { Download, ChevronLeft, ChevronRight, Layout, Calendar, Grid, Smartphone, Monitor, Palette, Layers, Film, Newspaper, Loader2 } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { DiaryEntry, ViewMode, Orientation, ColorTheme, LayoutStyle } from './types';
import { generateMockEntries } from './utils';

// --- Configuration Constants ---

const THEMES: ColorTheme[] = [
  // Morandi Series
  {
    id: 'morandi-haze',
    name: '莫兰迪·雾蓝',
    colors: {
      paper: '#F0F4F8', 
      ink: '#485665',   
      inkLight: '#8FA1B3',
      accent: '#B0C4DE', 
      border: '#D9E2EC',
      highlight: '#FFFFFF'
    }
  },
  {
    id: 'morandi-olive',
    name: '莫兰迪·青苔',
    colors: {
      paper: '#F2F3EE', 
      ink: '#5C6356',   
      inkLight: '#99A092',
      accent: '#BCC6B3', 
      border: '#E1E6DE',
      highlight: '#FFFFFF'
    }
  },
  {
    id: 'morandi-clay',
    name: '莫兰迪·陶土',
    colors: {
      paper: '#F9F6F2',
      ink: '#6B584F',
      inkLight: '#A69288',
      accent: '#D4C5BF',
      border: '#EBE3DE',
      highlight: '#FFFFFF'
    }
  },
  // Traditional Chinese Series
  {
    id: 'cn-rouge',
    name: '国色·胭脂',
    colors: {
      paper: '#FCF6F6',
      ink: '#5E1821', 
      inkLight: '#A85A63',
      accent: '#D68990',
      border: '#F2D3D6',
      highlight: '#FFFFFF'
    }
  },
  {
    id: 'cn-bamboo',
    name: '国色·竹青',
    colors: {
      paper: '#F5F9F5',
      ink: '#1A4032', 
      inkLight: '#4F7565',
      accent: '#83AFA0',
      border: '#CFE6DE',
      highlight: '#FFFFFF'
    }
  },
  {
    id: 'cn-indigo',
    name: '国色·黛蓝',
    colors: {
      paper: '#F4F6F9',
      ink: '#1C2C42', 
      inkLight: '#4E607A',
      accent: '#7D92B0',
      border: '#D1DBE8',
      highlight: '#FFFFFF'
    }
  },
  {
    id: 'classic',
    name: '经典·纯白',
    colors: {
      paper: '#fdfbf7',
      ink: '#2c2c2c',
      inkLight: '#888888',
      accent: '#e5e5e5',
      border: '#e5e5e5',
      highlight: '#ffffff'
    }
  }
];

// SVG Noise Pattern for Paper Texture
const NOISE_PATTERN = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/>
    </filter>
    <rect width="100%" height="100%" filter="url(#noise)" opacity="0.04"/>
  </svg>`
)}`;

// --- Styles Helper ---

const getFontClass = (style: LayoutStyle) => {
  switch (style) {
    case 'newspaper': return 'font-display'; // Playfair
    case 'film': return 'font-sans';
    case 'minimal': return 'font-sans';
    default: return 'font-serif';
  }
};

// --- Components ---

// 1. Navigation & Controls
const Controls = ({ 
  viewMode, setViewMode, 
  orientation, setOrientation,
  theme, setTheme,
  layoutStyle, setLayoutStyle,
  onPrev, onNext, currentDate, onExport, isExporting
}: { 
  viewMode: ViewMode; setViewMode: (m: ViewMode) => void; 
  orientation: Orientation; setOrientation: (o: Orientation) => void;
  theme: ColorTheme; setTheme: (t: ColorTheme) => void;
  layoutStyle: LayoutStyle; setLayoutStyle: (l: LayoutStyle) => void;
  onPrev: () => void; onNext: () => void;
  currentDate: Date; onExport: () => void;
  isExporting: boolean;
}) => {
  const dateLabel = useMemo(() => {
    if (viewMode === 'week') return format(currentDate, 'yyyy年 M月', { locale: zhCN });
    if (viewMode === 'month') return format(currentDate, 'yyyy年 M月', { locale: zhCN });
    return format(currentDate, 'yyyy年', { locale: zhCN });
  }, [viewMode, currentDate]);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-stone-200 px-4 py-3 flex flex-col xl:flex-row items-center justify-between gap-4 shadow-sm h-auto xl:h-16 transition-all">
      <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto justify-center xl:justify-start">
        <h1 className="font-serif text-2xl font-bold text-stone-800 tracking-widest hidden md:block">Lumostime</h1>
        
        {/* View Mode Toggle */}
        <div className="flex bg-stone-100 rounded-lg p-1">
          <button onClick={() => setViewMode('week')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'week' ? 'bg-white shadow text-stone-800' : 'text-stone-500 hover:text-stone-800'}`}>
            <Layout size={16} className="inline mr-1.5 mb-0.5" />周
          </button>
          <button onClick={() => setViewMode('month')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'month' ? 'bg-white shadow text-stone-800' : 'text-stone-500 hover:text-stone-800'}`}>
            <Calendar size={16} className="inline mr-1.5 mb-0.5" />月
          </button>
          <button onClick={() => setViewMode('year')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'year' ? 'bg-white shadow text-stone-800' : 'text-stone-500 hover:text-stone-800'}`}>
            <Grid size={16} className="inline mr-1.5 mb-0.5" />年
          </button>
        </div>

        {/* Orientation Toggle */}
        <div className="flex bg-stone-100 rounded-lg p-1">
           <button onClick={() => setOrientation('landscape')} className={`p-1.5 rounded-md transition-all ${orientation === 'landscape' ? 'bg-white shadow text-stone-800' : 'text-stone-400'}`} title="Landscape">
             <Monitor size={18} />
           </button>
           <button onClick={() => setOrientation('portrait')} className={`p-1.5 rounded-md transition-all ${orientation === 'portrait' ? 'bg-white shadow text-stone-800' : 'text-stone-400'}`} title="Portrait">
             <Smartphone size={18} />
           </button>
        </div>

        {/* Theme Toggle */}
        <div className="flex items-center gap-2 bg-stone-100 rounded-lg p-1 px-2">
          <Palette size={16} className="text-stone-500" />
          <select 
            value={theme.id}
            onChange={(e) => setTheme(THEMES.find(t => t.id === e.target.value) || THEMES[0])}
            className="bg-transparent text-sm font-medium text-stone-700 outline-none cursor-pointer"
          >
            {THEMES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {/* Layout Toggle */}
        <div className="flex items-center gap-2 bg-stone-100 rounded-lg p-1 px-2">
          <Layers size={16} className="text-stone-500" />
          <select 
            value={layoutStyle}
            onChange={(e) => setLayoutStyle(e.target.value as LayoutStyle)}
            className="bg-transparent text-sm font-medium text-stone-700 outline-none cursor-pointer"
          >
            <option value="magazine">杂志风</option>
            <option value="minimal">极简风</option>
            <option value="newspaper">报纸风</option>
            <option value="film">胶片风</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between w-full xl:w-auto gap-4">
        <div className="flex items-center gap-2 font-serif text-lg mx-auto xl:mx-0">
          <button onClick={onPrev} className="p-1 hover:bg-stone-100 rounded-full transition-colors"><ChevronLeft size={20}/></button>
          <span className="min-w-[140px] text-center font-semibold text-stone-600">{dateLabel}</span>
          <button onClick={onNext} className="p-1 hover:bg-stone-100 rounded-full transition-colors"><ChevronRight size={20}/></button>
        </div>
        
        <button 
          onClick={onExport}
          disabled={isExporting}
          className={`bg-stone-800 text-white px-3 py-2 md:px-4 rounded-lg text-sm font-medium hover:bg-black transition-colors flex items-center gap-2 whitespace-nowrap ${isExporting ? 'opacity-75 cursor-wait' : ''}`}
        >
          {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          <span className="hidden md:inline">{isExporting ? '导出中...' : '导出图片'}</span>
        </button>
      </div>
    </div>
  );
};

// Extracted DayCard component with Content Logic
interface DayCardProps {
  day: Date;
  heightClass: string;
  entry?: DiaryEntry;
  theme: ColorTheme;
  layoutStyle: LayoutStyle;
}

const DayCard: React.FC<DayCardProps> = ({ day, heightClass, entry, theme, layoutStyle }) => {
  const hasImage = !!(entry && entry.imageUrl);
  const hasText = !!(entry && entry.content && entry.content.length > 0);
  const isEmpty = !entry;

  const isMinimal = layoutStyle === 'minimal';
  const isNewspaper = layoutStyle === 'newspaper';
  const isFilm = layoutStyle === 'film';
  const isMagazine = layoutStyle === 'magazine';

  // --- RENDERERS ---

  // 1. Newspaper Renderer
  if (isNewspaper) {
    return (
      <div 
        className={`relative flex flex-col w-full overflow-hidden border-r border-b group p-3 ${heightClass}`}
        style={{ backgroundColor: theme.colors.paper, borderColor: theme.colors.ink }}
      >
        {/* Header */}
        <div className="flex items-baseline justify-between border-b-2 pb-1 mb-2" style={{ borderColor: theme.colors.ink }}>
          <span className="font-display font-bold text-2xl leading-none" style={{ color: theme.colors.ink }}>{format(day, 'd')}</span>
          <span className="font-serif text-xs uppercase tracking-wider" style={{ color: theme.colors.inkLight }}>{format(day, 'EEE')}</span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col gap-2">
          {isEmpty && (
            <div className="w-full h-full flex items-center justify-center opacity-10">
              <Newspaper size={32} color={theme.colors.ink} />
            </div>
          )}
          
          {hasImage && (
            <div className={`w-full ${hasText ? 'h-[72%]' : 'h-full'} relative`}>
              <img src={entry!.imageUrl} className="w-full h-full object-cover grayscale contrast-125" alt="" crossOrigin="anonymous"/>
            </div>
          )}

          {hasText && (
            <div className={`${hasImage ? 'flex-1' : 'h-full'} overflow-hidden`}>
              <p 
                className={`font-serif text-xs leading-loose tracking-wide text-justify ${hasImage ? 'line-clamp-5' : ''}`} 
                style={{ color: theme.colors.ink }}
              >
                {!hasImage && <span className="float-left text-3xl font-display font-bold mr-2 leading-none mt-1" style={{ color: theme.colors.ink }}>{entry!.content.charAt(0)}</span>}
                {entry!.content}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. Film Renderer
  if (isFilm) {
    return (
      <div 
        className={`relative flex flex-col w-full overflow-hidden group ${heightClass}`}
        style={{ backgroundColor: theme.colors.ink }}
      >
        {/* Film Strip Borders (Top/Bottom) */}
        <div 
          className="h-4 w-full flex justify-between px-1 items-center border-b"
          style={{ borderColor: theme.colors.inkLight, backgroundColor: 'rgba(0,0,0,0.2)' }}
        >
           {Array.from({length: 8}).map((_, i) => (
             <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.colors.paper }}></div>
           ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 relative flex flex-col">
          {isEmpty && (
             <div className="w-full h-full flex items-center justify-center">
                <span className="font-mono text-xs opacity-50" style={{ color: theme.colors.paper }}>NO SIGNAL</span>
             </div>
          )}

          {hasImage && (
             <div className={`relative w-full ${hasText ? 'h-[78%]' : 'h-full'}`}>
                <img src={entry!.imageUrl} className="w-full h-full object-cover" alt="" crossOrigin="anonymous"/>
                {/* Date Overlay on Image if Full */}
                {!hasText && (
                   <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded font-mono text-xs shadow-sm" style={{ backgroundColor: theme.colors.ink, color: theme.colors.paper }}>
                     REC {format(day, 'MM/dd')}
                   </div>
                )}
             </div>
          )}

          {hasText && (
            <div 
              className={`w-full ${hasImage ? 'flex-1' : 'h-full'} p-3 flex items-center justify-center text-center relative`}
              style={{ backgroundColor: theme.colors.ink }}
            >
               {/* Intertitle Style */}
               <div className="border border-white/20 p-2 w-full h-full flex items-center justify-center" style={{ borderColor: theme.colors.inkLight }}>
                 <p className={`font-sans text-xs leading-loose tracking-wider ${hasImage ? 'line-clamp-3' : ''}`} style={{ color: theme.colors.paper }}>
                   {entry!.content}
                 </p>
               </div>
            </div>
          )}
          
          {/* Metadata Overlay for Mixed Mode */}
          {(hasImage || hasText) && (
            <div className="absolute top-2 left-2 text-[8px] font-mono tracking-widest uppercase opacity-60" style={{ color: theme.colors.paper }}>
               SCENE {format(day, 'd')} / {format(day, 'EEE')}
            </div>
          )}
        </div>

        <div 
          className="h-4 w-full flex justify-between px-1 items-center border-t"
          style={{ borderColor: theme.colors.inkLight, backgroundColor: 'rgba(0,0,0,0.2)' }}
        >
           {Array.from({length: 8}).map((_, i) => (
             <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.colors.paper }}></div>
           ))}
        </div>
      </div>
    );
  }

  // 3. Minimal Renderer
  if (isMinimal) {
    return (
      <div 
        className={`relative flex flex-col w-full overflow-hidden rounded-xl group ${heightClass}`}
        style={{ backgroundColor: theme.colors.highlight }}
      >
        {isEmpty && (
           <div className="w-full h-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.colors.border }}></div>
           </div>
        )}

        {hasImage && (
           <div className="absolute inset-0 w-full h-full">
              <img src={entry!.imageUrl} className="w-full h-full object-cover" alt="" crossOrigin="anonymous"/>
              {/* Gradient for text readability if text exists */}
              {hasText && <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>}
           </div>
        )}

        <div className={`relative z-10 w-full h-full flex flex-col justify-between p-4 ${hasImage && !hasText ? 'text-white' : ''}`}>
           <div className="text-xl font-bold font-sans" style={{ color: hasImage ? '#fff' : theme.colors.ink }}>{format(day, 'd')}</div>
           
           {hasText && (
             <div className="mt-auto">
               <p className="text-xs font-sans leading-relaxed line-clamp-3" style={{ color: hasImage ? '#fff' : theme.colors.ink }}>
                  {entry!.content}
               </p>
             </div>
           )}
        </div>
      </div>
    );
  }

  // 4. Magazine Renderer (Default)
  return (
    <div 
      className={`relative flex flex-col w-full overflow-hidden border shadow-sm group ${heightClass}`}
      style={{ backgroundColor: theme.colors.highlight, borderColor: theme.colors.border }}
    >
      {/* Date Badge */}
      <div className="absolute top-0 left-0 bg-white/90 px-3 py-1.5 border-b border-r z-10" style={{ borderColor: theme.colors.border }}>
         <span className="font-serif font-bold text-lg" style={{ color: theme.colors.ink }}>{format(day, 'd')}</span>
      </div>

      <div className="flex flex-col h-full">
         {isEmpty && (
            <div className="w-full h-full flex items-center justify-center opacity-20">
              <div className="w-full h-px mx-8" style={{ backgroundColor: theme.colors.inkLight }}></div>
            </div>
         )}

         {hasImage && (
           <div className={`${hasText ? 'h-[70%]' : 'h-full'} w-full relative border-b`} style={{ borderColor: theme.colors.border }}>
             <img src={entry!.imageUrl} className="w-full h-full object-cover grayscale-[10%] group-hover:grayscale-0 transition-all" alt="" crossOrigin="anonymous"/>
           </div>
         )}

         {hasText && (
            <div className={`flex-1 p-4 flex flex-col ${!hasImage ? 'justify-center' : ''} overflow-hidden`}>
               <p className={`font-serif text-xs leading-loose tracking-wide opacity-90 text-justify ${hasImage ? 'line-clamp-5' : ''}`} style={{ color: theme.colors.ink }}>
                 {entry!.content}
               </p>
            </div>
         )}
      </div>
    </div>
  );
};

// 2. Week View Layout
const WeekView = ({ date, entries, orientation, theme, layoutStyle }: { date: Date; entries: DiaryEntry[], orientation: Orientation, theme: ColorTheme, layoutStyle: LayoutStyle }) => {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });
  const topRowDays = days.slice(0, 4);
  const bottomRowDays = days.slice(4, 7);

  const isNewspaper = layoutStyle === 'newspaper';
  const isFilm = layoutStyle === 'film';

  // Container Styles
  const containerStyle = {
    backgroundColor: theme.colors.paper,
    border: isNewspaper ? `1px solid ${theme.colors.ink}` : 'none'
  };

  return (
    <div 
      className={`w-full h-full flex flex-col ${orientation === 'landscape' ? 'p-10' : 'p-6'} ${isNewspaper ? 'gap-0' : 'gap-6'}`}
      style={containerStyle}
    >
      {/* Header */}
      <div 
        className={`pb-4 flex justify-between items-end 
          ${isNewspaper ? 'border-b-2 mb-0 px-2 pt-2' : 'border-b mb-2'} 
        `}
        style={{ borderColor: theme.colors.ink }}
      >
        <div>
          <h2 className={`${isFilm ? 'font-mono tracking-widest uppercase' : getFontClass(layoutStyle)} ${isNewspaper ? 'text-5xl uppercase tracking-tighter' : 'text-4xl font-bold'}`} style={{ color: theme.colors.ink }}>
            {isNewspaper ? 'The Weekly Chronicle' : (isFilm ? 'CINEMA LOG' : 'WEEKLY LOG')}
          </h2>
          <p className={`${isFilm ? 'font-mono' : getFontClass(layoutStyle)} mt-1 tracking-widest text-xs md:text-sm`} style={{ color: theme.colors.inkLight }}>
            {format(start, 'yyyy.MM.dd')} — {format(end, 'yyyy.MM.dd')}
          </p>
        </div>
        <div className="text-right">
          <span className={`${isFilm ? 'font-mono' : getFontClass(layoutStyle)} italic text-xl md:text-2xl opacity-40`} style={{ color: theme.colors.ink }}>
            Vol. {format(date, 'w')}
          </span>
        </div>
      </div>

      {/* Content Layout */}
      {orientation === 'landscape' ? (
        <div className={`flex flex-col flex-1 ${isNewspaper ? 'gap-0 border-t-0' : 'gap-4'}`}>
          <div className={`grid grid-cols-4 ${isNewspaper ? 'gap-0' : 'gap-4'}`}>
            {topRowDays.map(day => {
              const entry = entries.find(e => isSameDay(e.date, day));
              return <DayCard key={day.toISOString()} day={day} heightClass="h-[480px]" entry={entry} theme={theme} layoutStyle={layoutStyle} />;
            })}
          </div>
          <div className={`grid grid-cols-3 ${isNewspaper ? 'gap-0 border-t' : 'gap-4'}`} style={{ borderColor: theme.colors.ink }}>
             {bottomRowDays.map(day => {
               const entry = entries.find(e => isSameDay(e.date, day));
               return <DayCard key={day.toISOString()} day={day} heightClass="h-[480px]" entry={entry} theme={theme} layoutStyle={layoutStyle} />;
             })}
          </div>
        </div>
      ) : (
        <div className={`grid grid-cols-2 flex-1 ${isNewspaper ? 'gap-0 border-t' : 'gap-3'}`} style={{ borderColor: theme.colors.ink }}>
          {days.map((day, idx) => {
             const entry = entries.find(e => isSameDay(e.date, day));
             return (
               <div key={day.toISOString()} className={`${idx === 6 ? 'col-span-2' : 'col-span-1'} h-[280px]`}>
                  <DayCard day={day} heightClass="h-full" entry={entry} theme={theme} layoutStyle={layoutStyle} />
               </div>
             );
          })}
        </div>
      )}
      
      {/* Footer */}
      <div 
        className={`pt-3 flex justify-between items-center text-[10px] tracking-widest uppercase ${isNewspaper ? 'mt-2 border-t-2 px-2' : 'border-t'}`}
        style={{ borderColor: theme.colors.ink, color: theme.colors.inkLight }}
      >
         <span className={`${isNewspaper ? 'text-lg font-display font-bold' : 'font-bold'}`} style={{ color: theme.colors.ink }}>Lumostime</span>
         <span className={`${isNewspaper ? 'text-xs' : ''}`}>Illuminate your life</span>
      </div>
    </div>
  );
};

// 3. Month View Layout (Visual Focused)
const MonthView = ({ date, entries, orientation, theme, layoutStyle }: { date: Date; entries: DiaryEntry[], orientation: Orientation, theme: ColorTheme, layoutStyle: LayoutStyle }) => {
  const monthStart = startOfMonth(date);
  const start = startOfWeek(monthStart, { weekStartsOn: 1 }); 
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });

  const isNewspaper = layoutStyle === 'newspaper';
  const isMinimal = layoutStyle === 'minimal';
  const isFilm = layoutStyle === 'film';
  const isMagazine = layoutStyle === 'magazine';

  // Styles
  let bg = theme.colors.paper;
  let headerColor = theme.colors.ink;
  let borderColor = isNewspaper ? theme.colors.ink : theme.colors.border;
  
  // Header Style
  const headerContainerClass = `flex justify-between items-end pb-4 mb-4 ${isNewspaper ? 'border-b-4' : ''} ${isMagazine ? 'border-b-2' : ''}`;

  return (
    <div 
      className={`w-full flex flex-col h-full justify-between ${orientation === 'landscape' ? 'p-12' : 'p-8'}`}
      style={{ 
        backgroundColor: bg,
        gap: isMinimal ? '2rem' : '1.5rem',
        border: isNewspaper ? `1px solid ${theme.colors.ink}` : 'none'
      }}
    >
      {/* Header */}
      <div 
        className={headerContainerClass}
        style={{ borderColor: borderColor }}
      >
         <div className="flex flex-col">
            <h2 
              className={`${isFilm ? 'font-mono tracking-tighter' : getFontClass(layoutStyle)} ${isNewspaper ? 'text-7xl tracking-tighter font-display' : 'text-5xl md:text-6xl font-bold'}`} 
              style={{ color: headerColor, lineHeight: 0.9 }}
            >
              {format(date, 'MMMM').toUpperCase()}
            </h2>
         </div>
         <div className="text-right">
            <span 
              className={`${isFilm ? 'font-mono' : getFontClass(layoutStyle)} ${isNewspaper ? 'text-4xl font-bold' : 'text-3xl italic font-serif'}`} 
              style={{ color: theme.colors.inkLight }}
            >
              {format(date, 'yyyy')}
            </span>
         </div>
      </div>

      {/* Grid */}
      <div 
        className={`grid grid-cols-7 flex-1 ${isMinimal ? 'gap-2' : (isNewspaper || isFilm ? 'gap-0' : 'gap-px')}`}
        style={{ 
          backgroundColor: isNewspaper || isFilm ? borderColor : 'transparent',
          border: isNewspaper ? `1px solid ${borderColor}` : 'none'
        }}
      >
        {/* Days Header */}
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(day => (
          <div 
            key={day} 
            className={`p-2 text-center text-xs font-bold ${isFilm ? 'font-mono' : getFontClass(layoutStyle)}`}
            style={{ 
              color: isFilm ? theme.colors.paper : theme.colors.inkLight,
              backgroundColor: isFilm ? theme.colors.ink : theme.colors.paper,
            }}
          >
            {day}
          </div>
        ))}

        {/* Days Cells */}
        {days.map((day) => {
          const entry = entries.find(e => isSameDay(e.date, day));
          const isCurrentMonth = isSameMonth(day, date);
          const cellHeight = orientation === 'landscape' ? 'min-h-[120px]' : 'min-h-[90px]';
          const hasImage = !!(entry && entry.imageUrl);
          
          return (
            <div 
              key={day.toISOString()} 
              className={`${cellHeight} relative flex flex-col transition-all duration-300`}
              style={{
                backgroundColor: !isCurrentMonth ? (isFilm ? theme.colors.ink : theme.colors.highlight) : (isFilm ? theme.colors.inkLight : theme.colors.paper),
                opacity: !isCurrentMonth ? 0.3 : 1,
                borderRadius: isMinimal ? '8px' : '0',
                overflow: 'hidden'
              }}
            >
              {/* Day Number */}
              <div className={`absolute top-1 left-2 z-10`}>
                 <span className={`${isFilm ? 'font-mono' : getFontClass(layoutStyle)} font-bold text-sm`} style={{ color: isFilm ? theme.colors.paper : (hasImage ? '#fff' : theme.colors.ink), textShadow: hasImage ? '0 1px 2px rgba(0,0,0,0.8)' : 'none' }}>
                  {format(day, 'd')}
                </span>
              </div>

              {/* Content Visualization (Image or Dot) */}
              {isCurrentMonth && (
                <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                  {hasImage ? (
                     <img 
                        src={entry!.imageUrl} 
                        className={`w-full h-full object-cover ${isNewspaper ? 'grayscale' : ''}`} 
                        alt="" 
                        crossOrigin="anonymous"
                      />
                  ) : (
                    // Placeholder for text-only or empty
                    entry ? (
                      <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: isFilm ? theme.colors.paper : theme.colors.accent }}></div>
                    ) : null
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

       {/* Footer */}
       <div 
        className={`pt-3 flex justify-between items-center text-[10px] tracking-widest uppercase ${isNewspaper ? 'border-t-2' : 'border-t'}`}
        style={{ 
            borderColor: borderColor, 
            color: theme.colors.inkLight,
        }}
      >
         <span className={`${isNewspaper ? 'text-lg font-display font-bold' : 'font-bold'}`} style={{ color: headerColor }}>Lumostime</span>
         <span>Illuminate Your Life</span>
      </div>
    </div>
  );
};

// 4. Year View Layout
const YearView = ({ date, entries, orientation, theme, layoutStyle }: { date: Date; entries: DiaryEntry[], orientation: Orientation, theme: ColorTheme, layoutStyle: LayoutStyle }) => {
  const months = Array.from({ length: 12 }, (_, i) => new Date(getYear(date), i, 1));
  
  const gridClass = orientation === 'landscape' 
    ? "grid-cols-4 gap-x-6 gap-y-8" 
    : "grid-cols-3 gap-x-3 gap-y-6";

  const isNewspaper = layoutStyle === 'newspaper';
  const isFilm = layoutStyle === 'film';

  const bg = theme.colors.paper;
  const ink = theme.colors.ink;
  const border = isNewspaper ? theme.colors.ink : theme.colors.border;

  return (
    <div 
      className={`w-full flex flex-col gap-6 ${orientation === 'landscape' ? 'p-12' : 'p-8'}`}
      style={{ backgroundColor: bg, border: isNewspaper ? `1px solid ${border}` : 'none' }}
    >
      {/* Title */}
      <div 
        className="text-center py-6 relative"
        style={{ 
          borderBottom: isNewspaper ? `4px solid ${border}` : `3px double ${border}`
        }}
      >
        <h2 className={`${isFilm ? 'font-mono' : getFontClass(layoutStyle)} text-6xl font-bold tracking-tight`} style={{ color: ink }}>
          {format(date, 'yyyy')}
        </h2>
      </div>

      {/* Grid of Months */}
      <div className={`grid ${gridClass}`}>
        {months.map((month) => {
           const start = startOfMonth(month);
           const end = endOfMonth(month);
           const monthDays = eachDayOfInterval({ start, end });
           const startDayOfWeek = (getDay(start) + 6) % 7; 
           const blanks = Array.from({ length: startDayOfWeek });

          return (
            <div key={month.toISOString()} className="flex flex-col gap-2">
              <div 
                className={`flex items-baseline justify-between pb-1 ${isNewspaper ? 'border-b-2' : 'border-b'}`}
                style={{ borderColor: border }}
              >
                <span className={`${isFilm ? 'font-mono' : getFontClass(layoutStyle)} font-bold text-xl`} style={{ color: ink }}>
                  {format(month, 'MM')}
                </span>
                <span className={`${isFilm ? 'font-mono' : getFontClass(layoutStyle)} text-[10px] tracking-widest uppercase`} style={{ color: theme.colors.inkLight }}>
                  {format(month, 'MMM')}
                </span>
              </div>
              
              {/* Daily Mosaic Grid */}
              <div className={`grid grid-cols-7 ${layoutStyle === 'minimal' ? 'gap-1' : (isNewspaper || isFilm ? 'gap-0 border border-stone-800' : 'gap-0.5')}`}>
                 {blanks.map((_, i) => <div key={`blank-${i}`} className="aspect-square"></div>)}
                 
                 {monthDays.map(day => {
                    const entry = entries.find(e => isSameDay(e.date, day));
                    // Visualization: Image > Color Block > Empty
                    return (
                        <div 
                          key={day.toISOString()} 
                          className={`aspect-square relative group ${layoutStyle === 'minimal' ? 'rounded-sm overflow-hidden' : ''} ${isNewspaper ? 'border-[0.5px] border-stone-300' : ''}`}
                        >
                            {entry?.imageUrl ? (
                                <img 
                                    src={entry.imageUrl} 
                                    className={`w-full h-full object-cover ${isNewspaper ? 'grayscale' : ''}`}
                                    crossOrigin="anonymous"
                                    alt=""
                                />
                            ) : (
                                <div 
                                  className="w-full h-full transition-colors"
                                  style={{ 
                                    backgroundColor: entry ? (isFilm ? theme.colors.ink : theme.colors.accent) : (isFilm ? theme.colors.inkLight : theme.colors.highlight),
                                    opacity: entry ? 1 : (isFilm ? 0.3 : 0.4)
                                  }}
                                ></div>
                            )}
                        </div>
                    )
                 })}
              </div>
            </div>
          );
        })}
      </div>
      
       {/* Footer for Year View */}
       <div 
        className={`pt-3 flex justify-between items-center text-[10px] tracking-widest uppercase ${isNewspaper ? 'border-t-2' : 'border-t'}`}
        style={{ 
            borderColor: border, 
            color: theme.colors.inkLight,
        }}
      >
         <span className={`${isNewspaper ? 'text-lg font-bold' : 'font-bold'}`} style={{ color: ink }}>Lumostime</span>
         <span>Illuminate Your Life</span>
      </div>
    </div>
  );
};

// --- Main App Logic ---

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  
  // Customization State
  const [theme, setTheme] = useState<ColorTheme>(THEMES[0]);
  const [layoutStyle, setLayoutStyle] = useState<LayoutStyle>('magazine');

  const exportRef = useRef<HTMLDivElement>(null);
  
  // Scaling state
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(800);

  // Target width definition
  const TARGET_WIDTH = orientation === 'landscape' ? 1000 : 700;

  // Generate mock data
  useEffect(() => {
    const start = new Date(getYear(currentDate), 0, 1);
    const end = new Date(getYear(currentDate), 11, 31);
    const mockData = generateMockEntries(start, end);
    setEntries(mockData);
  }, [currentDate]);

  // Handle Resize & Scaling
  useEffect(() => {
    const handleResize = () => {
      const margin = 20; 
      const availableWidth = window.innerWidth - margin;
      const newScale = Math.min(1, availableWidth / TARGET_WIDTH);
      setScale(newScale);
    };

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
         setContentHeight(entry.contentRect.height);
      }
    });

    if (exportRef.current) {
      resizeObserver.observe(exportRef.current);
    }

    window.addEventListener('resize', handleResize);
    handleResize(); // Init

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [viewMode, currentDate, orientation, TARGET_WIDTH, theme, layoutStyle]); 

  // Navigation Logic
  const handlePrev = () => {
    if (viewMode === 'week') setCurrentDate(d => subWeeks(d, 1));
    else if (viewMode === 'month') setCurrentDate(d => subMonths(d, 1));
    else setCurrentDate(d => subYears(d, 1));
  };

  const handleNext = () => {
    if (viewMode === 'week') setCurrentDate(d => addWeeks(d, 1));
    else if (viewMode === 'month') setCurrentDate(d => addMonths(d, 1));
    else setCurrentDate(d => addYears(d, 1));
  };

  const handleExport = async () => {
    if (exportRef.current && !isExporting) {
      setIsExporting(true);
      // Give UI a moment to update state before freezing for generation
      setTimeout(async () => {
        try {
          if (!exportRef.current) return;
          const dataUrl = await htmlToImage.toPng(exportRef.current, { 
            quality: 1.0,
            backgroundColor: theme.colors.paper,
            pixelRatio: 2,
            width: TARGET_WIDTH, 
            height: exportRef.current.offsetHeight
          });
          const link = document.createElement('a');
          link.download = `diary-${viewMode}-${orientation}-${format(currentDate, 'yyyy-MM-dd')}.png`;
          link.href = dataUrl;
          link.click();
        } catch (error) {
          console.error('Export failed:', error);
          alert('导出失败，请重试');
        } finally {
          setIsExporting(false);
        }
      }, 100);
    }
  };

  return (
    <div className="min-h-screen font-serif overflow-x-hidden transition-colors duration-500" style={{ backgroundColor: '#e5e5e5' }}>
      <Controls 
        viewMode={viewMode} setViewMode={setViewMode}
        orientation={orientation} setOrientation={setOrientation}
        theme={theme} setTheme={setTheme}
        layoutStyle={layoutStyle} setLayoutStyle={setLayoutStyle}
        onPrev={handlePrev} onNext={handleNext}
        currentDate={currentDate} onExport={handleExport}
        isExporting={isExporting}
      />

      <div className="w-full flex justify-center pt-36 md:pt-32 pb-12">
        {/* Scaling Wrapper */}
        <div 
           style={{ 
             width: TARGET_WIDTH * scale, 
             height: contentHeight * scale,
             transition: 'width 0.3s, height 0.3s'
           }}
           className="relative"
        >
          {/* Transform Container */}
          <div 
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              width: TARGET_WIDTH,
              position: 'absolute',
              top: 0,
              left: 0
            }}
          >
            <div 
              ref={exportRef} 
              className={`shadow-2xl origin-top min-h-[600px] transition-colors duration-500 ${orientation === 'landscape' ? 'rounded-sm' : 'rounded-none'}`}
              style={{ 
                width: TARGET_WIDTH, 
                backgroundColor: theme.colors.paper,
                backgroundImage: `url('${NOISE_PATTERN}')` 
              }}
            >
              {viewMode === 'week' && <WeekView date={currentDate} entries={entries} orientation={orientation} theme={theme} layoutStyle={layoutStyle} />}
              {viewMode === 'month' && <MonthView date={currentDate} entries={entries} orientation={orientation} theme={theme} layoutStyle={layoutStyle} />}
              {viewMode === 'year' && <YearView date={currentDate} entries={entries} orientation={orientation} theme={theme} layoutStyle={layoutStyle} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}