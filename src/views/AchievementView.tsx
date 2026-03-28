/**
 * @file AchievementView.tsx
 * @input Achievement context state, categories for rule editing
 * @output Full-screen achievement bottle experience with bottle view, records, rules, and redeem tabs
 * @pos View (Achievement Overlay)
 * @description Achievement bottle full-screen page opened from Timeline, including the star container, expandable detail sheet, and rule-driven daily snapshot ledger.
 *
 * @updated 2026-03-28: Added initial achievement bottle view with recent-day recomputation, editable rules, reward redemption, and bottle test controls.
 */
import React, { useEffect, useState } from 'react';
import { CalendarClock, Gift, ScrollText, SlidersHorizontal } from 'lucide-react';
import { useAchievement } from '../contexts/AchievementContext';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { AchievementBottle } from '../components/achievement/AchievementBottle';
import { AchievementRecordsTab } from '../components/achievement/AchievementRecordsTab';
import { AchievementRulesTab } from '../components/achievement/AchievementRulesTab';
import { AchievementRedeemTab } from '../components/achievement/AchievementRedeemTab';

type AchievementTab = 'records' | 'rules' | 'redeem';

const TAB_CONFIG: Array<{ id: AchievementTab; label: string; icon: React.ReactNode }> = [
  { id: 'records', label: '记录', icon: <ScrollText size={16} /> },
  { id: 'rules', label: '规则', icon: <SlidersHorizontal size={16} /> },
  { id: 'redeem', label: '兑换', icon: <Gift size={16} /> }
];

export const AchievementView: React.FC = () => {
  const {
    isReady,
    achievementStartDate,
    rules,
    rewards,
    dailySnapshots,
    redemptionRecords,
    availableStars,
    totalEarnedStars,
    totalRedeemedStars,
    ensureRecentSnapshots,
    createRule,
    updateRule,
    deleteRule,
    createReward,
    updateReward,
    deleteReward,
    redeemReward,
    deleteRedemptionRecord
  } = useAchievement();
  const { categories } = useCategoryScope();
  const [activeTab, setActiveTab] = useState<AchievementTab>('records');
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [testOffset, setTestOffset] = useState(0);
  const [rebuildToken, setRebuildToken] = useState(0);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    void ensureRecentSnapshots();
  }, [isReady]);

  const displayCount = Math.max(0, availableStars + testOffset);

  return (
    <div className="h-full bg-[linear-gradient(180deg,#fffdf6_0%,#fff8e4_42%,#f9efe0_100%)] text-stone-900">
      <div className="flex h-full flex-col">
        <section
          className={`shrink-0 px-4 pb-4 pt-4 transition-[height] duration-300 ${
            isSheetExpanded ? 'h-[15%]' : 'h-[74%]'
          }`}
        >
          <AchievementBottle
            starCount={displayCount}
            onAddTestStar={() => setTestOffset((previous) => previous + 1)}
            onRemoveTestStar={() => setTestOffset((previous) => previous - 1)}
            onRebuild={() => setRebuildToken((previous) => previous + 1)}
            rebuildToken={rebuildToken}
          />
        </section>

        <section
          className={`flex-1 overflow-hidden rounded-t-[2rem] border-t border-white/70 bg-[#fcfbf7]/96 shadow-[0_-12px_30px_rgba(120,113,108,0.08)] transition-[transform,height] duration-300 ${
            isSheetExpanded ? 'h-[85%]' : 'h-[26%]'
          }`}
        >
          <div className="flex h-full flex-col">
            <button
              type="button"
              onClick={() => setIsSheetExpanded((previous) => !previous)}
              className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-stone-300"
              aria-label={isSheetExpanded ? '收起详情' : '展开详情'}
            />

            <div className="px-5 pb-4 pt-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">
                    <CalendarClock size={14} />
                    Achievement Ledger
                  </div>
                  <h2 className="mt-2 text-2xl font-black text-stone-900">成就明细</h2>
                  <p className="mt-1 text-sm text-stone-500">
                    {achievementStartDate
                      ? `从 ${achievementStartDate} 开始记账，历史快照冻结，规则变更仅影响今天和昨天。`
                      : '首次打开后会从今天开始记账。'}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-amber-50 px-3 py-3 text-center">
                    <div className="text-xs text-amber-700">可用</div>
                    <div className="mt-1 text-xl font-black text-stone-900">{availableStars}</div>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 px-3 py-3 text-center">
                    <div className="text-xs text-emerald-700">累计获得</div>
                    <div className="mt-1 text-xl font-black text-stone-900">{totalEarnedStars}</div>
                  </div>
                  <div className="rounded-2xl bg-rose-50 px-3 py-3 text-center">
                    <div className="text-xs text-rose-700">累计兑换</div>
                    <div className="mt-1 text-xl font-black text-stone-900">{totalRedeemedStars}</div>
                  </div>
                </div>
              </div>

              {testOffset !== 0 && (
                <div className="mt-3 rounded-2xl bg-stone-100 px-4 py-3 text-sm text-stone-600">
                  当前瓶子处于测试偏移状态：{testOffset > 0 ? `临时多显示 ${testOffset} 颗` : `临时少显示 ${Math.abs(testOffset)} 颗`}。
                </div>
              )}
            </div>

            <div className="px-4">
              <div className="grid grid-cols-3 gap-2 rounded-2xl bg-stone-100/90 p-1">
                {TAB_CONFIG.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition-colors ${
                      activeTab === tab.id
                        ? 'bg-white text-stone-900 shadow-sm'
                        : 'text-stone-500'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-24 pt-4">
              {activeTab === 'records' && (
                <AchievementRecordsTab snapshots={dailySnapshots} />
              )}
              {activeTab === 'rules' && (
                <AchievementRulesTab
                  categories={categories}
                  rules={rules}
                  onCreateRule={createRule}
                  onUpdateRule={updateRule}
                  onDeleteRule={deleteRule}
                />
              )}
              {activeTab === 'redeem' && (
                <AchievementRedeemTab
                  availableStars={availableStars}
                  rewards={rewards}
                  redemptionRecords={redemptionRecords}
                  onCreateReward={createReward}
                  onUpdateReward={updateReward}
                  onDeleteReward={deleteReward}
                  onRedeemReward={redeemReward}
                  onDeleteRedemptionRecord={deleteRedemptionRecord}
                />
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
