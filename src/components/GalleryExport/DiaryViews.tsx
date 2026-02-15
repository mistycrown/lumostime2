/**
 * @file DiaryViews.tsx
 * @description 周/月/年视图组件 - 手机端布局（完全参照 serif-diary-layout 示例）
 */
import React from 'react';
import { 
    format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, 
    startOfMonth, endOfMonth, isSameMonth, getYear, getDay 
} from 'date-fns';
import { DayCard, DiaryEntry, ColorTheme, LayoutStyle, getFontClass } from './DiaryComponents';

interface ViewProps {
    date: Date;
    entries: DiaryEntry[];
    theme: ColorTheme;
    layoutStyle: LayoutStyle;
    orientation: 'portrait' | 'landscape';
}

// 周视图 - 支持横竖屏
export const WeekView: React.FC<ViewProps> = ({ date, entries, theme, layoutStyle, orientation }) => {
    const start = startOfWeek(date, { weekStartsOn: 1 });
    const end = endOfWeek(date, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });

    const isNewspaper = layoutStyle === 'newspaper';
    const isFilm = layoutStyle === 'film';

    const containerStyle = {
        backgroundColor: theme.colors.paper,
        border: isNewspaper ? `1px solid ${theme.colors.ink}` : 'none'
    };

    // 横屏布局 - A4横向比例
    if (orientation === 'landscape') {
        const topRowDays = days.slice(0, 4);
        const bottomRowDays = days.slice(4, 7);

        return (
            <div 
                className={`w-full flex flex-col ${isNewspaper ? 'gap-0 p-6' : 'gap-4 p-8'}`}
                style={containerStyle}
            >
                {/* Header */}
                <div 
                    className={`${isNewspaper ? 'pb-3' : 'pb-4'} flex justify-between items-end ${isNewspaper ? 'border-b-2 mb-0 px-2' : 'border-b mb-2'}`}
                    style={{ borderColor: theme.colors.ink }}
                >
                    <div>
                        <h2 className={`${isFilm ? 'font-mono tracking-widest uppercase' : getFontClass(layoutStyle)} ${isNewspaper ? 'text-3xl uppercase tracking-tighter' : 'text-2xl font-bold'}`} style={{ color: theme.colors.ink }}>
                            {isNewspaper ? 'The Weekly Chronicle' : (isFilm ? 'CINEMA LOG' : 'WEEKLY LOG')}
                        </h2>
                        <p className={`${isFilm ? 'font-mono' : getFontClass(layoutStyle)} mt-1 tracking-widest text-xs`} style={{ color: theme.colors.inkLight }}>
                            {format(start, 'yyyy.MM.dd')} — {format(end, 'yyyy.MM.dd')}
                        </p>
                    </div>
                    <div className="text-right">
                        <span className={`${isFilm ? 'font-mono' : getFontClass(layoutStyle)} italic text-xl opacity-40`} style={{ color: theme.colors.ink }}>
                            Vol. {format(date, 'w')}
                        </span>
                    </div>
                </div>

                {/* Content Layout - 横屏：4+3布局，A4比例高度 */}
                <div className={`flex flex-col ${isNewspaper ? 'gap-0 border-t-0' : 'gap-4'}`}>
                    <div className={`grid grid-cols-4 ${isNewspaper ? 'gap-0' : 'gap-3'}`}>
                        {topRowDays.map(day => {
                            const entry = entries.find(e => isSameDay(e.date, day));
                            return <DayCard key={day.toISOString()} day={day} heightClass="h-48" entry={entry} theme={theme} layoutStyle={layoutStyle} />;
                        })}
                    </div>
                    <div className={`grid grid-cols-3 ${isNewspaper ? 'gap-0 border-t' : 'gap-3'}`} style={{ borderColor: theme.colors.ink }}>
                        {bottomRowDays.map(day => {
                            const entry = entries.find(e => isSameDay(e.date, day));
                            return <DayCard key={day.toISOString()} day={day} heightClass="h-48" entry={entry} theme={theme} layoutStyle={layoutStyle} />;
                        })}
                    </div>
                </div>
                
                {/* Footer */}
                <div 
                    className={`pt-3 flex justify-between items-center text-[10px] tracking-widest uppercase ${isNewspaper ? 'mt-2 border-t-2 px-2' : 'border-t'}`}
                    style={{ borderColor: theme.colors.ink, color: theme.colors.inkLight }}
                >
                    <span className={`${isNewspaper ? 'text-base font-display font-bold' : 'font-bold'}`} style={{ color: theme.colors.ink }}>Lumostime</span>
                    <span className={`${isNewspaper ? 'text-[10px]' : ''}`}>Illuminate your life</span>
                </div>
            </div>
        );
    }

    // 竖屏布局（原有代码）
    return (
        <div 
            className={`w-full h-full flex flex-col ${isNewspaper ? 'gap-0' : 'gap-6'} ${isNewspaper ? 'p-6' : 'p-6'}`}
            style={containerStyle}
        >
            {/* Header */}
            <div 
                className={`${isNewspaper ? 'pb-2' : 'pb-4'} flex justify-between items-end ${isNewspaper ? 'border-b mb-0 px-2 pt-2' : 'border-b mb-2'}`}
                style={{ borderColor: theme.colors.ink }}
            >
                <div>
                    <h2 className={`${isFilm ? 'font-mono tracking-widest uppercase' : getFontClass(layoutStyle)} ${isNewspaper ? 'text-3xl uppercase tracking-tighter' : 'text-2xl font-bold'}`} style={{ color: theme.colors.ink }}>
                        {isNewspaper ? 'The Weekly Chronicle' : (isFilm ? 'CINEMA LOG' : 'WEEKLY LOG')}
                    </h2>
                    <p className={`${isFilm ? 'font-mono' : getFontClass(layoutStyle)} mt-1 tracking-widest text-xs`} style={{ color: theme.colors.inkLight }}>
                        {format(start, 'yyyy.MM.dd')} — {format(end, 'yyyy.MM.dd')}
                    </p>
                </div>
                <div className="text-right">
                    <span className={`${isFilm ? 'font-mono' : getFontClass(layoutStyle)} italic text-xl opacity-40`} style={{ color: theme.colors.ink }}>
                        Vol. {format(date, 'w')}
                    </span>
                </div>
            </div>

            {/* Content Layout - 手机端：2列网格，最后一天占2列 */}
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

// 月视图 - 支持横竖屏
export const MonthView: React.FC<ViewProps> = ({ date, entries, theme, layoutStyle, orientation }) => {
    const monthStart = startOfMonth(date);
    const start = startOfWeek(monthStart, { weekStartsOn: 1 }); 
    const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });

    const isNewspaper = layoutStyle === 'newspaper';
    const isMinimal = layoutStyle === 'minimal';
    const isFilm = layoutStyle === 'film';

    const bg = isFilm ? theme.colors.ink : theme.colors.paper;
    const headerColor = isFilm ? theme.colors.paper : theme.colors.ink;
    const borderColor = isNewspaper ? theme.colors.ink : theme.colors.border;

    return (
        <div 
            className="w-full flex flex-col h-full justify-between"
            style={{ 
                backgroundColor: bg,
                border: isNewspaper ? `1px solid ${theme.colors.ink}` : (isFilm ? `2px solid ${theme.colors.ink}` : 'none')
            }}
        >
            {/* Film Top Sprocket Holes */}
            {isFilm && (
                <div 
                    className="h-3 w-full flex justify-between px-2 items-center border-b"
                    style={{ borderColor: theme.colors.inkLight, backgroundColor: 'rgba(0,0,0,0.3)' }}
                >
                    {Array.from({length: 16}).map((_, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.colors.paper }}></div>
                    ))}
                </div>
            )}

            <div className="flex-1 flex flex-col p-4" style={{ gap: isMinimal ? '1rem' : '0.75rem' }}>
                {/* Header */}
                <div 
                    className={`flex justify-between items-end pb-2 mb-2 ${isNewspaper ? 'border-b-2' : 'border-b'}`}
                    style={{ borderColor: isFilm ? theme.colors.paper : borderColor }}
                >
                    <div className="flex flex-col">
                        <h2 
                            className={`${isFilm ? 'font-mono tracking-tighter' : getFontClass(layoutStyle)} ${isNewspaper ? 'text-3xl tracking-tighter font-display' : 'text-2xl font-bold'}`} 
                            style={{ color: headerColor, lineHeight: 0.9 }}
                        >
                            {format(date, 'MMMM').toUpperCase()}
                        </h2>
                    </div>
                    <div className="text-right">
                        <span 
                            className={`${isFilm ? 'font-mono' : getFontClass(layoutStyle)} ${isNewspaper ? 'text-xl font-bold' : 'text-lg italic font-serif'}`} 
                            style={{ color: isFilm ? theme.colors.paper : theme.colors.inkLight }}
                        >
                            {format(date, 'yyyy')}
                        </span>
                    </div>
                </div>

                {/* Grid */}
                <div 
                    className={`grid grid-cols-7 flex-1 ${isMinimal ? 'gap-1' : (isNewspaper || isFilm ? 'gap-0' : 'gap-px')}`}
                    style={{ 
                        backgroundColor: isNewspaper || isFilm ? borderColor : 'transparent',
                        border: isNewspaper ? `1px solid ${borderColor}` : (isFilm ? `1px solid ${theme.colors.paper}` : 'none')
                    }}
                >
                    {/* Days Header */}
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(day => (
                        <div 
                            key={day} 
                            className={`p-1 text-center text-[8px] font-bold ${isFilm ? 'font-mono' : getFontClass(layoutStyle)}`}
                            style={{ 
                                color: isFilm ? theme.colors.ink : theme.colors.inkLight,
                                backgroundColor: isFilm ? theme.colors.paper : theme.colors.paper,
                                borderBottom: isFilm ? `1px solid ${theme.colors.inkLight}` : 'none'
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
                                    backgroundColor: isFilm ? theme.colors.inkLight : theme.colors.paper,
                                    borderRadius: isMinimal ? '4px' : '0',
                                    overflow: 'hidden',
                                    border: isFilm ? `0.5px solid ${theme.colors.paper}` : 'none'
                                }}
                            >
                                {/* Day Number - 始终显示 */}
                                <div className="absolute top-0.5 left-1 z-10">
                                    <span 
                                        className={`${isFilm ? 'font-mono' : getFontClass(layoutStyle)} font-bold text-[8px]`} 
                                        style={{ 
                                            color: isFilm 
                                                ? theme.colors.paper 
                                                : (hasImage 
                                                    ? '#fff' 
                                                    : (isCurrentMonth ? theme.colors.ink : theme.colors.inkLight)
                                                ),
                                            textShadow: hasImage && !isFilm ? '0 1px 2px rgba(0,0,0,0.8)' : 'none',
                                            opacity: isCurrentMonth ? 1 : 0.4
                                        }}
                                    >
                                        {format(day, 'd')}
                                    </span>
                                </div>

                                {/* Content Visualization */}
                                <div className="absolute inset-0 w-full h-full flex items-center justify-center" style={{ opacity: isCurrentMonth ? 1 : 0.15 }}>
                                    {hasImage ? (
                                        <div className="relative w-full h-full">
                                            <img 
                                                src={entry!.imageUrl} 
                                                className="w-full h-full object-cover" 
                                                alt="" 
                                                crossOrigin="anonymous"
                                            />
                                            {isNewspaper && (
                                                <div 
                                                    className="absolute inset-0 pointer-events-none"
                                                    style={{
                                                        backgroundColor: theme.colors.ink,
                                                        opacity: 0.08,
                                                        mixBlendMode: 'multiply'
                                                    }}
                                                />
                                            )}
                                            {isFilm && (
                                                <div className="absolute inset-0 border border-transparent pointer-events-none" style={{
                                                    boxShadow: `inset 0 0 0 1px ${theme.colors.paper}`
                                                }}></div>
                                            )}
                                        </div>
                                    ) : (
                                        entry && isCurrentMonth ? (
                                            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: isFilm ? theme.colors.paper : theme.colors.accent }}></div>
                                        ) : null
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div 
                    className={`pt-1.5 flex justify-between items-center text-[8px] tracking-widest uppercase ${isNewspaper ? 'border-t' : 'border-t'}`}
                    style={{ 
                        borderColor: isFilm ? theme.colors.paper : borderColor, 
                        color: isFilm ? theme.colors.paper : theme.colors.inkLight,
                    }}
                >
                    <span className={`${isNewspaper ? 'text-xs font-display font-bold' : 'font-bold'}`} style={{ color: isFilm ? theme.colors.paper : headerColor }}>Lumostime</span>
                    <span>Illuminate Your Life</span>
                </div>
            </div>

            {/* Film Bottom Sprocket Holes */}
            {isFilm && (
                <div 
                    className="h-3 w-full flex justify-between px-2 items-center border-t"
                    style={{ borderColor: theme.colors.inkLight, backgroundColor: 'rgba(0,0,0,0.3)' }}
                >
                    {Array.from({length: 16}).map((_, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.colors.paper }}></div>
                    ))}
                </div>
            )}
        </div>
    );
};

