/**
 * @file CheckItemAssociation.tsx
 * @description 日课关联选择器组件 - 用于选择手动日课
 */
import React, { useMemo } from 'react';
import { CheckTemplate } from '../types';
import { IconRenderer } from './IconRenderer';

interface CheckItemAssociationProps {
  checkTemplates: CheckTemplate[];
  selectedCheckItemId?: string;
  onChange: (checkItemId: string | undefined) => void;
}

export const CheckItemAssociation: React.FC<CheckItemAssociationProps> = ({
  checkTemplates,
  selectedCheckItemId,
  onChange
}) => {
  // 筛选出手动日课（排除自动日课）
  const manualCheckItems = useMemo(() => {
    const items: Array<{ 
      id: string; 
      content: string; 
      category: string; 
      icon?: string; 
      uiIcon?: string;
      templateId: string;
    }> = [];
    
    checkTemplates
      .filter(template => template.enabled && template.isDaily)
      .forEach(template => {
        template.items
          .filter(item => item.type !== 'auto') // 只保留手动日课
          .forEach(item => {
            items.push({
              id: item.id,
              content: item.content,
              category: template.title,
              icon: item.icon,
              uiIcon: item.uiIcon,
              templateId: template.id
            });
          });
      });
    
    return items;
  }, [checkTemplates]);

  // 按模板分组
  const groupedItems = useMemo(() => {
    const groups: { [templateId: string]: { 
      title: string; 
      items: typeof manualCheckItems 
    } } = {};
    
    manualCheckItems.forEach(item => {
      if (!groups[item.templateId]) {
        groups[item.templateId] = {
          title: item.category,
          items: []
        };
      }
      groups[item.templateId].items.push(item);
    });
    
    return Object.values(groups);
  }, [manualCheckItems]);

  if (manualCheckItems.length === 0) {
    return (
      <div className="text-xs sm:text-sm text-stone-400 py-6 text-center border border-stone-200 rounded-lg">
        暂无可用的手动日课
        <p className="text-[10px] text-stone-400 mt-1">
          请在设置中添加日课模板
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groupedItems.map((group, groupIndex) => (
        <div key={groupIndex}>
          {/* 分组标题 */}
          <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2 px-1">
            {group.title}
          </div>
          
          {/* 日课列表 */}
          <div className="space-y-1.5">
            {group.items.map(item => (
              <button
                key={item.id}
                onClick={() => onChange(item.id === selectedCheckItemId ? undefined : item.id)}
                className={`w-full text-left p-2.5 rounded-lg transition-all ${
                  selectedCheckItemId === item.id
                    ? 'bg-white text-stone-800 shadow-sm'
                    : 'bg-white hover:bg-stone-50 text-stone-700 border border-stone-100'
                }`}
                style={selectedCheckItemId === item.id ? {
                  border: '1.5px solid var(--accent-color)',
                  backgroundColor: 'color-mix(in srgb, var(--accent-color) 5%, white)'
                } : undefined}
              >
                <div className="flex items-center gap-2.5">
                  {(item.icon || item.uiIcon) && (
                    <div className="flex-shrink-0">
                      <IconRenderer 
                        icon={item.icon || ''}
                        uiIcon={item.uiIcon}
                        size={16}
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{item.content}</div>
                  </div>
                  
                  {/* 选中指示器 */}
                  {selectedCheckItemId === item.id && (
                    <div 
                      className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: 'var(--accent-color)' }}
                    >
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
