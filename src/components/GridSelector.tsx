/**
 * @file GridSelector.tsx
 * @input options, selected, onSelect
 * @output Grid Selection UI
 * @pos Component (Input)
 * @description 通用的网格选择器组件 - 支持图片预览、自定义渲染、响应式布局
 * 
 * 使用场景：
 * - PresetEditModal (UI 主题、时间小友选择)
 * - NavigationDecorationSelector
 * - ColorSchemeSelector
 * - BackgroundSelector
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import React from 'react';
import { Check } from 'lucide-react';

export interface GridSelectorOption {
  /**
   * 选项唯一标识
   */
  id: string;
  
  /**
   * 选项名称
   */
  name: string;
  
  /**
   * 预览图片 URL（可选）
   */
  preview?: string;
  
  /**
   * 自定义预览渲染（优先级高于 preview）
   */
  renderPreview?: () => React.ReactNode;
  
  /**
   * 是否禁用
   */
  disabled?: boolean;
  
  /**
   * 额外的元数据
   */
  metadata?: Record<string, any>;
}

export interface GridSelectorProps {
  /**
   * 选项列表
   */
  options: GridSelectorOption[];
  
  /**
   * 当前选中的选项 ID
   */
  selected: string;
  
  /**
   * 选择回调
   */
  onSelect: (id: string) => void;
  
  /**
   * 列数（响应式）
   * @default { base: 2, sm: 3, md: 4, lg: 5 }
   */
  columns?: number | {
    base?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };
  
  /**
   * 选项尺寸
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * 是否显示选项名称
   * @default true
   */
  showName?: boolean;
  
  /**
   * 是否显示选中标记
   * @default true
   */
  showCheckmark?: boolean;
  
  /**
   * 自定义类名
   */
  className?: string;
  
  /**
   * 选项按钮的自定义类名
   */
  optionClassName?: string;
}

/**
 * 通用网格选择器组件
 * 
 * @example
 * ```tsx
 * // 基础用法
 * <GridSelector
 *   options={[
 *     { id: 'option1', name: 'Option 1', preview: '/images/option1.png' },
 *     { id: 'option2', name: 'Option 2', preview: '/images/option2.png' }
 *   ]}
 *   selected="option1"
 *   onSelect={(id) => console.log(id)}
 * />
 * ```
 * 
 * @example
 * ```tsx
 * // 自定义渲染
 * <GridSelector
 *   options={[
 *     {
 *       id: 'custom',
 *       name: 'Custom',
 *       renderPreview: () => <div className="text-2xl">🎨</div>
 *     }
 *   ]}
 *   selected="custom"
 *   onSelect={(id) => console.log(id)}
 * />
 * ```
 */
export const GridSelector: React.FC<GridSelectorProps> = ({
  options,
  selected,
  onSelect,
  columns = { base: 2, sm: 3, md: 4, lg: 5 },
  size = 'md',
  showName = true,
  showCheckmark = true,
  className = '',
  optionClassName = ''
}) => {
  // 尺寸映射
  const sizeClasses = {
    sm: 'h-16',
    md: 'h-20',
    lg: 'h-24'
  };

  // 列数类名
  const getColumnsClass = () => {
    if (typeof columns === 'number') {
      return `grid-cols-${columns}`;
    }
    
    const { base = 2, sm = 3, md = 4, lg = 5 } = columns;
    return `grid-cols-${base} sm:grid-cols-${sm} md:grid-cols-${md} lg:grid-cols-${lg}`;
  };

  return (
    <div className={`grid gap-2 ${getColumnsClass()} ${className}`}>
      {options.map((option) => {
        const isSelected = selected === option.id;
        const isDisabled = option.disabled || false;

        return (
          <button
            key={option.id}
            onClick={() => !isDisabled && onSelect(option.id)}
            disabled={isDisabled}
            className={`
              relative flex flex-col items-center justify-center gap-1.5
              ${sizeClasses[size]}
              rounded-xl border-2 transition-all
              ${isSelected
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-sm'
              }
              ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
              ${optionClassName}
            `}
            title={option.name}
          >
            {/* 选中标记 */}
            {showCheckmark && isSelected && (
              <div className="absolute top-1 right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <Check size={12} className="text-white" />
              </div>
            )}

            {/* 预览内容 */}
            <div className="flex-1 flex items-center justify-center">
              {option.renderPreview ? (
                option.renderPreview()
              ) : option.preview ? (
                <img
                  src={option.preview}
                  alt={option.name}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-2xl">{option.name.charAt(0)}</div>
              )}
            </div>

            {/* 选项名称 */}
            {showName && (
              <div className={`text-xs font-medium text-center px-1 ${
                isSelected ? 'text-blue-700' : 'text-stone-600'
              }`}>
                {option.name}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

/**
 * 网格选择器按钮组件（用于更细粒度的控制）
 */
export const GridSelectorButton: React.FC<{
  option: GridSelectorOption;
  isSelected: boolean;
  onSelect: () => void;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  showCheckmark?: boolean;
  className?: string;
}> = ({
  option,
  isSelected,
  onSelect,
  size = 'md',
  showName = true,
  showCheckmark = true,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-16',
    md: 'h-20',
    lg: 'h-24'
  };

  const isDisabled = option.disabled || false;

  return (
    <button
      onClick={() => !isDisabled && onSelect()}
      disabled={isDisabled}
      className={`
        relative flex flex-col items-center justify-center gap-1.5
        ${sizeClasses[size]}
        rounded-xl border-2 transition-all
        ${isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-sm'
        }
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
        ${className}
      `}
      title={option.name}
    >
      {showCheckmark && isSelected && (
        <div className="absolute top-1 right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
          <Check size={12} className="text-white" />
        </div>
      )}

      <div className="flex-1 flex items-center justify-center">
        {option.renderPreview ? (
          option.renderPreview()
        ) : option.preview ? (
          <img
            src={option.preview}
            alt={option.name}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="text-2xl">{option.name.charAt(0)}</div>
        )}
      </div>

      {showName && (
        <div className={`text-xs font-medium text-center px-1 ${
          isSelected ? 'text-blue-700' : 'text-stone-600'
        }`}>
          {option.name}
        </div>
      )}
    </button>
  );
};