// 年视图 - 支持横竖屏
export const YearView: React.FC<ViewProps> = ({ date, entries, theme, layoutStyle, orientation }) => {
    const months = Array.from({ length: 12 }, (_, i) => new Date(getYear(date), i, 1));
    
    // 根据横竖屏调整布局 - 参照参考代码
    const gridClass = orientation === 'landscape' ? "grid-cols-4 gap-x-3 gap-y-4" : "grid-cols-3 gap-x-3 gap-y-6";

    const isNewspaper = layoutStyle === 'newspaper';
    const isFilm = layoutStyle === 'film';

    const bg = isFilm ? theme.colors.ink : theme.colors.paper;
    const ink = isFilm ? theme.colors.paper : theme.colors.ink;
    const border = isNewspaper ? theme.colors.ink : (isFilm ? theme.colors.paper : theme.colors.border);

    return (
        <div 
            className="w-full h-full flex flex-col"
            style={{ 
                backgroundColor: bg, 
                border: isNewspaper ? `1px solid ${theme.colors.ink}` : (isFilm ? `2px solid ${theme.colors.ink}` : 'none')
            }}
        >
            {/* Film Top Sprocket Holes */}
            {isFilm && (
                <div 
                    className="h-4 w-full flex justify-between px-3 items-center border-b flex-shrink-0"
                    style={{ borderColor: theme.colors.inkLight, backgroundColor: 'rgba(0,0,0,0.3)' }}
                >
                    {Array.from({length: 20}).map((_, i) => (
                        <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.colors.paper }}></div>
                    ))}
                </div>
            )}

            <div className={`flex-1 flex flex-col gap-2 ${orientation === 'landscape' ? 'p-4' : 'p-4'} min-h-0`}>
                {/* Title */}
                <div 
                    className={`text-center ${orientation === 'landscape' ? 'py-3' : 'py-3'} relative`}
                    style={{ 
                        borderBottom: isNewspaper ? `2px solid ${border}` : (isFilm ? `1px solid ${border}` : `2px double ${border}`)
                    }}
                >
                    <h2 className={`${isFilm ? 'font-mono tracking-widest' : getFontClass(layoutStyle)} ${orientation === 'landscape' ? 'text-3xl' : 'text-3xl'} font-bold ${isFilm ? 'uppercase' : 'tracking-tight'}`} style={{ color: ink }}>
                        {isFilm ? `FILM ARCHIVE ${format(date, 'yyyy')}` : format(date, 'yyyy')}
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
                            <div 
                                key={month.toISOString()} 
                                className="flex flex-col gap-1"
                                style={{
                                    border: isFilm ? `1px solid ${theme.colors.paper}` : 'none',
                                    padding: isFilm ? '0.5rem' : '0',
                                    backgroundColor: isFilm ? 'rgba(0,0,0,0.2)' : 'transparent'
                                }}
                            >
                                <div 
                                    className={`flex items-baseline justify-between pb-0.5 ${isNewspaper ? 'border-b' : 'border-b'}`}
                                    style={{ borderColor: border }}
                                >
                                    <span className={`${isFilm ? 'font-mono' : getFontClass(layoutStyle)} font-bold ${orientation === 'landscape' ? 'text-sm' : 'text-sm'}`} style={{ color: ink }}>
                                        {format(month, 'MM')}
                                    </span>
                                    <span className={`${isFilm ? 'font-mono' : getFontClass(layoutStyle)} text-[8px] tracking-widest uppercase`} style={{ color: isFilm ? theme.colors.paper : theme.colors.inkLight }}>
                                        {format(month, 'MMM')}
                                    </span>
                                </div>
                                
                                {/* Daily Mosaic Grid */}
                                <div className={`grid grid-cols-7 ${layoutStyle === 'minimal' ? 'gap-0.5' : (isNewspaper || isFilm ? 'gap-0 border' : 'gap-px')}`} style={{ borderColor: isFilm ? theme.colors.paper : 'rgb(41 37 36)' }}>
                                    {blanks.map((_, i) => <div key={`blank-${i}`} className="aspect-square"></div>)}
                                    
                                    {monthDays.map(day => {
                                        const entry = entries.find(e => isSameDay(e.date, day));
                                        const dayNum = format(day, 'd');
                                        return (
                                            <div 
                                                key={day.toISOString()} 
                                                className={`aspect-square relative group ${layoutStyle === 'minimal' ? 'rounded-sm overflow-hidden' : ''} ${isNewspaper ? 'border-[0.5px] border-stone-300' : ''}`}
                                                style={{
                                                    border: isFilm ? `0.5px solid ${theme.colors.paper}` : 'none'
                                                }}
                                            >
                                                {entry?.imageUrl ? (
                                                    <div className="relative w-full h-full">
                                                        <img 
                                                            src={entry.imageUrl} 
                                                            className="w-full h-full object-cover"
                                                            crossOrigin="anonymous"
                                                            alt=""
                                                        />
                                                        {isNewspaper && (
                                                            <div 
                                                                className="absolute inset-0 pointer-events-none"
                                                                style={{
                                                                    backgroundColor: theme.colors.ink,
                                                                    opacity: 0.08,
                                                                    mixBlendMode: 'multiply'
                                                                }}
                                                            />
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div 
                                                        className="w-full h-full transition-colors relative flex items-center justify-center"
                                                        style={{ 
                                                            backgroundColor: entry ? (isFilm ? theme.colors.inkLight : theme.colors.accent) : (isFilm ? 'rgba(0,0,0,0.3)' : theme.colors.highlight),
                                                            opacity: entry ? 1 : (isFilm ? 0.5 : 0.4)
                                                        }}
                                                    >
                                                        {/* 日期数字 - 只在无图片时显示 */}
                                                        <span 
                                                            className={`${isFilm ? 'font-mono' : getFontClass(layoutStyle)} font-bold text-[6px] leading-none`}
                                                            style={{ 
                                                                color: isFilm ? theme.colors.paper : theme.colors.inkLight,
                                                                opacity: 0.6
                                                            }}
                                                        >
                                                            {dayNum}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                {/* Footer */}
                <div 
                    className={`pt-1.5 flex justify-between items-center text-[8px] tracking-widest uppercase ${isNewspaper ? 'border-t' : 'border-t'}`}
                    style={{ 
                        borderColor: border, 
                        color: isFilm ? theme.colors.paper : theme.colors.inkLight,
                    }}
                >
                    <span className={`${isNewspaper ? 'text-xs font-bold' : 'font-bold'} ${isFilm ? 'font-mono' : ''}`} style={{ color: ink }}>Lumostime</span>
                    <span className={isFilm ? 'font-mono' : ''}>Illuminate Your Life</span>
                </div>
            </div>

            {/* Film Bottom Sprocket Holes */}
            {isFilm && (
                <div 
                    className="h-4 w-full flex justify-between px-3 items-center border-t"
                    style={{ borderColor: theme.colors.inkLight, backgroundColor: 'rgba(0,0,0,0.3)' }}
                >
                    {Array.from({length: 20}).map((_, i) => (
                        <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.colors.paper }}></div>
                    ))}
                </div>
            )}
        </div>
    );
};
