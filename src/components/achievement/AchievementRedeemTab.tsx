/**
 * @file AchievementRedeemTab.tsx
 * @input Achievement rewards, current available stars, and reward mutation callbacks for the redeem tab
 * @output Reward list plus create, edit, and redeem dialogs with tolerant numeric cost editing
 * @description Simplified reward catalog and redemption record manager used inside the achievement ledger.
 *
 * @updated 2026-03-28: Support one-decimal reward costs and star balance display while keeping redemption checks precise.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Gift, Pencil, Plus } from 'lucide-react';
import { AchievementReward } from '../../types';
import { AchievementDialog } from './AchievementDialog';
import { formatAchievementStars, normalizeAchievementStarValue } from '../../utils/achievementUtils';

interface AchievementRedeemTabProps {
  availableStars: number;
  rewards: AchievementReward[];
  onCreateReward: (input: { name: string; cost: number; description?: string; icon?: string }) => void;
  onUpdateReward: (reward: AchievementReward) => void;
  onDeleteReward: (rewardId: string) => void;
  onRedeemReward: (reward: AchievementReward, note?: string) => { ok: boolean; message?: string };
}

type DialogMode = 'create' | 'edit' | 'redeem' | null;

interface RewardDraft {
  name: string;
  cost: number;
}

const createEmptyRewardDraft = (): RewardDraft => ({
  name: '',
  cost: 10
});

const formatRewardCostInput = (value: number) => String(value);

const parseRewardCostInput = (value: string): number | null => {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.max(0.1, normalizeAchievementStarValue(parsed));
};

const isSameRewardDraft = (left: RewardDraft, right: RewardDraft) => (
  left.name === right.name &&
  left.cost === right.cost
);

export const AchievementRedeemTab: React.FC<AchievementRedeemTabProps> = ({
  availableStars,
  rewards,
  onCreateReward,
  onUpdateReward,
  onDeleteReward,
  onRedeemReward
}) => {
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RewardDraft>(createEmptyRewardDraft);
  const [costInput, setCostInput] = useState<string>(() => formatRewardCostInput(createEmptyRewardDraft().cost));
  const [redeemError, setRedeemError] = useState<string | null>(null);

  const orderedRewards = useMemo(() => {
    return [...rewards].sort((first, second) => second.updatedAt - first.updatedAt);
  }, [rewards]);

  const selectedReward = selectedRewardId ? rewards.find((reward) => reward.id === selectedRewardId) || null : null;

  useEffect(() => {
    if (dialogMode === 'edit' && selectedReward) {
      const nextDraft = {
        name: selectedReward.name,
        cost: selectedReward.cost
      };
      setCostInput(formatRewardCostInput(nextDraft.cost));
      setDraft((previous) => (isSameRewardDraft(previous, nextDraft) ? previous : nextDraft));
      return;
    }

    if (dialogMode === 'create') {
      const nextDraft = createEmptyRewardDraft();
      setCostInput(formatRewardCostInput(nextDraft.cost));
      setDraft((previous) => (isSameRewardDraft(previous, nextDraft) ? previous : nextDraft));
    }
  }, [dialogMode, selectedReward]);

  const closeDialog = () => {
    setDialogMode(null);
    setSelectedRewardId(null);
    setDraft(createEmptyRewardDraft());
    setCostInput(formatRewardCostInput(createEmptyRewardDraft().cost));
    setRedeemError(null);
  };

  const commitCostInput = () => {
    const nextValue = parseRewardCostInput(costInput) ?? Math.max(0.1, normalizeAchievementStarValue(draft.cost));
    setCostInput(formatRewardCostInput(nextValue));
    setDraft((previous) => (
      previous.cost === nextValue
        ? previous
        : { ...previous, cost: nextValue }
    ));
    return nextValue;
  };

  const handleRewardSave = () => {
    if (!draft.name.trim()) {
      return;
    }

    const sanitizedCost = commitCostInput();

    if (dialogMode === 'create') {
      onCreateReward({
        name: draft.name.trim(),
        cost: sanitizedCost
      });
      closeDialog();
      return;
    }

    if (dialogMode === 'edit' && selectedReward) {
      onUpdateReward({
        ...selectedReward,
        name: draft.name.trim(),
        cost: sanitizedCost,
        description: undefined,
        icon: undefined,
        enabled: true
      });
      closeDialog();
    }
  };

  const handleRedeem = () => {
    if (!selectedReward) {
      return;
    }

    const result = onRedeemReward(selectedReward);
    if (!result.ok) {
      setRedeemError(result.message || '兑换失败，请稍后重试');
      return;
    }

    closeDialog();
  };

  const canRedeemSelected = Boolean(
    dialogMode === 'redeem' &&
      selectedReward &&
      availableStars >= selectedReward.cost
  );

  return (
    <>
      <div>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-[14px]">
          <div className="text-[11px] uppercase tracking-[0.18em] text-stone-400">
            Rewards / {orderedRewards.length}
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedRewardId(null);
              setDialogMode('create');
            }}
            className="inline-flex items-center gap-2 text-sm text-stone-900 transition-colors hover:text-stone-600"
          >
            <Plus size={15} />
            新增奖励
          </button>
        </header>

        {orderedRewards.length === 0 ? (
          <div className="mt-[14px] rounded-2xl border border-dashed border-stone-300 bg-white/50 px-5 py-6 text-sm leading-7 text-stone-500">
            先创建一个“周末电影夜 120 光点”之类的奖励。创建后就能从瓶子里消耗光点进行兑换。
          </div>
        ) : (
          <div className="mt-[14px] divide-y divide-stone-200">
            {orderedRewards.map((reward) => {
              const canRedeem = availableStars >= reward.cost;

              return (
                <div key={reward.id} className="flex items-center justify-between gap-4 py-[14px]">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[16px] leading-none text-stone-900">{reward.name}</div>
                    <div className="mt-[6px] text-[13px] leading-6 text-stone-500">成本 {formatAchievementStars(reward.cost)} 光点</div>
                  </div>

                  <div className="flex shrink-0 items-center gap-4">
                    <button
                      type="button"
                      disabled={!canRedeem}
                      onClick={() => {
                        setRedeemError(null);
                        setSelectedRewardId(reward.id);
                        setDialogMode('redeem');
                      }}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                        canRedeem ? 'text-stone-900' : 'bg-stone-200 text-stone-400'
                      }`}
                      style={canRedeem ? {
                        backgroundColor: '#e7e5e4',
                        boxShadow: '0 8px 18px rgba(120, 113, 108, 0.14)'
                      } : undefined}
                      aria-label="兑换奖励"
                    >
                      <Gift size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRewardId(reward.id);
                        setDialogMode('edit');
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 text-stone-500 transition-colors"
                      style={{
                        color: '#57534e',
                        borderColor: '#d6d3d1',
                        backgroundColor: '#fafaf9'
                      }}
                      aria-label="编辑奖励"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AchievementDialog
        isOpen={dialogMode === 'create' || (dialogMode === 'edit' && !!selectedReward)}
        title={dialogMode === 'edit' ? selectedReward?.name || '编辑奖励' : '新增奖励'}
        subtitle={dialogMode === 'edit' ? '修改奖励不会影响历史兑换记录。' : undefined}
        onClose={closeDialog}
        footer={(
          <div className="flex items-center justify-between gap-3">
            {dialogMode === 'edit' && selectedReward ? (
              <button
                type="button"
                onClick={() => {
                  onDeleteReward(selectedReward.id);
                  closeDialog();
                }}
                className="text-sm text-rose-500 transition-colors hover:text-rose-600"
              >
                删除奖励
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-600 transition-colors hover:bg-stone-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleRewardSave}
                disabled={!draft.name.trim()}
                className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white transition-colors disabled:bg-stone-300"
              >
                保存
              </button>
            </div>
          </div>
        )}
      >
        <div className="space-y-5">
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400">奖励名称</span>
            <input
              value={draft.name}
              onChange={(event) => setDraft((previous) => ({ ...previous, name: event.target.value }))}
              className="mt-2 w-full border-b border-stone-300 bg-transparent px-0 py-2 text-[1rem] text-stone-900 outline-none focus:border-stone-900"
              placeholder="例如：周末电影夜"
            />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400">成本（光点）</span>
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={costInput}
              onBlur={commitCostInput}
              onChange={(event) => {
                const nextValue = event.target.value;
                setCostInput(nextValue);
                const parsedValue = parseRewardCostInput(nextValue);
                if (parsedValue !== null) {
                  setDraft((previous) => ({ ...previous, cost: parsedValue }));
                }
              }}
              className="mt-2 w-full border-b border-stone-300 bg-transparent px-0 py-2 text-[1rem] text-stone-900 outline-none focus:border-stone-900"
            />
            <div className="mt-2 text-xs text-stone-400">Current: {formatAchievementStars(draft.cost)} 光点</div>
          </label>
        </div>
      </AchievementDialog>

      <AchievementDialog
        isOpen={dialogMode === 'redeem' && !!selectedReward}
        title={selectedReward ? `兑换 ${selectedReward.name}` : '兑换奖励'}
        subtitle={selectedReward ? `需要 ${formatAchievementStars(selectedReward.cost)} 光点 · 当前可用 ${formatAchievementStars(availableStars)} 光点` : undefined}
        onClose={closeDialog}
        footer={(
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={closeDialog}
              className="rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-600 transition-colors hover:bg-stone-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleRedeem}
              disabled={!canRedeemSelected}
              className="rounded-full px-4 py-2 text-sm text-stone-900 transition-all disabled:bg-stone-300 disabled:text-white"
              style={canRedeemSelected ? {
                backgroundColor: '#e7e5e4',
                boxShadow: '0 10px 24px rgba(120, 113, 108, 0.14)'
              } : undefined}
            >
              确认兑换
            </button>
          </div>
        )}
      >
        {selectedReward && (
          <div className="space-y-5">
            <p className="text-sm leading-6 text-stone-500">
              {canRedeemSelected
                ? `兑换成功后剩余 ${formatAchievementStars(normalizeAchievementStarValue(availableStars - selectedReward.cost))} 光点，立即记入兑换记录。`
                : '当前光点不足，暂时无法兑换。'}
            </p>
            {redeemError && (
              <div className="text-sm text-rose-500">{redeemError}</div>
            )}
          </div>
        )}
      </AchievementDialog>
    </>
  );
};
