/**
 * @file UIIconSelector.tsx
 * @description UI 图标选择器组件 - 允许用户从当前主题的图标集中选择图标
 */

import React, { useState, useMemo } from 'react';
import { Check } from 'lucide-react';
import { uiIconService, UIIconType, ICON_GROUPS } from '../services/uiIconService';

interface UIIconSelectorProps {
    currentIcon: string;              // 当前图标（可能是 Emoji 或 "ui:iconType"）
    onSelect: (iconString: string) => void;  // 选择回调
    className?: string;
}

/**
 * UI 图标选择器组件
 * 
 * 使用示例：
 * ```tsx
 * <UIIconSelector 
 *   currentIcon={activity.icon}
 *   onSelect={(icon) => setActivity({ ...activity, icon })}
 * />
 * ```
 */
export const UIIconSelector: React.FC<UIIconSelectorProps> = ({
    currentIcon,
    onSelect,
    className = ''
}) => {
    const [selectedGroup, setSelectedGroup] = useState<keyof typeof ICON_GROUPS>('daily');
    const currentTheme = uiIconService.getCurrentTheme();
    
    // 解析当前图标
    const { isUIIcon, value: currentIconType } = uiIconService.parseIconString(currentIcon);
    
    // 获取当前选中的图标类型
    const currentSelectedIconType = isUIIcon ? currentIconType : null;
    
    // 按分组组织图标
    const groupedIcons = useMemo(() => {
        return Object.entries(ICON_GROUPS).map(([key, group]) => ({
            key: key as keyof typeof ICON_GROUPS,
            name: group.name,
            icons: group.icons
        }));
    }, []);
    
    // 处理图标选择
    const handleIconSelect = (iconType: UIIconType) => {
        const iconString = `ui:${iconType}`;
        onSelect(iconString);
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
                                ? 'bg-stone-900 text-white'
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
                                    ? 'bg-white ring-2 ring-stone-400 shadow-md'
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
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-stone-800 rounded-full flex items-center justify-center shadow-lg">
                                    <Check size={12} className="text-white" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
            
            {/* 提示信息 */}
            <div className="text-xs text-stone-400 text-center">
                共 {ICON_GROUPS[selectedGroup].icons.length} 个图标
            </div>
        </div>
    );
};

/**
 * 简化版 UI 图标选择器（单行显示）
 */
export const UIIconSelectorCompact: React.FC<UIIconSelectorProps> = ({
    currentIcon,
    onSelect,
    className = ''
}) => {
    const currentTheme = uiIconService.getCurrentTheme();
    const { isUIIcon, value: currentIconType } = uiIconService.parseIconString(currentIcon);
    const currentSelectedIconType = isUIIcon ? currentIconType : null;
    
    // 获取所有图标
    const allIcons = useMemo(() => {
        return uiIconService.getAllIcons();
    }, []);
    
    const handleIconSelect = (iconType: UIIconType) => {
        const iconString = `ui:${iconType}`;
        onSelect(iconString);
    };
    
    return (
        <div className={`space-y-2 ${className}`}>
            <div 
                className="grid gap-2 max-h-60 overflow-y-auto p-2 bg-stone-50 rounded-xl"
                style={{ 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))'
                }}
            >
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
                                    ? 'bg-white ring-2 ring-stone-400 shadow-md'
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
                                <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-stone-800 rounded-full flex items-center justify-center">
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
