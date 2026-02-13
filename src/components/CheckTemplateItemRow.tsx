/**
 * @file CheckTemplateItemRow.tsx
 * @input CheckTemplateItem, handlers
 * @output UI for editing check template item
 * @pos Component (Check Template)
 * @description 日课模板项编辑行 - 支持手动和自动类型
 */

import React, { useState } from 'react';
import { CheckTemplateItem } from '../types';
import { X, Zap, Circle } from 'lucide-react';
import { AutoCheckItemEditor } from './AutoCheckItemEditor';

interface CheckTemplateItemRowProps {
  item: CheckTemplateItem;
  index: number;
  onUpdate: (index: number, item: CheckTemplateItem) => void;
  onDelete: (index: number) => void;
}

export const CheckTemplateItemRow: React.FC<CheckTemplateItemRowProps> = ({
  item,
  index,
  onUpdate,
  onDelete
}) => {
  const [showAutoEditor, setShowAutoEditor] = useState(false);

  // 切换类型（手动 <-> 自动）
  const handleToggleType = () => {
    if (item.type === 'auto') {
      // 切换到手动，清除自动配置
      onUpdate(index, { ...item, type: 'manual', autoConfig: undefined });
    } else {
      // 切换到自动，保持现有配置（如果有）
      onUpdate(index, { ...item, type: 'auto' });
    }
  };

  const handleContentChange = (fullText: string) => {
    // 提取第一个字符作为图标
    const firstChar = Array.from(fullText.trim())[0] || '';
    const icon = firstChar || '📝';
    // 剩余部分作为内容
    const contentArray = Array.from(fullText.trim());
    const content = contentArray.length > 1 ? contentArray.slice(1).join('').trim() : '';
    onUpdate(index, { ...item, content, icon });
  };

  // 显示值：图标 + 内容
  const displayValue = `${item.icon || ''}${item.content || ''}`;

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
            placeholder={item.type === 'auto' ? '⚡ 输入自动日课名称...' : '💧 输入检查内容 (首字符作为图标)...'}
          />
          
          {/* 类型切换图标 */}
          <button
            type="button"
            onClick={handleToggleType}
            className={`px-2.5 py-2 rounded-lg transition-colors shrink-0 ${
              item.type === 'auto' 
                ? 'text-blue-600' 
                : 'text-stone-400'
            }`}
            title={item.type === 'auto' ? '点击切换为手动' : '点击切换为自动'}
          >
            {item.type === 'auto' ? <Zap size={16} /> : <Circle size={16} />}
          </button>

          {/* 删除按钮 - 始终显示 */}
          <button
            type="button"
            onClick={() => onDelete(index)}
            className="px-2.5 py-2 text-stone-300 active:text-red-500 transition-colors shrink-0"
            tabIndex={-1}
          >
            <X size={16} />
          </button>
        </div>

        {/* 自动规则预览（可点击编辑） */}
        {item.type === 'auto' && (
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
