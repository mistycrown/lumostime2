/**
 * @file AchievementRedeemTab.tsx
 * @description Reward catalog and redemption record manager used inside the achievement ledger.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Gift, Pause, Play, Plus, Sparkles } from 'lucide-react';
import { AchievementRedemptionRecord, AchievementReward } from '../../types';
import { formatRelativeTime, getLocalDateTimeStr } from '../../utils/dateUtils';
import { AchievementDialog } from './AchievementDialog';

interface AchievementRedeemTabProps {
  availableStars: number;
  rewards: AchievementReward[];
  redemptionRecords: AchievementRedemptionRecord[];
  onCreateReward: (input: { name: string; cost: number; description?: string; icon?: string }) => void;
  onUpdateReward: (reward: AchievementReward) => void;
  onDeleteReward: (rewardId: string) => void;
  onRedeemReward: (reward: AchievementReward, note?: string) => { ok: boolean; message?: string };
  onDeleteRedemptionRecord: (recordId: string) => void;
}

type DialogMode = 'create' | 'edit' | 'redeem' | null;

interface RewardDraft {
  name: string;
  cost: number;
  description: string;
  icon: string;
}

const createEmptyRewardDraft = (): RewardDraft => ({
  name: '',
  cost: 10,
  description: '',
  icon: ''
});

export const AchievementRedeemTab: React.FC<AchievementRedeemTabProps> = ({
  availableStars,
  rewards,
  redemptionRecords,
  onCreateReward,
  onUpdateReward,
  onDeleteReward,
  onRedeemReward,
  onDeleteRedemptionRecord
}) => {
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RewardDraft>(createEmptyRewardDraft);
  const [redeemNote, setRedeemNote] = useState('');
  const [redeemError, setRedeemError] = useState<string | null>(null);

  const orderedRewards = useMemo(() => {
    return [...rewards].sort((first, second) => {
      if (first.enabled !== second.enabled) {
        return first.enabled ? -1 : 1;
      }
      return second.updatedAt - first.updatedAt;
    });
  }, [rewards]);

  const orderedRecords = useMemo(() => {
    return [...redemptionRecords].sort((first, second) => second.redeemedAt - first.redeemedAt);
  }, [redemptionRecords]);

  const selectedReward = selectedRewardId ? rewards.find((reward) => reward.id === selectedRewardId) || null : null;

  useEffect(() => {
    if (dialogMode === 'edit' && selectedReward) {
      setDraft({
        name: selectedReward.name,
        cost: selectedReward.cost,
        description: selectedReward.description || '',
        icon: selectedReward.icon || ''
      });
      return;
    }

    if (dialogMode === 'create') {
      setDraft(createEmptyRewardDraft());
    }
  }, [dialogMode, selectedReward]);

  const closeDialog = () => {
    setDialogMode(null);
    setSelectedRewardId(null);
    setDraft(createEmptyRewardDraft());
    setRedeemNote('');
    setRedeemError(null);
  };

  const handleRewardSave = () => {
    if (!draft.name.trim()) {
      return;
    }

    const sanitizedCost = Math.max(1, Math.floor(Number(draft.cost) || 1));
    const sanitizedDescription = draft.description.trim() || undefined;
    const sanitizedIcon = draft.icon.trim() || undefined;

    if (dialogMode === 'create') {
      onCreateReward({
        name: draft.name.trim(),
        cost: sanitizedCost,
        description: sanitizedDescription,
        icon: sanitizedIcon
      });
      closeDialog();
      return;
    }

    if (dialogMode === 'edit' && selectedReward) {
      onUpdateReward({
        ...selectedReward,
        name: draft.name.trim(),
        cost: sanitizedCost,
        description: sanitizedDescription,
        icon: sanitizedIcon
      });
      closeDialog();
    }
  };

  const handleRedeem = () => {
    if (!selectedReward) {
      return;
    }

    const result = onRedeemReward(selectedReward, redeemNote.trim() || undefined);
    if (!result.ok) {
      setRedeemError(result.message || '兑换失败，请稍后重试');
      return;
    }

    closeDialog();
  };

  const canRedeemSelected = Boolean(
    dialogMode === 'redeem' &&
      selectedReward &&
      selectedReward.enabled &&
      availableStars >= selectedReward.cost
  );

  return (
    <>
      <div className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-stone-400">
              Rewards / {orderedRewards.length}
            </div>
            <p className="mt-1 text-sm leading-6 text-stone-500">
              当前可用 {availableStars} 星，可立即兑换已启用的奖励。
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedRewardId(null);
              setDialogMode('create');
            }}
            className="inline-flex items-center gap-2 rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-900 transition-colors hover:border-stone-900"
          >
            <Plus size={15} />
            新增奖励
          </button>
        </header>

        {orderedRewards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white/50 px-5 py-6 text-sm leading-7 text-stone-500">
            先创建一个“周末电影夜 120 星”之类的奖励。当奖励启用后即可从瓶子里消耗星星进行兑换。
          </div>
        ) : (
          <div className="divide-y divide-stone-200 rounded-3xl border border-stone-200 bg-white/80">
            {orderedRewards.map((reward) => {
              const progress = Math.min(1, availableStars / Math.max(1, reward.cost));
              const progressPercent = Math.round(progress * 100);
              const canRedeem = reward.enabled && availableStars >= reward.cost;

              return (
                <div key={reward.id} className="p-5">
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-stone-200 bg-[#fdfbf7] text-2xl">
                        {reward.icon || <Gift size={20} className="text-stone-400" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 text-[1.1rem] text-stone-900">
                          <span className="truncate max-w-[10rem] sm:max-w-xs">{reward.name}</span>
                          <span
                            className={`text-[11px] uppercase tracking-[0.16em] ${reward.enabled ? 'text-emerald-500' : 'text-stone-400'}`}
                          >
                            {reward.enabled ? 'Active' : 'Paused'}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-stone-500">成本 {reward.cost} 星</div>
                        {reward.description && (
                          <p className="mt-2 max-w-xl text-sm leading-6 text-stone-600">{reward.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="ml-auto flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRewardId(reward.id);
                          setDialogMode('edit');
                        }}
                        className="rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-700 transition-colors hover:border-stone-900"
                      >
                        编辑
                      </button>
                      <button
                        type="button"
                        disabled={!canRedeem}
                        onClick={() => {
                          setRedeemNote('');
                          setRedeemError(null);
                          setSelectedRewardId(reward.id);
                          setDialogMode('redeem');
                        }}
                        className={`rounded-full px-4 py-2 text-sm text-white transition-colors ${
                          canRedeem ? 'bg-stone-900 hover:bg-stone-700' : 'bg-stone-300'
                        }`}
                      >
                        兑换
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateReward({ ...reward, enabled: !reward.enabled })}
                        className="inline-flex items-center justify-center gap-1 text-xs text-stone-400 transition-colors hover:text-stone-900"
                      >
                        {reward.enabled ? <Pause size={12} /> : <Play size={12} />}
                        {reward.enabled ? '暂停奖励' : '恢复奖励'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-stone-400">
                      <span>Progress</span>
                      <span>{progressPercent}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-stone-100">
                      <div
                        className={`h-full rounded-full ${canRedeem ? 'bg-emerald-400' : 'bg-stone-400/80'}`}
                        style={{ width: `${Math.max(6, progressPercent)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <section>
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-stone-400">
              Redemption Records / {orderedRecords.length}
            </div>
            {orderedRecords.length > 0 && (
              <div className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-stone-400">
                <Sparkles size={12} />
                最近日志
              </div>
            )}
          </div>

          {orderedRecords.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 px-4 py-5 text-sm leading-7 text-stone-500">
              还没有兑换记录。兑换奖励后，最近一次会显示在这里，方便你快速撤销或补充备注。
            </div>
          ) : (
            <div className="divide-y divide-stone-200">
              {orderedRecords.map((record) => (
                <div key={record.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-[1rem] text-stone-900">{record.rewardName}</div>
                    <div className="mt-1 text-[13px] leading-6 text-stone-500">
                      花费 {record.cost} 星 · {formatRelativeTime(record.redeemedAt)} · {getLocalDateTimeStr(new Date(record.redeemedAt))}
                    </div>
                    {record.note && (
                      <div className="mt-1 text-sm leading-6 text-stone-600">{record.note}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteRedemptionRecord(record.id)}
                    className="self-start rounded-full border border-transparent px-3 py-1 text-xs text-rose-500 transition-colors hover:border-rose-200 hover:bg-rose-50"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <AchievementDialog
        isOpen={dialogMode === 'create' || (dialogMode === 'edit' && !!selectedReward)}
        title={dialogMode === 'edit' ? selectedReward?.name || '编辑奖励' : '新增奖励'}
        subtitle={dialogMode === 'edit' ? '修改奖励不会影响历史兑换记录。' : '把你想要的放进奖励清单，随时用星星来犒劳自己。'}
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
            <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400">成本（星星）</span>
            <input
              type="number"
              min={1}
              value={draft.cost}
              onChange={(event) => setDraft((previous) => ({ ...previous, cost: Number(event.target.value) }))}
              className="mt-2 w-full border-b border-stone-300 bg-transparent px-0 py-2 text-[1rem] text-stone-900 outline-none focus:border-stone-900"
            />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400">图标（可选）</span>
            <input
              value={draft.icon}
              onChange={(event) => setDraft((previous) => ({ ...previous, icon: event.target.value }))}
              className="mt-2 w-full border-b border-stone-300 bg-transparent px-0 py-2 text-[1rem] text-stone-900 outline-none focus:border-stone-900"
              placeholder="🌟 或 ui:purple:01"
            />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400">描述</span>
            <textarea
              value={draft.description}
              onChange={(event) => setDraft((previous) => ({ ...previous, description: event.target.value }))}
              rows={4}
              className="mt-2 w-full border border-stone-200 bg-transparent px-3 py-3 text-sm leading-7 text-stone-900 outline-none focus:border-stone-900"
              placeholder="补充细节，比如和谁一起、包含哪些内容。"
            />
          </label>
        </div>
      </AchievementDialog>

      <AchievementDialog
        isOpen={dialogMode === 'redeem' && !!selectedReward}
        title={selectedReward ? `兑换 ${selectedReward.name}` : '兑换奖励'}
        subtitle={selectedReward ? `需要 ${selectedReward.cost} 星 · 当前可用 ${availableStars} 星` : undefined}
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
              className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white transition-colors disabled:bg-stone-300"
            >
              确认兑换
            </button>
          </div>
        )}
      >
        {selectedReward && (
          <div className="space-y-5">
            <div
              className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
                canRedeemSelected ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'
              }`}
            >
              {canRedeemSelected
                ? `兑换成功后剩余 ${availableStars - selectedReward.cost} 星，立即记入兑换记录。`
                : '星星不足或奖励已暂停，暂时无法兑换。'}
            </div>
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400">备注（可选）</span>
              <textarea
                value={redeemNote}
                onChange={(event) => {
                  setRedeemNote(event.target.value);
                  setRedeemError(null);
                }}
                rows={3}
                className="mt-2 w-full border border-stone-200 bg-transparent px-3 py-3 text-sm leading-7 text-stone-900 outline-none focus:border-stone-900"
                placeholder="写下这次犒劳自己的理由。"
              />
            </label>
            {redeemError && (
              <div className="text-sm text-rose-500">{redeemError}</div>
            )}
          </div>
        )}
      </AchievementDialog>
    </>
  );
};

