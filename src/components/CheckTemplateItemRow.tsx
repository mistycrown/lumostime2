/**
 * @file CheckTemplateItemRow.tsx
 * @input CheckTemplateItem plus editing handlers and optional UI icon support flag
 * @output UI row for editing one daily check template item
 * @pos Component (Check Template)
 * @description 日课模板条目编辑行，支持手动/自动模式切换、次数目标输入、自动规则配置，以及可选的 UI icon 选择。
 * @updated 2026-05-14: Keep index and input on one line, move action buttons to a right-aligned second row on small screens.
 * @updated 2026-07-21: Added semantic dark-mode surfaces for daily-check item inputs and auto-rule controls.
 * @updated 2026-05-03: Rewrote the row in UTF-8 and added supporter-gated UI icon selection support.
 * @updated 2026-04-15: Added nightLatestStart summary rendering for auto rules.
 */

import React, { useEffect, useState } from 'react';
import { X, Zap, Circle, ChevronUp, ChevronDown } from 'lucide-react';
import { CheckTemplateItem } from '../types';
import { AutoCheckItemEditor } from './AutoCheckItemEditor';
import { UIIconSelectorCompact } from './UIIconSelector';
import { IconRenderer } from './IconRenderer';

interface CheckTemplateItemRowProps {
  item: CheckTemplateItem;
  index: number;
  onUpdate: (index: number, item: CheckTemplateItem) => void;
  onDelete: (index: number) => void;
  sortingMode?: boolean;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  canUseUiIcon?: boolean;
}

