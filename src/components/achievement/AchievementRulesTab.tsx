/**
 * @file AchievementRulesTab.tsx
 * @description Editable achievement rule list and creation form for activity-based star conversion rules.
 */
import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { AchievementRule, Category } from '../../types';

interface AchievementRulesTabProps {
  categories: Category[];
  rules: AchievementRule[];
  onCreateRule: (input: {
    name: string;
    effectType: 'earn' | 'spend';
    targetIds: string[];
    unitMinutes: number;
    deltaPerUnit: number;
    note?: string;
  }) => void;
  onUpdateRule: (rule: AchievementRule) => void;
  onDeleteRule: (ruleId: string) => void;
}

const collectActivityOptions = (categories: Category[]) => categories.flatMap((category) => (
  category.activities.map((activity) => ({
    categoryId: category.id,
    categoryName: category.name,
    activityId: activity.id,
    activityName: activity.name
  }))
));

const ActivityPicker: React.FC<{
  categories: Category[];
  selectedIds: string[];
  onChange: (targetIds: string[]) => void;
}> = ({ categories, selectedIds, onChange }) => {
  const options = useMemo(() => collectActivityOptions(categories), [categories]);

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const checked = selectedIds.includes(option.activityId);
        return (
          <label
            key={option.activityId}
            className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 text-sm transition-colors ${
              checked
                ? 'border-amber-300 bg-amber-50/90'
                : 'border-stone-200 bg-white'
            }`}
          >
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-stone-300 text-amber-500 focus:ring-amber-400"
              checked={checked}
              onChange={(event) => {
                if (event.target.checked) {
                  onChange([...selectedIds, option.activityId]);
                  return;
                }

                onChange(selectedIds.filter((item) => item !== option.activityId));
              }}
            />
            <span className="min-w-0">
              <span className="block font-medium text-stone-800">{option.activityName}</span>
              <span className="block text-xs text-stone-500">{option.categoryName}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
};

const RuleCard: React.FC<{
  categories: Category[];
  rule: AchievementRule;
  onUpdateRule: (rule: AchievementRule) => void;
  onDeleteRule: (ruleId: string) => void;
}> = ({ categories, rule, onUpdateRule, onDeleteRule }) => {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <input
          value={rule.name}
          onChange={(event) => onUpdateRule({ ...rule, name: event.target.value })}
          className="min-w-0 flex-1 rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-900 outline-none focus:border-amber-300"
        />
        <button
          type="button"
          onClick={() => onUpdateRule({ ...rule, enabled: !rule.enabled })}
          className={`rounded-full px-3 py-2 text-xs font-semibold ${
            rule.enabled
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-stone-100 text-stone-500'
          }`}
        >
          {rule.enabled ? '启用中' : '已停用'}
        </button>
        <button
          type="button"
          onClick={() => onDeleteRule(rule.id)}
          className="rounded-full bg-rose-50 p-2 text-rose-500"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block text-stone-500">方向</span>
          <select
            value={rule.effectType}
            onChange={(event) => onUpdateRule({ ...rule, effectType: event.target.value as 'earn' | 'spend' })}
            className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-stone-800 outline-none focus:border-amber-300"
          >
            <option value="earn">获得星星</option>
            <option value="spend">扣除星星</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-stone-500">每多少分钟</span>
          <input
            type="number"
            min={1}
            value={rule.unitMinutes}
            onChange={(event) => onUpdateRule({ ...rule, unitMinutes: Number(event.target.value) || 1 })}
            className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-stone-800 outline-none focus:border-amber-300"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-stone-500">每次变化</span>
          <input
            type="number"
            min={1}
            value={rule.deltaPerUnit}
            onChange={(event) => onUpdateRule({ ...rule, deltaPerUnit: Number(event.target.value) || 1 })}
            className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-stone-800 outline-none focus:border-amber-300"
          />
        </label>
      </div>

      <label className="mt-3 block text-sm">
        <span className="mb-1 block text-stone-500">备注</span>
        <textarea
          value={rule.note || ''}
          onChange={(event) => onUpdateRule({ ...rule, note: event.target.value })}
          rows={2}
          className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-stone-700 outline-none focus:border-amber-300"
        />
      </label>

      <div className="mt-4">
        <div className="mb-2 text-sm font-semibold text-stone-700">关联活动</div>
        <ActivityPicker
          categories={categories}
          selectedIds={rule.targetIds}
          onChange={(targetIds) => onUpdateRule({ ...rule, targetIds })}
        />
      </div>
    </div>
  );
};

export const AchievementRulesTab: React.FC<AchievementRulesTabProps> = ({
  categories,
  rules,
  onCreateRule,
  onUpdateRule,
  onDeleteRule
}) => {
  const [draft, setDraft] = useState({
    name: '',
    effectType: 'earn' as 'earn' | 'spend',
    targetIds: [] as string[],
    unitMinutes: 30,
    deltaPerUnit: 1,
    note: ''
  });

  const handleCreate = () => {
    if (!draft.name.trim() || draft.targetIds.length === 0) {
      return;
    }

    onCreateRule(draft);
    setDraft({
      name: '',
      effectType: 'earn',
      targetIds: [],
      unitMinutes: 30,
      deltaPerUnit: 1,
      note: ''
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50/80 p-4">
        <div className="text-sm font-semibold text-amber-800">新增规则</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block text-stone-500">规则名称</span>
            <input
              value={draft.name}
              onChange={(event) => setDraft((previous) => ({ ...previous, name: event.target.value }))}
              className="w-full rounded-2xl border border-amber-200 bg-white px-3 py-2 text-stone-800 outline-none focus:border-amber-300"
              placeholder="例如：阅读半小时一颗星"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-stone-500">方向</span>
            <select
              value={draft.effectType}
              onChange={(event) => setDraft((previous) => ({ ...previous, effectType: event.target.value as 'earn' | 'spend' }))}
              className="w-full rounded-2xl border border-amber-200 bg-white px-3 py-2 text-stone-800 outline-none focus:border-amber-300"
            >
              <option value="earn">获得星星</option>
              <option value="spend">扣除星星</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-stone-500">每次变化</span>
            <input
              type="number"
              min={1}
              value={draft.deltaPerUnit}
              onChange={(event) => setDraft((previous) => ({ ...previous, deltaPerUnit: Number(event.target.value) || 1 }))}
              className="w-full rounded-2xl border border-amber-200 bg-white px-3 py-2 text-stone-800 outline-none focus:border-amber-300"
            />
          </label>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-stone-500">每多少分钟触发一次</span>
            <input
              type="number"
              min={1}
              value={draft.unitMinutes}
              onChange={(event) => setDraft((previous) => ({ ...previous, unitMinutes: Number(event.target.value) || 1 }))}
              className="w-full rounded-2xl border border-amber-200 bg-white px-3 py-2 text-stone-800 outline-none focus:border-amber-300"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-stone-500">备注</span>
            <input
              value={draft.note}
              onChange={(event) => setDraft((previous) => ({ ...previous, note: event.target.value }))}
              className="w-full rounded-2xl border border-amber-200 bg-white px-3 py-2 text-stone-800 outline-none focus:border-amber-300"
              placeholder="可选"
            />
          </label>
        </div>

        <div className="mt-4">
          <div className="mb-2 text-sm font-semibold text-stone-700">关联活动</div>
          <ActivityPicker
            categories={categories}
            selectedIds={draft.targetIds}
            onChange={(targetIds) => setDraft((previous) => ({ ...previous, targetIds }))}
          />
        </div>

        <button
          type="button"
          onClick={handleCreate}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm"
        >
          <Plus size={14} />
          添加规则
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-200 bg-stone-50/80 px-5 py-8 text-center text-sm text-stone-500">
          还没有规则。先添加“阅读 30 分钟 +1 星”之类的规则，成就页才能开始产出每日快照。
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              categories={categories}
              rule={rule}
              onUpdateRule={onUpdateRule}
              onDeleteRule={onDeleteRule}
            />
          ))}
        </div>
      )}
    </div>
  );
};
