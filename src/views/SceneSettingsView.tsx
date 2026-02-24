/**
 * @file SceneSettingsView.tsx
 * @description 场景设置页面 - 管理时间段和快捷方式
 */
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Edit2, Palette, Clock, RotateCcw, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import { TimeSlot, SceneCardData, SceneCardType, Category, TodoItem, TodoCategory, CheckTemplate } from '../types';
import { CustomSelect } from '../components/CustomSelect';
import { UIIconSelectorCompact } from '../components/UIIconSelector';
import { IconRenderer } from '../components/IconRenderer';
import { TagAssociation } from '../components/TagAssociation';
import { TodoAssociation } from '../components/TodoAssociation';
import { CheckItemAssociation } from '../components/CheckItemAssociation';
import { TagMultipleAssociation } from '../components/TagMultipleAssociation';
import { ConfirmModal } from '../components/ConfirmModal';
import { uiIconService } from '../services/uiIconService';
import { useData } from '../contexts/DataContext';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { useReview } from '../contexts/ReviewContext';
import { useToast } from '../contexts/ToastContext';
import { DEFAULT_SCENE_PRESETS } from '../constants/scenePresets';
import { COLOR_OPTIONS } from '../constants';

interface SceneSettingsViewProps {
  onBack: () => void;
}

