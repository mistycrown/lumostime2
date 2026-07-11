/**
 * @file AchievementRulesTab.tsx
 * @input Achievement rules plus category, scope, todo, and daily-check metadata for editing targets
 * @output Rule list rows and a modal editor that can safely edit temporary empty numeric input states
 * @description Achievement rule list and modal editor, reusing the shared selectors plus inline filter expressions for duration-based custom matching.
 * @updated 2026-07-11: Added a custom styled todo subtask inclusion checkbox for todo-completion achievement rules.
 * @updated 2026-06-06: Clarified custom-filter help text so `@` expressions cover todo titles and todo category names.
 * @updated 2026-04-25: Added a fixed per-rule streak toggle for check-category rules without exposing custom streak-tier editing in the UI.
 * @updated 2026-04-17: Added filter-duration rules backed by inline custom filter expressions.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight, Plus } from 'lucide-react';
import { AchievementRule, Category, CheckTemplate, Scope, TodoCategory } from '../../types';
import { AchievementDialog } from './AchievementDialog';
import { TagMultipleAssociation } from '../TagMultipleAssociation';
import { IconRenderer } from '../IconRenderer';
import { formatAchievementSignedStars, formatAchievementStars } from '../../utils/achievementUtils';

interface AchievementRulesTabProps {
  categories: Category[];
  scopes: Scope[];
  todoCategories: TodoCategory[];
  checkTemplates: CheckTemplate[];
  rules: AchievementRule[];
  onCreateRule: (input: {
    name: string;
    effectType: 'earn' | 'spend';
    targetType: AchievementRule['targetType'];
    targetIds: string[];
    useCheckStreakMultiplier?: boolean;
    includeSubtasks?: boolean;
    filterExpression?: string;
    unitAmount: number;
    deltaPerUnit: number;
    note?: string;
  }) => void;
  onUpdateRule: (rule: AchievementRule) => void;
  onDeleteRule: (ruleId: string) => void;
}

interface RuleDraft {
  name: string;
  effectType: 'earn' | 'spend';
  targetType: AchievementRule['targetType'];
  targetIds: string[];
  useCheckStreakMultiplier: boolean;
  includeSubtasks: boolean;
  filterExpression: string;
  unitAmount: number;
  deltaPerUnit: number;
  note: string;
}

interface TargetOption {
  id: string;
  name: string;
  icon?: string;
  uiIcon?: string;
}

const RULE_TYPE_OPTIONS: Array<{ id: AchievementRule['targetType']; label: string }> = [
  { id: 'activity', label: '标签时长' },
  { id: 'scope', label: '领域时长' },
  { id: 'filterDuration', label: '筛选器时长' },
  { id: 'todoCategory', label: '待办完成' },
  { id: 'checkCategory', label: '日课完成' }
];

const createEmptyDraft = (): RuleDraft => ({
  name: '',
  effectType: 'earn',
  targetType: 'activity',
  targetIds: [],
  useCheckStreakMultiplier: false,
  includeSubtasks: false,
  filterExpression: '',
  unitAmount: 30,
  deltaPerUnit: 1,
  note: ''
});

const formatRuleNumberInput = (value: number) => String(value);

const parseRuleUnitAmountInput = (value: string): number | null => {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.max(1, Math.round(parsed));
};

const parseRuleDeltaInput = (value: string): number | null => {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.max(0.1, parsed);
};

const isSameRuleDraft = (left: RuleDraft, right: RuleDraft) => (
  left.name === right.name &&
  left.effectType === right.effectType &&
  left.targetType === right.targetType &&
  left.unitAmount === right.unitAmount &&
  left.deltaPerUnit === right.deltaPerUnit &&
  left.useCheckStreakMultiplier === right.useCheckStreakMultiplier &&
  left.includeSubtasks === right.includeSubtasks &&
  left.filterExpression === right.filterExpression &&
  left.note === right.note &&
  left.targetIds.length === right.targetIds.length &&
  left.targetIds.every((targetId, index) => targetId === right.targetIds[index])
);

const getSelectedOutlineStyle = () => ({
  borderColor: '#d6d3d1',
  backgroundColor: '#f5f5f4',
  color: 'rgb(28 25 23)'
});

const getRuleUnitAmountDefault = (targetType: AchievementRule['targetType']) => (
  targetType === 'activity' || targetType === 'scope' || targetType === 'filterDuration'
    ? 30
    : 1
);

const getRuleNamePlaceholder = (targetType: AchievementRule['targetType']) => {
  if (targetType === 'activity') {
    return '例如：阅读标签半小时一点光';
  }
  if (targetType === 'scope') {
    return '例如：学习领域半小时一点光';
  }
  if (targetType === 'filterDuration') {
    return '例如：阅读筛选半小时一点光';
  }
  if (targetType === 'todoCategory') {
    return '例如：完成待办得光点';
  }
  return '例如：完成晨间日课得光点';
};

const collectActivityOptions = (categories: Category[]) => categories.flatMap((category) => (
  category.activities.map((activity) => ({
    categoryId: category.id,
    categoryName: category.name,
    activityId: activity.id,
    activityName: activity.name
  }))
));

const TargetMultiSelector: React.FC<{
  label: string;
  description: string;
  options: TargetOption[];
  selectedIds: string[];
  onChange: (targetIds: string[]) => void;
}> = ({ label, description, options, selectedIds, onChange }) => {
  const selectedOptions = selectedIds
    .map((id) => options.find((option) => option.id === id) || { id, name: id })
    .filter(Boolean);

  const toggleOption = (targetId: string) => {
    onChange(
      selectedIds.includes(targetId)
        ? selectedIds.filter((id) => id !== targetId)
        : [...selectedIds, targetId]
    );
  };

  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.14em] text-stone-400">{label}</div>
      <p className="mt-2 text-xs leading-6 text-stone-500">{description}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((option) => {
          const isSelected = selectedIds.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => toggleOption(option.id)}
              className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-left text-sm transition-colors ${
                isSelected
                  ? 'bg-white text-stone-900'
                  : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
              }`}
              style={isSelected ? getSelectedOutlineStyle() : undefined}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                isSelected ? 'text-stone-900' : 'bg-stone-100 text-stone-500'
              }`}>
                {option.icon || option.uiIcon ? (
                  <IconRenderer icon={option.icon || 'List'} uiIcon={option.uiIcon} className="text-sm" />
                ) : (
                  <span className="text-[11px] font-semibold">{option.name.slice(0, 1)}</span>
                )}
              </span>
              <span className="truncate">{option.name}</span>
            </button>
          );
        })}
      </div>
      {selectedOptions.length > 0 && (
        <div className="mt-3 text-xs leading-6 text-stone-500">
          已选择：{selectedOptions.map((option) => option.name).join('、')}
        </div>
      )}
    </div>
  );
};

const TodoSubtaskInclusionToggle: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ checked, onChange }) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
      checked
        ? 'border-stone-300 bg-stone-100 text-stone-900'
        : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
    }`}
  >
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
        checked
          ? 'border-stone-900 bg-stone-900 text-white'
          : 'border-stone-300 bg-stone-50 text-transparent'
      }`}
    >
      <Check size={13} strokeWidth={2.4} />
    </span>
    <span className="min-w-0">
      <span className="block text-sm leading-5">包括子任务</span>
      <span className="mt-1 block text-xs leading-5 text-stone-500">勾选后，完成子任务也会计入这条待办完成规则。</span>
    </span>
  </button>
);

export const AchievementRulesTab: React.FC<AchievementRulesTabProps> = ({
  categories,
  scopes,
  todoCategories,
  checkTemplates,
  rules,
  onCreateRule,
  onUpdateRule,
  onDeleteRule
}) => {
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RuleDraft>(createEmptyDraft);
  const [unitAmountInput, setUnitAmountInput] = useState<string>(() => formatRuleNumberInput(createEmptyDraft().unitAmount));
  const [deltaPerUnitInput, setDeltaPerUnitInput] = useState<string>(() => formatRuleNumberInput(createEmptyDraft().deltaPerUnit));

  const selectedRule = rules.find((rule) => rule.id === selectedRuleId) || null;
  const isDialogOpen = dialogMode !== null;
  const isDraftSavable = Boolean(
    (draft.targetType === 'filterDuration' && draft.filterExpression.trim())
    || (draft.targetType !== 'filterDuration' && draft.targetIds.length > 0)
  );

  useEffect(() => {
    if (dialogMode === 'edit' && selectedRule) {
      const nextDraft: RuleDraft = {
        name: selectedRule.name,
        effectType: selectedRule.effectType,
        targetType: selectedRule.targetType,
        targetIds: selectedRule.targetIds,
        useCheckStreakMultiplier: selectedRule.useCheckStreakMultiplier === true,
        includeSubtasks: selectedRule.targetType === 'todoCategory'
          ? selectedRule.includeSubtasks !== false
          : false,
        filterExpression: selectedRule.filterExpression || '',
        unitAmount: selectedRule.unitAmount,
        deltaPerUnit: selectedRule.deltaPerUnit,
        note: selectedRule.note || ''
      };
      setUnitAmountInput(formatRuleNumberInput(nextDraft.unitAmount));
      setDeltaPerUnitInput(formatRuleNumberInput(nextDraft.deltaPerUnit));
      setDraft((previous) => (isSameRuleDraft(previous, nextDraft) ? previous : nextDraft));
      return;
    }

    if (dialogMode === 'create') {
      const nextDraft = createEmptyDraft();
      setUnitAmountInput(formatRuleNumberInput(nextDraft.unitAmount));
      setDeltaPerUnitInput(formatRuleNumberInput(nextDraft.deltaPerUnit));
      setDraft((previous) => (isSameRuleDraft(previous, nextDraft) ? previous : nextDraft));
    }
  }, [dialogMode, selectedRule]);

  const activityNameMap = useMemo(() => {
    const entries = collectActivityOptions(categories).map((option) => [option.activityId, option.activityName] as const);
    return new Map(entries);
  }, [categories]);

  const todoCategoryNameMap = useMemo(
    () => new Map(todoCategories.map((category) => [category.id, category.name] as const)),
    [todoCategories]
  );
  const scopeNameMap = useMemo(
    () => new Map(scopes.map((scope) => [scope.id, scope.name] as const)),
    [scopes]
  );
  const checkTemplateNameMap = useMemo(
    () => new Map(checkTemplates.map((template) => [template.title, template.title] as const)),
    [checkTemplates]
  );

  const scopeTargetOptions = useMemo<TargetOption[]>(() => (
    scopes
      .filter((scope) => !scope.isArchived)
      .map((scope) => ({
        id: scope.id,
        name: scope.name,
        icon: scope.icon,
        uiIcon: scope.uiIcon
      }))
  ), [scopes]);

  const todoTargetOptions = useMemo<TargetOption[]>(() => (
    todoCategories.map((category) => ({
      id: category.id,
      name: category.name,
      icon: category.icon,
      uiIcon: category.uiIcon
    }))
  ), [todoCategories]);

  const checkTargetOptions = useMemo<TargetOption[]>(() => {
    const baseOptions = checkTemplates
      .filter((template) => template.isDaily && template.enabled)
      .map((template) => ({
        id: template.title,
        name: template.title,
        icon: template.icon,
        uiIcon: template.uiIcon
      }));

    const existingIds = new Set(baseOptions.map((option) => option.id));
    draft.targetIds.forEach((targetId) => {
      if (!existingIds.has(targetId)) {
        baseOptions.push({ id: targetId, name: targetId });
      }
    });

    return baseOptions;
  }, [checkTemplates, draft.targetIds]);
  const closeDialog = () => {
    setDialogMode(null);
    setSelectedRuleId(null);
  };

  const commitUnitAmountInput = () => {
    const nextValue = parseRuleUnitAmountInput(unitAmountInput) ?? Math.max(1, Math.round(draft.unitAmount));
    setUnitAmountInput(formatRuleNumberInput(nextValue));
    setDraft((previous) => (
      previous.unitAmount === nextValue
        ? previous
        : { ...previous, unitAmount: nextValue }
    ));
    return nextValue;
  };

  const commitDeltaPerUnitInput = () => {
    const nextValue = parseRuleDeltaInput(deltaPerUnitInput) ?? Math.max(0.1, draft.deltaPerUnit);
    setDeltaPerUnitInput(formatRuleNumberInput(nextValue));
    setDraft((previous) => (
      previous.deltaPerUnit === nextValue
        ? previous
        : { ...previous, deltaPerUnit: nextValue }
    ));
    return nextValue;
  };

  const handleRuleTypeChange = (targetType: AchievementRule['targetType']) => {
    const nextUnitAmount = getRuleUnitAmountDefault(targetType);
    setUnitAmountInput(formatRuleNumberInput(nextUnitAmount));
    setDraft((previous) => ({
      ...previous,
      targetType,
      targetIds: targetType === 'filterDuration' ? previous.targetIds : [],
      useCheckStreakMultiplier: targetType === 'checkCategory' ? previous.useCheckStreakMultiplier : false,
      includeSubtasks: targetType === 'todoCategory' ? previous.includeSubtasks : false,
      unitAmount: nextUnitAmount
    }));
  };

  const handleSave = () => {
    if (!isDraftSavable) {
      return;
    }

    const normalizedUnitAmount = commitUnitAmountInput();
    const normalizedDeltaPerUnit = commitDeltaPerUnitInput();
    const normalizedTargetIds = draft.targetType === 'filterDuration' ? [] : draft.targetIds;
    const normalizedFilterExpression = draft.filterExpression.trim() || undefined;

    if (dialogMode === 'create') {
      onCreateRule({
        name: draft.name.trim(),
        effectType: draft.effectType,
        targetType: draft.targetType,
        targetIds: normalizedTargetIds,
        useCheckStreakMultiplier: draft.targetType === 'checkCategory' ? draft.useCheckStreakMultiplier : false,
        includeSubtasks: draft.targetType === 'todoCategory' ? draft.includeSubtasks : false,
        filterExpression: normalizedFilterExpression,
        unitAmount: normalizedUnitAmount,
        deltaPerUnit: normalizedDeltaPerUnit,
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
        targetType: draft.targetType,
        targetIds: normalizedTargetIds,
        useCheckStreakMultiplier: draft.targetType === 'checkCategory' ? draft.useCheckStreakMultiplier : false,
        includeSubtasks: draft.targetType === 'todoCategory' ? draft.includeSubtasks : false,
        filterExpression: normalizedFilterExpression,
        unitAmount: normalizedUnitAmount,
        deltaPerUnit: normalizedDeltaPerUnit,
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
        <div className="mt-[14px] rounded-2xl border border-dashed border-stone-300 bg-white/50 px-5 py-6 text-sm leading-7 text-stone-500">
          还没有规则。先新增一条类似“阅读 30 分钟 +1 光点”或“#阅读 %学习 30 分钟 +1 光点”的规则，成就页才会开始生成每日快照。
        </div>
      ) : (
        <div className="mt-[14px] divide-y divide-stone-200">
          {rules.map((rule) => {
            const targetPreview = rule.targetType === 'filterDuration'
              ? (rule.filterExpression || '')
              : rule.targetIds
                .map((targetId) => {
                  if (rule.targetType === 'activity') {
                    return activityNameMap.get(targetId) || '未命名标签';
                  }
                  if (rule.targetType === 'scope') {
                    return scopeNameMap.get(targetId) || '未命名领域';
                  }
                  if (rule.targetType === 'todoCategory') {
                    return todoCategoryNameMap.get(targetId) || '未命名待办分类';
                  }
                  return checkTemplateNameMap.get(targetId) || '未命名日课组';
                })
                .slice(0, 3)
                .join(' / ');

            const summaryText = (() => {
              if (rule.targetType === 'activity' || rule.targetType === 'scope' || rule.targetType === 'filterDuration') {
                return `每 ${rule.unitAmount} 分钟 ${formatAchievementSignedStars(rule.effectType === 'earn' ? rule.deltaPerUnit : -rule.deltaPerUnit)} 光点`;
              }
              return `每完成 ${rule.unitAmount} 项 ${formatAchievementSignedStars(rule.effectType === 'earn' ? rule.deltaPerUnit : -rule.deltaPerUnit)} 光点`;
            })();

            return (
              <button
                key={rule.id}
                type="button"
                onClick={() => {
                  setSelectedRuleId(rule.id);
                  setDialogMode('edit');
                }}
                className="flex w-full items-center justify-between gap-4 py-[14px] text-left transition-colors hover:bg-stone-50/70"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[16px] leading-none text-stone-900">{rule.name}</div>
                  <div className="mt-[6px] text-[13px] leading-6 text-stone-500">
                    {summaryText}
                    {rule.targetType === 'todoCategory'
                      ? ` · ${rule.includeSubtasks !== false ? '含子任务' : '仅父任务'}`
                      : ''}
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
                disabled={!isDraftSavable}
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
                placeholder={getRuleNamePlaceholder(draft.targetType)}
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
                      ? 'bg-white text-stone-900'
                      : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                  }`}
                  style={draft.effectType === 'earn' ? getSelectedOutlineStyle() : undefined}
                >
                  获得光点
                </button>
                <button
                  type="button"
                  onClick={() => setDraft((previous) => ({ ...previous, effectType: 'spend' }))}
                  className={`rounded-2xl border px-4 py-3 text-sm transition-colors ${
                    draft.effectType === 'spend'
                      ? 'bg-white text-stone-900'
                      : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                  }`}
                  style={draft.effectType === 'spend' ? getSelectedOutlineStyle() : undefined}
                >
                  扣除光点
                </button>
              </div>
            </div>

            <div className="block sm:col-span-2">
              <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400">规则类型</span>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {RULE_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleRuleTypeChange(option.id)}
                    className={`rounded-2xl border px-4 py-3 text-sm transition-colors ${
                      draft.targetType === option.id
                        ? 'bg-white text-stone-900'
                        : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                    }`}
                    style={draft.targetType === option.id ? getSelectedOutlineStyle() : undefined}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {(draft.targetType === 'activity' || draft.targetType === 'scope' || draft.targetType === 'filterDuration') && (
              <label className="block">
                <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400">触发分钟</span>
                <input
                  type="number"
                  min={1}
                  value={unitAmountInput}
                  onBlur={commitUnitAmountInput}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setUnitAmountInput(nextValue);
                    const parsedValue = parseRuleUnitAmountInput(nextValue);
                    if (parsedValue !== null) {
                      setDraft((previous) => ({ ...previous, unitAmount: parsedValue }));
                    }
                  }}
                  className="mt-2 w-full border-b border-stone-300 bg-transparent px-0 py-2 text-[1rem] text-stone-900 outline-none focus:border-stone-900"
                />
              </label>
            )}

            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400">每次变化</span>
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={deltaPerUnitInput}
                onBlur={commitDeltaPerUnitInput}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setDeltaPerUnitInput(nextValue);
                  const parsedValue = parseRuleDeltaInput(nextValue);
                  if (parsedValue !== null) {
                    setDraft((previous) => ({ ...previous, deltaPerUnit: parsedValue }));
                  }
                }}
                className="mt-2 w-full border-b border-stone-300 bg-transparent px-0 py-2 text-[1rem] text-stone-900 outline-none focus:border-stone-900"
              />
              <div className="mt-2 text-xs text-stone-400">Current: {formatAchievementStars(draft.deltaPerUnit)} 光点</div>
            </label>
          </div>

          {draft.targetType === 'checkCategory' && (
            <div className="flex items-center justify-between gap-4 rounded-3xl border border-stone-200 px-4 py-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-stone-400">连胜倍率</div>
                <p className="mt-2 text-xs leading-6 text-stone-500">
                  开启后连胜打卡积分按倍率计算：5天 1.2x，15天 1.5x，30天 2.0x。
                </p>
              </div>
              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setDraft((previous) => ({ ...previous, useCheckStreakMultiplier: !previous.useCheckStreakMultiplier }))}
                  aria-pressed={draft.useCheckStreakMultiplier}
                  className="inline-flex items-center bg-transparent px-0 py-0"
                >
                  <span
                    className={`relative h-7 w-12 rounded-full transition-colors ${
                      draft.useCheckStreakMultiplier ? 'bg-stone-900' : 'bg-stone-200'
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
                        draft.useCheckStreakMultiplier ? 'left-6' : 'left-1'
                      }`}
                    />
                  </span>
                </button>
              </div>
            </div>
          )}

          {draft.targetType === 'activity' ? (
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-stone-400">关联标签</div>
              <div className="mt-3 rounded-3xl border border-stone-200 px-4 py-4">
                <TagMultipleAssociation
                  categories={categories}
                  selectedActivityIds={draft.targetIds}
                  onChange={(targetIds) => setDraft((previous) => ({ ...previous, targetIds }))}
                  description="选择命中这条成就规则的标签，可跨分类多选。"
                />
              </div>
            </div>
          ) : draft.targetType === 'scope' ? (
            <TargetMultiSelector
              label="领域"
              description="选择要统计的领域。当日命中这些领域的记录时长会累计结算光点，同一条记录不会因为命中多个已选领域而重复计时。"
              options={scopeTargetOptions}
              selectedIds={draft.targetIds}
              onChange={(targetIds) => setDraft((previous) => ({ ...previous, targetIds }))}
            />
          ) : draft.targetType === 'filterDuration' ? (
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400">筛选表达式</span>
              <p className="mt-2 text-xs leading-6 text-stone-500">
                直接输入自定义筛选器语法，例如 `#阅读 %学习`、`@晨间计划`、`冥想 OR 呼吸`。系统会用这条表达式去匹配当天记录并累计时长。
              </p>
              <textarea
                value={draft.filterExpression}
                onChange={(event) => setDraft((previous) => ({ ...previous, filterExpression: event.target.value }))}
                className="mt-3 min-h-[7.5rem] w-full rounded-3xl border border-stone-200 bg-white px-4 py-3 text-sm leading-6 text-stone-900 outline-none transition-colors focus:border-stone-400"
                placeholder="例如：#阅读 %学习"
              />
              <p className="mt-2 text-xs leading-6 text-stone-400">
                支持 `#标签`、`%领域`、`@待办/分类`、`^Reaction`、备注关键词，以及 `OR` 连接同类条件。
              </p>
            </label>
          ) : draft.targetType === 'todoCategory' ? (
            <>
              <TargetMultiSelector
                label="待办分类"
                description="选择要统计的待办分类。当日完成该分类下的待办后，就会按条目数结算光点。"
                options={todoTargetOptions}
                selectedIds={draft.targetIds}
                onChange={(targetIds) => setDraft((previous) => ({ ...previous, targetIds }))}
              />
              <TodoSubtaskInclusionToggle
                checked={draft.includeSubtasks}
                onChange={(includeSubtasks) => setDraft((previous) => ({ ...previous, includeSubtasks }))}
              />
            </>
          ) : (
            <TargetMultiSelector
              label="日课组"
              description="选择要统计的日课组。系统会从当日日报中读取该分组下已完成的日课条目数量。"
              options={checkTargetOptions}
              selectedIds={draft.targetIds}
              onChange={(targetIds) => setDraft((previous) => ({ ...previous, targetIds }))}
            />
          )}
        </div>
      </AchievementDialog>
    </>
  );
};
