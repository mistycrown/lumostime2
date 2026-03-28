/**
 * @file AchievementRecordsTab.tsx
 * @description Minimal ledger-style daily snapshot list with modal-based detail view and redemption record history.
 */
import React, { useMemo, useState } from 'react';
import { ChevronRight, Trash2 } from 'lucide-react';
import { AchievementDailySnapshot, AchievementRedemptionRecord } from '../../types';
import { formatRelativeTime, getLocalDateTimeStr } from '../../utils/dateUtils';
import { AchievementDialog } from './AchievementDialog';

interface AchievementRecordsTabProps {
  snapshots: AchievementDailySnapshot[];
  redemptionRecords: AchievementRedemptionRecord[];
  onDeleteRedemptionRecord: (recordId: string) => void;
}

export const AchievementRecordsTab: React.FC<AchievementRecordsTabProps> = ({
  snapshots,
  redemptionRecords,
  onDeleteRedemptionRecord
}) => {
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);

  const orderedSnapshots = useMemo(() => {
    return [...snapshots].sort((first, second) => second.date.localeCompare(first.date));
  }, [snapshots]);

  const orderedRecords = useMemo(() => {
    return [...redemptionRecords].sort((first, second) => second.redeemedAt - first.redeemedAt);
  }, [redemptionRecords]);

  const selectedSnapshot = orderedSnapshots.find((snapshot) => snapshot.id === selectedSnapshotId) || null;

  return (
    <>
      <div className="space-y-6">
        <section>
          <div className="flex items-center justify-between border-b border-stone-200 pb-[14px]">
            <div className="text-[11px] uppercase tracking-[0.18em] text-stone-400">
              Daily Records / {orderedSnapshots.length}
            </div>
          </div>

          {orderedSnapshots.length === 0 ? (
            <div className="mt-[14px] rounded-2xl border border-dashed border-stone-300 bg-white/50 px-5 py-6 text-sm leading-7 text-stone-500">
              还没有每日快照。首次进入成就页后，系统会从启用当天开始生成记录。
            </div>
          ) : (
            <div className="mt-[14px] divide-y divide-stone-200">
              {orderedSnapshots.map((snapshot) => (
                <button
                  key={snapshot.id}
                  type="button"
                  onClick={() => setSelectedSnapshotId(snapshot.id)}
                  className="flex w-full items-center justify-between gap-4 py-[14px] text-left transition-colors hover:bg-stone-50/70"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[16px] leading-none text-stone-900">{snapshot.date}</div>
                    <div className="mt-[6px] text-[13px] leading-6 text-stone-500">
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
          )}
        </section>

        <section>
          <div className="flex items-center justify-between border-b border-stone-200 pb-[14px]">
            <div className="text-[11px] uppercase tracking-[0.18em] text-stone-400">
              Redemption Records / {orderedRecords.length}
            </div>
          </div>

          {orderedRecords.length === 0 ? (
            <div className="mt-[14px] rounded-2xl border border-dashed border-stone-300 bg-white/50 px-5 py-6 text-sm leading-7 text-stone-500">
              还没有兑换记录。兑换奖励后，最近一次会显示在这里。
            </div>
          ) : (
            <div className="mt-[14px] divide-y divide-stone-200">
              {orderedRecords.map((record) => (
                <div key={record.id} className="flex items-center justify-between gap-4 py-[14px]">
                  <div className="min-w-0 flex-1">
                    <div className="text-[16px] leading-none text-stone-900">{record.rewardName}</div>
                    <div className="mt-[6px] text-[13px] leading-6 text-stone-500">
                      花费 {record.cost} 光点 · {formatRelativeTime(record.redeemedAt)} · {getLocalDateTimeStr(new Date(record.redeemedAt))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteRedemptionRecord(record.id)}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center self-center rounded-full text-stone-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                    aria-label="删除兑换记录"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
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
                  {item.targetType === 'activity' || item.targetType === 'scope'
                    ? `${item.matchedValue} 分钟，按每 ${item.unitAmount} 分钟 ${item.effectType === 'earn' ? '+' : '-'}${item.deltaPerUnit} 光点，触发 ${item.appliedUnits} 次。`
                    : `${item.matchedValue} 项，按每 ${item.unitAmount} 项 ${item.effectType === 'earn' ? '+' : '-'}${item.deltaPerUnit} 光点，触发 ${item.appliedUnits} 次。`}
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
