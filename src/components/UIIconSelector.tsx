/**
 * @file UIIconSelector.tsx
 * @description UI 图标选择器组件 - 支持双图标系统
 * 
 * 新的双图标系统：
 * - 选择图标时，根据当前主题决定更新哪个字段
 * - 默认主题：更新 icon（emoji）
 * - 自定义主题：更新 uiIcon（UI 图标 ID）
 */

import React, { useState, useMemo } from 'react';
import { Check } from 'lucide-react';
import { uiIconService, UIIconType, ICON_GROUPS } from '../services/uiIconService';

interface UIIconSelectorProps {
    currentIcon: string;              // 当前 emoji 图标
    currentUiIcon?: string;           // 当前 UI 图标（可选）
    onSelect: (iconString: string) => void;  // 选择回调（兼容旧接口）
    onSelectDual?: (emoji: string, uiIcon: string) => void;  // 双图标选择回调（新接口）
    className?: string;
}

/**
 * UI 图标选择器组件
 * 
 * 使用示例：
 * ```tsx
 * // 旧接口（兼容）
 * <UIIconSelector 
 *   currentIcon={activity.icon}
 *   onSelect={(icon) => setActivity({ ...activity, icon })}
 * />
 * 
 * // 新接口（推荐）
 * <UIIconSelector 
 *   currentIcon={activity.icon}
 *   currentUiIcon={activity.uiIcon}
 *   onSelectDual={(emoji, uiIcon) => setActivity({ ...activity, icon: emoji, uiIcon })}
 * />
 * ```
 */
