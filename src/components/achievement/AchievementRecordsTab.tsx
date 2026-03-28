/**
 * @file AchievementRecordsTab.tsx
 * @description Minimal ledger-style daily snapshot list with modal-based detail view.
 */
import React, { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { AchievementDailySnapshot } from '../../types';
import { formatRelativeTime } from '../../utils/dateUtils';
import { AchievementDialog } from './AchievementDialog';

interface AchievementRecordsTabProps {
  snapshots: AchievementDailySnapshot[];
}

export const AchievementRecordsTab: React.FC<AchievementRecordsTabProps> = ({ snapshots }) => {
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);

  const orderedSnapshots = useMemo(() => {
    return [...snapshots].sort((first, second) => second.date.localeCompare(first.date));
  }, [snapshots]);

  const selectedSnapshot = orderedSnapshots.find((snapshot) => snapshot.id === selectedSnapshotId) || null;

  if (orderedSnapshots.length === 0) {
    return (
      <div className="border-t border-dashed border-stone-300 pt-4 text-sm leading-7 text-stone-500">
        还没有每日快照。首次进入成就页后，系统会从启用当天开始生成记录。
      </div>
    );
  }

  return (
    <>
      <div className="border-t border-stone-200">
        {orderedSnapshots.map((snapshot) => (
          <button
            key={snapshot.id}
            type="button"
            onClick={() => setSelectedSnapshotId(snapshot.id)}
            className="flex w-full items-center justify-between gap-4 border-b border-stone-200 py-4 text-left transition-colors hover:bg-stone-50/70"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[1rem] leading-none text-stone-900">{snapshot.date}</div>
              <div className="mt-2 text-[13px] leading-6 text-stone-500">
                命中 {snapshot.ruleBreakdown.length} 条规则，更新于 {formatRelativeTime(snapshot.computedAt)}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[1.2rem] leading-none text-stone-900">
                {snapshot.netDelta >= 0 ? `+${snapshot.netDelta}` : snapshot.netDelta}
              </span>
              <ChevronRight size={16} className="text-stone-300" />
            </div>
          </button>
        ))}
      </div>

      <AchievementDialog
        isOpen={!!selectedSnapshot}
        title={selectedSnapshot?.date || '记录详情'}
        subtitle={selectedSnapshot ? `净变化 ${selectedSnapshot.netDelta >= 0 ? `+${selectedSnapshot.netDelta}` : selectedSnapshot.netDelta}` : undefined}
        onClose={() => setSelectedSnapshotId(null)}
      >
        {selectedSnapshot?.ruleBreakdown.length ? (
          <div className="border-t border-stone-200">
            {selectedSnapshot.ruleBreakdown.map((item) => (
              <div key={`${selectedSnapshot.id}-${item.ruleId}`} className="border-b border-stone-200 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-[1rem] text-stone-900">{item.ruleName}</div>
                  <div className="text-[1rem] text-stone-900">
                    {item.delta >= 0 ? `+${item.delta}` : item.delta}
                  </div>
                </div>
                <div className="mt-2 text-sm leading-7 text-stone-500">
                  {item.matchedMinutes} 分钟，按每 {item.unitMinutes} 分钟 {item.effectType === 'earn' ? '+' : '-'}
                  {item.deltaPerUnit} 星，触发 {item.appliedUnits} 次。
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm leading-7 text-stone-500">
            这一天没有命中任何规则，净变化为 0。
          </div>
        )}
      </AchievementDialog>
    </>
  );
};
