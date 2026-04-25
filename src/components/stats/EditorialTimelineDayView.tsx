/**
 * @file EditorialTimelineDayView.tsx
 * @input timelineRows, legendItems, displayDate
 * @output UI (Editorial day timeline card)
 * @pos Component (Statistics - Matrix Day Tab)
 * @description 日范围矩阵子视图，以 editorial 风格展示 24 小时 * 6 个十分钟切片的时间格子，并在底部展示活动图例。
 *
 * @updated 2026-04-25: Initial implementation for the matrix day-range editorial timeline tab.
 */

import React from 'react';
interface TimelineChunk {
  activityId: string | null;
  activityName: string | null;
  color: string;
  textColor: string;
  label: string;
}

interface TimelineRow {
  hour: number;
  chunks: TimelineChunk[];
}

interface TimelineLegendItem {
  activityId: string;
  activityName: string;
  color: string;
  duration: number;
}

interface EditorialTimelineDayViewProps {
  displayDate: Date;
  timelineRows: TimelineRow[];
  legendItems: TimelineLegendItem[];
}

const formatLegendDuration = (seconds: number): string => {
  const totalMinutes = Math.max(0, Math.floor(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
};

export const EditorialTimelineDayView: React.FC<EditorialTimelineDayViewProps> = ({
  displayDate: _displayDate,
  timelineRows,
  legendItems
}) => {
  return (
    <div className="animate-in fade-in zoom-in-95 duration-300">
      <div className="-ml-4 w-full max-w-[452px] pr-2 sm:-ml-5 sm:pr-0">
        {timelineRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#ddd2c5] bg-[#fcfbf8] px-4 py-10 text-center text-sm text-[#9b8a79]">
            当天还没有记录
          </div>
        ) : (
          <div className="space-y-[3px]">
            {timelineRows.map((row) => (
              <div key={row.hour} className="group flex items-stretch gap-3">
                <div className="w-10 pt-[3px] text-right text-[10px] font-semibold leading-none text-[#76695d] transition-colors group-hover:text-[#2f2923]">
                  {String(row.hour).padStart(2, '0')}
                </div>
                <div className="flex flex-1 gap-[2px]">
                  {row.chunks.map((chunk, index) => (
                    <div
                      key={`${row.hour}-${index}`}
                      className="flex h-5 flex-1 items-center overflow-hidden rounded-[3px] px-[2px] transition-transform duration-200 group-hover:scale-y-[1.03]"
                      style={{ backgroundColor: chunk.color }}
                      title={chunk.activityName || '留白'}
                    >
                      {chunk.label ? (
                        <span
                          className="truncate text-[7px] font-medium leading-none"
                          style={{ color: chunk.textColor }}
                        >
                          {chunk.label}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 border-t border-[#e5ddd2] pt-5 pl-[50px]">
          {legendItems.length === 0 ? (
            <div className="text-center text-xs tracking-[0.2em] text-[#ad9984]">NO ENTRIES</div>
          ) : (
            <ul className="space-y-2.5">
              {legendItems.map((item) => (
                <li key={item.activityId} className="flex items-baseline justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate text-[11px] uppercase tracking-[0.18em] text-[#5f564d]">
                      {item.activityName}
                    </span>
                  </div>
                  <span className="shrink-0 text-[11px] uppercase tracking-[0.12em] text-[#8d7967]">
                    {formatLegendDuration(item.duration)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
