/**
 * @file AchievementRedeemTab.tsx
 * @description Reward management and redemption ledger for the achievement bottle page.
 */
import React, { useMemo, useState } from 'react';
import { Gift, Plus, Trash2 } from 'lucide-react';
import { AchievementRedemptionRecord, AchievementReward } from '../../types';
import { formatRelativeTime } from '../../utils/dateUtils';

interface AchievementRedeemTabProps {
  availableStars: number;
  rewards: AchievementReward[];
  redemptionRecords: AchievementRedemptionRecord[];
  onCreateReward: (input: { name: string; cost: number; description?: string; icon?: string }) => void;
  onUpdateReward: (reward: AchievementReward) => void;
  onDeleteReward: (rewardId: string) => void;
  onRedeemReward: (reward: AchievementReward) => { ok: boolean; message?: string };
  onDeleteRedemptionRecord: (recordId: string) => void;
}

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
  const [draft, setDraft] = useState({
    name: '',
    cost: 3,
    description: '',
    icon: '🎁'
  });
  const [feedback, setFeedback] = useState<string | null>(null);

  const orderedRecords = useMemo(() => {
    return [...redemptionRecords].sort((first, second) => second.redeemedAt - first.redeemedAt);
  }, [redemptionRecords]);

  const handleCreateReward = () => {
    if (!draft.name.trim()) {
      return;
    }

    onCreateReward(draft);
    setDraft({
      name: '',
      cost: 3,
      description: '',
      icon: '🎁'
    });
  };

  return (
    <div className="space-y-5">
      <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50/80 p-4">
        <div className="text-sm font-semibold text-emerald-800">新增奖励</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1 block text-stone-500">图标</span>
            <input
              value={draft.icon}
              onChange={(event) => setDraft((previous) => ({ ...previous, icon: event.target.value }))}
              className="w-full rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-stone-800 outline-none focus:border-emerald-300"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-stone-500">奖励名称</span>
            <input
              value={draft.name}
              onChange={(event) => setDraft((previous) => ({ ...previous, name: event.target.value }))}
              className="w-full rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-stone-800 outline-none focus:border-emerald-300"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-stone-500">消耗星星</span>
            <input
              type="number"
              min={1}
              value={draft.cost}
              onChange={(event) => setDraft((previous) => ({ ...previous, cost: Number(event.target.value) || 1 }))}
              className="w-full rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-stone-800 outline-none focus:border-emerald-300"
            />
          </label>
        </div>
        <label className="mt-3 block text-sm">
          <span className="mb-1 block text-stone-500">描述</span>
          <input
            value={draft.description}
            onChange={(event) => setDraft((previous) => ({ ...previous, description: event.target.value }))}
            className="w-full rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-stone-800 outline-none focus:border-emerald-300"
            placeholder="比如：周末喝一杯喜欢的饮料"
          />
        </label>
        <button
          type="button"
          onClick={handleCreateReward}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm"
        >
          <Plus size={14} />
          添加奖励
        </button>
      </div>

      {feedback && (
        <div className="rounded-2xl bg-stone-100 px-4 py-3 text-sm text-stone-600">
          {feedback}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-700">奖励列表</h3>
          <div className="text-sm text-stone-500">当前可用 {availableStars} 星</div>
        </div>
        {rewards.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-200 bg-stone-50/80 px-5 py-8 text-center text-sm text-stone-500">
            还没有奖励。你可以先建一个“小零食”或“放松时间”。
          </div>
        ) : (
          rewards.map((reward) => {
            const canRedeem = reward.enabled && availableStars >= reward.cost;
            return (
              <div key={reward.id} className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{reward.icon || '🎁'}</span>
                      <input
                        value={reward.name}
                        onChange={(event) => onUpdateReward({ ...reward, name: event.target.value })}
                        className="min-w-0 flex-1 rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-900 outline-none focus:border-emerald-300"
                      />
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <label className="text-sm">
                        <span className="mb-1 block text-stone-500">星星消耗</span>
                        <input
                          type="number"
                          min={1}
                          value={reward.cost}
                          onChange={(event) => onUpdateReward({ ...reward, cost: Number(event.target.value) || 1 })}
                          className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-stone-800 outline-none focus:border-emerald-300"
                        />
                      </label>
                      <label className="text-sm sm:col-span-2">
                        <span className="mb-1 block text-stone-500">描述</span>
                        <input
                          value={reward.description || ''}
                          onChange={(event) => onUpdateReward({ ...reward, description: event.target.value })}
                          className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-stone-800 outline-none focus:border-emerald-300"
                        />
                      </label>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteReward(reward.id)}
                    className="rounded-full bg-rose-50 p-2 text-rose-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onUpdateReward({ ...reward, enabled: !reward.enabled })}
                    className={`rounded-full px-3 py-2 text-xs font-semibold ${
                      reward.enabled
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {reward.enabled ? '可兑换' : '已停用'}
                  </button>
                  <button
                    type="button"
                    disabled={!canRedeem}
                    onClick={() => {
                      const result = onRedeemReward(reward);
                      setFeedback(result.ok ? `已兑换「${reward.name}」` : (result.message || '兑换失败'));
                    }}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      canRedeem
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-200 text-stone-400'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Gift size={14} />
                      兑换 {reward.cost} 星
                    </span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-stone-700">兑换记录</h3>
        {orderedRecords.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-200 bg-stone-50/80 px-5 py-8 text-center text-sm text-stone-500">
            还没有兑换记录。
          </div>
        ) : (
          orderedRecords.map((record) => (
            <div key={record.id} className="flex items-center justify-between gap-3 rounded-3xl border border-stone-200 bg-white px-4 py-4 shadow-sm">
              <div>
                <div className="text-sm font-semibold text-stone-900">{record.rewardName}</div>
                <div className="mt-1 text-xs text-stone-500">
                  {formatRelativeTime(record.redeemedAt)}，消耗 {record.cost} 星
                </div>
              </div>
              <button
                type="button"
                onClick={() => onDeleteRedemptionRecord(record.id)}
                className="rounded-full bg-rose-50 p-2 text-rose-500"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
