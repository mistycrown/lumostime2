/**
 * @file SceneSettingsView.tsx
 * @description 场景设置页面 - 管理时间段和快捷方式
 */
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Edit2, Palette, Clock, RotateCcw } from 'lucide-react';
import { TimeSlot, SceneCardData, SceneCardType, Category, TodoItem, TodoCategory } from '../types';
import { CustomSelect } from '../components/CustomSelect';
import { UIIconSelectorCompact } from '../components/UIIconSelector';
import { UIIcon } from '../components/UIIcon';
import { IconRenderer } from '../components/IconRenderer';
import { uiIconService } from '../services/uiIconService';
import { useData } from '../contexts/DataContext';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { useSettings } from '../contexts/SettingsContext';
import { DEFAULT_SCENE_PRESETS } from '../constants/scenePresets';

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

  // 获取数据
  const { todos, todoCategories } = useData();
  const { categories } = useCategoryScope();
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

  // 添加/编辑时间段
  const handleSaveSlot = () => {
    if (!editingSlot || !editingSlot.name || !editingSlot.startTime || !editingSlot.endTime) {
      alert('请填写完整信息');
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
  };

  // 删除时间段
  const handleDeleteSlot = (id: string) => {
    if (confirm('确定删除此时间段？')) {
      saveTimeSlots(timeSlots.filter(s => s.id !== id));
      if (selectedSlotId === id) {
        setSelectedSlotId(null);
      }
    }
  };

  // 添加/编辑快捷方式
  const handleSaveCard = () => {
    if (!selectedSlotId || !editingCard || !editingCard.title || !editingCard.type) {
      alert('请填写完整信息');
      return;
    }

    const newCard: SceneCardData = {
      id: editingCard.id || `card-${Date.now()}`,
      type: editingCard.type,
      title: editingCard.title,
      frontText: editingCard.frontText,
      backText: editingCard.backText,
      action: editingCard.action || { type: 'none' }
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
  };

  // 删除快捷方式
  const handleDeleteCard = (cardId: string) => {
    if (!selectedSlotId || !confirm('确定删除此快捷方式？')) return;

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
  };

  // 重设为预设场景
  const handleResetToPresets = () => {
    if (!confirm('确定要重设为预设场景吗？\n\n这将清除所有自定义配置，恢复为默认的时间段和快捷方式。此操作不可撤销。')) {
      return;
    }

    saveTimeSlots(DEFAULT_SCENE_PRESETS);
    setSelectedSlotId(null);
    alert('已重设为预设场景');
  };

  const selectedSlot = timeSlots.find(s => s.id === selectedSlotId);

  return (
    <div className="h-full flex flex-col bg-[#faf9f6]">
      {/* 顶部导航 */}
      <div className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4 border-b border-stone-200 bg-white">
        <button
          onClick={onBack}
          className="p-2 hover:bg-stone-100 rounded-lg transition-colors flex-shrink-0"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg sm:text-xl font-bold text-stone-800 flex-1 min-w-0">场景设置</h1>
        
        {/* 重设为预设场景按钮 */}
        <button
          onClick={handleResetToPresets}
          className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors flex-shrink-0"
          title="重设为预设场景"
        >
          <RotateCcw size={14} className="sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">重设</span>
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
              {selectedSlot.cards.map(card => (
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
                      {card.frontText && (
                        <p className="text-xs text-stone-600 mb-0.5 line-clamp-1">正面：{card.frontText}</p>
                      )}
                      {card.backText && (
                        <p className="text-xs text-stone-600 line-clamp-1">反面：{card.backText}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => {
                          setEditingCard(card);
                          setIsEditingCard(true);
                        }}
                        className="p-1.5 hover:bg-stone-100 rounded"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteCard(card.id!)}
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
        />
      )}
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
}> = ({ card, onSave, onCancel, onChange, categories, todos, todoCategories }) => {
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

  // 当卡片类型改变时，重置选择
  useEffect(() => {
    if (card?.type === 'timer') {
      setSelectedActivityId(card?.action?.activityId);
      setSelectedCategoryId(card?.action?.categoryId);
    } else if (card?.type === 'todo') {
      setSelectedTodoId(card?.action?.todoId);
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
            <select
              value={card?.type || 'timer'}
              onChange={(e) => onChange({ ...card, type: e.target.value as SceneCardType })}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-800"
            >
              {cardTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
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
              placeholder="例如：点击开始计时"
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
              placeholder="例如：正在进行中..."
            />
          </div>

          {/* 根据类型显示不同的关联选项 */}
          {card?.type === 'timer' && (
            <ActivitySelector
              categories={categories}
              selectedActivityId={selectedActivityId}
              selectedCategoryId={selectedCategoryId}
              onChange={handleActivityChange}
            />
          )}

          {card?.type === 'todo' && (
            <TodoSelector
              todos={todos}
              todoCategories={todoCategories}
              selectedTodoId={selectedTodoId}
              onChange={handleTodoChange}
            />
          )}

          {card?.type !== 'timer' && card?.type !== 'todo' && (
            <div className="p-3 bg-stone-50 rounded-lg text-xs sm:text-sm text-stone-600">
              提示：{card?.type === 'checklist' ? '日课功能' : card?.type === 'navigation' ? '导航功能' : card?.type === 'text' ? '文字卡片' : '统计功能'}将在后续版本中实现
            </div>
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
  // Create options grouped by category
  const activityOptions: Array<{
    value: string;
    label: string;
    icon: React.ReactNode;
    categoryName: string;
    categoryId: string;
  }> = [];

  categories.forEach(category => {
    category.activities.forEach(activity => {
      activityOptions.push({
        value: activity.id,
        label: `${category.name} / ${activity.name}`,
        icon: <span>{activity.icon}</span>,
        categoryName: category.name,
        categoryId: category.id
      });
    });
  });

  // Sort by category name, then by activity name
  activityOptions.sort((a, b) => {
    if (a.categoryName !== b.categoryName) {
      return a.categoryName.localeCompare(b.categoryName);
    }
    return a.label.localeCompare(b.label);
  });

  const handleActivityChange = (activityId: string | undefined) => {
    if (!activityId) {
      onChange(undefined, undefined);
      return;
    }

    const selectedOption = activityOptions.find(opt => opt.value === activityId);
    if (selectedOption) {
      onChange(activityId, selectedOption.categoryId);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-stone-700">
        关联标签
      </label>

      {activityOptions.length === 0 ? (
        <div className="text-sm text-stone-400 py-4 text-center">
          暂无可用标签
        </div>
      ) : (
        <CustomSelect
          value={selectedActivityId || ''}
          onChange={handleActivityChange}
          options={activityOptions}
          placeholder="请选择标签"
        />
      )}

      {selectedActivityId && selectedCategoryId && (
        <div className="text-xs text-stone-500 bg-stone-50 p-3 rounded-lg">
          <p>点击此卡片将开始计时该标签</p>
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
  // Group todos by category and filter out completed ones
  const activeTodos = todos.filter(todo => !todo.isCompleted);

  // Create options grouped by category
  const todoOptions = activeTodos.map(todo => {
    const category = todoCategories.find(c => c.id === todo.categoryId);
    return {
      value: todo.id,
      label: todo.title,
      icon: <span>{category?.icon || '📝'}</span>,
      categoryName: category?.name || '未分类'
    };
  });

  // Sort by category name, then by todo title
  todoOptions.sort((a, b) => {
    if (a.categoryName !== b.categoryName) {
      return a.categoryName.localeCompare(b.categoryName);
    }
    return a.label.localeCompare(b.label);
  });

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-stone-700">
        关联待办任务
      </label>

      {activeTodos.length === 0 ? (
        <div className="text-sm text-stone-400 py-4 text-center">
          暂无可用的待办任务
        </div>
      ) : (
        <CustomSelect
          value={selectedTodoId || ''}
          onChange={(value) => onChange(value || undefined)}
          options={todoOptions}
          placeholder="请选择待办任务"
        />
      )}

      {selectedTodoId && (
        <div className="text-xs text-stone-500 bg-stone-50 p-3 rounded-lg">
          <p>点击此卡片将开始该待办任务的计时</p>
        </div>
      )}
    </div>
  );
};
