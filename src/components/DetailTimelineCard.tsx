/**
 * @file DetailTimelineCard.tsx
 * @input Filtered logs, display date, entity info
 * @output Timeline UI with calendar, stats, and history
 * @pos Component (Shared Detail View UI)
 * @description 详情页面共享的时间线卡片组件，包括月历热图、统计信息和历史记录列表
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useMemo } from 'react';
import { Log, Category } from '../types';
import { CalendarWidget } from './CalendarWidget';
import { Clock, Zap, MessageCircle, ChevronLeft, ChevronRight, Grid, Image as ImageIcon, Hash } from 'lucide-react';
import { TimelineImage } from './TimelineImage';

interface DetailTimelineCardProps {
    // 数据
    filteredLogs: Log[];              // 已过滤的日志（category/activity/scope特定）
    displayDate: Date;                // 当前显示的月份
    onDateChange: (date: Date) => void;

    // 自定义选项
    customScale?: { min: number; max: number }; // 可选的热图刻度
    entityInfo: {                     // 实体信息（用于显示标签）
        icon?: string;
        name: string;
        type: 'category' | 'activity' | 'scope' | 'other';
    };

    // 回调
    onEditLog?: (log: Log) => void;

    // 可选的类别信息（用于显示activity名称）
    categories?: Category[];

    // 自定义元数据渲染（用于显示不同页面特定的标签）
    renderLogMetadata?: (log: Log) => React.ReactNode;
    // 默认视图模式 (默认 'month')
    defaultViewMode?: 'month' | 'all';
    
    // 待办列表（用于获取 Cover Image）
    todos?: import('../types').TodoItem[];
    
    // 关键字支持
    keywords?: string[];
    
    // 专注分数支持
    enableFocusScore?: boolean;
}

export const DetailTimelineCard: React.FC<DetailTimelineCardProps> = ({
    filteredLogs,
    displayDate,
    onDateChange,
    customScale,
    entityInfo,
    onEditLog,
    categories,
    renderLogMetadata,
    defaultViewMode = 'month',
    todos = [],
    keywords = [],
    enableFocusScore = false
}) => {
    const [viewMode, setViewMode] = React.useState<'month' | 'all'>(defaultViewMode);
    const [calendarViewMode, setCalendarViewMode] = React.useState<'heatmap' | 'gallery' | 'keywords'>('heatmap');

    const displayMonth = displayDate.getMonth();
    const displayYear = displayDate.getFullYear();
    
    // 关键字颜色系统
    const KEYWORD_COLORS = [
        'bg-red-100 text-red-600 border-red-200',
        'bg-cyan-100 text-cyan-600 border-cyan-200',
        'bg-yellow-100 text-yellow-600 border-yellow-200',
        'bg-blue-100 text-blue-600 border-blue-200',
        'bg-orange-100 text-orange-600 border-orange-200',
        'bg-teal-100 text-teal-600 border-teal-200',
        'bg-amber-100 text-amber-600 border-amber-200',
        'bg-indigo-100 text-indigo-600 border-indigo-200',
        'bg-lime-100 text-lime-600 border-lime-200',
        'bg-purple-100 text-purple-600 border-purple-200',
        'bg-green-100 text-green-600 border-green-200',
        'bg-fuchsia-100 text-fuchsia-600 border-fuchsia-200',
        'bg-emerald-100 text-emerald-600 border-emerald-200',
        'bg-pink-100 text-pink-600 border-pink-200',
        'bg-sky-100 text-sky-600 border-sky-200',
        'bg-rose-100 text-rose-600 border-rose-200',
        'bg-violet-100 text-violet-600 border-violet-200',
    ];

    const getKeywordColor = (keyword: string) => {
        let index = keywords.indexOf(keyword);
        if (index === -1) {
            let hash = 0;
            for (let i = 0; i < keyword.length; i++) {
                hash = keyword.charCodeAt(i) + ((hash << 5) - hash);
            }
            index = Math.abs(hash);
        }
        const colorIndex = index % KEYWORD_COLORS.length;
        return KEYWORD_COLORS[colorIndex];
    };

    // 当月日志
    const monthLogs = useMemo(() => filteredLogs.filter(log => {
        const d = new Date(log.startTime);
        return d.getMonth() === displayMonth && d.getFullYear() === displayYear;
    }), [filteredLogs, displayMonth, displayYear]);

    // 智能判断初始视图：检测当月是否有足够的图片
    React.useEffect(() => {
        // 如果有关键字，不自动切换视图
        if (keywords.length > 0) return;
        
        let imageCount = 0;
        
        monthLogs.forEach(log => {
            // 统计记录本身的图片
            if (log.images && log.images.length > 0) {
                imageCount += log.images.length;
            } else if (log.linkedTodoId && todos && todos.length > 0) {
                // 统计关联待办的 Cover Image
                const linkedTodo = todos.find(t => t.id === log.linkedTodoId);
                if (linkedTodo?.coverImage) {
                    imageCount += 1;
                }
            }
        });

        // 如果图片总数大于 3，优先显示画廊视图
        if (imageCount > 3) {
            setCalendarViewMode('gallery');
        } else {
            setCalendarViewMode('heatmap');
        }
    }, [monthLogs, todos, displayMonth, displayYear, keywords.length]); // 当月份变化时重新判断

    // 显示日志：根据模式选择
    const logsToDisplay = viewMode === 'month' ? monthLogs : filteredLogs;

    // 总计统计
    const totalSeconds = filteredLogs.reduce((acc, curr) => acc + curr.duration, 0);
    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMins = Math.floor((totalSeconds % 3600) / 60);

    // 当月统计
    const monthSeconds = monthLogs.reduce((acc, curr) => acc + curr.duration, 0);
    const monthHours = Math.floor(monthSeconds / 3600);
    const monthMins = Math.floor((monthSeconds % 3600) / 60);

    // 平均时长 (All View)
    const avgDurationMins = filteredLogs.length > 0
        ? Math.round(totalSeconds / filteredLogs.length / 60)
        : 0;
    const avgDurationH = Math.floor(avgDurationMins / 60);
    const avgDurationM = avgDurationMins % 60;

    // 热图/分组数据
    const groupedData = useMemo(() => {
        // 使用 logsToDisplay 进行分组
        // 这里的 key 需要包含完整日期信息以便排序 (timestamp or YYYY-MM-DD)
        // 为了复用现有逻辑（按日分组），我们使用 timestamp (Start of day) 作为 key
        const map = new Map<number, number>(); // Key: timestamp of start of day
        const logsMap = new Map<number, Log[]>();

        logsToDisplay.forEach(log => {
            const d = new Date(log.startTime);
            const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

            map.set(startOfDay, (map.get(startOfDay) || 0) + log.duration);

            if (!logsMap.has(startOfDay)) {
                logsMap.set(startOfDay, []);
            }
            logsMap.get(startOfDay)!.push(log);
        });

        return { durationMap: map, logsMap };
    }, [logsToDisplay]);

    // 计算日历数据（包含热力图和画廊数据）
    const calendarData = useMemo(() => {
        const map = new Map<number, { duration: number; images: string[]; focusScore?: number }>();
        const daysInMonth = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0).getDate();
        
        // 初始化所有日期
        for (let day = 1; day <= daysInMonth; day++) {
            map.set(day, { duration: 0, images: [] });
        }
        
        // 填充数据
        monthLogs.forEach(log => {
            const d = new Date(log.startTime);
            const day = d.getDate();
            const current = map.get(day)!;
            current.duration += log.duration;
            
            // 收集所有图片（从日记记录中）
            if (log.images && log.images.length > 0) {
                // 将这条记录的所有图片添加到当天的图片列表中
                log.images.forEach(img => {
                    if (!current.images.includes(img)) {
                        current.images.push(img);
                    }
                });
            } else if (log.linkedTodoId && todos && todos.length > 0) {
                // 如果记录没有图片，但关联了待办，尝试获取待办的 Cover Image
                const linkedTodo = todos.find(t => t.id === log.linkedTodoId);
                if (linkedTodo?.coverImage && !current.images.includes(linkedTodo.coverImage)) {
                    current.images.push(linkedTodo.coverImage);
                }
            }
            
            // 累计专注分数
            if (log.focusScore) {
                if (!current.focusScore) {
                    current.focusScore = log.focusScore;
                } else {
                    current.focusScore += log.focusScore;
                }
            }
        });
        
        return map;
    }, [monthLogs, displayDate, todos]);

    const handleMonthChange = (offset: number) => {
        const newDate = new Date(displayDate);
        newDate.setMonth(newDate.getMonth() + offset);
        onDateChange(newDate);
    };

    // 热力图颜色计算函数
    const getHeatmapColor = (duration: number) => {
        if (duration === 0) return { bg: 'bg-stone-50', text: 'text-stone-300', border: 'border-stone-100' };
        
        // 阈值逻辑
        let t1 = 1800; // 30m
        let t2 = 7200; // 2h
        let t3 = 14400; // 4h

        if (customScale && customScale.max > customScale.min) {
            const min = Math.max(0, customScale.min);
            const max = Math.max(min + 60, customScale.max);
            const range = max - min;
            t1 = min + (range * 0.33);
            t2 = min + (range * 0.66);
            t3 = max;
        }

        if (customScale) {
            if (duration >= customScale.max) {
                return { bg: 'bg-stone-700', text: 'text-white', border: 'border-stone-700' };
            } else if (duration <= t1) {
                return { bg: 'bg-stone-100', text: 'text-stone-600', border: 'border-stone-200' };
            } else if (duration <= t2) {
                return { bg: 'bg-stone-300', text: 'text-stone-800', border: 'border-stone-300' };
            } else {
                return { bg: 'bg-stone-500', text: 'text-white', border: 'border-stone-500' };
            }
        } else {
            if (duration <= 1800) {
                return { bg: 'bg-stone-100', text: 'text-stone-600', border: 'border-stone-200' };
            } else if (duration <= 7200) {
                return { bg: 'bg-stone-300', text: 'text-stone-800', border: 'border-stone-300' };
            } else if (duration <= 14400) {
                return { bg: 'bg-stone-500', text: 'text-white', border: 'border-stone-500' };
            } else {
                return { bg: 'bg-stone-700', text: 'text-white', border: 'border-stone-700' };
            }
        }
    };

    return (
        <>
            {viewMode === 'month' ? (
                <div className="mb-8">
                    {/* 简洁的日历头部 - 左边月份切换，右边视图切换 */}
                    <div className="flex items-center justify-between mb-4 px-2">
                        {/* 左侧：月份切换 */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleMonthChange(-1)}
                                className="p-1.5 hover:bg-stone-100/50 rounded-lg transition-colors"
                            >
                                <ChevronLeft size={18} className="text-stone-600" />
                            </button>
                            <span className="text-lg font-bold text-stone-800 font-mono min-w-[100px] text-center">
                                {displayDate.getFullYear()}.{String(displayDate.getMonth() + 1).padStart(2, '0')}
                            </span>
                            <button
                                onClick={() => handleMonthChange(1)}
                                className="p-1.5 hover:bg-stone-100/50 rounded-lg transition-colors"
                            >
                                <ChevronRight size={18} className="text-stone-600" />
                            </button>
                        </div>

                        {/* 右侧：视图切换 */}
                        <div className="flex bg-stone-100/50 p-0.5 rounded-lg">
                            <button
                                onClick={() => setCalendarViewMode('heatmap')}
                                className={`p-1.5 rounded-md transition-all ${
                                    calendarViewMode === 'heatmap'
                                        ? 'bg-white text-stone-900 shadow-sm'
                                        : 'text-stone-400 hover:text-stone-600'
                                }`}
                                title="热力图"
                            >
                                <Grid size={14} />
                            </button>
                            <button
                                onClick={() => setCalendarViewMode('gallery')}
                                className={`p-1.5 rounded-md transition-all ${
                                    calendarViewMode === 'gallery'
                                        ? 'bg-white text-stone-900 shadow-sm'
                                        : 'text-stone-400 hover:text-stone-600'
                                }`}
                                title="画廊"
                            >
                                <ImageIcon size={14} />
                            </button>
                            {keywords.length > 0 && (
                                <button
                                    onClick={() => setCalendarViewMode('keywords')}
                                    className={`p-1.5 rounded-md transition-all ${
                                        calendarViewMode === 'keywords'
                                            ? 'bg-white text-stone-900 shadow-sm'
                                            : 'text-stone-400 hover:text-stone-600'
                                    }`}
                                    title="关键字"
                                >
                                    <Hash size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 日历主体 - 统一的网格布局 */}
                    <div className="mb-6">
                        {/* 星期标题 */}
                        <div className="grid grid-cols-7 gap-2 mb-2 px-2">
                            {['周日', '周一', '周二', '周三', '周四', '周五', '周六'].map(day => (
                                <div key={day} className="text-center text-[10px] font-medium text-stone-400">
                                    {day}
                                </div>
                            ))}
                        </div>
                        
                        {/* 日历格子 */}
                        <div className="grid grid-cols-7 gap-2 px-2">
                            {(() => {
                                const year = displayDate.getFullYear();
                                const month = displayDate.getMonth();
                                const firstDay = new Date(year, month, 1);
                                const daysInMonth = new Date(year, month + 1, 0).getDate();
                                const startDay = firstDay.getDay(); // 0 = Sunday
                                
                                const cells = [];
                                
                                // 填充前面的空白
                                for (let i = 0; i < startDay; i++) {
                                    cells.push(<div key={`empty-${i}`} />);
                                }
                                
                                // 填充日期
                                for (let day = 1; day <= daysInMonth; day++) {
                                    const data = calendarData.get(day);
                                    const hasData = data && data.duration > 0;
                                    
                                    if (calendarViewMode === 'keywords') {
                                        // 关键字视图
                                        const dayDate = new Date(year, month, day);
                                        const dayLogs = monthLogs.filter(l => {
                                            const d = new Date(l.startTime);
                                            return d.getDate() === day;
                                        });
                                        
                                        // 找到匹配的关键字
                                        const matchedKeywords = new Set<string>();
                                        dayLogs.forEach(log => {
                                            keywords.forEach(kw => {
                                                if ((log.title && log.title.includes(kw)) || (log.note && log.note.includes(kw))) {
                                                    matchedKeywords.add(kw);
                                                }
                                            });
                                        });
                                        
                                        cells.push(
                                            <div
                                                key={day}
                                                className="aspect-square rounded-lg overflow-hidden relative"
                                            >
                                                {matchedKeywords.size === 0 ? (
                                                    // 无匹配关键字：灰色
                                                    <div className="w-full h-full bg-stone-100 flex items-center justify-center">
                                                        <span className="text-sm font-medium text-stone-400">{day}</span>
                                                    </div>
                                                ) : (
                                                    // 有匹配关键字：分割颜色
                                                    <div className="w-full h-full flex">
                                                        {Array.from(matchedKeywords).map(kw => (
                                                            <div
                                                                key={kw}
                                                                className={`h-full flex-1 ${getKeywordColor(kw).split(' ')[0]}`}
                                                            />
                                                        ))}
                                                        <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-stone-700">
                                                            {day}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    } else if (calendarViewMode === 'gallery') {
                                        // 画廊视图
                                        const images = data?.images || [];
                                        const firstImage = images.length > 0 ? images[0] : null;
                                        
                                        cells.push(
                                            <div
                                                key={day}
                                                className="aspect-square rounded-lg overflow-hidden relative group cursor-pointer"
                                            >
                                                {firstImage ? (
                                                    // 有图片：显示第一张图片，日期居中
                                                    <div className="w-full h-full relative">
                                                        <TimelineImage 
                                                            filename={firstImage} 
                                                            className="w-full h-full object-cover"
                                                            useThumbnail={true}
                                                        />
                                                        <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-medium drop-shadow-lg">
                                                            {day}
                                                        </span>
                                                    </div>
                                                ) : hasData ? (
                                                    // 有数据但没图片：显示浅色背景
                                                    <div className="w-full h-full bg-stone-100 flex items-center justify-center">
                                                        <span className="text-sm font-medium text-stone-600">{day}</span>
                                                    </div>
                                                ) : (
                                                    // 无数据：显示空白
                                                    <div className="w-full h-full bg-stone-50 flex items-center justify-center">
                                                        <span className="text-sm font-medium text-stone-300">{day}</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    } else {
                                        // 热力图视图
                                        const colors = getHeatmapColor(data?.duration || 0);
                                        
                                        cells.push(
                                            <div
                                                key={day}
                                                className={`aspect-square rounded-lg flex items-center justify-center transition-colors ${colors.bg} ${colors.text} border ${colors.border}`}
                                            >
                                                <span className="text-sm font-medium">{day}</span>
                                            </div>
                                        );
                                    }
                                }
                                
                                return cells;
                            })()}
                        </div>
                    </div>

                    {/* 统计信息 - 简洁版本 */}
                    <div className="px-2 space-y-3">
                        {/* Total Time */}
                        <div className="flex items-baseline gap-2">
                            <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">Total</span>
                            <div className="flex-1 border-b border-dotted border-stone-200" />
                            <span className="text-xs font-medium text-stone-400">
                                {totalHours}h {totalMins}m / {monthHours}h {monthMins}m
                            </span>
                        </div>

                        {/* Average Daily */}
                        <div className="flex items-baseline gap-2">
                            <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">Avg</span>
                            <div className="flex-1 border-b border-dotted border-stone-200" />
                            <span className="text-xs font-medium text-stone-400">
                                {(() => {
                                    const totalDays = new Set(filteredLogs.map(l => new Date(l.startTime).toDateString())).size;
                                    const avgTotal = totalDays > 0 ? Math.round(totalSeconds / 60 / totalDays) : 0;
                                    const monthDays = new Set(monthLogs.map(l => new Date(l.startTime).toDateString())).size;
                                    const avgMonth = monthDays > 0 ? Math.round(monthSeconds / 60 / monthDays) : 0;
                                    return `${avgTotal}m / ${avgMonth}m`;
                                })()}
                            </span>
                        </div>

                        {/* Focus Score Distribution */}
                        {enableFocusScore && (() => {
                            // 计算当月专注度分布
                            const focusDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
                            let totalFocusTime = 0;
                            
                            monthLogs.forEach(log => {
                                if (log.focusScore && log.focusScore >= 1 && log.focusScore <= 5) {
                                    focusDistribution[log.focusScore as 1 | 2 | 3 | 4 | 5] += log.duration;
                                    totalFocusTime += log.duration;
                                }
                            });
                            
                            // 如果有专注度数据，显示分布图
                            if (totalFocusTime > 0) {
                                const percentages = {
                                    1: (focusDistribution[1] / totalFocusTime) * 100,
                                    2: (focusDistribution[2] / totalFocusTime) * 100,
                                    3: (focusDistribution[3] / totalFocusTime) * 100,
                                    4: (focusDistribution[4] / totalFocusTime) * 100,
                                    5: (focusDistribution[5] / totalFocusTime) * 100,
                                };
                                
                                return (
                                    <>
                                        {/* Focus 文字行 - 与 Total 和 Average 并列 */}
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">Focus</span>
                                            <div className="flex-1 border-b border-dotted border-stone-200" />
                                            <span className="text-xs font-medium text-stone-400">
                                                {Math.floor(totalFocusTime / 3600)}h {Math.floor((totalFocusTime % 3600) / 60)}m
                                            </span>
                                        </div>
                                        
                                        {/* 条形统计图 - 独立的模块 */}
                                        <div className="flex h-6 rounded-lg overflow-hidden">
                                            {percentages[1] > 0 && (
                                                <div 
                                                    className="bg-red-100 flex items-center justify-center transition-all hover:opacity-80"
                                                    style={{ width: `${percentages[1]}%` }}
                                                    title={`专注度1: ${Math.round(percentages[1])}%`}
                                                >
                                                    {percentages[1] > 8 && (
                                                        <span className="text-[10px] font-bold text-red-600">1</span>
                                                    )}
                                                </div>
                                            )}
                                            {percentages[2] > 0 && (
                                                <div 
                                                    className="bg-orange-100 flex items-center justify-center transition-all hover:opacity-80"
                                                    style={{ width: `${percentages[2]}%` }}
                                                    title={`专注度2: ${Math.round(percentages[2])}%`}
                                                >
                                                    {percentages[2] > 8 && (
                                                        <span className="text-[10px] font-bold text-orange-600">2</span>
                                                    )}
                                                </div>
                                            )}
                                            {percentages[3] > 0 && (
                                                <div 
                                                    className="bg-amber-100 flex items-center justify-center transition-all hover:opacity-80"
                                                    style={{ width: `${percentages[3]}%` }}
                                                    title={`专注度3: ${Math.round(percentages[3])}%`}
                                                >
                                                    {percentages[3] > 8 && (
                                                        <span className="text-[10px] font-bold text-amber-600">3</span>
                                                    )}
                                                </div>
                                            )}
                                            {percentages[4] > 0 && (
                                                <div 
                                                    className="bg-lime-100 flex items-center justify-center transition-all hover:opacity-80"
                                                    style={{ width: `${percentages[4]}%` }}
                                                    title={`专注度4: ${Math.round(percentages[4])}%`}
                                                >
                                                    {percentages[4] > 8 && (
                                                        <span className="text-[10px] font-bold text-lime-600">4</span>
                                                    )}
                                                </div>
                                            )}
                                            {percentages[5] > 0 && (
                                                <div 
                                                    className="bg-green-200 flex items-center justify-center transition-all hover:opacity-80"
                                                    style={{ width: `${percentages[5]}%` }}
                                                    title={`专注度5: ${Math.round(percentages[5])}%`}
                                                >
                                                    {percentages[5] > 8 && (
                                                        <span className="text-[10px] font-bold text-green-600">5</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                );
                            }
                            return null;
                        })()}
                    </div>
                    
                    {/* 关键字图例 - 仅在关键字视图时显示 */}
                    {calendarViewMode === 'keywords' && keywords.length > 0 && (
                        <div className="px-2 mt-4 pt-3 border-t border-stone-100">
                            <div className="flex flex-wrap gap-2 justify-center">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded bg-stone-100"></div>
                                    <span className="text-[10px] text-stone-400">Unmatched</span>
                                </div>
                                {keywords.map(kw => (
                                    <div key={kw} className="flex items-center gap-1.5">
                                        <div className={`w-2.5 h-2.5 rounded ${getKeywordColor(kw).split(' ')[0]}`}></div>
                                        <span className="text-[10px] text-stone-500">{kw}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                // All View Stats (Three Columns)
                <div className="flex items-start justify-around px-2 py-4 mb-8">
                    {/* Total Duration */}
                    <div className="flex flex-col items-center gap-2">
                        <span className="text-xs font-bold text-stone-900 tracking-wider">累计投入</span>
                        <div className="flex items-baseline text-stone-800">
                            <span className="text-3xl font-black font-mono tracking-tight">{totalHours}</span>
                            <span className="text-sm font-bold opacity-60 ml-0.5 mr-1 text-stone-400">h</span>
                            <span className="text-xl font-bold font-mono tracking-tight">{totalMins}</span>
                            <span className="text-xs font-bold opacity-60 ml-0.5 text-stone-400">m</span>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-10 bg-stone-200/50 mt-1"></div>

                    {/* Count */}
                    <div className="flex flex-col items-center gap-2">
                        <span className="text-xs font-bold text-stone-900 tracking-wider">累计次数</span>
                        <div className="flex items-baseline text-stone-800">
                            <span className="text-3xl font-black font-mono tracking-tight">{filteredLogs.length}</span>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-10 bg-stone-200/50 mt-1"></div>

                    {/* Avg Duration */}
                    <div className="flex flex-col items-center gap-2">
                        <span className="text-xs font-bold text-stone-900 tracking-wider">平均时长</span>
                        <div className="flex items-baseline text-stone-800">
                            {avgDurationH > 0 ? (
                                <>
                                    <span className="text-3xl font-black font-mono tracking-tight">{avgDurationH}</span>
                                    <span className="text-sm font-bold opacity-60 ml-0.5 mr-1 text-stone-400">h</span>
                                    {avgDurationM > 0 && (
                                        <>
                                            <span className="text-xl font-bold font-mono tracking-tight">{avgDurationM}</span>
                                            <span className="text-xs font-bold opacity-60 ml-0.5 text-stone-400">m</span>
                                        </>
                                    )}
                                </>
                            ) : (
                                <>
                                    <span className="text-3xl font-black font-mono tracking-tight">{avgDurationM}</span>
                                    <span className="text-sm font-bold opacity-60 ml-0.5 text-stone-400">m</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* History List */}
            <div className="space-y-8">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Clock size={14} className="text-stone-400" />
                        <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                            {viewMode === 'month'
                                ? `History (${displayMonth + 1}/${displayYear})`
                                : `History (All)`
                            }
                        </span>
                    </div>

                    {/* Toggle Button */}
                    <div className="flex bg-stone-100/50 p-0.5 rounded-lg">
                        <button
                            onClick={() => setViewMode('all')}
                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${viewMode === 'all'
                                ? 'bg-white text-stone-900 shadow-sm'
                                : 'text-stone-400 hover:text-stone-600'
                                }`}
                        >
                            全部
                        </button>
                        <button
                            onClick={() => setViewMode('month')}
                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${viewMode === 'month'
                                ? 'bg-white text-stone-900 shadow-sm'
                                : 'text-stone-400 hover:text-stone-600'
                                }`}
                        >
                            {displayMonth + 1}月
                        </button>
                    </div>
                </div>

                {logsToDisplay.length === 0 ? (
                    <div className="text-center py-10 text-stone-400 text-sm italic border border-dashed border-stone-200 rounded-2xl">
                        {viewMode === 'month' ? 'No activity recorded in this month.' : 'No activity recorded.'}
                    </div>
                ) : (
                    Array.from(groupedData.durationMap.keys()).sort((a: number, b: number) => b - a).map((timestamp: number) => {
                        const daySeconds = groupedData.durationMap.get(timestamp) || 0;
                        const dayLogsFiltered = groupedData.logsMap.get(timestamp) || [];

                        const date = new Date(timestamp);
                        const month = date.getMonth() + 1;
                        const day = date.getDate();
                        const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];

                        return (
                            <div key={timestamp} className="flex flex-col gap-3 group">
                                <div className="flex justify-between items-end border-b border-stone-100 pb-2">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-lg font-bold text-stone-800 font-mono">
                                            {String(month).padStart(2, '0')}/{String(day).padStart(2, '0')}
                                        </span>
                                        <span className="text-xs font-medium text-stone-400">{weekDay}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-stone-900 font-mono">{Math.floor(daySeconds / 60)}m</span>
                                    </div>
                                </div>

                                <div className="relative border-l border-stone-300 ml-[70px] space-y-6 pb-4">
                                    {dayLogsFiltered.sort((a, b) => b.startTime - a.startTime).map(log => {
                                        // 查找对应的category和activity
                                        const category = categories?.find(c => c.id === log.categoryId);
                                        const activity = category?.activities.find(a => a.id === log.activityId);

                                        const d = new Date(log.startTime);
                                        const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                                        const durationMins = Math.round(log.duration / 60);
                                        const h = Math.floor(durationMins / 60);
                                        const m = durationMins % 60;
                                        const durStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

                                        return (
                                            <div
                                                key={log.id}
                                                className="relative pl-8 group cursor-pointer rounded-xl hover:bg-stone-50/80 transition-colors p-2 -ml-2"
                                                onClick={() => onEditLog?.(log)}
                                            >
                                                {/* Time & Duration - Absolute Left */}
                                                <div className="absolute -left-[60px] top-0 w-[45px] text-right flex flex-col items-end">
                                                    <span className="text-sm font-bold text-stone-800 leading-none font-mono">
                                                        {timeStr}
                                                    </span>
                                                    <span className="text-[10px] font-medium text-stone-400 mt-1">
                                                        {durStr}
                                                    </span>
                                                </div>

                                                {/* Timeline Dot */}
                                                <div className="absolute left-[3px] top-2 w-2.5 h-2.5 rounded-full bg-stone-900 border-2 border-[#faf9f6] z-10" />

                                                <div className="relative top-[-2px]">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-lg font-bold text-stone-900 leading-tight">
                                                            {activity?.name || category?.name || 'Unknown Activity'}
                                                        </span>

                                                        {/* Reactions */}
                                                        {log.reactions && log.reactions.length > 0 && (
                                                            <div className="flex items-center -space-x-1 ml-0.5">
                                                                {Array.from(new Set(log.reactions)).map((emoji, idx) => (
                                                                    <span key={idx} className="text-sm scale-90">{emoji}</span>
                                                                ))}
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-2">
                                                            {log.focusScore && log.focusScore > 0 && (
                                                                <span className="text-sm font-bold text-stone-400 font-mono flex items-center gap-0.5">
                                                                    <Zap size={12} fill="currentColor" />
                                                                    {log.focusScore}
                                                                </span>
                                                            )}
                                                            {log.comments && log.comments.length > 0 && (
                                                                <span className="text-xs font-bold text-stone-400 font-mono flex items-center gap-0.5">
                                                                    <MessageCircle size={10} />
                                                                    {log.comments.length}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {log.note && (
                                                        <p className="text-sm text-stone-500 font-light leading-relaxed mb-2 whitespace-pre-wrap">
                                                            {log.note}
                                                        </p>
                                                    )}

                                                    {/* 自定义元数据渲染 */}
                                                    {renderLogMetadata ? (
                                                        renderLogMetadata(log)
                                                    ) : (
                                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                                            <span className="text-[10px] font-medium text-stone-500 border border-stone-200 px-2 py-0.5 rounded flex items-center gap-1 bg-stone-50/30">
                                                                <span className="font-bold text-stone-400">
                                                                    {entityInfo.type === 'category' ? '#' : entityInfo.type === 'activity' ? '#' : '%'}
                                                                </span>
                                                                <span>{entityInfo.icon}</span>
                                                                <span>{entityInfo.name}</span>
                                                                {activity && entityInfo.type === 'category' && (
                                                                    <>
                                                                        <span className="mx-1 text-stone-300">/</span>
                                                                        <span className="mr-1">{activity.icon}</span>
                                                                        <span className="text-stone-500">{activity.name}</span>
                                                                    </>
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Images */}
                                                    {log.images && log.images.length > 0 && (
                                                        <div className="flex gap-2 mt-2 mb-1 overflow-x-auto pb-1 no-scrollbar">
                                                            {(log.images.length > 3
                                                                ? log.images.slice(0, 2)
                                                                : log.images
                                                            ).map(img => (
                                                                <TimelineImage key={img} filename={img} className="w-16 h-16 shadow-sm" useThumbnail={true} />
                                                            ))}
                                                            {log.images.length > 3 && (
                                                                <div className="w-16 h-16 rounded-xl bg-stone-100 flex items-center justify-center border border-stone-200 text-stone-400 font-bold text-sm shrink-0">
                                                                    +{log.images.length - 2}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </>
    );
};
