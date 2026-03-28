/**
 * @file AchievementEntryCard.tsx
 * @description Timeline-top entry card for opening the achievement bottle page with current summary data.
 */
import React from 'react';
import { Sparkles, Stars } from 'lucide-react';
import { useAchievement } from '../../contexts/AchievementContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { formatRelativeTime } from '../../utils/dateUtils';

export const AchievementEntryCard: React.FC = () => {
  const { availableStars, dailySnapshots, redemptionRecords } = useAchievement();
  const { setIsAchievementOpen } = useNavigation();

  const latestComputedAt = dailySnapshots.length > 0
    ? Math.max(...dailySnapshots.map((item) => item.computedAt))
    : null;
  const latestRedemptionAt = redemptionRecords.length > 0
    ? Math.max(...redemptionRecords.map((item) => item.redeemedAt))
    : null;
  const latestActivityTime = Math.max(latestComputedAt || 0, latestRedemptionAt || 0);

  return (
    <button
      type="button"
      onClick={() => setIsAchievementOpen(true)}
      className="w-full rounded-3xl border border-amber-200/80 bg-[linear-gradient(135deg,rgba(255,251,235,0.95),rgba(255,244,214,0.92))] p-4 text-left shadow-[0_12px_30px_rgba(245,158,11,0.12)] transition-transform duration-200 active:scale-[0.99]"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-amber-700">
            <Stars size={16} />
            <span className="text-xs font-semibold tracking-[0.18em] uppercase">Achievement Bottle</span>
          </div>
          <div className="mt-2 flex items-end gap-3">
            <span className="text-3xl font-black text-stone-900">{availableStars}</span>
            <span className="pb-1 text-sm font-medium text-stone-500">当前可用星星</span>
          </div>
          <p className="mt-2 text-sm text-stone-600">
            {latestActivityTime > 0
              ? `最近更新 ${formatRelativeTime(latestActivityTime)}`
              : '还没有成就记录，先去配置规则吧'}
          </p>
        </div>
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-amber-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <Sparkles size={28} />
        </div>
      </div>
    </button>
  );
};
