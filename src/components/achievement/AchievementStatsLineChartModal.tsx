/**
 * @file AchievementStatsLineChartModal.tsx
 * @input Active achievement daily snapshots plus visible character attributes and growth snapshots
 * @output Bottom-sheet achievement stats drawer with a horizontally draggable multi-series positive/negative line chart
 * @pos Component (Achievement Stats)
 * @description Renders an editorial print-inspired statistics drawer for the active achievement ledger with draggable daily point and attribute-change lines.
 * @updated 2026-08-12: Uses stable indexed keys when historical snapshots contain duplicate dates.
 * @updated 2026-08-12: Added toggleable lines for every attribute currently visible on the character panel.
 * @updated 2026-07-24: Anchored the opening scroll position to the latest daily point instead of a fixed viewport guess.
 * @updated 2026-07-06: Removed the y-axis title words and added a trailing empty day slot so the last-point label has breathing room.
 * @updated 2026-07-06: Restored fixed horizontal spacing by preventing the scrollable plot from shrinking on mobile.
 * @updated 2026-07-06: Moved the y-axis into a fixed safe gutter and expanded the x-axis to show every day label.
 * @updated 2026-07-06: Tightened chart side gutters so sparse datasets still feel full-width without oversized margins.
 * @updated 2026-07-06: Rebuilt the line chart into a flatter editorial style with axis labels, positive/negative bands, and lighter hover guides.
 * @updated 2026-07-05: Switched the stats view to a flat drawer that matches the supplement-log detail style and keeps only a draggable positive/negative line chart.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { AchievementAttribute, AchievementDailySnapshot, AchievementGrowthDailySnapshot } from '../../types';
import { formatAchievementSignedStars } from '../../utils/achievementUtils';

interface AchievementStatsLineChartModalProps {
  isOpen: boolean;
  snapshots: AchievementDailySnapshot[];
  growthSnapshots: AchievementGrowthDailySnapshot[];
  attributes: AchievementAttribute[];
  onClose: () => void;
}

interface ChartSeries {
  id: string;
  name: string;
  color: string;
  unit: 'points' | 'experience';
  values: number[];
}

const CHART_HEIGHT = 320;
const CHART_PANEL_HEIGHT = 360;
const MIN_CHART_WIDTH = 960;
const SPARSE_POINT_GAP = 132;
const REGULAR_POINT_GAP = 72;
const Y_AXIS_WIDTH = 56;
const LATEST_POINT_RIGHT_INSET = 96;

const addOneDay = (date: string): string => {
  const nextDate = new Date(`${date}T00:00:00`);
  nextDate.setDate(nextDate.getDate() + 1);

  return nextDate.toISOString().slice(0, 10);
};

const buildChartPath = (points: Array<{ x: number; y: number }>): string => {
  if (points.length === 0) {
    return '';
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  if (points.length <= 3) {
    return points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const controlX = (current.x + next.x) / 2;

    path += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
  }

  return path;
};

const formatChartValue = (value: number, unit: ChartSeries['unit']): string => (
  unit === 'points'
    ? formatAchievementSignedStars(value)
    : `${value >= 0 ? '+' : '-'}${Math.abs(Math.floor(value || 0)).toLocaleString('en-US')} EXP`
);

export const AchievementStatsLineChartModal: React.FC<AchievementStatsLineChartModalProps> = ({
  isOpen,
  snapshots,
  growthSnapshots,
  attributes,
  onClose
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{ pointerId: number; startX: number; startScrollLeft: number } | null>(null);
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [hiddenSeriesIds, setHiddenSeriesIds] = useState<Set<string>>(() => new Set());

  const orderedSnapshots = useMemo(() => (
    [...snapshots].sort((first, second) => first.date.localeCompare(second.date))
  ), [snapshots]);

  const chartSeries = useMemo<ChartSeries[]>(() => {
    const growthByDate = new Map(growthSnapshots.map((snapshot) => [snapshot.date, snapshot] as const));
    const visibleAttributes = attributes
      .filter((attribute) => attribute.enabled)
      .sort((first, second) => first.sortOrder - second.sortOrder);

    return [
      {
        id: 'points',
        name: '光点',
        color: '#231f1b',
        unit: 'points',
        values: orderedSnapshots.map((snapshot) => snapshot.netDelta)
      },
      ...visibleAttributes.map((attribute) => ({
        id: attribute.id,
        name: attribute.name,
        color: attribute.color,
        unit: 'experience' as const,
        values: orderedSnapshots.map((snapshot) => (
          growthByDate.get(snapshot.date)?.attributeChanges
            .find((change) => change.attributeId === attribute.id)?.deltaExp || 0
        ))
      }))
    ];
  }, [attributes, growthSnapshots, orderedSnapshots]);

  const visibleSeries = useMemo(() => (
    chartSeries.filter((series) => !hiddenSeriesIds.has(series.id))
  ), [chartSeries, hiddenSeriesIds]);

  const chartData = useMemo(() => {
    const values = visibleSeries.flatMap((series) => series.values);
    const count = orderedSnapshots.length;
    const maxAbs = values.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
    const domain = Math.max(5, Math.ceil(maxAbs / 2) * 2);
    const minValue = -domain;
    const maxValue = domain;
    const padding = { top: 36, right: 16, bottom: 52, left: 0 };
    const isSparse = count <= 3;
    const pointGap = isSparse ? SPARSE_POINT_GAP : REGULAR_POINT_GAP;
    const axisDates = orderedSnapshots.map((snapshot) => snapshot.date);
    const trailingDate = orderedSnapshots.length > 0
      ? addOneDay(orderedSnapshots[orderedSnapshots.length - 1].date)
      : null;
    const axisLabels = trailingDate ? [...axisDates, trailingDate] : axisDates;
    const axisOccupiedWidth = Math.max(0, (axisLabels.length - 1) * pointGap);
    const availableInnerWidth = Math.max(viewportWidth - Y_AXIS_WIDTH - padding.right, 0);
    const innerWidth = isSparse
      ? Math.max(320, availableInnerWidth, axisOccupiedWidth + 120)
      : Math.max(MIN_CHART_WIDTH - padding.left - padding.right, availableInnerWidth, axisOccupiedWidth);
    const innerHeight = CHART_HEIGHT - padding.top - padding.bottom;
    const svgWidth = innerWidth + padding.left + padding.right;
    const plotOffset = isSparse
      ? Math.max((innerWidth - axisOccupiedWidth) / 2, 0)
      : 0;

    const xCoordinates = orderedSnapshots.map((_, index) => {
      const x = count === 1
        ? padding.left + innerWidth / 2
        : padding.left + plotOffset + index * pointGap;
      return x;
    });
    const series = chartSeries.map((item) => ({
      ...item,
      points: orderedSnapshots.map((snapshot, index) => {
        const value = item.values[index] || 0;
        const normalized = (value - minValue) / (maxValue - minValue || 1);
        return {
          x: xCoordinates[index],
          y: CHART_HEIGHT - padding.bottom - normalized * innerHeight,
          date: snapshot.date,
          value
        };
      })
    }));

    const zeroY = CHART_HEIGHT - padding.bottom - ((0 - minValue) / (maxValue - minValue || 1)) * innerHeight;

    return {
      xCoordinates,
      series,
      zeroY,
      padding,
      minValue,
      maxValue,
      innerWidth,
      svgWidth,
      axisLabels,
      isSparse,
      isEmpty: values.length === 0,
      yTicks: [maxValue, maxValue / 2, 0, minValue / 2, minValue]
    };
  }, [chartSeries, orderedSnapshots, viewportWidth, visibleSeries]);

  useEffect(() => {
    if (!isOpen || !scrollerRef.current) {
      return undefined;
    }

    const measure = () => {
      setViewportWidth(scrollerRef.current?.clientWidth ?? 0);
    };

    measure();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }

    const observer = new ResizeObserver(() => {
      measure();
    });

    observer.observe(scrollerRef.current);

    return () => observer.disconnect();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setActivePointIndex(null);
      dragStateRef.current = null;
      return;
    }

    const latestIndex = Math.max(orderedSnapshots.length - 1, 0);
    setActivePointIndex(latestIndex);

    window.setTimeout(() => {
      const scroller = scrollerRef.current;
      const latestPointX = chartData.xCoordinates[latestIndex];

      if (!chartData.isSparse && scroller && latestPointX !== undefined) {
        const maxScrollLeft = Math.max(chartData.svgWidth - scroller.clientWidth, 0);
        const rightInset = Math.min(LATEST_POINT_RIGHT_INSET, Math.max(scroller.clientWidth * 0.25, 0));
        const targetScrollLeft = Math.max(latestPointX - scroller.clientWidth + rightInset, 0);

        scroller.scrollTo({
          left: Math.min(targetScrollLeft, maxScrollLeft),
          behavior: 'smooth'
        });
      }
    }, 0);
  }, [chartData.isSparse, chartData.svgWidth, chartData.xCoordinates, isOpen, orderedSnapshots.length]);

  if (!isOpen) {
    return null;
  }

  const activePointX = activePointIndex !== null ? chartData.xCoordinates[activePointIndex] : null;
  const activeDate = activePointIndex !== null ? orderedSnapshots[activePointIndex]?.date : null;

  const toggleSeries = (seriesId: string) => {
    setHiddenSeriesIds((previous) => {
      const next = new Set(previous);
      if (next.has(seriesId)) {
        next.delete(seriesId);
      } else if (previous.size < chartSeries.length - 1) {
        next.add(seriesId);
      }
      return next;
    });
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!scrollerRef.current) {
      return;
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: scrollerRef.current.scrollLeft
    };
    scrollerRef.current.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!scrollerRef.current || !dragStateRef.current || dragStateRef.current.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragStateRef.current.startX;
    scrollerRef.current.scrollLeft = dragStateRef.current.startScrollLeft - deltaX;
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!scrollerRef.current || !dragStateRef.current || dragStateRef.current.pointerId !== event.pointerId) {
      return;
    }

    scrollerRef.current.releasePointerCapture(event.pointerId);
    dragStateRef.current = null;
  };

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[130] flex items-end md:items-center justify-center bg-stone-900/40 backdrop-blur-sm animate-fadeIn pb-[env(safe-area-inset-bottom)]"
        onClick={onClose}
      >
        <div
          className="w-full h-[85vh] md:h-auto md:max-h-[85vh] md:max-w-4xl bg-[#faf9f6] rounded-t-[2rem] md:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative animate-slideUp"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-stone-100 bg-white/50">
            <button
              type="button"
              onClick={onClose}
              className="p-2 -ml-2 hover:bg-stone-100 rounded-full text-stone-500 transition-colors"
              aria-label="关闭"
            >
              <X size={22} />
            </button>
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-1">Achievement</span>
              <span className="text-[1.35rem] tracking-tight text-stone-900">积分统计</span>
            </div>
            <div className="w-10" />
          </div>

          <div className="flex-1 overflow-hidden px-2 pt-4 pb-6">
            {chartData.isEmpty ? (
              <div className="flex h-full items-center justify-center px-6 text-sm leading-7 text-stone-500">
                还没有可统计的每日记录。
              </div>
            ) : (
              <div className="flex h-full flex-col">
                <div className="mb-3 flex items-end justify-between gap-4 px-1">
                  <div className="shrink-0 text-xs text-stone-400">{orderedSnapshots[0]?.date}</div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-stone-400">Daily Change</div>
                  <div className="shrink-0 text-right text-xs text-stone-400">{orderedSnapshots[orderedSnapshots.length - 1]?.date}</div>
                </div>

                <div className="mb-3 flex flex-wrap gap-1.5 px-1">
                  {chartSeries.map((series) => {
                    const isVisible = !hiddenSeriesIds.has(series.id);
                    return (
                      <button
                        key={series.id}
                        type="button"
                        onClick={() => toggleSeries(series.id)}
                        aria-pressed={isVisible}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                          isVisible
                            ? 'border-stone-300 bg-white text-stone-800'
                            : 'border-stone-200 bg-transparent text-stone-400'
                        }`}
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: series.color, opacity: isVisible ? 1 : 0.35 }}
                        />
                        {series.name}
                      </button>
                    );
                  })}
                </div>

                <div
                  className="relative overflow-hidden md:h-[400px]"
                  style={{ height: `${CHART_PANEL_HEIGHT}px` }}
                >
                  <div
                    className="pointer-events-none absolute inset-y-0 left-0 z-10 bg-[#faf9f6]"
                    style={{ width: `${Y_AXIS_WIDTH}px` }}
                  >
                    <svg viewBox={`0 0 ${Y_AXIS_WIDTH} ${CHART_HEIGHT}`} className="block h-full w-full">
                      {chartData.yTicks.map((value) => {
                        const normalized = (value - chartData.minValue) / (chartData.maxValue - chartData.minValue || 1);
                        const y = CHART_HEIGHT - chartData.padding.bottom - normalized * (CHART_HEIGHT - chartData.padding.top - chartData.padding.bottom);
                        const isZero = value === 0;

                        return (
                          <text
                            key={value}
                            x={Y_AXIS_WIDTH - 10}
                            y={y + 4}
                            textAnchor="end"
                            fill={isZero ? '#44403c' : '#8b8680'}
                            fontSize="10"
                          >
                            {formatAchievementSignedStars(value)}
                          </text>
                        );
                      })}
                    </svg>
                  </div>

                  <div
                    ref={scrollerRef}
                    className="relative h-full overflow-x-auto overflow-y-hidden no-scrollbar cursor-grab active:cursor-grabbing touch-pan-x"
                    style={{ marginLeft: `${Y_AXIS_WIDTH}px` }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerEnd}
                    onPointerCancel={handlePointerEnd}
                  >
                    <div
                      className="relative h-full shrink-0"
                      style={{ width: `${chartData.svgWidth}px`, minWidth: `${chartData.svgWidth}px` }}
                    >
                      <svg viewBox={`0 0 ${chartData.svgWidth} ${CHART_HEIGHT}`} className="block h-full w-full">
                        <rect
                          x={0}
                          y={chartData.padding.top}
                          width={chartData.innerWidth}
                          height={chartData.zeroY - chartData.padding.top}
                          fill="#fbfaf7"
                        />
                        <rect
                          x={0}
                          y={chartData.zeroY}
                          width={chartData.innerWidth}
                          height={CHART_HEIGHT - chartData.padding.bottom - chartData.zeroY}
                          fill="#f7f4ef"
                        />

                        <line
                          x1={0}
                          y1={chartData.zeroY}
                          x2={chartData.innerWidth}
                          y2={chartData.zeroY}
                          stroke="#6b6258"
                          strokeWidth="1"
                        />

                        {chartData.yTicks.map((value) => {
                          const normalized = (value - chartData.minValue) / (chartData.maxValue - chartData.minValue || 1);
                          const y = CHART_HEIGHT - chartData.padding.bottom - normalized * (CHART_HEIGHT - chartData.padding.top - chartData.padding.bottom);
                          const isZero = value === 0;

                          return (
                            <line
                              key={value}
                              x1={0}
                              y1={y}
                              x2={chartData.innerWidth}
                              y2={y}
                              stroke={isZero ? '#6b6258' : '#e8e2d8'}
                              strokeDasharray={isZero ? undefined : '3 6'}
                            />
                          );
                        })}

                        {activePointX !== null && (
                          <line
                            x1={activePointX}
                            y1={chartData.padding.top}
                            x2={activePointX}
                            y2={CHART_HEIGHT - chartData.padding.bottom}
                            stroke="#b8b1a8"
                            strokeWidth="1"
                            strokeDasharray="4 6"
                          />
                        )}

                        {visibleSeries.map((series) => {
                          const points = chartData.series.find((item) => item.id === series.id)?.points || [];
                          const pathD = buildChartPath(points);
                          const isPointsSeries = series.id === 'points';
                          return (
                            <g key={series.id}>
                              {isPointsSeries && (
                                <path
                                  d={pathD}
                                  fill="none"
                                  stroke="#c9c1b7"
                                  strokeWidth="5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  opacity="0.32"
                                />
                              )}
                              <path
                                d={pathD}
                                fill="none"
                                stroke={series.color}
                                strokeWidth={isPointsSeries ? '1.9' : '1.6'}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity={isPointsSeries ? 1 : 0.88}
                              />
                              {points.map((point, index) => (
                                <circle
                                  key={`${series.id}-${point.date}-${index}`}
                                  cx={point.x}
                                  cy={point.y}
                                  r={index === activePointIndex ? '3.6' : '1.8'}
                                  fill={series.color}
                                  opacity={index === activePointIndex ? 1 : 0.72}
                                />
                              ))}
                            </g>
                          );
                        })}

                        {chartData.axisLabels.map((label, index) => {
                          const labelX = chartData.xCoordinates.length === 1 && index === 0
                            ? chartData.xCoordinates[0]
                            : chartData.padding.left + (chartData.isSparse ? Math.max((chartData.innerWidth - Math.max(0, (chartData.axisLabels.length - 1) * (chartData.isSparse ? SPARSE_POINT_GAP : REGULAR_POINT_GAP))) / 2, 0) : 0) + index * (chartData.isSparse ? SPARSE_POINT_GAP : REGULAR_POINT_GAP);

                          return (
                            <text
                              key={`${label}-${index}`}
                              x={labelX}
                              y={CHART_HEIGHT - 16}
                              textAnchor="middle"
                              fill="#8b8680"
                              fontSize="10"
                            >
                              {label.slice(5)}
                            </text>
                          );
                        })}

                        {chartData.xCoordinates.map((x, index) => {
                          const isActive = index === activePointIndex;

                          return (
                            <g
                              key={`${orderedSnapshots[index]?.date}-${index}`}
                              onMouseEnter={() => setActivePointIndex(index)}
                            >
                              <circle
                                cx={x}
                                cy={CHART_HEIGHT / 2}
                                r="18"
                                fill="transparent"
                                className="cursor-pointer"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setActivePointIndex(index);
                                }}
                                onPointerDown={(event) => event.stopPropagation()}
                              />
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  </div>
                </div>

                {activeDate && activePointIndex !== null && (
                  <div className="border-t border-stone-100 px-1 pt-4">
                    <div className="text-sm text-stone-500">{activeDate}</div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
                      {visibleSeries.map((series) => (
                        <span key={series.id} className="inline-flex items-center gap-1.5 text-xs text-stone-600">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: series.color }} />
                          {series.name} {formatChartValue(series.values[activePointIndex] || 0, series.unit)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1);
        }
      `}</style>
    </>,
    document.body
  );
};
