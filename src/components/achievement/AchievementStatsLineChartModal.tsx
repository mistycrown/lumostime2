/**
 * @file AchievementStatsLineChartModal.tsx
 * @input Active achievement daily snapshots
 * @output Bottom-sheet achievement stats drawer with a horizontally draggable positive/negative line chart
 * @pos Component (Achievement Stats)
 * @description Renders an editorial print-inspired statistics drawer for the active achievement ledger with one draggable daily net-delta line chart.
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
import { AchievementDailySnapshot } from '../../types';
import { formatAchievementSignedStars } from '../../utils/achievementUtils';

interface AchievementStatsLineChartModalProps {
  isOpen: boolean;
  snapshots: AchievementDailySnapshot[];
  onClose: () => void;
}

const CHART_HEIGHT = 320;
const CHART_PANEL_HEIGHT = 360;
const MIN_CHART_WIDTH = 960;
const SPARSE_POINT_GAP = 132;
const REGULAR_POINT_GAP = 72;
const Y_AXIS_WIDTH = 56;

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

export const AchievementStatsLineChartModal: React.FC<AchievementStatsLineChartModalProps> = ({
  isOpen,
  snapshots,
  onClose
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{ pointerId: number; startX: number; startScrollLeft: number } | null>(null);
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);

  const orderedSnapshots = useMemo(() => (
    [...snapshots].sort((first, second) => first.date.localeCompare(second.date))
  ), [snapshots]);

  const chartData = useMemo(() => {
    const values = orderedSnapshots.map((snapshot) => snapshot.netDelta);
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

    const points = orderedSnapshots.map((snapshot, index) => {
      const x = count === 1
        ? padding.left + innerWidth / 2
        : padding.left + plotOffset + index * pointGap;
      const normalized = (snapshot.netDelta - minValue) / (maxValue - minValue || 1);
      const y = CHART_HEIGHT - padding.bottom - normalized * innerHeight;

      return {
        x,
        y,
        date: snapshot.date,
        value: snapshot.netDelta,
        shortDate: snapshot.date.slice(5)
      };
    });

    const zeroY = CHART_HEIGHT - padding.bottom - ((0 - minValue) / (maxValue - minValue || 1)) * innerHeight;

    return {
      points,
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
  }, [orderedSnapshots, viewportWidth]);

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
      if (!chartData.isSparse) {
        scrollerRef.current?.scrollTo({
          left: Math.max(chartData.svgWidth - 640, 0),
          behavior: 'smooth'
        });
      }
    }, 0);
  }, [chartData.isSparse, chartData.svgWidth, isOpen, orderedSnapshots.length]);

  if (!isOpen) {
    return null;
  }

  const pathD = buildChartPath(chartData.points);

  const activePoint = activePointIndex !== null ? chartData.points[activePointIndex] : null;

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
                  <div className="text-[11px] uppercase tracking-[0.18em] text-stone-400">Daily Net Delta</div>
                  <div className="shrink-0 text-right text-xs text-stone-400">{orderedSnapshots[orderedSnapshots.length - 1]?.date}</div>
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

                        {activePoint && (
                          <line
                            x1={activePoint.x}
                            y1={chartData.padding.top}
                            x2={activePoint.x}
                            y2={CHART_HEIGHT - chartData.padding.bottom}
                            stroke="#b8b1a8"
                            strokeWidth="1"
                            strokeDasharray="4 6"
                          />
                        )}

                        <path
                          d={pathD}
                          fill="none"
                          stroke="#c9c1b7"
                          strokeWidth="5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity="0.32"
                        />
                        <path
                          d={pathD}
                          fill="none"
                          stroke="#231f1b"
                          strokeWidth="1.9"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {chartData.axisLabels.map((label, index) => {
                          const labelX = chartData.points.length === 1 && index === 0
                            ? chartData.points[0].x
                            : chartData.padding.left + (chartData.isSparse ? Math.max((chartData.innerWidth - Math.max(0, (chartData.axisLabels.length - 1) * (chartData.isSparse ? SPARSE_POINT_GAP : REGULAR_POINT_GAP))) / 2, 0) : 0) + index * (chartData.isSparse ? SPARSE_POINT_GAP : REGULAR_POINT_GAP);

                          return (
                            <text
                              key={label}
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

                        {chartData.points.map((point, index) => {
                          const isActive = index === activePointIndex;

                          return (
                            <g
                              key={`${point.date}-${index}`}
                              onMouseEnter={() => setActivePointIndex(index)}
                            >
                              <circle
                                cx={point.x}
                                cy={point.y}
                                r="18"
                                fill="transparent"
                                className="cursor-pointer"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setActivePointIndex(index);
                                }}
                                onPointerDown={(event) => event.stopPropagation()}
                              />
                              <circle
                                cx={point.x}
                                cy={point.y}
                                r={isActive ? '4.5' : '2.2'}
                                fill={isActive ? '#231f1b' : '#6b6258'}
                                opacity={isActive ? 1 : 0.55}
                              />
                              {isActive && (
                                <>
                                  <rect
                                    x={point.x - 34}
                                    y={point.y - 32}
                                    width="68"
                                    height="18"
                                    rx="9"
                                    fill="#f4efe7"
                                  />
                                  <text
                                    x={point.x}
                                    y={point.y - 19}
                                    textAnchor="middle"
                                    fill="#231f1b"
                                    fontSize="10"
                                    fontWeight="600"
                                  >
                                    {formatAchievementSignedStars(point.value)}
                                  </text>
                                </>
                              )}
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  </div>
                </div>

                {activePoint && (
                  <div className="flex items-center justify-between border-t border-stone-100 px-1 pt-4 text-sm text-stone-500">
                    <span>{activePoint.date}</span>
                    <span className="text-stone-900">{formatAchievementSignedStars(activePoint.value)}</span>
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