export const CheckTemplateItemRow: React.FC<CheckTemplateItemRowProps> = ({
  item,
  index,
  onUpdate,
  onDelete,
  sortingMode = false,
  onMoveUp,
  onMoveDown,
  canUseUiIcon = false
}) => {
  const [showAutoEditor, setShowAutoEditor] = useState(false);
  const [showIconSelector, setShowIconSelector] = useState(false);

  const getCurrentMode = (): 'manual-binary' | 'manual-count' | 'auto' => {
    if (item.type === 'auto') return 'auto';
    if (item.manualMode === 'count') return 'manual-count';
    return 'manual-binary';
  };

  const getNextMode = (
    mode: 'manual-binary' | 'manual-count' | 'auto'
  ): 'manual-binary' | 'manual-count' | 'auto' => {
    if (mode === 'manual-binary') return 'manual-count';
    if (mode === 'manual-count') return 'auto';
    return 'manual-binary';
  };

  const handleSetMode = (mode: 'manual-binary' | 'manual-count' | 'auto') => {
    if (mode === 'auto') {
      onUpdate(index, {
        ...item,
        type: 'auto',
        manualMode: undefined,
        targetCount: undefined
      });
      return;
    }

    if (mode === 'manual-count') {
      onUpdate(index, {
        ...item,
        type: 'manual',
        manualMode: 'count',
        targetCount: Math.max(1, Math.floor(Number(item.targetCount) || 1)),
        autoConfig: undefined
      });
      return;
    }

    onUpdate(index, {
      ...item,
      type: 'manual',
      manualMode: 'binary',
      targetCount: undefined,
      autoConfig: undefined
    });
  };

  const handleCycleMode = () => {
    handleSetMode(getNextMode(getCurrentMode()));
  };

  const handleContentChange = (fullText: string) => {
    const trimmed = fullText.trim();
    const firstChar = Array.from(trimmed)[0] || '';
    const icon = firstChar || '🔵';
    const contentArray = Array.from(trimmed);
    const content = contentArray.length > 1 ? contentArray.slice(1).join('').trim() : '';
    onUpdate(index, { ...item, content, icon });
  };

  const handleUiIconSelect = (_emoji: string, uiIcon: string) => {
    onUpdate(index, {
      ...item,
      uiIcon: uiIcon || undefined
    });
    setShowIconSelector(false);
  };

  const displayValue = `${item.icon || ''}${item.content || ''}`;
  const isAuto = item.type === 'auto';
  const isCountManual = !isAuto && item.manualMode === 'count';

  const [targetCountText, setTargetCountText] = useState<string>(
    item.targetCount === undefined ? '' : String(item.targetCount)
  );
  const [isEditingTargetCount, setIsEditingTargetCount] = useState(false);

  useEffect(() => {
    if (!isCountManual) {
      setIsEditingTargetCount(false);
      setTargetCountText(item.targetCount === undefined ? '' : String(item.targetCount));
      return;
    }
    if (isEditingTargetCount) return;
    setTargetCountText(item.targetCount === undefined ? '' : String(item.targetCount));
  }, [isCountManual, isEditingTargetCount, item.targetCount]);

  const renderAutoSummary = () => {
    if (!item.autoConfig) {
      return <span className="text-xs font-medium">点击配置自动规则（必填）</span>;
    }

    const { filterExpression, comparisonType, operator, targetValue } = item.autoConfig;
    const label = (() => {
      if (comparisonType === 'duration') return '时长';
      if (comparisonType === 'earliestStart') return '最早开始';
      if (comparisonType === 'latestStart') return '最晚开始';
      if (comparisonType === 'nightLatestStart') return '夜间最晚开始';
      if (comparisonType === 'earliestEnd') return '最早结束';
      if (comparisonType === 'latestEnd') return '最晚结束';
      if (comparisonType === 'count') return '次数';
      return comparisonType;
    })();

    const formattedTarget = (() => {
      if (comparisonType === 'duration') return `${targetValue}分钟`;
      if (comparisonType === 'count') return `${targetValue}次`;
      const rawMinutes = comparisonType === 'nightLatestStart' && targetValue >= 24 * 60
        ? targetValue - 24 * 60
        : targetValue;
      const prefix = comparisonType === 'nightLatestStart' && targetValue >= 24 * 60 ? '次日 ' : '';
      const hour = Math.floor(rawMinutes / 60).toString().padStart(2, '0');
      const minute = (rawMinutes % 60).toString().padStart(2, '0');
      return `${prefix}${hour}:${minute}`;
    })();

    return (
      <span className="min-w-0 break-words font-mono text-[10px]">
        {filterExpression || '(未设置筛选条件)'} {label} {operator} {formattedTarget}
      </span>
    );
  };

  return (
    <>
      <div className="space-y-2">
        <div className="group space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="w-4 shrink-0 text-center text-xs text-stone-300">{index + 1}</span>
            <input
              type="text"
              value={displayValue}
              onChange={(e) => handleContentChange(e.target.value)}
              className="daily-check-item-input min-w-0 flex-1 bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none transition-all font-serif focus:border-stone-400 focus:ring-2 focus:ring-stone-100"
              placeholder={isAuto ? '⚡ 输入自动日课名称...' : '📝 输入日课名称（首字符作为 emoji 图标）...'}
            />
          </div>

          {isCountManual && (
            <div className="ml-6 flex flex-wrap items-center gap-2 text-xs text-stone-500">
              <span>目标次数</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={targetCountText}
                onFocus={(e) => e.currentTarget.select()}
                onClick={(e) => e.currentTarget.select()}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (!/^\d*$/.test(raw)) return;

                  setIsEditingTargetCount(true);
                  setTargetCountText(raw);

                  if (raw === '') {
                    onUpdate(index, { ...item, targetCount: undefined, manualMode: 'count', type: 'manual' });
                    return;
                  }

                  const parsed = Number(raw);
                  if (!Number.isFinite(parsed) || parsed < 1) {
                    onUpdate(index, { ...item, targetCount: undefined, manualMode: 'count', type: 'manual' });
                    return;
                  }

                  onUpdate(index, { ...item, targetCount: Math.floor(parsed), manualMode: 'count', type: 'manual' });
                }}
                onBlur={() => setIsEditingTargetCount(false)}
                className="w-20 rounded border border-stone-200 bg-white px-2 py-1 text-stone-700"
              />
              <span>次</span>
            </div>
          )}

          {isAuto && (
            <div
              onClick={() => setShowAutoEditor(true)}
              className={`daily-check-auto-rule ml-6 min-w-0 cursor-pointer rounded-lg px-3 py-2 text-xs transition-colors active:opacity-80 flex items-center gap-2 ${
                item.autoConfig
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-amber-50 text-amber-600 animate-pulse'
              }`}
              title="点击编辑自动规则"
            >
              <Zap size={12} className="shrink-0" />
              {renderAutoSummary()}
            </div>
          )}

          <div className="ml-[1.375rem] flex justify-end gap-1.5">
            {canUseUiIcon && !sortingMode && (
              <button
                type="button"
                onClick={() => setShowIconSelector((prev) => !prev)}
                className={`daily-check-icon-button flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all ${
                  showIconSelector
                    ? 'bg-[var(--accent-color)]/10'
                    : 'border border-stone-200 bg-white hover:border-stone-300'
                }`}
                style={showIconSelector ? { border: '0.5px solid var(--accent-color)' } : undefined}
                title="选择 UI 图标"
              >
                {item.uiIcon ? (
                  <IconRenderer icon={item.icon || '🔵'} uiIcon={item.uiIcon} size={16} />
                ) : (
                  <span className="text-xs text-stone-300">+</span>
                )}
              </button>
            )}

            {!sortingMode && (
              <button
                type="button"
                onClick={handleCycleMode}
                className={`daily-check-mode-button ${isAuto ? 'daily-check-mode-button-auto' : ''} flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  isAuto
                    ? 'bg-blue-50 text-blue-600'
                    : isCountManual
                      ? 'bg-stone-100 text-stone-700'
                      : 'bg-stone-100 text-stone-500'
                }`}
                title={`点击切换类型（当前：${isAuto ? '自动规则' : isCountManual ? '手动次数' : '手动勾选'}）`}
              >
                {isAuto ? <Zap size={16} /> : isCountManual ? <span className="text-sm font-bold leading-none">1</span> : <Circle size={16} />}
              </button>
            )}

            {sortingMode && (
              <>
                <button
                  type="button"
                  onClick={() => onMoveUp?.(index)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700"
                  title="上移"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => onMoveDown?.(index)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700"
                  title="下移"
                >
                  <ChevronDown size={16} />
                </button>
              </>
            )}

            {!sortingMode && (
              <button
                type="button"
                onClick={() => onDelete(index)}
                className="flex h-9 w-9 shrink-0 items-center justify-center text-stone-300 transition-colors active:text-red-500"
                tabIndex={-1}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {canUseUiIcon && showIconSelector && !sortingMode && (
          <div className="ml-6 rounded-xl border border-stone-100 bg-stone-50/60 p-3">
            <UIIconSelectorCompact
              currentIcon={item.icon || ''}
              currentUiIcon={item.uiIcon}
              onSelectDual={handleUiIconSelect}
            />
          </div>
        )}
      </div>

      {showAutoEditor && (
        <AutoCheckItemEditor
          item={item}
          onUpdate={(updated) => {
            onUpdate(index, updated);
            setShowAutoEditor(false);
          }}
          onCancel={() => {
            setShowAutoEditor(false);
          }}
        />
      )}
    </>
  );
};
