/**
 * @file AutoCheckItemEditor.tsx
 * @input CheckTemplateItem
 * @output Updated CheckTemplateItem with auto config
 * @pos Component (Auto Check Editor)
 * @description 自动日课配置编辑器 - 用于配置自动判断规则
 */

import React, { useState } from 'react';
import { CheckTemplateItem, AutoCheckConfig } from '../types';
import { Zap, X } from 'lucide-react';
import { CustomSelect } from './CustomSelect';

interface AutoCheckItemEditorProps {
  item: CheckTemplateItem;
  onUpdate: (item: CheckTemplateItem) => void;
  onCancel: () => void;
}

export const AutoCheckItemEditor: React.FC<AutoCheckItemEditorProps> = ({
  item,
  onUpdate,
  onCancel
}) => {
  const [config, setConfig] = useState<AutoCheckConfig>(
    item.autoConfig || {
      filterExpression: '',
      comparisonType: 'duration',
      operator: '>=',
      targetValue: 0
    }
  );

  // 用于时刻输入的临时字符串状态
  const [timeInputStr, setTimeInputStr] = useState<string>(() => {
    if (item.autoConfig && item.autoConfig.targetValue > 0 && 
        (item.autoConfig.comparisonType === 'earliestStart' || 
         item.autoConfig.comparisonType === 'latestStart' || 
         item.autoConfig.comparisonType === 'earliestEnd' || 
         item.autoConfig.comparisonType === 'latestEnd')) {
      const hours = Math.floor(item.autoConfig.targetValue / 60);
      const mins = item.autoConfig.targetValue % 60;
      return `${hours.toString().padStart(2, '0')}${mins.toString().padStart(2, '0')}`;
    }
    return '';
  });

  const handleSave = () => {
    onUpdate({
      ...item,
      type: 'auto',
      autoConfig: config
    });
  };

  // 判断类型选项
  const comparisonTypeOptions = [
    { value: 'duration', label: '总时长' },
    { value: 'earliestStart', label: '最早开始时间' },
    { value: 'latestStart', label: '最晚开始时间' },
    { value: 'earliestEnd', label: '最早结束时间' },
    { value: 'latestEnd', label: '最晚结束时间' },
    { value: 'count', label: '次数' }
  ];

  // 运算符选项（根据类型动态变化）
  const getOperatorOptions = () => {
    if (config.comparisonType === 'duration' || config.comparisonType === 'count') {
      return [
        { value: '>=', label: '大于等于' },
        { value: '<=', label: '小于等于' },
        { value: '>', label: '大于' },
        { value: '<', label: '小于' },
        { value: '=', label: '等于' }
      ];
    } else {
      return [
        { value: '<=', label: '不晚于' },
        { value: '>=', label: '不早于' },
        { value: '<', label: '早于' },
        { value: '>', label: '晚于' },
        { value: '=', label: '等于' }
      ];
    }
  };

  // 格式化目标值显示（用于规则预览）
  const formatTargetValue = (value: number): string => {
    if (config.comparisonType === 'duration') {
      const hours = Math.floor(value / 60);
      const mins = value % 60;
      return hours > 0 ? `${hours}小时${mins > 0 ? mins + '分钟' : ''}` : `${mins}分钟`;
    } else if (config.comparisonType === 'count') {
      return `${value}次`;
    } else {
      // 时刻类型
      const hours = Math.floor(value / 60);
      const mins = value % 60;
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }
  };

  // 解析时刻输入（4位数字）- 只在输入完整时转换
  const parseTimeInput = (input: string): number => {
    const cleaned = input.replace(/\D/g, '');
    if (cleaned.length !== 4) return 0;
    
    const hours = parseInt(cleaned.slice(0, 2), 10);
    const mins = parseInt(cleaned.slice(2, 4), 10);
    if (hours >= 0 && hours < 24 && mins >= 0 && mins < 60) {
      return hours * 60 + mins;
    }
    
    return 0;
  };

  // 获取输入框的占位符
  const getInputPlaceholder = (): string => {
    if (config.comparisonType === 'duration') {
      return '输入分钟数（如：240）';
    } else if (config.comparisonType === 'count') {
      return '输入次数（如：3）';
    } else {
      return '输入4位数字（如：0800）';
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4"
      onClick={(e) => {
        // 点击背景关闭
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-blue-50/50">
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-blue-600" />
            <h3 className="font-bold text-stone-800">配置自动日课</h3>
          </div>
          <button onClick={onCancel} className="text-stone-400 hover:text-stone-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-blue-50 text-blue-700 text-xs p-3 rounded-xl">
            <p>自动日课会根据当天的活动记录自动判断完成状态，无需手动勾选。</p>
          </div>

          {/* 筛选条件 */}
          <div>
            <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase tracking-wider">
              筛选条件
            </label>
            <input
              type="text"
              value={config.filterExpression}
              onChange={(e) => {
                e.stopPropagation();
                setConfig({ ...config, filterExpression: e.target.value });
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-400 transition-all font-serif"
              placeholder="例如：#学习 %专业输入"
            />
            <p className="text-xs text-stone-400 mt-1">
              使用 # 标签、% 领域、@ 待办 来筛选活动
            </p>
          </div>

          {/* 判断类型 */}
          <div>
            <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase tracking-wider">
              判断类型
            </label>
            <CustomSelect
              value={config.comparisonType}
              options={comparisonTypeOptions}
              onChange={(value) => {
                setConfig({ 
                  ...config, 
                  comparisonType: value as any,
                  targetValue: 0 // 重置目标值
                });
                setTimeInputStr(''); // 重置时刻输入字符串
              }}
            />
          </div>

          {/* 比较运算符 */}
          <div>
            <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase tracking-wider">
              比较运算符
            </label>
            <CustomSelect
              value={config.operator}
              options={getOperatorOptions()}
              onChange={(value) => setConfig({ ...config, operator: value as any })}
            />
          </div>

          {/* 目标值 */}
          <div>
            <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase tracking-wider">
              目标值
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={
                config.comparisonType === 'duration' || config.comparisonType === 'count'
                  ? (config.targetValue === 0 ? '' : config.targetValue)
                  : timeInputStr
              }
              onChange={(e) => {
                e.stopPropagation();
                const input = e.target.value;
                if (config.comparisonType === 'duration' || config.comparisonType === 'count') {
                  // 时长和次数：直接存储数字
                  const num = parseInt(input) || 0;
                  setConfig({ ...config, targetValue: Math.max(0, num) });
                } else {
                  // 时刻：保存原始输入字符串，只保留数字，最多4位
                  const cleaned = input.replace(/\D/g, '').slice(0, 4);
                  setTimeInputStr(cleaned);
                  // 只在输入完整（4位）时转换为分钟数
                  const minutes = parseTimeInput(cleaned);
                  setConfig({ ...config, targetValue: minutes });
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-400 transition-all font-mono"
              placeholder={getInputPlaceholder()}
            />
            <p className="text-xs text-stone-400 mt-1">
              {config.comparisonType === 'duration' && '时长单位：分钟'}
              {config.comparisonType === 'count' && '输入具体次数'}
              {(config.comparisonType === 'earliestStart' || 
                config.comparisonType === 'latestStart' || 
                config.comparisonType === 'earliestEnd' || 
                config.comparisonType === 'latestEnd') && '格式：0800 表示 8:00'}
            </p>
          </div>

          {/* 预览 */}
          <div className="bg-stone-50 rounded-xl p-3 text-xs text-stone-600">
            <p className="font-bold mb-1">规则预览：</p>
            <p>
              当 <span className="text-blue-600 font-mono">{config.filterExpression || '(未设置)'}</span> 的
              {config.comparisonType === 'duration' && '总时长'}
              {config.comparisonType === 'earliestStart' && '最早开始时间'}
              {config.comparisonType === 'latestStart' && '最晚开始时间'}
              {config.comparisonType === 'earliestEnd' && '最早结束时间'}
              {config.comparisonType === 'latestEnd' && '最晚结束时间'}
              {config.comparisonType === 'count' && '次数'}
              {' '}
              {config.operator === '>=' && (config.comparisonType === 'duration' || config.comparisonType === 'count' ? '≥' : '不早于')}
              {config.operator === '<=' && (config.comparisonType === 'duration' || config.comparisonType === 'count' ? '≤' : '不晚于')}
              {config.operator === '>' && (config.comparisonType === 'duration' || config.comparisonType === 'count' ? '>' : '晚于')}
              {config.operator === '<' && (config.comparisonType === 'duration' || config.comparisonType === 'count' ? '<' : '早于')}
              {config.operator === '=' && '='}
              {' '}
              <span className="text-blue-600 font-bold">
                {formatTargetValue(config.targetValue)}
              </span>
              {' '}时，自动标记为完成
            </p>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 transition-all active:scale-[0.98]"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={!config.filterExpression.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Zap size={14} />
              保存配置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
