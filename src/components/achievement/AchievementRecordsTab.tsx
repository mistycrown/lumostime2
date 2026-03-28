/**
 * @file AchievementRecordsTab.tsx
 * @description Daily achievement snapshot list with expandable rule breakdown details.
 */
import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { AchievementDailySnapshot } from '../../types';
import { formatRelativeTime } from '../../utils/dateUtils';

interface AchievementRecordsTabProps {
  snapshots: AchievementDailySnapshot[];
}

export const AchievementRecordsTab: React.FC<AchievementRecordsTabProps> = ({ snapshots }) => {
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  const orderedSnapshots = useMemo(() => {
    return [...snapshots].sort((first, second) => second.date.localeCompare(first.date));
  }, [snapshots]);

  if (orderedSnapshots.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-stone-200 bg-stone-50/80 px-5 py-8 text-center text-sm text-stone-500">
        还没有每日快照。第一次进入成就页后，系统会从启用当天开始生成记录。
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orderedSnapshots.map((snapshot) => {
        const isExpanded = expandedDates[snapshot.date] || false;

        return (
          <div key={snapshot.id} className="overflow-hidden rounded-3xl border border-stone-200 bg-white/90 shadow-sm">
            <button
              type="button"
              onClick={() => setExpandedDates((previous) => ({ ...previous, [snapshot.date]: !isExpanded }))}
              className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
            >
              <div>
                <div className="text-sm font-semibold text-stone-900">{snapshot.date}</div>
                <div className="mt-1 text-xs text-stone-500">
                  命中 {snapshot.ruleBreakdown.length} 条规则，更新于 {formatRelativeTime(snapshot.computedAt)}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-lg font-black ${snapshot.netDelta >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {snapshot.netDelta >= 0 ? `+${snapshot.netDelta}` : snapshot.netDelta}
                </span>
                {isExpanded ? <ChevronUp size={18} className="text-stone-400" /> : <ChevronDown size={18} className="text-stone-400" />}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-stone-100 px-4 py-4">
                {snapshot.ruleBreakdown.length === 0 ? (
                  <div className="rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-500">
                    这一天没有命中任何规则，净变化为 0。
                  </div>
                ) : (
                  <div className="space-y-3">
                    {snapshot.ruleBreakdown.map((item) => (
                      <div key={`${snapshot.id}-${item.ruleId}`} className="rounded-2xl bg-stone-50/90 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-stone-900">{item.ruleName}</div>
                          <div className={`text-sm font-bold ${item.delta >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {item.delta >= 0 ? `+${item.delta}` : item.delta}
                          </div>
                        </div>
                        <div className="mt-2 text-xs leading-6 text-stone-600">
                          {item.matchedMinutes} 分钟，按每 {item.unitMinutes} 分钟 {item.effectType === 'earn' ? '+' : '-'}
                          {item.deltaPerUnit} 星，触发 {item.appliedUnits} 次
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
