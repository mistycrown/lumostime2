/**
 * @file AchievementView.tsx
 * @input Achievement context state, categories for rule editing
 * @output Full-screen achievement bottle experience with a bottle-first collapsed state and a ledger-first expanded state
 * @pos View (Achievement Overlay)
 * @description Achievement bottle full-screen page opened from Timeline. The collapsed state emphasizes the bottle, while the expanded state turns the screen into a full ledger workspace.
 *
 * @updated 2026-03-28: Expanded ledger now fills the screen, simplified the ledger chrome, and removed the heavy stats header.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Gift, ScrollText, SlidersHorizontal } from 'lucide-react';
import { useAchievement } from '../contexts/AchievementContext';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { AchievementBottle } from '../components/achievement/AchievementBottle';
import { AchievementRecordsTab } from '../components/achievement/AchievementRecordsTab';
import { AchievementRulesTab } from '../components/achievement/AchievementRulesTab';
import { AchievementRedeemTab } from '../components/achievement/AchievementRedeemTab';

type AchievementTab = 'records' | 'rules' | 'redeem';

const TAB_CONFIG: Array<{ id: AchievementTab; label: string; icon: React.ReactNode }> = [
  { id: 'records', label: '记录', icon: <ScrollText size={15} /> },
  { id: 'rules', label: '规则', icon: <SlidersHorizontal size={15} /> },
  { id: 'redeem', label: '兑换', icon: <Gift size={15} /> }
];

const COLLAPSED_DETAIL_HEIGHT = '10.5rem';

export const AchievementView: React.FC = () => {
  const {
    isReady,
    rules,
    rewards,
    dailySnapshots,
    redemptionRecords,
    availableStars,
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
  const [isDetailExpanded, setIsDetailExpanded] = useState(false);
  const [testOffset, setTestOffset] = useState(0);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    void ensureRecentSnapshots();
  }, [ensureRecentSnapshots, isReady]);

  const displayCount = Math.max(0, availableStars + testOffset);

  const tabContent = useMemo(() => {
    if (activeTab === 'records') {
      return <AchievementRecordsTab snapshots={dailySnapshots} />;
    }

    if (activeTab === 'rules') {
      return (
        <AchievementRulesTab
          categories={categories}
          rules={rules}
          onCreateRule={createRule}
          onUpdateRule={updateRule}
          onDeleteRule={deleteRule}
        />
      );
    }

    return (
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
    );
  }, [
    activeTab,
    availableStars,
    categories,
    createReward,
    createRule,
    dailySnapshots,
    deleteRedemptionRecord,
    deleteReward,
    deleteRule,
    redemptionRecords,
    redeemReward,
    rewards,
    rules,
    updateReward,
    updateRule
  ]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#faf9f6] text-stone-900">
      {!isDetailExpanded && (
        <section className="min-h-0 flex-1 px-4 pb-3 pt-4">
          <AchievementBottle
            starCount={displayCount}
            onAddTestStar={() => setTestOffset((previous) => previous + 1)}
            onRemoveTestStar={() => setTestOffset((previous) => previous - 1)}
            rebuildToken={displayCount}
            compact={false}
          />
        </section>
      )}

      <section
        className={`border-stone-200/80 bg-[#fdfbf7] transition-all duration-300 ease-out ${
          isDetailExpanded ? 'min-h-0 flex flex-1 flex-col border-t-0' : 'shrink-0 border-t'
        }`}
        style={isDetailExpanded ? undefined : { height: COLLAPSED_DETAIL_HEIGHT }}
      >
        <button
          type="button"
          onClick={() => setIsDetailExpanded((previous) => !previous)}
          aria-label={isDetailExpanded ? '收起明细' : '展开明细'}
          className="flex shrink-0 flex-col items-center gap-2 px-5 pb-2 pt-3 text-stone-400 transition-colors hover:text-stone-600"
        >
          <span className="h-1.5 w-16 rounded-full bg-stone-300" />
          {isDetailExpanded ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
        </button>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 px-5 pb-3 pt-1">
            <div className="text-[11px] font-medium uppercase tracking-[0.28em] text-stone-400">
              Achievement Ledger
            </div>
          </div>

          <div className="shrink-0 px-5 pb-2">
            <div className="inline-flex w-full items-center gap-1 rounded-[1.4rem] border border-stone-200 bg-white/90 p-1 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
              {TAB_CONFIG.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-[1.1rem] px-3 py-2.5 text-[14px] font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-stone-900 text-white shadow-[0_10px_25px_rgba(28,25,23,0.18)]'
                      : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {isDetailExpanded && (
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-24 pt-4">
              {tabContent}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