export const UIIconSelector: React.FC<UIIconSelectorProps> = ({
    currentIcon,
    currentUiIcon,
    onSelect,
    onSelectDual,
    className = ''
}) => {
    const [selectedGroup, setSelectedGroup] = useState<keyof typeof ICON_GROUPS>('daily');
    const currentTheme = uiIconService.getCurrentTheme();
    
    // 解析当前图标
    const { isUIIcon: currentIsUIIcon, value: currentIconType } = uiIconService.parseIconString(currentIcon);
    const { isUIIcon: currentUiIsUIIcon, value: currentUiIconType } = currentUiIcon 
        ? uiIconService.parseIconString(currentUiIcon)
        : { isUIIcon: false, value: '' };
    
    // 获取当前选中的图标类型（根据当前主题）
    const currentSelectedIconType = currentTheme === 'default'
        ? (currentIsUIIcon ? currentIconType : null)
        : (currentUiIsUIIcon ? currentUiIconType : null);
    
    // 按分组组织图标
    const groupedIcons = useMemo(() => {
        return Object.entries(ICON_GROUPS).map(([key, group]) => ({
            key: key as keyof typeof ICON_GROUPS,
            name: group.name,
            icons: group.icons
        }));
    }, []);
    
    // 处理图标选择
    const handleIconSelect = (iconType: UIIconType | null) => {
        if (iconType === null) {
            // 清空 UI 图标
            if (onSelectDual) {
                onSelectDual(currentIcon, '');
            } else {
                onSelect('');
            }
            return;
        }
        
        const uiIconString = `ui:${iconType}`;
        
        // 如果提供了新接口，使用新接口
        if (onSelectDual) {
            // 获取对应的 emoji（如果有映射的话）
            const emoji = uiIconService.convertUIIconToEmoji(uiIconString);
            onSelectDual(emoji, uiIconString);
        } else {
            // 兼容旧接口
            onSelect(uiIconString);
        }
    };
    
    return (
        <div className={`space-y-4 ${className}`}>
            {/* 分组标签 */}
            <div className="grid grid-cols-5 gap-2">
                {groupedIcons.map(group => (
                    <button
                        key={group.key}
                        onClick={() => setSelectedGroup(group.key)}
                        className={`
                            px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                            ${selectedGroup === group.key
                                ? 'btn-template-filled'
                                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                            }
                        `}
                    >
                        {group.name}
                    </button>
                ))}
            </div>
            
            {/* 图标网格 */}
            <div 
                className="grid gap-2 max-h-80 overflow-y-auto p-2 bg-stone-50 rounded-xl"
                style={{ 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(48px, 1fr))'
                }}
            >
                {/* 为空选项 */}
                <button
                    onClick={() => handleIconSelect(null)}
                    className={`
                        relative aspect-square rounded-lg transition-all
                        flex items-center justify-center border-2 border-dashed
                        ${!currentSelectedIconType
                            ? 'btn-template-filled shadow-md border-transparent'
                            : 'bg-white hover:bg-stone-100 hover:shadow-sm border-stone-300'
                        }
                    `}
                    title="清空 UI 图标"
                >
                    <span className="text-2xl text-stone-400 leading-none flex items-center justify-center">∅</span>
                    
                    {/* 选中标记 */}
                    {!currentSelectedIconType && (
                        <div 
                            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-lg"
                            style={{ backgroundColor: 'var(--accent-color)' }}
                        >
                            <Check size={12} className="text-white" />
                        </div>
                    )}
                </button>
                
                {ICON_GROUPS[selectedGroup].icons.map((iconType) => {
                    const { primary, fallback } = uiIconService.getIconPathWithFallback(iconType);
                    const isSelected = currentSelectedIconType === iconType;
                    const label = uiIconService.getIconLabel(iconType);
                    
                    return (
                        <button
                            key={iconType}
                            onClick={() => handleIconSelect(iconType)}
                            className={`
                                relative aspect-square rounded-lg transition-all
                                flex items-center justify-center p-2
                                ${isSelected
                                    ? 'btn-template-filled shadow-md'
                                    : 'bg-white hover:bg-stone-100 hover:shadow-sm'
                                }
                            `}
                            title={label}
                        >
                            <img
                                src={primary}
                                alt={label}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                    if (e.currentTarget.src === primary) {
                                        e.currentTarget.src = fallback;
                                    }
                                }}
                            />
                            
                            {/* 选中标记 */}
                            {isSelected && (
                                <div 
                                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-lg"
                                    style={{ backgroundColor: 'var(--accent-color)' }}
                                >
                                    <Check size={12} className="text-white" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
            
            {/* 提示信息 */}
            <div className="text-xs text-stone-400 text-center">
                共 {ICON_GROUPS[selectedGroup].icons.length + 1} 个图标（含空选项）
            </div>
        </div>
    );
};

/**
 * 简化版 UI 图标选择器（单行显示）
 */
export const UIIconSelectorCompact: React.FC<UIIconSelectorProps> = ({
    currentIcon,
    currentUiIcon,
    onSelect,
    onSelectDual,
    className = ''
}) => {
    const currentTheme = uiIconService.getCurrentTheme();
    
    // 解析当前图标
    const { isUIIcon: currentIsUIIcon, value: currentIconType } = uiIconService.parseIconString(currentIcon);
    const { isUIIcon: currentUiIsUIIcon, value: currentUiIconType } = currentUiIcon 
        ? uiIconService.parseIconString(currentUiIcon)
        : { isUIIcon: false, value: '' };
    
    // 获取当前选中的图标类型（根据当前主题）
    const currentSelectedIconType = currentTheme === 'default'
        ? (currentIsUIIcon ? currentIconType : null)
        : (currentUiIsUIIcon ? currentUiIconType : null);
    
    // 获取所有图标
    const allIcons = useMemo(() => {
        return uiIconService.getAllIcons();
    }, []);
    
    const handleIconSelect = (iconType: UIIconType | null) => {
        if (iconType === null) {
            // 清空 UI 图标
            if (onSelectDual) {
                onSelectDual(currentIcon, '');
            } else {
                onSelect('');
            }
            return;
        }
        
        const uiIconString = `ui:${iconType}`;
        
        // 如果提供了新接口，使用新接口
        if (onSelectDual) {
            // 获取对应的 emoji（如果有映射的话）
            const emoji = uiIconService.convertUIIconToEmoji(uiIconString);
            onSelectDual(emoji, uiIconString);
        } else {
            // 兼容旧接口
            onSelect(uiIconString);
        }
    };
    
    return (
        <div className={`space-y-2 ${className}`}>
            <div 
                className="grid gap-2 max-h-60 overflow-y-auto p-2 bg-stone-50 rounded-xl"
                style={{ 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))'
                }}
            >
                {/* 为空选项 */}
                <button
                    onClick={() => handleIconSelect(null)}
                    className={`
                        relative aspect-square rounded-lg transition-all
                        flex items-center justify-center border-2 border-dashed
                        ${!currentSelectedIconType
                            ? 'btn-template-filled shadow-md border-transparent'
                            : 'bg-white hover:bg-stone-100 border-stone-300'
                        }
                    `}
                    title="清空 UI 图标"
                >
                    <span className="text-xl text-stone-400 leading-none flex items-center justify-center">∅</span>
                    
                    {!currentSelectedIconType && (
                        <div 
                            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: 'var(--accent-color)' }}
                        >
                            <Check size={10} className="text-white" />
                        </div>
                    )}
                </button>
                
                {allIcons.map((iconType) => {
                    const { primary, fallback } = uiIconService.getIconPathWithFallback(iconType);
                    const isSelected = currentSelectedIconType === iconType;
                    const label = uiIconService.getIconLabel(iconType);
                    
                    return (
                        <button
                            key={iconType}
                            onClick={() => handleIconSelect(iconType)}
                            className={`
                                relative aspect-square rounded-lg transition-all
                                flex items-center justify-center p-1.5
                                ${isSelected
                                    ? 'btn-template-filled shadow-md'
                                    : 'bg-white hover:bg-stone-100'
                                }
                            `}
                            title={label}
                        >
                            <img
                                src={primary}
                                alt={label}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                    if (e.currentTarget.src === primary) {
                                        e.currentTarget.src = fallback;
                                    }
                                }}
                            />
                            
                            {isSelected && (
                                <div 
                                    className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: 'var(--accent-color)' }}
                                >
                                    <Check size={10} className="text-white" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
