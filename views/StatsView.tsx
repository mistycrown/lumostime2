import React, { useState, useMemo } from 'react';
import { Log, Category, Activity } from '../types';
import { COLOR_OPTIONS } from '../constants';
import { ArrowLeft, ChevronDown, ChevronRight, Maximize2, Minimize2, Share } from 'lucide-react';
import { ToastType } from '../components/Toast';

interface StatsViewProps {
  logs: Log[];
  categories: Category[];
  currentDate: Date;
  onBack: () => void;
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
  onToast?: (type: ToastType, message: string) => void;
}

type TimeRange = 'day' | 'week' | 'month' | 'year' | 'schedule';

interface ActivityStat extends Activity {
  duration: number;
}

interface CategoryStat extends Category {
  duration: number;
  percentage: number;
  items: ActivityStat[];
}

export const StatsView: React.FC<StatsViewProps> = ({ logs, categories, currentDate, onBack, isFullScreen, onToggleFullScreen, onToast }) => {
  const [range, setRange] = useState<TimeRange>('day');
  const [excludedCategoryIds, setExcludedCategoryIds] = useState<string[]>([]);

  const toggleExclusion = (id: string) => {
    setExcludedCategoryIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  // --- Date Helpers ---
  const getDateRange = (date: Date, type: TimeRange) => {
    const start = new Date(date);
    const end = new Date(date);

    if (type === 'day') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (type === 'week' || type === 'schedule') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (type === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(start.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
    } else if (type === 'year') {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
    }

    return { start, end };
  };

  // --- Calculation Logic ---
  const stats = useMemo(() => {
    const { start, end } = getDateRange(currentDate, range);

    const filteredLogs = logs.filter(log =>
      log.startTime >= start.getTime() &&
      log.endTime <= end.getTime() &&
      !excludedCategoryIds.includes(log.categoryId)
    );

    const totalDuration = filteredLogs.reduce((acc, log) => acc + Math.max(0, (log.endTime - log.startTime) / 1000), 0);

    const categoryStats: CategoryStat[] = categories.map(cat => {
      const catLogs = filteredLogs.filter(l => l.categoryId === cat.id);
      const catDuration = catLogs.reduce((acc, l) => acc + Math.max(0, (l.endTime - l.startTime) / 1000), 0);

      // Group by activity
      const activityStats: ActivityStat[] = cat.activities.map(act => {
        const actLogs = catLogs.filter(l => l.activityId === act.id);
        const actDuration = actLogs.reduce((acc, l) => acc + Math.max(0, (l.endTime - l.startTime) / 1000), 0);
        return { ...act, duration: actDuration };
      }).filter(a => a.duration > 0).sort((a, b) => b.duration - a.duration);

      return {
        ...cat,
        duration: catDuration,
        percentage: totalDuration > 0 ? (catDuration / totalDuration) * 100 : 0,
        items: activityStats
      };
    }).filter(s => s.duration > 0).sort((a, b) => b.duration - a.duration);

    return { totalDuration, categoryStats };
  }, [logs, currentDate, categories, range, excludedCategoryIds]);

  // --- Formatting Helpers ---
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}小时 ${m}分钟`;
    return `${m}分钟`;
  };

  const formatTotalDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return { h, m };
  };

  const getHexColor = (className: string = '') => {
    if (typeof className !== 'string') return '#78716c';

    // Extract basic color name (e.g. 'green' from 'text-green-600' or 'bg-green-100')
    const match = className.match(/(?:text|bg)-([a-z]+)-/);
    const colorId = match ? match[1] : 'stone';

    // Lookup in shared options
    const option = COLOR_OPTIONS.find(opt => opt.id === colorId);
    return option ? option.hex : '#78716c'; // Fallback to stone hex
  };

  const getScheduleStyle = (className: string = '') => {
    if (typeof className !== 'string') return 'bg-stone-100 text-stone-700 border-stone-200';

    const match = className.match(/(?:text|bg)-([a-z]+)-/);
    const color = match ? match[1] : 'stone';

    // Map to specific Tailwind classes that we know exist (safe list approach)
    const styles: Record<string, string> = {
      stone: 'bg-stone-100 text-stone-700 border-stone-200',
      slate: 'bg-slate-100 text-slate-700 border-slate-200',
      gray: 'bg-gray-100 text-gray-700 border-gray-200',
      zinc: 'bg-zinc-100 text-zinc-700 border-zinc-200',
      neutral: 'bg-neutral-100 text-neutral-700 border-neutral-200',
      red: 'bg-red-100 text-red-700 border-red-200',
      orange: 'bg-orange-100 text-orange-700 border-orange-200',
      amber: 'bg-amber-100 text-amber-700 border-amber-200',
      yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      lime: 'bg-lime-100 text-lime-700 border-lime-200',
      green: 'bg-green-100 text-green-700 border-green-200',
      emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      teal: 'bg-teal-100 text-teal-700 border-teal-200',
      cyan: 'bg-cyan-100 text-cyan-700 border-cyan-200',
      sky: 'bg-sky-100 text-sky-700 border-sky-200',
      blue: 'bg-blue-100 text-blue-700 border-blue-200',
      indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      violet: 'bg-violet-100 text-violet-700 border-violet-200',
      purple: 'bg-purple-100 text-purple-700 border-purple-200',
      fuchsia: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
      pink: 'bg-pink-100 text-pink-700 border-pink-200',
      rose: 'bg-rose-100 text-rose-700 border-rose-200',
    };
    return styles[color] || styles['stone'];
  };

  const handleExportStats = () => {
    if (stats.categoryStats.length === 0) {
      onToast?.('info', '当前时间段无数据可导出');
      return;
    }

    const { start, end } = getDateRange(currentDate, range);
    const dateStr = `${start.getFullYear()}/${start.getMonth() + 1}/${start.getDate()}`;
    const rangeLabel = range.charAt(0).toUpperCase() + range.slice(1);

    let text = `## 📊 ${dateStr} - ${rangeLabel} 统计\n`;
    text += `**总时长**: ${formatDuration(stats.totalDuration)}\n\n`;

    stats.categoryStats.forEach(cat => {
      text += `- **[${cat.name}]** ${formatDuration(cat.duration)} (${cat.percentage.toFixed(1)}%)\n`;
      cat.items.forEach(act => {
        text += `    * ${act.name}: ${formatDuration(act.duration)}\n`;
      });
      text += '\n';
    });

    navigator.clipboard.writeText(text).then(() => {
      onToast?.('success', '已复制到剪贴板');
    }).catch(() => {
      onToast?.('error', '复制失败');
    });
  };

  // --- Chart Logic ---
  const chartData = useMemo(() => {
    let currentAngle = 0;
    const gapAngle = 2; // Gap between segments
    const radius = 80;
    const strokeWidth = 25;
    const center = 100;

    return stats.categoryStats.map(cat => {
      const sweepAngle = (cat.percentage / 100) * 360;

      if (sweepAngle < 1) return null;

      const startAngle = currentAngle;
      const endAngle = currentAngle + sweepAngle - gapAngle;
      currentAngle += sweepAngle;

      const startRad = (startAngle - 90) * Math.PI / 180.0;
      const endRad = (endAngle - 90) * Math.PI / 180.0;

      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);

      const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

      const d = [
        "M", x1, y1,
        "A", radius, radius, 0, largeArcFlag, 1, x2, y2
      ].join(" ");

      return { ...cat, d, hexColor: getHexColor(cat.themeColor) };
    }).filter(Boolean);
  }, [stats]);

  const { h: totalH, m: totalM } = formatTotalDuration(stats.totalDuration);

  // --- Schedule Logic ---
  const { start: weekStart } = getDateRange(currentDate, 'week');
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  }), [weekStart]);

  const HOUR_HEIGHT = 40;
  const TOTAL_HEIGHT = 24 * HOUR_HEIGHT;

  const renderScheduleBody = () => {
    // Helper to calculate layout for overlapping events
    const layoutDayEvents = (dayLogs: Log[]) => {
      const sorted = [...dayLogs].sort((a, b) => {
        if (a.startTime === b.startTime) return b.duration - a.duration;
        return a.startTime - b.startTime;
      });

      const clusters: Log[][] = [];
      if (sorted.length === 0) return new Map();

      let currentCluster: Log[] = [sorted[0]];
      let clusterEnd = sorted[0].endTime;

      for (let i = 1; i < sorted.length; i++) {
        const log = sorted[i];
        if (log.startTime < clusterEnd) {
          currentCluster.push(log);
          clusterEnd = Math.max(clusterEnd, log.endTime);
        } else {
          clusters.push(currentCluster);
          currentCluster = [log];
          clusterEnd = log.endTime;
        }
      }
      clusters.push(currentCluster);

      const layoutMap = new Map<string, { left: string, width: string, zIndex: number }>();

      clusters.forEach(cluster => {
        const columns: Log[][] = [];
        cluster.forEach(log => {
          let placed = false;
          for (let i = 0; i < columns.length; i++) {
            const lastLog = columns[i][columns[i].length - 1];
            if (lastLog.endTime <= log.startTime) {
              columns[i].push(log);
              placed = true;
              break;
            }
          }
          if (!placed) {
            columns.push([log]);
          }
        });

        const nCols = columns.length;
        columns.forEach((col, colIdx) => {
          col.forEach(log => {
            layoutMap.set(log.id, {
              left: `${(colIdx / nCols) * 100}%`,
              width: `${(1 / nCols) * 100}%`,
              zIndex: 10
            });
          });
        });
      });

      return layoutMap;
    };

    return (
      <div className="relative mt-2">
        <div className="grid grid-cols-[auto_repeat(7,1fr)] relative" style={{ height: TOTAL_HEIGHT }}>

          {/* Time Labels */}
          <div className="w-10 border-r border-stone-100 relative" style={{ height: TOTAL_HEIGHT }}>
            {Array.from({ length: 24 }, (_, i) => (
              <div key={i} className="absolute w-full text-[10px] text-stone-300 font-mono text-right pr-2" style={{ top: i * HOUR_HEIGHT - 6 }}>
                {i}:00
              </div>
            ))}
          </div>

          {/* Day Columns */}
          {weekDays.map((day, dayIdx) => (
            <div key={dayIdx} className="relative border-r border-stone-50" style={{ height: TOTAL_HEIGHT }}>
              {/* Horizontal Guides */}
              {Array.from({ length: 24 }, (_, i) => (
                <div key={i} className="absolute w-full border-b border-stone-50" style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }} />
              ))}

              {/* Logs */}
              {(() => {
                const dayLogs = logs.filter(log => {
                  const ld = new Date(log.startTime);
                  return ld.getDate() === day.getDate() && ld.getMonth() === day.getMonth() && ld.getFullYear() === day.getFullYear();
                });

                const layout = layoutDayEvents(dayLogs);

                return dayLogs.map(log => {
                  const start = new Date(log.startTime);
                  const startMins = start.getHours() * 60 + start.getMinutes();
                  const top = startMins * (HOUR_HEIGHT / 60);
                  const height = (log.duration / 60) * (HOUR_HEIGHT / 60);

                  // Get Info
                  const cat = categories.find(c => c.id === log.categoryId);
                  const act = cat?.activities.find(a => a.id === log.activityId);

                  // Color Logic
                  const colorSource = act?.color || cat?.themeColor || '';
                  const styleClass = getScheduleStyle(colorSource);
                  const layoutStyle = layout.get(log.id) || { left: '0%', width: '100%', zIndex: 10 };

                  return (
                    <div
                      key={log.id}
                      className={`absolute rounded-md p-0.5 border text-[10px] overflow-hidden leading-tight flex flex-col ${styleClass} shadow-sm transition-all hover:z-[60] hover:brightness-105`}
                      style={{
                        top: `${top}px`,
                        height: `${Math.max(15, height)}px`,
                        left: `calc(${layoutStyle.left} + 1px)`,
                        width: `calc(${layoutStyle.width} - 2px)`,
                        zIndex: 10
                      }}
                    >
                      <div className="font-bold truncate">{act?.name || cat?.name}</div>
                      {height > 20 && log.note && (
                        <div className="truncate opacity-80 scale-90 origin-top-left whitespace-pre-wrap leading-none mt-0.5">{log.note}</div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`${isFullScreen ? 'fixed inset-0 z-50 pt-[calc(env(safe-area-inset-top)+20px)] pb-[env(safe-area-inset-bottom)]' : 'h-full'} bg-[#faf9f6] flex flex-col overflow-hidden animate-in slide-in-from-right duration-300`}>
      {/* Full Screen Dismiss Button */}
      {isFullScreen && (
        <button
          onClick={onToggleFullScreen}
          className="absolute top-[calc(1rem+env(safe-area-inset-top))] left-4 p-2 bg-white/80 backdrop-blur shadow-sm rounded-full text-stone-600 hover:bg-white transition-all z-50 border border-stone-200"
        >
          <Minimize2 size={24} />
        </button>
      )}

      {/* Date Header (Hidden in Full Screen) */}
      {!isFullScreen && (
        <div className="px-4 py-3 bg-[#faf9f6] border-b border-stone-200 flex items-center justify-between shrink-0 z-10">
          <h1 className="text-base font-bold text-stone-900 whitespace-nowrap">
            {currentDate.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })}
          </h1>

          <div className="flex bg-stone-200 p-0.5 rounded-lg scale-90 origin-right">
            {(['day', 'week', 'month', 'year', 'schedule'] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${range === r
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
                  }`}
              >
                {{
                  day: '日',
                  week: '周',
                  month: '月',
                  year: '年',
                  schedule: '日程'
                }[r]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fixed Grid Header for Schedule */}
      {range === 'schedule' && (
        <div className="grid grid-cols-[auto_repeat(7,1fr)] bg-[#faf9f6] z-10 pt-2 pb-2 px-6 border-b border-stone-100 shadow-sm">
          <div className="w-10"></div> {/* Time Col */}
          {weekDays.map(d => {
            const isToday = d.toDateString() === new Date().toDateString();
            return (
              <div key={d.toString()} className="text-center">
                <div className={`text-xs font-bold mb-1 ${isToday ? 'text-stone-900' : 'text-stone-400'}`}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]}
                </div>
                <div className={`text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center mx-auto ${isToday ? 'bg-stone-900 text-white' : 'text-stone-600'}`}>
                  {d.getDate()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-24 no-scrollbar">

        {range === 'schedule' ? renderScheduleBody() : (
          <>
            {/* Donut Chart Section */}
            <div className="flex flex-col items-center justify-center py-8 relative">
              <div className="relative w-64 h-64">
                <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                  {/* Background Circle */}
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#f5f5f4" strokeWidth="25" />

                  {/* Segments */}
                  {chartData.map((segment, idx) => (
                    <path
                      key={segment!.id}
                      d={segment!.d}
                      fill="none"
                      stroke={segment!.hexColor}
                      strokeWidth="25"
                      strokeLinecap="round"
                      className="transition-all duration-500 ease-out"
                    />
                  ))}
                </svg>

                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">总时长</span>
                  <div className="flex items-baseline gap-1 text-stone-800">
                    <span className="text-4xl font-bold font-mono tracking-tighter">{totalH}</span>
                    <span className="text-sm font-medium text-stone-500">h</span>
                    <span className="text-2xl font-bold font-mono tracking-tighter ml-1">{totalM}</span>
                    <span className="text-sm font-medium text-stone-500">m</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats List */}
            <div className="space-y-5 max-w-lg mx-auto">
              {/* ... Same List ... */}
              <div className="flex items-center justify-between border-b border-stone-200 pb-2 mb-2">
                <span className="text-sm font-bold text-stone-900"># 标签</span>
                <span className="text-xs font-medium text-stone-500">
                  {formatDuration(stats.totalDuration)}
                </span>
              </div>

              {stats.categoryStats.map(cat => (
                <div key={cat.id} className="flex flex-col gap-1">
                  <div className="flex items-end justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{cat.icon}</span>
                      <span className="font-bold text-stone-800 text-sm">{cat.name}</span>
                      <span className="text-xs text-stone-400 font-medium ml-1">{formatDuration(cat.duration)}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-stone-400">{cat.percentage.toFixed(1)}%</span>
                  </div>

                  <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${cat.percentage}%`, backgroundColor: getHexColor(cat.themeColor) }}
                    />
                  </div>

                  <div className="flex flex-col gap-1 mt-1 pl-2">
                    {cat.items.map(act => (
                      <div key={act.id} className="flex items-center gap-2 text-sm text-stone-600 pl-4 relative">
                        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-[1px] bg-stone-200"></div>
                        <span className="text-stone-300 font-bold text-xs">#</span>
                        <span>{act.name}</span>
                        <span className="text-xs text-stone-400 ml-auto">{formatDuration(act.duration)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {stats.categoryStats.length === 0 && (
                <div className="text-center py-10 text-stone-400 italic">
                  该时段无记录。
                </div>
              )}
            </div>

            {/* Filter Section */}
            <div className="mt-8 max-w-lg mx-auto border-t border-stone-100 pt-6">
              <div className="text-xs font-bold text-stone-400 mb-3 px-1">显示标签 (Filter)</div>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => {
                  const isExcluded = excludedCategoryIds.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleExclusion(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${isExcluded
                        ? 'bg-transparent text-stone-300 border-stone-100 bg-stone-50'
                        : 'bg-white text-stone-600 border-stone-200 shadow-sm hover:border-stone-300'
                        }`}
                    >
                      <span className={`transition-all ${isExcluded ? 'grayscale opacity-50' : ''}`}>{cat.icon}</span>
                      <span className={isExcluded ? 'line-through decoration-stone-300' : ''}>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {stats.categoryStats.length > 0 && (
              <div className="mt-6 max-w-lg mx-auto">
                <button
                  onClick={handleExportStats}
                  className="flex items-center gap-2 text-stone-400 hover:text-stone-600 transition-colors text-xs font-medium"
                >
                  <Share size={14} />
                  <span>导出统计</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};