/**
 * @file ReviewHubView.tsx
 * @input Daily/Weekly/Monthly Review Lists
 * @output Navigation to Specific Review
 * @pos View (Main Tab)
 * @description The central dashboard for accessing past reviews. Displays summaries and entry points for Daily, Weekly, and Monthly reviews, often using carousels or lists, with Android-compatible card rendering fallbacks for archive themes.
 * @updated 2026-04-17: Replaced Chronicle card color-mix shadows and blur-only surfaces with Android-safe fallbacks to avoid HarmonyOS gradient artifacts behind archive cards.
 *
 * 鈿狅笍 Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { DailyReview, WeeklyReview, MonthlyReview, Log } from '../types';
import { parseNarrative } from '../utils/narrativeUtils';

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
  onOpenMonthlyReview
}) => {
  const [isScrolled, setIsScrolled] = React.useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const prefersCompatibleArchiveCards = useMemo(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    if (Capacitor.isNativePlatform()) {
      return Capacitor.getPlatform() === 'android';
    }

    return /Android/i.test(window.navigator.userAgent);
  }, []);

  const supportsColorMix = useMemo(() => {
    if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') {
      return false;
    }

    return CSS.supports('color', 'color-mix(in srgb, black 50%, white)');
  }, []);

  const supportsBackdropBlur = useMemo(() => {
    if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') {
      return false;
    }

    return CSS.supports('backdrop-filter', 'blur(12px)') || CSS.supports('-webkit-backdrop-filter', 'blur(12px)');
  }, []);

  const parseCssColor = (color: string) => {
    const normalized = color.trim();

    const hexMatch = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hexMatch) {
      const hex = hexMatch[1];
      const expanded = hex.length === 3
        ? hex.split('').map((char) => char + char).join('')
        : hex;

      return {
        r: parseInt(expanded.slice(0, 2), 16),
        g: parseInt(expanded.slice(2, 4), 16),
        b: parseInt(expanded.slice(4, 6), 16)
      };
    }

    const rgbMatch = normalized.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1], 10),
        g: parseInt(rgbMatch[2], 10),
        b: parseInt(rgbMatch[3], 10)
      };
    }

    return null;
  };

  const getCardShadow = () => {
    const rootStyles = getComputedStyle(document.documentElement);
    const accentColor = rootStyles.getPropertyValue('--accent-color').trim();
    const progressBarFill = rootStyles.getPropertyValue('--progress-bar-fill').trim();
    const isDefaultTheme = accentColor === '#1c1917' || accentColor === 'rgb(28, 25, 23)';

    if (isDefaultTheme) {
      return '0 2px 8px -1px rgba(0, 0, 0, 0.08), 0 4px 16px -2px rgba(0, 0, 0, 0.05)';
    }

    if (!prefersCompatibleArchiveCards && supportsColorMix) {
      return '0 4px 16px -2px color-mix(in srgb, var(--progress-bar-fill) 12%, transparent), 0 12px 32px -4px color-mix(in srgb, var(--progress-bar-fill) 8%, transparent)';
    }

    const parsedColor = parseCssColor(progressBarFill) || parseCssColor(accentColor);
    if (!parsedColor) {
      return '0 4px 16px -2px rgba(28, 25, 23, 0.10), 0 12px 32px -4px rgba(28, 25, 23, 0.08)';
    }

    return `0 4px 16px -2px rgba(${parsedColor.r}, ${parsedColor.g}, ${parsedColor.b}, 0.16), 0 12px 32px -4px rgba(${parsedColor.r}, ${parsedColor.g}, ${parsedColor.b}, 0.11)`;
  };

  const getCardSurfaceStyle = (): React.CSSProperties => {
    const shouldUseBlur = !prefersCompatibleArchiveCards && supportsBackdropBlur;

    return {
      backgroundColor: shouldUseBlur ? 'rgba(255, 255, 255, 0.80)' : 'rgba(255, 255, 255, 0.94)',
      backdropFilter: shouldUseBlur ? 'blur(12px)' : undefined,
      WebkitBackdropFilter: shouldUseBlur ? 'blur(12px)' : undefined,
      boxShadow: getCardShadow()
    };
  };

  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setIsScrolled(container.scrollTop > 0);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const getWeekNumber = (date: Date) => {
    const target = new Date(date.valueOf());
    const dayNum = (target.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNum + 3);
    const firstThursday = new Date(target.getFullYear(), 0, 4);
    const firstThursdayDay = (firstThursday.getDay() + 6) % 7;
    firstThursday.setDate(firstThursday.getDate() - firstThursdayDay + 3);

    const weekDiff = (target.getTime() - firstThursday.getTime()) / 86400000;
    return 1 + Math.floor(weekDiff / 7);
  };

  const sortedMonthlyReviews = useMemo(() => {
    return [...monthlyReviews].sort((a, b) => b.monthStartDate.localeCompare(a.monthStartDate));
  }, [monthlyReviews]);

  const sortedWeeklyReviews = useMemo(() => {
    return [...weeklyReviews].sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate));
  }, [weeklyReviews]);

  const sortedDailyReviews = useMemo(() => {
    return [...dailyReviews].sort((a, b) => b.date.localeCompare(a.date));
  }, [dailyReviews]);

  const SectionTitle = ({ title, onAdd, className = 'mt-8' }: { title: string; onAdd?: () => void; className?: string }) => (
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

  const handleAddCurrentMonthly = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    onOpenMonthlyReview(start, end);
  };

  const handleAddCurrentWeekly = () => {
    const now = new Date();
    const start = new Date(now);
    const day = start.getDay();
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

  const [visibleCount, setVisibleCount] = React.useState(10);
  const observerTarget = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 10, sortedDailyReviews.length));
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

  const visibleDailyReviews = useMemo(() => {
    return sortedDailyReviews.slice(0, visibleCount);
  }, [sortedDailyReviews, visibleCount]);

  const cardSurfaceStyle = getCardSurfaceStyle();
  void logs;

  return (
    <div className="flex flex-col h-full bg-[#faf9f6] relative">
      <header
        className={`sticky top-0 z-40 transition-all duration-300 pt-[env(safe-area-inset-top)] ${
          isScrolled
            ? 'bg-[#faf9f6]/90 backdrop-blur-md shadow-sm h-[calc(3rem+env(safe-area-inset-top))]'
            : 'bg-[#faf9f6]/80 backdrop-blur-sm h-[calc(3.5rem+env(safe-area-inset-top))]'
        }`}
      >
        <div className="max-w-xl mx-auto px-6 h-full flex items-center justify-center">
          <h1 className={`font-serif text-stone-800 font-bold transition-all duration-300 ${isScrolled ? 'text-[16px]' : 'text-[18px]'}`}>
            Chronicle
          </h1>
        </div>
      </header>

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden pb-safe scrollbar-hide"
        id="chronicle-content"
      >
        <div className="md:max-w-xl md:mx-auto w-full px-5 pt-2 pb-20">
          <SectionTitle title="Monthly Reviews" onAdd={handleAddCurrentMonthly} className="mt-1" />

          {sortedMonthlyReviews.length === 0 ? (
            <div className="p-6 text-center border bg-stone-50 rounded-lg text-stone-400 text-sm">
              No monthly reviews yet.
            </div>
          ) : (
            <div className="flex overflow-x-auto gap-4 pb-5 pt-2 -mr-5 pr-5 snap-x snap-mandatory scrollbar-hide">
              {sortedMonthlyReviews.map((review) => {
                const reviewDate = new Date(review.monthStartDate);
                const monthName = reviewDate.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
                const isCurrentMonth = new Date().getMonth() === reviewDate.getMonth()
                  && new Date().getFullYear() === reviewDate.getFullYear();

                let displayTitle: string | null;
                let displayContent: string;

                if (review.summary && review.summary.trim()) {
                  displayTitle = null;
                  displayContent = review.summary;
                } else if (review.narrative && review.narrative.trim()) {
                  const { title, content: body } = parseNarrative(review.narrative, '暂无叙事标题');
                  displayTitle = title;
                  displayContent = body;
                } else {
                  displayTitle = '暂无叙事标题';
                  displayContent = '...';
                }

                return (
                  <article
                    key={review.id}
                    onClick={() => onOpenMonthlyReview(new Date(review.monthStartDate), new Date(review.monthEndDate))}
                    className="flex-none w-[90%] snap-center border border-stone-100 rounded-lg p-6 relative active:scale-[0.98] transition-transform"
                    style={cardSurfaceStyle}
                  >
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="font-serif text-2xl font-extrabold text-stone-900 m-0">{monthName}</h3>
                        <div className={`px-2 py-1 text-[10px] font-bold uppercase rounded flex whitespace-nowrap ${isCurrentMonth ? 'btn-template-filled' : 'btn-template-outlined'}`}>
                          {isCurrentMonth ? 'CURRENT' : 'PAST'}
                        </div>
                      </div>
                      {displayTitle && (
                        <span className="text-[11px] uppercase text-stone-500 block tracking-wider">
                          {displayTitle.slice(0, 30)}...
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-stone-600 leading-relaxed border-l-2 border-stone-200 pl-3 mb-4 line-clamp-3">
                      {displayContent}
                    </div>

                    <div className="flex justify-between text-[10px] text-stone-500 border-t border-stone-100 pt-3">
                      <span>{reviewDate.getFullYear()}/{(reviewDate.getMonth() + 1).toString().padStart(2, '0')}</span>
                      <span>Tap to read full report -&gt;</span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <SectionTitle title="Weekly History" onAdd={handleAddCurrentWeekly} />

          {sortedWeeklyReviews.length === 0 ? (
            <div className="p-6 text-center border bg-stone-50 rounded-lg text-stone-400 text-sm">
              No weekly reviews yet.
            </div>
          ) : (
            <div className="flex overflow-x-auto gap-3 -mr-5 pr-5 pb-5 pt-2 snap-x snap-mandatory scrollbar-hide">
              {sortedWeeklyReviews.map((review) => {
                const startDate = new Date(review.weekStartDate);
                const endDate = new Date(review.weekEndDate);
                const midWeekDate = new Date(startDate.getTime() + 3 * 24 * 60 * 60 * 1000);
                const weekNum = getWeekNumber(midWeekDate);

                let displayTitle: string;
                if (review.summary && review.summary.trim()) {
                  displayTitle = review.summary;
                } else if (review.narrative && review.narrative.trim()) {
                  const { title } = parseNarrative(review.narrative, '暂无标题');
                  displayTitle = title;
                } else {
                  displayTitle = '暂无标题';
                }

                const dateRangeStr = `${startDate.getFullYear()}/${(startDate.getMonth() + 1).toString().padStart(2, '0')}/${startDate.getDate().toString().padStart(2, '0')}-${(endDate.getMonth() + 1).toString().padStart(2, '0')}/${endDate.getDate().toString().padStart(2, '0')}`;
                const now = new Date();
                const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
                const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
                const isCurrentWeek = nowDateOnly >= startDateOnly && nowDateOnly <= endDateOnly;

                return (
                  <div
                    key={review.id}
                    onClick={() => onOpenWeeklyReview(new Date(review.weekStartDate), new Date(review.weekEndDate))}
                    className="snap-start flex-none w-[calc(50%-6px)] rounded-2xl p-4 h-[140px] flex flex-col justify-between relative overflow-hidden border border-stone-100 text-stone-900 transition-all active:scale-95"
                    style={cardSurfaceStyle}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-serif text-lg font-bold">W{weekNum}</span>
                      <span className={`text-[9px] uppercase px-1 py-0.5 rounded ${isCurrentWeek ? 'btn-template-filled' : 'btn-template-outlined'}`}>
                        {isCurrentWeek ? 'CURRENT' : 'PAST'}
                      </span>
                    </div>

                    <div className="font-serif text-[13px] leading-snug font-semibold line-clamp-2 overflow-hidden">
                      {displayTitle}
                    </div>

                    <div className="flex gap-2 text-[9px] opacity-80 font-mono">
                      <span>{dateRangeStr}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <SectionTitle title="Latest Entries" onAdd={handleAddCurrentDaily} />

          {sortedDailyReviews.length === 0 ? (
            <div className="p-6 text-center border bg-stone-50 rounded-lg text-stone-400 text-sm">
              No daily reviews yet. Start by reviewing today!
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {visibleDailyReviews.map((review) => {
                const dateObj = new Date(review.date);
                const dayStr = dateObj.getDate().toString();
                const monthStr = dateObj.toLocaleDateString('en-US', { month: 'short' });
                const weekdayStr = dateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();

                let displayTitle: string;
                let displayContent: string;

                if (review.summary && review.summary.trim()) {
                  displayTitle = review.date;
                  displayContent = review.summary;
                } else if (review.narrative && review.narrative.trim()) {
                  const { title, content: body } = parseNarrative(review.narrative, '暂无标题');
                  displayTitle = title;
                  displayContent = body;
                } else {
                  displayTitle = '暂无标题';
                  displayContent = '...';
                }

                return (
                  <div
                    key={review.id}
                    className="flex gap-4 pb-4 border-b border-stone-100 last:border-0"
                    onClick={() => onOpenDailyReview(new Date(review.date))}
                  >
                    <div className="flex flex-col items-center min-w-[40px] pt-1">
                      <span className="font-serif text-2xl font-bold leading-none text-stone-900">{dayStr}</span>
                      <span className="text-[10px] font-semibold uppercase text-stone-500 mt-1">{monthStr}</span>
                    </div>

                    <div
                      className="flex-1 min-w-0 rounded-lg p-4 border border-stone-100"
                      style={cardSurfaceStyle}
                    >
                      <div className="flex justify-between items-start mb-1.5 gap-2">
                        <div className="font-serif text-[17px] font-bold leading-snug text-stone-900 flex-1 min-w-0 truncate">
                          {displayTitle}
                        </div>
                        <span className="btn-template-filled text-[10px] font-bold uppercase inline-block px-1.5 py-0.5 rounded-sm shrink-0 whitespace-nowrap">
                          {weekdayStr}
                        </span>
                      </div>
                      <div className="text-[13px] text-stone-500 line-clamp-2 leading-relaxed">
                        {displayContent}
                      </div>
                    </div>
                  </div>
                );
              })}
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
