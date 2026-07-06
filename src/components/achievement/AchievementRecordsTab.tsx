/**
 * @file AchievementRecordsTab.tsx
 * @description Minimal ledger-style daily snapshot list with modal-based detail view and one-decimal achievement star values, including decimal-weighted check-category contributions.
 * @updated 2026-07-05: Added a stats entry button beside Daily Records and a bottom-sheet chart modal for active daily star trends.
 * @updated 2026-04-25: Clarified check-category detail copy so streak-weighted completion values display with one decimal place.
 *
 * @updated 2026-04-17: Added filter-expression detail text for filter-duration rules.
 * @updated 2026-04-06: Removed archived bottle exchange records so the tab only shows the current active bottle ledger.
 */
import React, { useMemo, useState } from 'react';
import { BarChart3, ChevronRight, RotateCcw, Trash2 } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { AchievementDailySnapshot, AchievementRedemptionRecord } from '../../types';
import { formatRelativeTime, getLocalDateTimeStr } from '../../utils/dateUtils';
import { AchievementDialog } from './AchievementDialog';
import { formatAchievementSignedStars, formatAchievementStars } from '../../utils/achievementUtils';
import { AchievementStatsLineChartModal } from './AchievementStatsLineChartModal';

interface AchievementRecordsTabProps {
  snapshots: AchievementDailySnapshot[];
  redemptionRecords: AchievementRedemptionRecord[];
  onDeleteRedemptionRecord: (recordId: string) => void;
  onRecomputeSnapshot: (date: string) => { ok: boolean; message?: string };
}

const PAGE_SIZE = 10;

/** Returns the visible slice and a loader for the next page. */
function usePagedList<T>(items: T[]) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visible = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;
  const loadMore = () => setVisibleCount((n) => n + PAGE_SIZE);
  return { visible, hasMore, loadMore };
}

