/**
 * @file CheckTemplateItemRow.tsx
 * @input CheckTemplateItem, handlers
 * @output UI for editing check template item
 * @pos Component (Check Template)
 * @description 日课模板项编辑行 - 支持手动和自动类型
 */

import React, { useEffect, useState } from 'react';
import { CheckTemplateItem } from '../types';
import { X, Zap, Circle, ChevronUp, ChevronDown } from 'lucide-react';
import { AutoCheckItemEditor } from './AutoCheckItemEditor';

interface CheckTemplateItemRowProps {
  item: CheckTemplateItem;
  index: number;
  onUpdate: (index: number, item: CheckTemplateItem) => void;
  onDelete: (index: number) => void;
  sortingMode?: boolean;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
}

export const CheckTemplateItemRow: React.FC<CheckTemplateItemRowProps> = ({
  item,
  index,
  onUpdate,
  onDelete,
  sortingMode = false,
  onMoveUp,
  onMoveDown
}) => {
  const [showAutoEditor, setShowAutoEditor] = useState(false);

  const getCurrentMode = (): 'manual-binary' | 'manual-count' | 'auto' => {
    if (item.type === 'auto') return 'auto';
    if (item.manualMode === 'count') return 'manual-count';
    return 'manual-binary';
  };

  const getNextMode = (mode: 'manual-binary' | 'manual-count' | 'auto'): 'manual-binary' | 'manual-count' | 'auto' => {
    if (mode === 'manual-binary') return 'manual-count';
    if (mode === 'manual-count') return 'auto';
    return 'manual-binary';
  };

  // 切换模式（二值手动 / 次数手动 / 自动）
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
    const current = getCurrentMode();
    const next = getNextMode(current);
    handleSetMode(next);
  };

  const handleContentChange = (fullText: string) => {
    // 提取第一个字符作为图标
    const firstChar = Array.from(fullText.trim())[0] || '';
    const icon = firstChar || '📝';
    // 剩余部分作为内容
    const contentArray = Array.from(fullText.trim());
    const content = contentArray.length > 1 ? contentArray.slice(1).join('').trim() : '';
    // 保留 type 和 autoConfig 字段
    onUpdate(index, { ...item, content, icon });
  };

  // 显示值：图标 + 内容
  const displayValue = `${item.icon || ''}${item.content || ''}`;
  const isAuto = item.type === 'auto';
  const isCountManual = !isAuto && item.manualMode === 'count';

  // 次数输入框允许暂时为空（例如全选后退格），避免出现“1 无法删除”的体验问题。
  const [targetCountText, setTargetCountText] = useState<string>(
    item.targetCount === undefined ? '' : String(item.targetCount)
  );
  const [isEditingTargetCount, setIsEditingTargetCount] = useState(false);

  useEffect(() => {
    if (!isCountManual) {
      // 输入框被卸载时，确保不处于“编辑中”状态，避免下次切回次数模式时不同步。
      setIsEditingTargetCount(false);
      setTargetCountText(item.targetCount === undefined ? '' : String(item.targetCount));
      return;
    }
    if (isEditingTargetCount) return;
    setTargetCountText(item.targetCount === undefined ? '' : String(item.targetCount));
  }, [isCountManual, isEditingTargetCount, item.targetCount]);

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 group">
          <span className="text-stone-300 text-xs w-4 text-center">{index + 1}</span>

          {/* 内容输入 */}
          <input
            type="text"
            value={displayValue}
            onChange={(e) => handleContentChange(e.target.value)}
            className="flex-1 bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100 transition-all font-serif"
            placeholder={isAuto ? '⚡ 输入自动日课名称...' : '💧 输入日课名称 (首字符作为图标)...'}
          />
          
          {/* 模式切换（单按钮循环） - 排序模式下隐藏 */}
          {!sortingMode && (
            <button
              type="button"
              onClick={handleCycleMode}
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors shrink-0 ${
                isAuto
                  ? 'text-blue-600 bg-blue-50'
                  : isCountManual
                    ? 'text-stone-700 bg-stone-100'
                    : 'text-stone-500 bg-stone-100'
              }`}
              title={`点击切换类型（当前：${
                isAuto ? '自动规则' : isCountManual ? '手动次数' : '手动勾选'
              }）`}
            >
              {isAuto ? <Zap size={16} /> : isCountManual ? <span className="text-sm font-bold leading-none">1</span> : <Circle size={16} />}
            </button>
          )}

          {/* 排序按钮 - 排序模式下显示 */}
          {sortingMode && (
            <>
              <button
                type="button"
                onClick={() => onMoveUp?.(index)}
                className="w-9 h-9 flex items-center justify-center text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors shrink-0"
                title="上移"
              >
                <ChevronUp size={16} />
              </button>
              <button
                type="button"
                onClick={() => onMoveDown?.(index)}
                className="w-9 h-9 flex items-center justify-center text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors shrink-0"
                title="下移"
              >
                <ChevronDown size={16} />
              </button>
            </>
          )}

          {/* 删除按钮 - 排序模式下隐藏 */}
          {!sortingMode && (
            <button
              type="button"
              onClick={() => onDelete(index)}
              className="w-9 h-9 flex items-center justify-center text-stone-300 active:text-red-500 transition-colors shrink-0"
              tabIndex={-1}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* 次数目标配置 */}
        {isCountManual && (
          <div className="ml-6 flex items-center gap-2 text-xs text-stone-500">
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
              className="w-20 px-2 py-1 rounded border border-stone-200 bg-white text-stone-700"
            />
            <span>次</span>
          </div>
        )}

        {/* 自动规则预览（可点击编辑） */}
        {isAuto && (
          <div 
            onClick={() => setShowAutoEditor(true)}
            className={`ml-6 text-xs px-3 py-2 rounded-lg flex items-center gap-2 cursor-pointer transition-colors active:opacity-80 ${
              item.autoConfig 
                ? 'text-blue-600 bg-blue-50' 
                : 'text-amber-600 bg-amber-50 animate-pulse'
            }`}
            title="点击编辑自动规则"
          >
            <Zap size={12} />
            {item.autoConfig ? (
              <span className="font-mono text-[10px]">
                {item.autoConfig.filterExpression || '(未设置筛选条件)'}
                {' '}
                {item.autoConfig.comparisonType === 'duration' && '时长'}
                {item.autoConfig.comparisonType === 'earliestStart' && '最早开始'}
                {item.autoConfig.comparisonType === 'latestStart' && '最晚开始'}
                {item.autoConfig.comparisonType === 'earliestEnd' && '最早结束'}
                {item.autoConfig.comparisonType === 'latestEnd' && '最晚结束'}
                {item.autoConfig.comparisonType === 'count' && '次数'}
                {' '}
                {item.autoConfig.operator}
                {' '}
                {item.autoConfig.comparisonType === 'duration' 
                  ? `${item.autoConfig.targetValue}分钟`
                  : item.autoConfig.comparisonType === 'count'
                    ? `${item.autoConfig.targetValue}次`
                    : `${Math.floor(item.autoConfig.targetValue / 60).toString().padStart(2, '0')}:${(item.autoConfig.targetValue % 60).toString().padStart(2, '0')}`
                }
              </span>
            ) : (
              <span className="text-xs font-medium">点击配置自动规则（必需）</span>
            )}
          </div>
        )}
      </div>

      {/* 自动配置编辑器 */}
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
