/**
 * @file AchievementStatsLineChartModal.tsx
 * @input Active achievement daily snapshots
 * @output Bottom-sheet achievement stats drawer with a horizontally draggable positive/negative line chart
 * @pos Component (Achievement Stats)
 * @description Renders a flat drawer-style statistics view for the active achievement ledger with one draggable daily net-delta line chart.
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
const MIN_CHART_WIDTH = 960;

export const AchievementStatsLineChartModal: React.FC<AchievementStatsLineChartModalProps> = ({
  isOpen,
  snapshots,
  onClose
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{ pointerId: number; startX: number; startScrollLeft: number } | null>(null);
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);

  const orderedSnapshots = useMemo(() => (
    [...snapshots].sort((first, second) => first.date.localeCompare(second.date))
  ), [snapshots]);

  const chartData = useMemo(() => {
    const values = orderedSnapshots.map((snapshot) => snapshot.netDelta);
    const maxAbs = values.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
    const domain = Math.max(5, Math.ceil(maxAbs));
    const minValue = -domain;
    const maxValue = domain;
    const padding = { top: 24, right: 28, bottom: 42, left: 56 };
    const innerWidth = Math.max(MIN_CHART_WIDTH - padding.left - padding.right, orderedSnapshots.length * 56);
    const innerHeight = CHART_HEIGHT - padding.top - padding.bottom;
    const divisor = Math.max(orderedSnapshots.length - 1, 1);
    const svgWidth = innerWidth + padding.left + padding.right;

    const points = orderedSnapshots.map((snapshot, index) => {
      const x = padding.left + (index / divisor) * innerWidth;
      const normalized = (snapshot.netDelta - minValue) / (maxValue - minValue || 1);
      const y = CHART_HEIGHT - padding.bottom - normalized * innerHeight;

      return {
        x,
        y,
        date: snapshot.date,
        value: snapshot.netDelta
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
      isEmpty: values.length === 0
    };
  }, [orderedSnapshots]);

  useEffect(() => {
    if (!isOpen) {
      setActivePointIndex(null);
      dragStateRef.current = null;
      return;
    }

    const latestIndex = Math.max(orderedSnapshots.length - 1, 0);
    setActivePointIndex(latestIndex);

    window.setTimeout(() => {
      scrollerRef.current?.scrollTo({
        left: Math.max(chartData.svgWidth - 640, 0),
        behavior: 'smooth'
      });
    }, 0);
  }, [chartData.svgWidth, isOpen, orderedSnapshots.length]);

  if (!isOpen) {
    return null;
  }

  const pathD = chartData.points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const ticks = [-2, -1, 0, 1, 2].map((tick) => (
    tick * Math.max(1, Math.floor(Math.max(Math.abs(chartData.minValue), Math.abs(chartData.maxValue)) / 2))
  ));

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

          <div className="flex-1 overflow-hidden px-4 pt-4 pb-6">
            {chartData.isEmpty ? (
              <div className="flex h-full items-center justify-center px-6 text-sm leading-7 text-stone-500">
                还没有可统计的每日记录。
              </div>
            ) : (
              <div className="flex h-full flex-col">
                <div className="mb-3 flex items-center justify-between px-2 text-xs text-stone-400">
                  <span>{orderedSnapshots[0]?.date}</span>
                  <span>{orderedSnapshots[orderedSnapshots.length - 1]?.date}</span>
                </div>

                <div
                  ref={scrollerRef}
                  className="relative flex-1 overflow-x-auto overflow-y-hidden no-scrollbar cursor-grab active:cursor-grabbing touch-pan-x"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerEnd}
                  onPointerCancel={handlePointerEnd}
                >
                  <div className="relative h-full" style={{ width: `${chartData.svgWidth}px` }}>
                    <svg viewBox={`0 0 ${chartData.svgWidth} ${CHART_HEIGHT}`} className="block h-full w-full">
                      <line
                        x1={chartData.padding.left}
                        y1={chartData.zeroY}
                        x2={chartData.padding.left + chartData.innerWidth}
                        y2={chartData.zeroY}
                        stroke="#d6d3d1"
                        strokeDasharray="4 4"
                      />

                      {ticks.map((value) => {
                        const normalized = (value - chartData.minValue) / (chartData.maxValue - chartData.minValue || 1);
                        const y = CHART_HEIGHT - chartData.padding.bottom - normalized * (CHART_HEIGHT - chartData.padding.top - chartData.padding.bottom);

                        return (
                          <g key={value}>
                            <line
                              x1={chartData.padding.left}
                              y1={y}
                              x2={chartData.padding.left + chartData.innerWidth}
                              y2={y}
                              stroke="#f1efea"
                            />
                            <text
                              x={chartData.padding.left - 10}
                              y={y + 4}
                              textAnchor="end"
                              fill="#a8a29e"
                              fontSize="10"
                            >
                              {formatAchievementSignedStars(value)}
                            </text>
                          </g>
                        );
                      })}

                      {chartData.points.length > 1 && (
                        <path
                          d={pathD}
                          fill="none"
                          stroke="#1c1917"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {chartData.points.map((point, index) => {
                        const isActive = index === activePointIndex;

                        return (
                          <g
                            key={`${point.date}-${index}`}
                            onMouseEnter={() => setActivePointIndex(index)}
                            onFocus={() => setActivePointIndex(index)}
                            tabIndex={0}
                          >
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r={isActive ? '5' : '4'}
                              fill="#ffffff"
                              stroke="#1c1917"
                              strokeWidth={isActive ? '2.5' : '2'}
                            />
                            <text
                              x={point.x}
                              y={CHART_HEIGHT - 14}
                              textAnchor="middle"
                              fill="#a8a29e"
                              fontSize="10"
                            >
                              {point.date.slice(5)}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>

                {activePoint && (
                  <div className="flex items-center justify-between border-t border-stone-100 px-2 pt-4 text-sm text-stone-500">
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
