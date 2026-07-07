/**
 * @file AchievementView.tsx
 * @input Achievement context state, categories for rule editing
 * @output Full-screen achievement bottle experience with a bottle-first collapsed state and a ledger-first expanded state
 * @pos View (Achievement Overlay)
 * @description Achievement bottle full-screen page opened from Timeline. The collapsed state emphasizes the bottle, while the expanded state turns the screen into a full ledger workspace.
 *
 * @updated 2026-07-07: Shows split current/history bottle balances and feeds sealing with the shared achievement account summary.
 * @updated 2026-04-06: Collections tab now drives fixed-range sealing, archived bottle browsing, and shatter actions.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Archive, ChevronDown, Gift, ScrollText, SlidersHorizontal } from 'lucide-react';
import { useAchievement } from '../contexts/AchievementContext';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { AchievementBottle } from '../components/achievement/AchievementBottle';
import { AchievementCollectionsTab } from '../components/achievement/AchievementCollectionsTab';
import { AchievementRecordsTab } from '../components/achievement/AchievementRecordsTab';
import { AchievementRulesTab } from '../components/achievement/AchievementRulesTab';
import { AchievementRedeemTab } from '../components/achievement/AchievementRedeemTab';
import { useData } from '../contexts/DataContext';
import { useReview } from '../contexts/ReviewContext';
import { useSettings } from '../contexts/SettingsContext';
import { getAchievementRenderableStarCount } from '../utils/achievementUtils';

type AchievementTab = 'records' | 'rules' | 'redeem' | 'collections';

const TAB_CONFIG: Array<{ id: AchievementTab; label: string; icon: React.ReactNode }> = [
  { id: 'records', label: '记录', icon: <ScrollText size={15} /> },
  { id: 'rules', label: '规则', icon: <SlidersHorizontal size={15} /> },
  { id: 'redeem', label: '兑换', icon: <Gift size={15} /> },
  { id: 'collections', label: '收藏', icon: <Archive size={15} /> }
];

const COLLAPSED_DETAIL_HEIGHT = '8.5rem';
const DETAIL_EXPAND_DURATION_MS = 460;

export const AchievementView: React.FC = () => {
  const {
    isReady,
    rules,
    rewards,
    collections,
    dailySnapshots,
    redemptionRecords,
    archivedBottles,
    sealPreview,
    accountSummary,
    availableStars,
    ensureRecentSnapshots,
    recomputeSnapshotForDate,
    createRule,
    updateRule,
    deleteRule,
    createReward,
    updateReward,
    deleteReward,
    redeemReward,
    sealBottle,
    shatterBottle,
    deleteRedemptionRecord
  } = useAchievement();
  const { categories, scopes } = useCategoryScope();
  const { todoCategories } = useData();
  const { checkTemplates } = useReview();
  const { achievementBottleStyle, achievementBottleIconPack } = useSettings();
  const [activeTab, setActiveTab] = useState<AchievementTab>('records');
  const [isDetailExpanded, setIsDetailExpanded] = useState(false);
  const [pendingTab, setPendingTab] = useState<AchievementTab | null>(null);
  const [isDetailContentVisible, setIsDetailContentVisible] = useState(false);
  const [hasEnsuredSnapshots, setHasEnsuredSnapshots] = useState(false);
  const renderedBottleStars = getAchievementRenderableStarCount(availableStars);

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
          onRecomputeSnapshot={recomputeSnapshotForDate}
        />
      );
    }

    if (activeTab === 'rules') {
      return (
        <AchievementRulesTab
          categories={categories}
          scopes={scopes}
          todoCategories={todoCategories}
          checkTemplates={checkTemplates}
          rules={rules}
          onCreateRule={createRule}
          onUpdateRule={updateRule}
          onDeleteRule={deleteRule}
        />
      );
    }

    if (activeTab === 'redeem') {
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
    }

    return (
      <AchievementCollectionsTab
        accountSummary={accountSummary}
        collections={collections}
        archivedBottles={archivedBottles}
        sealPreview={sealPreview}
        onSealBottle={sealBottle}
        onShatterBottle={shatterBottle}
      />
    );
  }, [
    accountSummary,
    activeTab,
    availableStars,
    archivedBottles,
    categories,
    checkTemplates,
    collections,
    createReward,
    createRule,
    dailySnapshots,
    deleteRedemptionRecord,
    deleteReward,
    deleteRule,
    recomputeSnapshotForDate,
    redeemReward,
    redemptionRecords,
    rewards,
    rules,
    sealBottle,
    sealPreview,
    shatterBottle,
    scopes,
    todoCategories,
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
          currentStarCount={accountSummary.currentStars}
          historyStarCount={accountSummary.historyStars}
          rebuildToken={renderedBottleStars}
          compact={false}
          styleVariant={achievementBottleStyle}
          iconPack={achievementBottleIconPack}
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
                  className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded-[1.1rem] px-2 py-2.5 text-[13px] font-medium leading-none transition-all min-[360px]:gap-1.5 min-[360px]:px-2.5 min-[360px]:text-[13px] min-[390px]:gap-2 min-[390px]:px-3 min-[390px]:text-[14px] ${
                    activeTab === tab.id
                      ? 'text-stone-900'
                      : 'text-stone-900 hover:text-stone-900'
                  }`}
                  style={activeTab === tab.id ? {
                    backgroundColor: '#e7e5e4',
                    boxShadow: '0 8px 18px rgba(120, 113, 108, 0.14)'
                  } : undefined}
                >
                  {tab.icon}
                  <span className="whitespace-nowrap text-center">{tab.label}</span>
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

