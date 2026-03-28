/**
 * @file AchievementRulesTab.tsx
 * @description Achievement rule list and modal editor, reusing the shared multi-tag selector for target activity picking.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { AchievementRule, Category } from '../../types';
import { AchievementDialog } from './AchievementDialog';
import { TagMultipleAssociation } from '../TagMultipleAssociation';

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

interface RuleDraft {
  name: string;
  effectType: 'earn' | 'spend';
  targetIds: string[];
  unitMinutes: number;
  deltaPerUnit: number;
  note: string;
}

const createEmptyDraft = (): RuleDraft => ({
  name: '',
  effectType: 'earn',
  targetIds: [],
  unitMinutes: 30,
  deltaPerUnit: 1,
  note: ''
});

const isSameRuleDraft = (left: RuleDraft, right: RuleDraft) => (
  left.name === right.name &&
  left.effectType === right.effectType &&
  left.unitMinutes === right.unitMinutes &&
  left.deltaPerUnit === right.deltaPerUnit &&
  left.note === right.note &&
  left.targetIds.length === right.targetIds.length &&
  left.targetIds.every((targetId, index) => targetId === right.targetIds[index])
);

const collectActivityOptions = (categories: Category[]) => categories.flatMap((category) => (
  category.activities.map((activity) => ({
    categoryId: category.id,
    categoryName: category.name,
    activityId: activity.id,
    activityName: activity.name
  }))
));

export const AchievementRulesTab: React.FC<AchievementRulesTabProps> = ({
  categories,
  rules,
  onCreateRule,
  onUpdateRule,
  onDeleteRule
}) => {
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RuleDraft>(createEmptyDraft);

  const selectedRule = rules.find((rule) => rule.id === selectedRuleId) || null;
  const isDialogOpen = dialogMode !== null;

  useEffect(() => {
    if (dialogMode === 'edit' && selectedRule) {
      const nextDraft = {
        name: selectedRule.name,
        effectType: selectedRule.effectType,
        targetIds: selectedRule.targetIds,
        unitMinutes: selectedRule.unitMinutes,
        deltaPerUnit: selectedRule.deltaPerUnit,
        note: selectedRule.note || ''
      };
      setDraft((previous) => (isSameRuleDraft(previous, nextDraft) ? previous : nextDraft));
      return;
    }

    if (dialogMode === 'create') {
      const nextDraft = createEmptyDraft();
      setDraft((previous) => (isSameRuleDraft(previous, nextDraft) ? previous : nextDraft));
    }
  }, [dialogMode, selectedRule]);

  const activityNameMap = useMemo(() => {
    const entries = collectActivityOptions(categories).map((option) => [option.activityId, option.activityName]);
    return new Map(entries);
  }, [categories]);

  const closeDialog = () => {
    setDialogMode(null);
    setSelectedRuleId(null);
  };

  const handleSave = () => {
    if (!draft.name.trim() || draft.targetIds.length === 0) {
      return;
    }

    if (dialogMode === 'create') {
      onCreateRule({
        name: draft.name.trim(),
        effectType: draft.effectType,
        targetIds: draft.targetIds,
        unitMinutes: draft.unitMinutes,
        deltaPerUnit: draft.deltaPerUnit,
        note: draft.note.trim() || undefined
      });
      closeDialog();
      return;
    }

    if (dialogMode === 'edit' && selectedRule) {
      onUpdateRule({
        ...selectedRule,
        name: draft.name.trim(),
        effectType: draft.effectType,
        targetIds: draft.targetIds,
        unitMinutes: draft.unitMinutes,
        deltaPerUnit: draft.deltaPerUnit,
        note: draft.note.trim() || undefined
      });
      closeDialog();
    }
  };

  return (
    <>
      <div className="flex items-center justify-between border-b border-stone-200 pb-[14px]">
        <div className="text-[11px] uppercase tracking-[0.18em] text-stone-400">Rules / {rules.length}</div>
        <button
          type="button"
          onClick={() => setDialogMode('create')}
          className="inline-flex items-center gap-2 text-sm text-stone-900 transition-colors hover:text-stone-600"
        >
          <Plus size={15} />
          新增规则
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="mt-[14px] rounded-2xl border border-dashed border-stone-300 px-4 py-5 text-sm leading-7 text-stone-500">
          还没有规则。先新增一条类似“阅读 30 分钟 +1 光点”的规则，成就页才会开始生成每日快照。
        </div>
      ) : (
        <div className="mt-[14px] divide-y divide-stone-200">
          {rules.map((rule) => {
            const targetPreview = rule.targetIds
              .map((targetId) => activityNameMap.get(targetId) || '未命名活动')
              .slice(0, 3)
              .join(' / ');

            return (
              <button
                key={rule.id}
                type="button"
                onClick={() => {
                  setSelectedRuleId(rule.id);
                  setDialogMode('edit');
                }}
                className="flex w-full items-center justify-between gap-4 py-[12px] text-left transition-colors hover:bg-stone-50/70"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-[16px] leading-none text-stone-900">{rule.name}</span>
                    <span className={`text-[11px] uppercase tracking-[0.14em] ${rule.enabled ? 'text-stone-400' : 'text-stone-300'}`}>
                      {rule.enabled ? 'Enabled' : 'Paused'}
                    </span>
                  </div>
                  <div className="mt-2 text-[13px] leading-6 text-stone-500">
                    每 {rule.unitMinutes} 分钟 {rule.effectType === 'earn' ? '+' : '-'}{rule.deltaPerUnit} 光点
                    {targetPreview ? ` · ${targetPreview}` : ''}
                  </div>
                </div>
                <ChevronRight size={16} className="text-stone-300" />
              </button>
            );
          })}
        </div>
      )}

      <AchievementDialog
        isOpen={isDialogOpen}
        title={dialogMode === 'create' ? '新增规则' : (selectedRule?.name || '编辑规则')}
        onClose={closeDialog}
        footer={(
          <div className="flex items-center justify-between gap-3">
            <div>
              {dialogMode === 'edit' && selectedRule && (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteRule(selectedRule.id);
                    closeDialog();
                  }}
                  className="text-sm text-stone-400 transition-colors hover:text-rose-500"
                >
                  删除规则
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-600 transition-colors hover:bg-stone-100"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!draft.name.trim() || draft.targetIds.length === 0}
                className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white transition-colors disabled:bg-stone-300"
              >
                保存
              </button>
            </div>
          </div>
        )}
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400">规则名称</span>
              <input
                value={draft.name}
                onChange={(event) => setDraft((previous) => ({ ...previous, name: event.target.value }))}
                className="mt-2 w-full border-b border-stone-300 bg-transparent px-0 py-2 text-[1rem] text-stone-900 outline-none focus:border-stone-900"
                placeholder="例如：阅读半小时一点光"
              />
            </label>
            <div className="block">
              <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400">方向</span>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDraft((previous) => ({ ...previous, effectType: 'earn' }))}
                  className={`rounded-2xl border px-4 py-3 text-sm transition-colors ${
                    draft.effectType === 'earn'
                      ? 'border-stone-900 bg-stone-900 text-white'
                      : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                  }`}
                >
                  获得光点
                </button>
                <button
                  type="button"
                  onClick={() => setDraft((previous) => ({ ...previous, effectType: 'spend' }))}
                  className={`rounded-2xl border px-4 py-3 text-sm transition-colors ${
                    draft.effectType === 'spend'
                      ? 'border-stone-900 bg-stone-900 text-white'
                      : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                  }`}
                >
                  扣除光点
                </button>
              </div>
            </div>
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400">触发分钟</span>
              <input
                type="number"
                min={1}
                value={draft.unitMinutes}
                onChange={(event) => setDraft((previous) => ({ ...previous, unitMinutes: Number(event.target.value) || 1 }))}
                className="mt-2 w-full border-b border-stone-300 bg-transparent px-0 py-2 text-[1rem] text-stone-900 outline-none focus:border-stone-900"
              />
            </label>
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400">每次变化</span>
              <input
                type="number"
                min={1}
                value={draft.deltaPerUnit}
                onChange={(event) => setDraft((previous) => ({ ...previous, deltaPerUnit: Number(event.target.value) || 1 }))}
                className="mt-2 w-full border-b border-stone-300 bg-transparent px-0 py-2 text-[1rem] text-stone-900 outline-none focus:border-stone-900"
              />
            </label>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-stone-400">关联活动</div>
            <div className="mt-3 rounded-3xl border border-stone-200 px-4 py-4">
              <TagMultipleAssociation
                categories={categories}
                selectedActivityIds={draft.targetIds}
                onChange={(targetIds) => setDraft((previous) => ({ ...previous, targetIds }))}
                description="选择命中这条成就规则的标签，可跨分类多选。"
              />
            </div>
          </div>
        </div>
      </AchievementDialog>
    </>
  );
};