export const SceneSettingsView: React.FC<SceneSettingsViewProps> = ({ onBack }) => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [isEditingSlot, setIsEditingSlot] = useState(false);
  const [isEditingCard, setIsEditingCard] = useState(false);
  const [editingSlot, setEditingSlot] = useState<Partial<TimeSlot> | null>(null);
  const [editingCard, setEditingCard] = useState<Partial<SceneCardData> | null>(null);
  
  // 确认模态框状态
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
    type: 'warning'
  });

  // 获取数据
  const { todos, todoCategories } = useData();
  const { categories } = useCategoryScope();
  const { checkTemplates } = useReview();
  const { addToast } = useToast();
  const isCustomIconEnabled = uiIconService.isCustomTheme();

  // 加载数据
  useEffect(() => {
    const saved = localStorage.getItem('sceneTimeSlots');
    if (saved) {
      setTimeSlots(JSON.parse(saved));
    }
  }, []);

  // 保存数据
  const saveTimeSlots = (slots: TimeSlot[]) => {
    setTimeSlots(slots);
    localStorage.setItem('sceneTimeSlots', JSON.stringify(slots));
  };

  // 获取卡片关联信息的描述
  const getCardAssociationText = (card: SceneCardData): string | null => {
    switch (card.type) {
      case 'timer':
        if (card.action.activityId && card.action.categoryId) {
          const category = categories.find(c => c.id === card.action.categoryId);
          const activity = category?.activities.find(a => a.id === card.action.activityId);
          if (activity && category) {
            return `关联：${category.name} - ${activity.name}`;
          }
        }
        return '关联：未设置';
      
      case 'todo':
        if (card.action.todoId) {
          const todo = todos.find(t => t.id === card.action.todoId);
          if (todo) {
            return `关联：${todo.title}`;
          }
        }
        return '关联：未设置';
      
      case 'checklist':
        if (card.action.checkItemId) {
          // 查找日课项
          for (const template of checkTemplates) {
            const item = template.items.find(i => i.id === card.action.checkItemId);
            if (item) {
              return `关联：${template.title} - ${item.content}`;
            }
          }
        }
        return '关联：未设置';
      
      case 'navigation':
        if (card.action.targetView) {
          const navigationLabels: Record<string, string> = {
            'daily-review-today': '今日回顾',
            'daily-review-yesterday': '昨日回顾',
            'weekly-review': '本周回顾',
            'stats-today': '今日统计',
            'stats-week': '本周统计',
          };
          return `跳转：${navigationLabels[card.action.targetView] || card.action.targetView}`;
        }
        return '跳转：未设置';
      
      case 'stats':
        if (card.filterActivityIds && card.filterActivityIds.length > 0) {
          // 获取所有选中的活动名称
          const activityNames: string[] = [];
          for (const activityId of card.filterActivityIds) {
            for (const category of categories) {
              const activity = category.activities.find(a => a.id === activityId);
              if (activity) {
                activityNames.push(activity.name);
                break;
              }
            }
          }
          if (activityNames.length > 0) {
            return `统计：${activityNames.join('、')}`;
          }
        }
        return '统计：未设置';
      
      case 'text':
        return null; // 文本卡片不需要显示关联信息
      
      default:
        return null;
    }
  };

  // 检测时间段是否重叠
  const checkTimeOverlap = (slot1Start: string, slot1End: string, slot2Start: string, slot2End: string): boolean => {
    // 将时间字符串转换为分钟数（从 00:00 开始）
    const timeToMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    let start1 = timeToMinutes(slot1Start);
    let end1 = timeToMinutes(slot1End);
    let start2 = timeToMinutes(slot2Start);
    let end2 = timeToMinutes(slot2End);

    // 处理跨天的情况（如 22:00 - 06:00）
    // 如果结束时间小于开始时间，说明跨天了，结束时间加上 24 小时
    if (end1 < start1) {
      end1 += 24 * 60;
    }
    if (end2 < start2) {
      end2 += 24 * 60;
    }

    // 对于跨天的时间段，需要检查两种情况
    // 情况1：slot1 跨天
    if (end1 > 24 * 60) {
      // 将 slot1 分成两段：[start1, 24*60] 和 [0, end1-24*60]
      const slot1Part1Start = start1;
      const slot1Part1End = 24 * 60;
      const slot1Part2Start = 0;
      const slot1Part2End = end1 - 24 * 60;

      // 检查 slot2 是否与任一段重叠
      if (end2 > 24 * 60) {
        // slot2 也跨天
        const slot2Part1Start = start2;
        const slot2Part1End = 24 * 60;
        const slot2Part2Start = 0;
        const slot2Part2End = end2 - 24 * 60;

        // 检查所有可能的重叠组合
        if (
          (slot1Part1Start < slot2Part1End && slot1Part1End > slot2Part1Start) ||
          (slot1Part1Start < slot2Part2End && slot1Part1End > slot2Part2Start) ||
          (slot1Part2Start < slot2Part1End && slot1Part2End > slot2Part1Start) ||
          (slot1Part2Start < slot2Part2End && slot1Part2End > slot2Part2Start)
        ) {
          return true;
        }
      } else {
        // slot2 不跨天
        if (
          (slot1Part1Start < end2 && slot1Part1End > start2) ||
          (slot1Part2Start < end2 && slot1Part2End > start2)
        ) {
          return true;
        }
      }
    } else if (end2 > 24 * 60) {
      // 只有 slot2 跨天
      const slot2Part1Start = start2;
      const slot2Part1End = 24 * 60;
      const slot2Part2Start = 0;
      const slot2Part2End = end2 - 24 * 60;

      if (
        (start1 < slot2Part1End && end1 > slot2Part1Start) ||
        (start1 < slot2Part2End && end1 > slot2Part2Start)
      ) {
        return true;
      }
    } else {
      // 两个时间段都不跨天，使用标准重叠检测
      if (start1 < end2 && end1 > start2) {
        return true;
      }
    }

    return false;
  };

  // 添加/编辑时间段
  const handleSaveSlot = () => {
    if (!editingSlot || !editingSlot.name || !editingSlot.startTime || !editingSlot.endTime) {
      addToast('error', '请填写完整信息');
      return;
    }

    // 检查时间段是否与其他时间段重叠
    const hasOverlap = timeSlots.some(slot => {
      // 跳过正在编辑的时间段本身
      if (editingSlot.id && slot.id === editingSlot.id) {
        return false;
      }
      return checkTimeOverlap(
        editingSlot.startTime!,
        editingSlot.endTime!,
        slot.startTime,
        slot.endTime
      );
    });

    if (hasOverlap) {
      addToast('error', '时间段与现有时间段重叠，请调整时间范围');
      return;
    }

    const newSlot: TimeSlot = {
      id: editingSlot.id || `slot-${Date.now()}`,
      name: editingSlot.name,
      icon: editingSlot.icon || '⏰',
      uiIcon: editingSlot.uiIcon,
      displayTitle: editingSlot.displayTitle,
      startTime: editingSlot.startTime,
      endTime: editingSlot.endTime,
      cards: editingSlot.cards || []
    };

    if (editingSlot.id) {
      // 编辑现有时间段
      saveTimeSlots(timeSlots.map(s => s.id === editingSlot.id ? newSlot : s));
    } else {
      // 添加新时间段
      saveTimeSlots([...timeSlots, newSlot]);
    }

    setIsEditingSlot(false);
    setEditingSlot(null);
    addToast('success', editingSlot.id ? '时间段已更新' : '时间段已添加');
  };

  // 删除时间段
  const handleDeleteSlot = (id: string) => {
    const slot = timeSlots.find(s => s.id === id);
    setConfirmModal({
      isOpen: true,
      title: '删除时间段',
      description: `确定删除「${slot?.name}」时间段吗？该时间段下的所有快捷方式也会被删除。`,
      type: 'danger',
      onConfirm: () => {
        saveTimeSlots(timeSlots.filter(s => s.id !== id));
        if (selectedSlotId === id) {
          setSelectedSlotId(null);
        }
        setConfirmModal({ ...confirmModal, isOpen: false });
        addToast('success', '时间段已删除');
      }
    });
  };

  // 添加/编辑快捷方式
  const handleSaveCard = () => {
    if (!selectedSlotId || !editingCard || !editingCard.title || !editingCard.type) {
      addToast('error', '请填写完整信息');
      return;
    }

    const newCard: SceneCardData = {
      id: editingCard.id || `card-${Date.now()}`,
      type: editingCard.type,
      title: editingCard.title,
      frontText: editingCard.frontText || '现在开始！',
      backText: editingCard.backText || '完成了！',
      action: editingCard.action || { type: 'none' },
      // 保存颜色字段
      ...(editingCard.color && { color: editingCard.color }),
      // 保存自动进入沉浸式计时字段（timer 和 todo 类型）
      ...((editingCard.type === 'timer' || editingCard.type === 'todo') && {
        autoEnterFocus: editingCard.autoEnterFocus
      }),
      // 保留统计卡片的特有字段
      ...(editingCard.type === 'stats' && {
        filterActivityIds: editingCard.filterActivityIds,
        enableGoal: editingCard.enableGoal,
        goalValue: editingCard.goalValue,
        goalType: editingCard.goalType
      }),
      // 保留待办卡片的进度字段
      ...(editingCard.type === 'todo' && {
        progress: editingCard.progress,
        totalAmount: editingCard.totalAmount
      }),
      // 保留文字卡片的内容字段
      ...(editingCard.type === 'text' && {
        content: editingCard.content
      }),
      // 保留日课卡片的完成状态
      ...(editingCard.type === 'checklist' && {
        isCompleted: editingCard.isCompleted
      })
    };

    const updatedSlots = timeSlots.map(slot => {
      if (slot.id === selectedSlotId) {
        if (editingCard.id) {
          // 编辑现有卡片
          return {
            ...slot,
            cards: slot.cards.map(c => c.id === editingCard.id ? newCard : c)
          };
        } else {
          // 添加新卡片
          return {
            ...slot,
            cards: [...slot.cards, newCard]
          };
        }
      }
      return slot;
    });

    saveTimeSlots(updatedSlots);
    setIsEditingCard(false);
    setEditingCard(null);
    addToast('success', editingCard.id ? '快捷方式已更新' : '快捷方式已添加');
  };

  // 删除快捷方式
  const handleDeleteCard = (cardId: string) => {
    if (!selectedSlotId) return;
    
    const slot = timeSlots.find(s => s.id === selectedSlotId);
    const card = slot?.cards.find(c => c.id === cardId);
    
    setConfirmModal({
      isOpen: true,
      title: '删除快捷方式',
      description: `确定删除「${card?.title}」快捷方式吗？`,
      type: 'danger',
      onConfirm: () => {
        const updatedSlots = timeSlots.map(slot => {
          if (slot.id === selectedSlotId) {
            return {
              ...slot,
              cards: slot.cards.filter(c => c.id !== cardId)
            };
          }
          return slot;
        });

        saveTimeSlots(updatedSlots);
        setConfirmModal({ ...confirmModal, isOpen: false });
        addToast('success', '快捷方式已删除');
      }
    });
  };

  // 移动快捷方式
  const handleMoveCard = (cardIndex: number, direction: 'up' | 'down') => {
    if (!selectedSlotId) return;

    const updatedSlots = timeSlots.map(slot => {
      if (slot.id === selectedSlotId) {
        const newCards = [...slot.cards];
        
        if (direction === 'up' && cardIndex > 0) {
          [newCards[cardIndex], newCards[cardIndex - 1]] = [newCards[cardIndex - 1], newCards[cardIndex]];
        } else if (direction === 'down' && cardIndex < newCards.length - 1) {
          [newCards[cardIndex], newCards[cardIndex + 1]] = [newCards[cardIndex + 1], newCards[cardIndex]];
        }
        
        return {
          ...slot,
          cards: newCards
        };
      }
      return slot;
    });

    saveTimeSlots(updatedSlots);
  };

  // 重设为预设场景
  const handleResetToPresets = () => {
    setConfirmModal({
      isOpen: true,
      title: '重设为预设场景',
      description: '确定要重设为预设场景吗？\n\n这将清除所有自定义配置，恢复为默认的时间段和快捷方式。此操作不可撤销。',
      type: 'warning',
      onConfirm: () => {
        saveTimeSlots(DEFAULT_SCENE_PRESETS);
        setSelectedSlotId(null);
        setConfirmModal({ ...confirmModal, isOpen: false });
        addToast('success', '已重设为预设场景');
      }
    });
  };

  const selectedSlot = timeSlots.find(s => s.id === selectedSlotId);

  return (
    <div className="h-full flex flex-col bg-[#faf9f6] pt-[env(safe-area-inset-top)]">
      {/* 顶部导航 */}
      <div className="h-14 flex items-center justify-between px-5 bg-[#fdfbf7] border-b border-stone-100 sticky top-0 z-20">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-stone-400 hover:text-stone-600 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-serif font-bold text-lg text-stone-800">场景设置</h1>
        
        {/* 重设为预设场景按钮 */}
        <button
          onClick={handleResetToPresets}
          className="p-2 -mr-2 text-stone-400 hover:text-stone-600 transition-colors"
          title="重设为预设场景"
        >
          <RotateCcw size={20} />
        </button>
      </div>

      {/* 主体内容 - 单列布局 */}
      <div className="flex-1 overflow-y-auto">
        {/* 时间段列表 */}
        <div className="p-3 sm:p-4 border-b-4 border-stone-200 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-stone-700">时间段管理</h2>
            <button
              onClick={() => {
                setEditingSlot({});
                setIsEditingSlot(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors"
            >
              <Plus size={14} />
              添加
            </button>
          </div>

          <div className="space-y-2">
            {timeSlots.map(slot => (
              <div
                key={slot.id}
                className={`p-3 rounded-lg border-2 transition-all ${
                  selectedSlotId === slot.id
                    ? 'border-stone-800 bg-stone-50'
                    : 'border-stone-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSelectedSlotId(slot.id === selectedSlotId ? null : slot.id)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                  >
                    {/* 使用 IconRenderer 统一处理图标渲染 */}
                    <div className="flex-shrink-0">
                      <IconRenderer 
                        icon={slot.icon || '⏰'}
                        uiIcon={slot.uiIcon}
                        size={18}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-stone-800 text-sm truncate">{slot.name}</div>
                      <div className="text-xs text-stone-500 font-mono">
                        {slot.startTime} - {slot.endTime} · {slot.cards.length} 个卡片
                      </div>
                    </div>
                  </button>
                  
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSlot(slot);
                        setIsEditingSlot(true);
                      }}
                      className="p-1.5 hover:bg-stone-200 rounded"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSlot(slot.id);
                      }}
                      className="p-1.5 hover:bg-red-100 text-red-600 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 快捷方式列表 */}
        {selectedSlot ? (
          <div className="p-3 sm:p-4 bg-[#faf9f6]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-stone-700">
                {selectedSlot.name} - 快捷方式
              </h2>
              <button
                onClick={() => {
                  setEditingCard({ type: 'timer' });
                  setIsEditingCard(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors"
              >
                <Plus size={14} />
                添加
              </button>
            </div>

            <div className="space-y-2">
              {selectedSlot.cards.map((card, cardIndex) => {
                const associationText = getCardAssociationText(card);
                return (
                  <div
                    key={card.id}
                    className="p-3 bg-white rounded-lg border border-stone-200"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-stone-100 text-stone-600 flex-shrink-0">
                            {card.type}
                          </span>
                          <h3 className="font-bold text-stone-800 text-sm truncate">{card.title}</h3>
                        </div>
                        {associationText && (
                          <p className="text-xs text-stone-500 mb-0.5 line-clamp-1">{associationText}</p>
                        )}
                        {card.frontText && (
                          <p className="text-xs text-stone-600 mb-0.5 line-clamp-1">正面：{card.frontText}</p>
                        )}
                        {card.backText && (
                          <p className="text-xs text-stone-600 line-clamp-1">反面：{card.backText}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleMoveCard(cardIndex, 'up')}
                          disabled={cardIndex === 0}
                          className="p-1.5 hover:bg-stone-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                          title="上移"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          onClick={() => handleMoveCard(cardIndex, 'down')}
                          disabled={cardIndex === selectedSlot.cards.length - 1}
                          className="p-1.5 hover:bg-stone-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                          title="下移"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingCard(card);
                            setIsEditingCard(true);
                          }}
                          className="p-1.5 hover:bg-stone-100 rounded"
                          title="编辑"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteCard(card.id!)}
                          className="p-1.5 hover:bg-red-100 text-red-600 rounded"
                          title="删除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-stone-400 text-sm">
            请选择一个时间段来管理快捷方式
          </div>
        )}
      </div>

      {/* 编辑时间段弹窗 */}
      {isEditingSlot && (
        <SlotEditModal
          slot={editingSlot}
          onSave={handleSaveSlot}
          onCancel={() => {
            setIsEditingSlot(false);
            setEditingSlot(null);
          }}
          onChange={setEditingSlot}
          isCustomIconEnabled={isCustomIconEnabled}
        />
      )}

      {/* 编辑快捷方式弹窗 */}
      {isEditingCard && (
        <CardEditModal
          card={editingCard}
          onSave={handleSaveCard}
          onCancel={() => {
            setIsEditingCard(false);
            setEditingCard(null);
          }}
          onChange={setEditingCard}
          categories={categories}
          todos={todos}
          todoCategories={todoCategories}
          checkTemplates={checkTemplates}
        />
      )}

      {/* 确认模态框 */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        description={confirmModal.description}
        type={confirmModal.type}
        confirmText="确认"
        cancelText="取消"
      />
    </div>
  );
};

// 时间段编辑弹窗
const SlotEditModal: React.FC<{
  slot: Partial<TimeSlot> | null;
  onSave: () => void;
  onCancel: () => void;
  onChange: (slot: Partial<TimeSlot>) => void;
  isCustomIconEnabled: boolean;
}> = ({ slot, onSave, onCancel, onChange, isCustomIconEnabled }) => {
  const [showIconSelector, setShowIconSelector] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg sm:text-xl font-bold mb-4">
          {slot?.id ? '编辑时间段' : '添加时间段'}
        </h2>

        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-stone-700 mb-1">
              名称
            </label>
            <input
              type="text"
              value={slot?.name || ''}
              onChange={(e) => onChange({ ...slot, name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-800"
              placeholder="例如：早晨"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-stone-700 mb-1">
              显示标题（可选）
            </label>
            <input
              type="text"
              value={slot?.displayTitle || ''}
              onChange={(e) => onChange({ ...slot, displayTitle: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-800"
              placeholder="留空则显示时间段"
            />
            <p className="text-[10px] sm:text-xs text-stone-500 mt-1">
              如果填写，场景页面顶部将显示此标题
            </p>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-stone-700 mb-1">
              图标
            </label>
            
            <div className="flex items-center gap-2">
              {/* Emoji 输入框 */}
              <input
                type="text"
                value={slot?.icon || ''}
                onChange={(e) => onChange({ ...slot, icon: e.target.value })}
                className="flex-1 px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-800"
                placeholder="🌅"
              />
              
              {/* UI Icon 选择按钮 */}
              {isCustomIconEnabled && (
                <button
                  onClick={() => setShowIconSelector(!showIconSelector)}
                  className={`w-9 h-9 rounded-lg transition-all flex items-center justify-center flex-shrink-0 ${
                    showIconSelector
                      ? 'bg-[var(--accent-color)]/10'
                      : 'border border-stone-200 hover:border-stone-300 bg-white'
                  }`}
                  style={showIconSelector ? { border: '0.5px solid var(--accent-color)' } : undefined}
                  title="选择 UI 图标"
                >
                  {slot?.uiIcon ? (
                    <IconRenderer 
                      icon={slot.icon || '⏰'} 
                      uiIcon={slot.uiIcon}
                      size={16}
                    />
                  ) : (
                    <Palette size={16} className="text-stone-400" />
                  )}
                </button>
              )}
            </div>
            
            <p className="text-[10px] sm:text-xs text-stone-500 mt-1">
              输入 Emoji 图标{isCustomIconEnabled ? '，或点击右侧按钮选择 UI 图标' : ''}
            </p>
            
            {/* UI Icon 选择器（展开时显示） */}
            {isCustomIconEnabled && showIconSelector && (
              <div className="mt-2 p-3 bg-stone-50/50 rounded-xl border border-stone-100">
                <UIIconSelectorCompact
                  currentIcon={slot?.icon || ''}
                  currentUiIcon={slot?.uiIcon}
                  onSelectDual={(emoji, uiIcon) => {
                    // 只更新 uiIcon 字段，不修改 icon（emoji）
                    onChange({ 
                      ...slot, 
                      uiIcon: uiIcon 
                    });
                    // 选择后自动关闭选择器
                    setShowIconSelector(false);
                  }}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-stone-700 mb-1">
                开始时间
              </label>
              <input
                type="text"
                value={slot?.startTime || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  if (value.length === 4) {
                    const formatted = `${value.slice(0, 2)}:${value.slice(2, 4)}`;
                    onChange({ ...slot, startTime: formatted });
                  } else {
                    onChange({ ...slot, startTime: value });
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-800 font-mono"
                placeholder="0600"
                maxLength={4}
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-stone-700 mb-1">
                结束时间
              </label>
              <input
                type="text"
                value={slot?.endTime || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  if (value.length === 4) {
                    const formatted = `${value.slice(0, 2)}:${value.slice(2, 4)}`;
                    onChange({ ...slot, endTime: formatted });
                  } else {
                    onChange({ ...slot, endTime: value });
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-800 font-mono"
                placeholder="0900"
                maxLength={4}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-sm border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={onSave}
            className="flex-1 px-4 py-2 text-sm bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

// 快捷方式编辑弹窗
const CardEditModal: React.FC<{
  card: Partial<SceneCardData> | null;
  onSave: () => void;
  onCancel: () => void;
  onChange: (card: Partial<SceneCardData>) => void;
  categories: Category[];
  todos: TodoItem[];
  todoCategories: TodoCategory[];
  checkTemplates: CheckTemplate[];
}> = ({ card, onSave, onCancel, onChange, categories, todos, todoCategories, checkTemplates }) => {
  const cardTypes: { value: SceneCardType; label: string }[] = [
    { value: 'timer', label: '计时' },
    { value: 'todo', label: '待办' },
    { value: 'checklist', label: '日课' },
    { value: 'navigation', label: '导航' },
    { value: 'text', label: '文字' },
    { value: 'stats', label: '统计' }
  ];

  // 活动选择状态
  const [selectedActivityId, setSelectedActivityId] = useState<string | undefined>(
    card?.action?.activityId
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(
    card?.action?.categoryId
  );

  // 待办选择状态
  const [selectedTodoId, setSelectedTodoId] = useState<string | undefined>(
    card?.action?.todoId
  );

  // 日课选择状态
  const [selectedCheckItemId, setSelectedCheckItemId] = useState<string | undefined>(
    card?.action?.checkItemId
  );

  // 当卡片类型改变时，重置选择
  useEffect(() => {
    if (card?.type === 'timer') {
      setSelectedActivityId(card?.action?.activityId);
      setSelectedCategoryId(card?.action?.categoryId);
    } else if (card?.type === 'todo') {
      setSelectedTodoId(card?.action?.todoId);
    } else if (card?.type === 'checklist') {
      setSelectedCheckItemId(card?.action?.checkItemId);
    }
  }, [card?.type]);

  // 处理活动选择变化
  const handleActivityChange = (activityId: string | undefined, categoryId: string | undefined) => {
    setSelectedActivityId(activityId);
    setSelectedCategoryId(categoryId);
    
    if (activityId && categoryId) {
      onChange({
        ...card,
        action: {
          type: 'startTimer',
          activityId,
          categoryId
        }
      });
    }
  };

  // 处理待办选择变化
  const handleTodoChange = (todoId: string | undefined) => {
    setSelectedTodoId(todoId);
    
    if (todoId) {
      onChange({
        ...card,
        action: {
          type: 'startTodo',
          todoId
        }
      });
    }
  };

  // 处理日课选择变化
  const handleCheckItemChange = (checkItemId: string | undefined) => {
    setSelectedCheckItemId(checkItemId);
    
    if (checkItemId) {
      onChange({
        ...card,
        action: {
          type: 'toggleCheck',
          checkItemId
        }
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg sm:text-xl font-bold mb-4">
          {card?.id ? '编辑快捷方式' : '添加快捷方式'}
        </h2>

        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-stone-700 mb-1">
              类型
            </label>
            <CustomSelect
              value={card?.type || 'timer'}
              onChange={(value) => onChange({ ...card, type: value as SceneCardType })}
              options={cardTypes.map(type => ({
                value: type.value,
                label: type.label,
                icon: null
              }))}
              placeholder="选择类型"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-stone-700 mb-1">
              标题
            </label>
            <input
              type="text"
              value={card?.title || ''}
              onChange={(e) => onChange({ ...card, title: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-800"
              placeholder="例如：洗漱"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-stone-700 mb-1">
              正面文字（可选）
            </label>
            <input
              type="text"
              value={card?.frontText || ''}
              onChange={(e) => onChange({ ...card, frontText: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-800"
              placeholder="现在开始！"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-stone-700 mb-1">
              反面文字（可选）
            </label>
            <input
              type="text"
              value={card?.backText || ''}
              onChange={(e) => onChange({ ...card, backText: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-800"
              placeholder="完成了！"
            />
          </div>

          {/* 颜色选择器 */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-stone-700 mb-1">
              卡片颜色（可选）
            </label>
            <div className="flex gap-2 flex-wrap">
              {/* 不选择选项 */}
              <button
                onClick={() => onChange({ ...card, color: undefined })}
                className={`w-8 h-8 rounded-full border-[2px] transition-all hover:scale-110 flex items-center justify-center ${
                  !card?.color
                    ? 'border-stone-300'
                    : 'border-stone-100'
                }`}
                title="使用默认颜色"
              >
                <span className="text-xs text-stone-400">默</span>
              </button>
              
              {/* 颜色选项 */}
              {COLOR_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => onChange({ ...card, color: opt.lightHex })}
                  title={opt.label}
                  className={`w-8 h-8 rounded-full ${opt.bg} transition-all hover:scale-110 ${
                    card?.color === opt.lightHex
                      ? 'ring-[2px] ring-stone-300 ring-offset-0'
                      : ''
                  }`}
                />
              ))}
            </div>
            <p className="text-[10px] sm:text-xs text-stone-500 mt-1">
              不选择则使用卡片类型的默认颜色
            </p>
          </div>

          {/* 根据类型显示不同的关联选项 */}
          {card?.type === 'timer' && (
            <>
              <ActivitySelector
                categories={categories}
                selectedActivityId={selectedActivityId}
                selectedCategoryId={selectedCategoryId}
                onChange={handleActivityChange}
              />
              
              {/* 自动进入沉浸式计时开关 */}
              <div className="pt-3 border-t border-stone-200">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-stone-700">
                      直接跳转沉浸式计时
                    </label>
                    <p className="text-[10px] sm:text-xs text-stone-500 mt-0.5">
                      开启后点击卡片将自动进入沉浸式计时页面
                    </p>
                  </div>
                  <button
                    onClick={() => onChange({ ...card, autoEnterFocus: !card?.autoEnterFocus })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors`}
                    style={{
                      backgroundColor: card?.autoEnterFocus ? 'var(--accent-color)' : '#d6d3d1'
                    }}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        card?.autoEnterFocus ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </>
          )}

          {card?.type === 'todo' && (
            <>
              <TodoSelector
                todos={todos}
                todoCategories={todoCategories}
                selectedTodoId={selectedTodoId}
                onChange={handleTodoChange}
              />
              
              {/* 自动进入沉浸式计时开关 */}
              <div className="pt-3 border-t border-stone-200">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-stone-700">
                      直接跳转沉浸式计时
                    </label>
                    <p className="text-[10px] sm:text-xs text-stone-500 mt-0.5">
                      开启后点击卡片将自动进入沉浸式计时页面
                    </p>
                  </div>
                  <button
                    onClick={() => onChange({ ...card, autoEnterFocus: !card?.autoEnterFocus })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors`}
                    style={{
                      backgroundColor: card?.autoEnterFocus ? 'var(--accent-color)' : '#d6d3d1'
                    }}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        card?.autoEnterFocus ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </>
          )}

          {card?.type === 'checklist' && (
            <CheckItemSelector
              checkTemplates={checkTemplates}
              selectedCheckItemId={selectedCheckItemId}
              onChange={handleCheckItemChange}
            />
          )}

          {card?.type === 'navigation' && (
            <NavigationSelector
              selectedTarget={card?.action?.targetView}
              onChange={(targetView) => {
                onChange({
                  ...card,
                  action: {
                    type: 'navigate',
                    targetView
                  }
                });
              }}
            />
          )}

          {card?.type === 'text' && (
            <div className="p-3 bg-stone-50 rounded-lg text-xs sm:text-sm text-stone-600">
              提示：文字卡片将在后续版本中实现
            </div>
          )}

          {card?.type === 'stats' && (
            <StatsSelector
              categories={categories}
              selectedActivityIds={card?.filterActivityIds || []}
              enableGoal={card?.enableGoal}
              goalValue={card?.goalValue}
              goalType={card?.goalType}
              onChange={(activityIds) => {
                onChange({
                  ...card,
                  filterActivityIds: activityIds
                });
              }}
              onGoalChange={(enableGoal, goalValue, goalType) => {
                onChange({
                  ...card,
                  enableGoal,
                  goalValue,
                  goalType
                });
              }}
            />
          )}
        </div>

        <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-sm border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={onSave}
            className="flex-1 px-4 py-2 text-sm bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * ActivitySelector component - 复用自 BatchFocusRecordManageView
 */
interface ActivitySelectorProps {
  categories: Category[];
  selectedActivityId: string | undefined;
  selectedCategoryId: string | undefined;
  onChange: (activityId: string | undefined, categoryId: string | undefined) => void;
}

const ActivitySelector: React.FC<ActivitySelectorProps> = ({
  categories,
  selectedActivityId,
  selectedCategoryId,
  onChange
}) => {
  const [localCategoryId, setLocalCategoryId] = useState<string>(
    selectedCategoryId || (categories.length > 0 ? categories[0].id : '')
  );
  const [localActivityId, setLocalActivityId] = useState<string>(
    selectedActivityId || ''
  );

  // 当选择改变时，通知父组件
  useEffect(() => {
    if (localActivityId && localCategoryId) {
      onChange(localActivityId, localCategoryId);
    }
  }, [localActivityId, localCategoryId]);

  const handleCategorySelect = (categoryId: string) => {
    setLocalCategoryId(categoryId);
    // 自动选择该分类的第一个活动
    const category = categories.find(c => c.id === categoryId);
    if (category && category.activities.length > 0) {
      setLocalActivityId(category.activities[0].id);
    }
  };

  const handleActivitySelect = (activityId: string) => {
    setLocalActivityId(activityId);
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs sm:text-sm font-medium text-stone-700">
        关联标签
      </label>

      {categories.length === 0 ? (
        <div className="text-xs sm:text-sm text-stone-400 py-6 text-center border border-stone-200 rounded-lg">
          暂无可用标签
        </div>
      ) : (
        <div className="border border-stone-200 rounded-lg p-3 bg-stone-50/50">
          <TagAssociation
            categories={categories}
            selectedCategoryId={localCategoryId}
            selectedActivityId={localActivityId}
            onCategorySelect={handleCategorySelect}
            onActivitySelect={handleActivitySelect}
          />
        </div>
      )}

      {localActivityId && localCategoryId && (
        <div className="text-[10px] sm:text-xs text-stone-500 bg-stone-50 p-2 rounded-lg">
          点击此卡片将开始计时该标签
        </div>
      )}
    </div>
  );
};

/**
 * TodoSelector component - 复用自 BatchFocusRecordManageView
 */
interface TodoSelectorProps {
  todos: TodoItem[];
  todoCategories: TodoCategory[];
  selectedTodoId: string | undefined;
  onChange: (todoId: string | undefined) => void;
}

const TodoSelector: React.FC<TodoSelectorProps> = ({
  todos,
  todoCategories,
  selectedTodoId,
  onChange
}) => {
  return (
    <div className="space-y-2">
      <div className="border border-stone-200 rounded-lg p-3 bg-stone-50/50">
        <TodoAssociation
          todos={todos}
          todoCategories={todoCategories}
          linkedTodoId={selectedTodoId}
          onChange={onChange}
        />
      </div>

      {selectedTodoId && (
        <div className="text-[10px] sm:text-xs text-stone-500 bg-stone-50 p-2 rounded-lg">
          点击此卡片将开始该待办任务的计时
        </div>
      )}
    </div>
  );
};

/**
 * CheckItemSelector component - 日课选择器
 */
interface CheckItemSelectorProps {
  checkTemplates: CheckTemplate[];
  selectedCheckItemId: string | undefined;
  onChange: (checkItemId: string | undefined) => void;
}

const CheckItemSelector: React.FC<CheckItemSelectorProps> = ({
  checkTemplates,
  selectedCheckItemId,
  onChange
}) => {
  return (
    <div className="space-y-2">
      <label className="block text-xs sm:text-sm font-medium text-stone-700">
        关联日课
      </label>

      <div className="border border-stone-200 rounded-lg p-3 bg-stone-50/50 max-h-60 overflow-y-auto">
        <CheckItemAssociation
          checkTemplates={checkTemplates}
          selectedCheckItemId={selectedCheckItemId}
          onChange={onChange}
        />
      </div>

      {selectedCheckItemId && (
        <div className="text-[10px] sm:text-xs text-stone-500 bg-stone-50 p-2 rounded-lg">
          点击此卡片将切换该日课的完成状态
        </div>
      )}
    </div>
  );
};

/**
 * NavigationSelector component - 导航目标选择器
 */
interface NavigationSelectorProps {
  selectedTarget: string | undefined;
  onChange: (targetView: string | undefined) => void;
}

const NavigationSelector: React.FC<NavigationSelectorProps> = ({
  selectedTarget,
  onChange
}) => {
  const navigationOptions = [
    { value: 'daily-review-today', label: '今日回顾', description: '查看今天的日课和回顾' },
    { value: 'daily-review-yesterday', label: '昨日回顾', description: '查看昨天的日课和回顾' },
    { value: 'weekly-review', label: '本周回顾', description: '查看本周的总结和反思' },
    { value: 'stats-today', label: '今日统计', description: '查看今天的时间分布' },
    { value: 'stats-week', label: '本周统计', description: '查看本周的时间统计' },
  ];

  return (
    <div className="space-y-2">
      <label className="block text-xs sm:text-sm font-medium text-stone-700">
        跳转目标
      </label>

      <div className="border border-stone-200 rounded-lg bg-stone-50/50 max-h-60 overflow-y-auto">
        <div className="p-2 space-y-1">
          {navigationOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                selectedTarget === option.value
                  ? 'bg-white shadow-sm border-2'
                  : 'hover:bg-white/50'
              }`}
              style={
                selectedTarget === option.value
                  ? { borderColor: 'var(--accent-color)' }
                  : undefined
              }
            >
              <div className="font-medium text-sm text-stone-800">{option.label}</div>
              <div className="text-xs text-stone-500 mt-0.5">{option.description}</div>
            </button>
          ))}
        </div>
      </div>

      {selectedTarget && (
        <div className="text-[10px] sm:text-xs text-stone-500 bg-stone-50 p-2 rounded-lg">
          点击此卡片将跳转到对应页面
        </div>
      )}
    </div>
  );
};

/**
 * StatsSelector component - 统计标签选择器
 */
interface StatsSelectorProps {
  categories: Category[];
  selectedActivityIds: string[];
  enableGoal?: boolean;
  goalValue?: number;
  goalType?: 'min' | 'max';
  onChange: (activityIds: string[]) => void;
  onGoalChange?: (enableGoal: boolean, goalValue?: number, goalType?: 'min' | 'max') => void;
}

const StatsSelector: React.FC<StatsSelectorProps> = ({
  categories,
  selectedActivityIds,
  enableGoal = false,
  goalValue,
  goalType = 'min',
  onChange,
  onGoalChange
}) => {
  return (
    <div className="space-y-2">
      <label className="block text-xs sm:text-sm font-medium text-stone-700">
        统计设置
      </label>

      <div className="border border-stone-200 rounded-lg p-3 bg-stone-50/50 space-y-3">
        <TagMultipleAssociation
          categories={categories}
          selectedActivityIds={selectedActivityIds}
          onChange={onChange}
          showToggle={true}
          toggleLabel="限定标签（Activity）"
          description="仅统计选中标签的今日时长"
        />

        {/* 目标值设置 */}
        <div className="pt-3 border-t border-stone-200">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs sm:text-sm font-medium text-stone-700">
              设定目标值
            </label>
            <button
              onClick={() => onGoalChange?.(!enableGoal, goalValue, goalType)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors`}
              style={{
                backgroundColor: enableGoal ? 'var(--accent-color)' : '#d6d3d1'
              }}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  enableGoal ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {enableGoal && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={goalValue || ''}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      onGoalChange?.(enableGoal, value, goalType);
                    }}
                    className="w-full px-2 py-1.5 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-800"
                    placeholder="目标值（分钟）"
                  />
                </div>
                <CustomSelect
                  value={goalType}
                  onChange={(value) => onGoalChange?.(enableGoal, goalValue, value as 'min' | 'max')}
                  options={[
                    { value: 'min', label: '≥ 大于等于' },
                    { value: 'max', label: '≤ 小于等于' }
                  ]}
                  className="w-32"
                />
              </div>
              <p className="text-[10px] text-stone-500">
                {goalType === 'min' 
                  ? '目标：达到或超过此时长' 
                  : '目标：控制在此时长以内'}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="text-[10px] sm:text-xs text-stone-500 bg-stone-50 p-2 rounded-lg">
        此卡片将显示今日指定标签的总时长。{enableGoal ? '通过进度条展示目标完成情况。' : '正面显示当前时长，反面显示完成提示。'}
      </div>
    </div>
  );
};
