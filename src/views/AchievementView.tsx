/**
 * @file AchievementView.tsx
 * @input Achievement context state, categories for rule editing
 * @output Full-screen achievement bottle experience with a bottle-first collapsed state and a ledger-first expanded state
 * @pos View (Achievement Overlay)
 * @description Achievement bottle full-screen page opened from Timeline. The collapsed state emphasizes the bottle, while the expanded state turns the screen into a full ledger workspace.
 *
 * @updated 2026-03-28: Expanded ledger now fills the screen, keeps the collapsed nav lower, uses theme accent colors instead of pure black, and removes the temporary bottle debug controls.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Gift, ScrollText, SlidersHorizontal } from 'lucide-react';
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

const COLLAPSED_DETAIL_HEIGHT = '8.5rem';
const DETAIL_EXPAND_DURATION_MS = 460;

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
  const [pendingTab, setPendingTab] = useState<AchievementTab | null>(null);
  const [isDetailContentVisible, setIsDetailContentVisible] = useState(false);
  const [hasEnsuredSnapshots, setHasEnsuredSnapshots] = useState(false);

  useEffect(() => {
    if (!isReady || hasEnsuredSnapshots) {
      return;
    }

    setHasEnsuredSnapshots(true);
    void ensureRecentSnapshots();
  }, [ensureRecentSnapshots, hasEnsuredSnapshots, isReady]);

  useEffect(() => {
    let timer: number | null = null;

    if (!isDetailExpanded) {
      setIsDetailContentVisible(false);
      setPendingTab(null);
      return;
    }

    setIsDetailContentVisible(false);
    timer = window.setTimeout(() => {
      if (pendingTab) {
        setActiveTab(pendingTab);
        setPendingTab(null);
      }
      setIsDetailContentVisible(true);
    }, Math.round(DETAIL_EXPAND_DURATION_MS * 0.55));

    return () => {
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [isDetailExpanded, pendingTab]);

  const openDetailPanel = (targetTab?: AchievementTab) => {
    if (!isDetailExpanded) {
      setPendingTab(targetTab || null);
      setIsDetailExpanded(true);
      return;
    }

    if (targetTab && targetTab !== activeTab) {
      setActiveTab(targetTab);
    }
  };

  const tabContent = useMemo(() => {
    if (activeTab === 'records') {
      return (
        <AchievementRecordsTab
          snapshots={dailySnapshots}
          redemptionRecords={redemptionRecords}
          onDeleteRedemptionRecord={deleteRedemptionRecord}
        />
      );
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
        onCreateReward={createReward}
        onUpdateReward={updateReward}
        onDeleteReward={deleteReward}
        onRedeemReward={redeemReward}
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
    <div className="relative flex h-full flex-col overflow-hidden bg-[#faf9f6] text-stone-900">
      <section
        className={`pointer-events-none absolute inset-x-0 top-0 px-4 pb-3 pt-4 transition-all ${
          isDetailExpanded ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
        }`}
        style={{
          bottom: COLLAPSED_DETAIL_HEIGHT,
          transitionDuration: `${DETAIL_EXPAND_DURATION_MS}ms`
        }}
        aria-hidden={isDetailExpanded}
      >
        <AchievementBottle
          starCount={availableStars}
          rebuildToken={availableStars}
          compact={false}
        />
      </section>

      <section
        className={`relative z-10 mt-auto border-stone-200/80 bg-[#fdfbf7] transition-all duration-300 ease-out ${
          isDetailExpanded ? 'min-h-0 flex flex-1 flex-col border-t-0' : 'shrink-0 border-t'
        }`}
        style={{
          transitionDuration: `${DETAIL_EXPAND_DURATION_MS}ms`,
          ...(isDetailExpanded ? {} : { height: COLLAPSED_DETAIL_HEIGHT })
        }}
      >
        {isDetailExpanded && (
          <button
            type="button"
            onClick={() => setIsDetailExpanded(false)}
            aria-label="收起明细"
            className="mx-auto flex shrink-0 flex-col items-center gap-3 px-5 pt-3 text-stone-400 transition-colors hover:text-stone-600"
          >
            <span className="h-1.5 w-16 rounded-full bg-stone-300" />
            <ChevronDown size={15} />
          </button>
        )}

        <div className={`flex min-h-0 flex-1 flex-col ${isDetailExpanded ? '' : 'justify-end pb-3'}`}>
          <button
            type="button"
            onClick={() => openDetailPanel()}
            className={`shrink-0 px-5 pb-3 text-center text-[11px] font-medium uppercase tracking-[0.28em] text-stone-400 ${
              isDetailExpanded ? 'pt-3 pb-0' : 'pt-0'
            }`}
            style={isDetailExpanded ? undefined : { marginTop: 30 }}
          >
            <div>
              Achievement Ledger
            </div>
          </button>

          <div className={`shrink-0 px-5 ${isDetailExpanded ? 'pb-0 pt-3' : 'pb-0.5'}`}>
            <div className="inline-flex w-full items-center gap-1 rounded-[1.4rem] border border-stone-200 bg-white/90 p-1 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
              {TAB_CONFIG.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => openDetailPanel(tab.id)}
                  className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-[1.1rem] px-3 py-2.5 text-[14px] font-medium transition-all ${
                    activeTab === tab.id
                      ? 'text-white'
                      : 'text-stone-900 hover:text-stone-900'
                  }`}
                  style={activeTab === tab.id ? {
                    backgroundColor: 'var(--accent-color)',
                    boxShadow: '0 10px 25px var(--accent-color-light)'
                  } : undefined}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {isDetailExpanded && (
            <div
              className={`min-h-0 flex-1 overflow-y-auto px-5 pb-24 pt-5 transition-all ${
                isDetailContentVisible
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-2 opacity-0'
              }`}
              style={{ transitionDuration: `${Math.round(DETAIL_EXPAND_DURATION_MS * 0.45)}ms` }}
            >
              {isDetailContentVisible ? tabContent : null}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