export const AchievementRecordsTab: React.FC<AchievementRecordsTabProps> = ({
  snapshots,
  redemptionRecords,
  onDeleteRedemptionRecord,
  onRecomputeSnapshot
}) => {
  const { addToast } = useToast();
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  const orderedSnapshots = useMemo(() => {
    return [...snapshots].sort((first, second) => second.date.localeCompare(first.date));
  }, [snapshots]);

  const orderedRewardRecords = useMemo(() => {
    return [...redemptionRecords].sort((first, second) => second.redeemedAt - first.redeemedAt);
  }, [redemptionRecords]);

  const selectedSnapshot = orderedSnapshots.find((snapshot) => snapshot.id === selectedSnapshotId) || null;

  const snapshotsPaged = usePagedList(orderedSnapshots);
  const rewardsPaged = usePagedList(orderedRewardRecords);

  const handleRecomputeSelectedSnapshot = () => {
    if (!selectedSnapshot) {
      return;
    }

    const result = onRecomputeSnapshot(selectedSnapshot.date);
    if (result.ok) {
      addToast('success', `${selectedSnapshot.date} 已按当前规则重新计算`);
      return;
    }

    addToast('error', result.message || '重新计算失败，请稍后重试');
  };

  return (
    <>
      <div className="space-y-6">
        <section>
          <div className="flex items-center justify-between gap-3 border-b border-stone-200 pb-[14px]">
            <div className="text-[11px] uppercase tracking-[0.18em] text-stone-400">
              Daily Records / {orderedSnapshots.length}
            </div>
            <button
              type="button"
              onClick={() => setIsStatsOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white/80 px-3 py-1.5 text-xs text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-900"
            >
              <BarChart3 size={13} />
              统计
            </button>
          </div>

          {orderedSnapshots.length === 0 ? (
            <div className="mt-[14px] rounded-2xl border border-dashed border-stone-300 bg-white/50 px-5 py-6 text-sm leading-7 text-stone-500">
              还没有每日快照。首次进入成就页后，系统会从启用当天开始生成记录。
            </div>
          ) : (
            <div className="mt-[14px] divide-y divide-stone-200">
              {snapshotsPaged.visible.map((snapshot) => (
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
                      {formatAchievementSignedStars(snapshot.netDelta)}
                    </span>
                    <ChevronRight size={16} className="text-stone-300" />
                  </div>
                </button>
              ))}
              {snapshotsPaged.hasMore && (
                <button
                  type="button"
                  onClick={snapshotsPaged.loadMore}
                  className="w-full py-3 text-[13px] text-stone-400 transition-colors hover:text-stone-600"
                >
                  展开更多（剩余 {orderedSnapshots.length - snapshotsPaged.visible.length} 条）
                </button>
              )}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between border-b border-stone-200 pb-[14px]">
            <div className="text-[11px] uppercase tracking-[0.18em] text-stone-400">
              Redemption Records / {orderedRewardRecords.length}
            </div>
          </div>

          {orderedRewardRecords.length === 0 ? (
            <div className="mt-[14px] rounded-2xl border border-dashed border-stone-300 bg-white/50 px-5 py-6 text-sm leading-7 text-stone-500">
              还没有奖励兑换记录。兑换奖励后，最近一次会显示在这里。
            </div>
          ) : (
            <div className="mt-[14px] divide-y divide-stone-200">
              {rewardsPaged.visible.map((record) => (
                <div key={record.id} className="flex items-center justify-between gap-4 py-[14px]">
                  <div className="min-w-0 flex-1">
                    <div className="text-[16px] leading-none text-stone-900">{record.rewardName}</div>
                    <div className="mt-[6px] text-[13px] leading-6 text-stone-500">
                      花费 {formatAchievementStars(record.cost)} 光点 · {getLocalDateTimeStr(new Date(record.redeemedAt))}
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
              {rewardsPaged.hasMore && (
                <button
                  type="button"
                  onClick={rewardsPaged.loadMore}
                  className="w-full py-3 text-[13px] text-stone-400 transition-colors hover:text-stone-600"
                >
                  展开更多（剩余 {orderedRewardRecords.length - rewardsPaged.visible.length} 条）
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      <AchievementDialog
        isOpen={!!selectedSnapshot}
        title={selectedSnapshot?.date || '记录详情'}
        subtitle={selectedSnapshot ? `净变化 ${formatAchievementSignedStars(selectedSnapshot.netDelta)}` : undefined}
        onClose={() => setSelectedSnapshotId(null)}
        footer={selectedSnapshot ? (
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setSelectedSnapshotId(null)}
              className="rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-600 transition-colors hover:bg-stone-50"
            >
              关闭
            </button>
            <button
              type="button"
              onClick={handleRecomputeSelectedSnapshot}
              className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-4 py-2 text-sm text-white transition-colors hover:bg-stone-800"
            >
              <RotateCcw size={14} />
              重新计算当天得分
            </button>
          </div>
        ) : undefined}
      >
        {selectedSnapshot?.ruleBreakdown.length ? (
          <div className="border-t border-stone-200">
            {selectedSnapshot.ruleBreakdown.map((item) => (
              <div key={`${selectedSnapshot.id}-${item.ruleId}`} className="border-b border-stone-200 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-[1rem] text-stone-900">{item.ruleName}</div>
                  <div className="text-[1rem] text-stone-900">
                    {formatAchievementSignedStars(item.delta)}
                  </div>
                </div>
                <div className="mt-2 text-sm leading-7 text-stone-500">
                  {item.targetType === 'activity' || item.targetType === 'scope' || item.targetType === 'filterDuration'
                    ? `${item.matchedValue} 分钟，按每 ${item.unitAmount} 分钟 ${formatAchievementSignedStars(item.effectType === 'earn' ? item.deltaPerUnit : -item.deltaPerUnit)} 光点，折算 ${formatAchievementStars(item.appliedUnits)} 单位。`
                    : `${item.targetType === 'checkCategory' ? formatAchievementStars(item.matchedValue) : item.matchedValue} 项，按每 ${item.unitAmount} 项 ${formatAchievementSignedStars(item.effectType === 'earn' ? item.deltaPerUnit : -item.deltaPerUnit)} 光点，折算 ${formatAchievementStars(item.appliedUnits)} 单位。`}
                </div>
                {item.targetType === 'filterDuration' && item.filterExpression && (
                  <div className="mt-1 text-xs leading-6 text-stone-400">
                    表达式：{item.filterExpression}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm leading-7 text-stone-500">
            这一天没有命中任何规则，净变化为 0。
          </div>
        )}
      </AchievementDialog>

      <AchievementStatsLineChartModal
        isOpen={isStatsOpen}
        snapshots={orderedSnapshots}
        onClose={() => setIsStatsOpen(false)}
      />
    </>
  );
};
