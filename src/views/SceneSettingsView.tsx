/**
 * @file SceneSettingsView.tsx
 * @updated 2026-08-06: Made scene time-slot previews explicitly prefer configured UI icons over stored emoji fallbacks.
 * @description 场景设置页面 - 管理场景组、时间段和快捷方式
 *
 * @updated 2026-07-21: Replaced shadow-only scene-mode selection with a dark-mode outline state.
 * @updated 2026-05-11: Added manual-mode scene-group ordering controls via a shared order-list component.
 * 修改历史:
 * - 2026-03-19: 调整根布局为全屏覆盖层，修复页面白屏无法打开的问题。
 */
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Edit2, Palette, Clock, RotateCcw, ChevronRight, ArrowUp, ArrowDown, Check, Copy } from 'lucide-react';
import { TimeSlot, SceneCardData, SceneCardType, Category, TodoItem, TodoCategory, CheckTemplate, SceneGroup, SceneGroupAutoSwitchConfig, SceneGroupState, SceneGroupSwitchMode, CustomColorItem } from '../types';
import { CustomSelect } from '../components/CustomSelect';
import { UIIconSelectorCompact } from '../components/UIIconSelector';
import { IconRenderer } from '../components/IconRenderer';
import { TagAssociation } from '../components/TagAssociation';
import { TodoAssociation } from '../components/TodoAssociation';
import { CheckItemAssociation } from '../components/CheckItemAssociation';
import { TagMultipleAssociation } from '../components/TagMultipleAssociation';
import { ConfirmModal } from '../components/ConfirmModal';
import { AppSelector } from '../components/AppSelector';
import { SceneGroupOrderList } from '../components/SceneGroupOrderList';
import { uiIconService } from '../services/uiIconService';
import { useData } from '../contexts/DataContext';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { useReview } from '../contexts/ReviewContext';
import { useToast } from '../contexts/ToastContext';
import { useSettings } from '../contexts/SettingsContext';
import { useCustomColors } from '../hooks/useCustomColors';
import { DEFAULT_SCENE_PRESETS } from '../constants/scenePresets';
import { COLOR_OPTIONS } from '../constants';
import { findAutoSwitchTargetGroup, getActiveSceneGroup, isSceneGroupAutoSwitchMatched, loadSceneGroupStateFromStorage, moveSceneGroup, saveSceneGroupStateToStorage } from '../utils/sceneGroupStorage';
import { updateLocalDataTimestamp } from '../utils/localDataTimestamp';
import { isStoredColorSelected } from '../utils/colorUtils';

interface SceneSettingsViewProps {
  onBack: () => void;
}

interface PrinciplePreviewItem {
  id: string;
  title: string;
  frontText: string;
  backText: string;
}

interface SceneCardPreviewContent {
  title: string;
  frontText?: string;
  backText?: string;
}

const loadPrinciplesFromStorage = (): PrinciplePreviewItem[] => {
  const stored = localStorage.getItem('lumostime_principles');
  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[SceneSettingsView] Failed to parse principles for preview:', error);
    return [];
  }
};

export const SceneSettingsView: React.FC<SceneSettingsViewProps> = ({ onBack }) => {
  const [sceneGroupState, setSceneGroupState] = useState<SceneGroupState>(() => loadSceneGroupStateFromStorage());
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [isModeConfigOpen, setIsModeConfigOpen] = useState(false);
  const [groupEditMode, setGroupEditMode] = useState<'create' | 'rename'>('create');
  const [groupNameDraft, setGroupNameDraft] = useState('');
  const [groupCreateMode, setGroupCreateMode] = useState<'empty' | 'copy'>('empty');
  const [groupCopySourceId, setGroupCopySourceId] = useState('');
  const [isEditingSlot, setIsEditingSlot] = useState(false);
  const [isEditingCard, setIsEditingCard] = useState(false);
  const [editingSlot, setEditingSlot] = useState<Partial<TimeSlot> | null>(null);
  const [editingCard, setEditingCard] = useState<Partial<SceneCardData> | null>(null);
  
  // 复制快捷方式相关状态
  const [isCopyCardModalOpen, setIsCopyCardModalOpen] = useState(false);
  const [copyingCard, setCopyingCard] = useState<SceneCardData | null>(null);
  const [copyTargetGroupId, setCopyTargetGroupId] = useState('');
  const [copyTargetSlotId, setCopyTargetSlotId] = useState('');
  const [principles, setPrinciples] = useState<PrinciplePreviewItem[]>(() => loadPrinciplesFromStorage());
  
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
  const { sceneCardTimerMode } = useSettings();
  const customColors = useCustomColors();
  const isCustomIconEnabled = uiIconService.isCustomTheme();

  const activeGroup = getActiveSceneGroup(sceneGroupState);
  const matchedAutoGroup = findAutoSwitchTargetGroup(sceneGroupState, new Date());
  const timeSlots = activeGroup?.timeSlots || [];

  const persistSceneGroupState = (nextState: SceneGroupState) => {
    const saved = saveSceneGroupStateToStorage(nextState);
    setSceneGroupState(saved);
    updateLocalDataTimestamp();
    // 同时触发新旧事件，保证场景页与旧逻辑都能收到更新通知
    window.dispatchEvent(new Event('sceneGroupsUpdated'));
    window.dispatchEvent(new Event('sceneTimeSlotsUpdated'));
  };

  // 保存当前激活分组的时间段
  const saveTimeSlots = (slots: TimeSlot[]) => {
    const updatedState: SceneGroupState = {
      ...sceneGroupState,
      groups: sceneGroupState.groups.map(group => (
        group.id === activeGroup.id
          ? { ...group, timeSlots: slots }
          : group
      ))
    };
    persistSceneGroupState(updatedState);
  };

  useEffect(() => {
    // 切换场景组后，清空当前选中的时间段，避免引用到旧分组的 slot id
    setSelectedSlotId(null);
  }, [sceneGroupState.activeGroupId]);

  useEffect(() => {
    const handlePrincipleLibraryChange = () => {
      setPrinciples(loadPrinciplesFromStorage());
    };

    window.addEventListener('principleLibraryChanged', handlePrincipleLibraryChange);
    return () => {
      window.removeEventListener('principleLibraryChanged', handlePrincipleLibraryChange);
    };
  }, []);

  const handleSwitchGroup = (groupId: string) => {
    const exists = sceneGroupState.groups.some(group => group.id === groupId);
    if (!exists) return;
    persistSceneGroupState({
      ...sceneGroupState,
      activeGroupId: groupId
    });
  };

  const handleCreateGroup = () => {
    setGroupEditMode('create');
    setGroupNameDraft('');
    setGroupCreateMode('empty');
    setGroupCopySourceId(sceneGroupState.activeGroupId);
    setIsEditingGroup(true);
  };

  const handleRenameGroup = () => {
    setGroupEditMode('rename');
    setGroupNameDraft(activeGroup.name);
    setIsEditingGroup(true);
  };

  const handleSaveGroup = () => {
    const trimmedName = groupNameDraft.trim();
    if (!trimmedName) {
      addToast('error', '场景组名称不能为空');
      return;
    }

    if (groupEditMode === 'create') {
      const duplicated = sceneGroupState.groups.some(group => group.name === trimmedName);
      if (duplicated) {
        addToast('error', '场景组名称已存在');
        return;
      }

      const sourceGroup = sceneGroupState.groups.find(group => group.id === groupCopySourceId) || activeGroup;
      const copiedSlots: TimeSlot[] = groupCreateMode === 'copy'
        ? JSON.parse(JSON.stringify(sourceGroup.timeSlots))
        : [];
      const newGroup: SceneGroup = {
        id: `scene-group-${Date.now()}`,
        name: trimmedName,
        timeSlots: copiedSlots,
        autoSwitch: { mode: 'disabled' }
      };

      persistSceneGroupState({
        ...sceneGroupState,
        activeGroupId: newGroup.id,
        groups: [...sceneGroupState.groups, newGroup]
      });
      addToast('success', groupCreateMode === 'copy' ? '场景组已创建（基于已有组复制）' : '场景组已创建（空白组）');
    } else {
      const duplicated = sceneGroupState.groups.some(group => group.id !== activeGroup.id && group.name === trimmedName);
      if (duplicated) {
        addToast('error', '场景组名称已存在');
        return;
      }

      persistSceneGroupState({
        ...sceneGroupState,
        groups: sceneGroupState.groups.map(group => (
          group.id === activeGroup.id
            ? { ...group, name: trimmedName }
            : group
        ))
      });
      addToast('success', '场景组名称已更新');
    }

    setIsEditingGroup(false);
    setGroupNameDraft('');
    setGroupCreateMode('empty');
    setGroupCopySourceId(sceneGroupState.activeGroupId);
  };

  const handleDeleteGroup = () => {
    if (sceneGroupState.groups.length <= 1) {
      addToast('error', '至少需要保留一个场景组');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: '删除场景组',
      description: `确定删除「${activeGroup.name}」场景组吗？该组下所有时间段和快捷方式都会被删除。`,
      type: 'danger',
      onConfirm: () => {
        const remainingGroups = sceneGroupState.groups.filter(group => group.id !== activeGroup.id);
        const nextActiveGroupId = remainingGroups[0].id;
        persistSceneGroupState({
          ...sceneGroupState,
          activeGroupId: nextActiveGroupId,
          groups: remainingGroups
        });
        setConfirmModal({ ...confirmModal, isOpen: false });
        addToast('success', '场景组已删除');
      }
    });
  };

  const switchMode: SceneGroupSwitchMode = sceneGroupState.switchMode || 'manual';
  const weekdayOptions = [
    { value: 1, label: '一' },
    { value: 2, label: '二' },
    { value: 3, label: '三' },
    { value: 4, label: '四' },
    { value: 5, label: '五' },
    { value: 6, label: '六' },
    { value: 0, label: '日' }
  ];

  const updateSwitchMode = (mode: SceneGroupSwitchMode) => {
    persistSceneGroupState({
      ...sceneGroupState,
      switchMode: mode
    });
  };

  const handleMoveGroup = (groupId: string, direction: 'up' | 'down') => {
    const nextState = moveSceneGroup(sceneGroupState, groupId, direction);
    if (nextState === sceneGroupState) {
      return;
    }
    persistSceneGroupState(nextState);
  };

  const updateGroupAutoSwitch = (
    groupId: string,
    updater: (current: SceneGroupAutoSwitchConfig) => SceneGroupAutoSwitchConfig
  ) => {
    persistSceneGroupState({
      ...sceneGroupState,
      groups: sceneGroupState.groups.map(group => (
        group.id === groupId
          ? {
            ...group,
            autoSwitch: updater(group.autoSwitch || { mode: 'disabled' })
          }
          : group
      ))
    });
  };

  const getRuleSummary = (config: SceneGroupAutoSwitchConfig): string => {
    if (config.mode === 'disabled') return '不启用';
    if (config.mode === 'weekday') return '每周一至周五';
    if (config.mode === 'weekend') return '每周六、周日';
    if (config.mode === 'customWeekdays') {
      const weekdays = Array.isArray(config.weekdays) ? config.weekdays : [];
      if (weekdays.length === 0) return '自定义星期未选择';
      const labels = weekdayOptions
        .filter(option => weekdays.includes(option.value))
        .map(option => `${option.label}`);
      return labels.length > 0 ? labels.join('、') : '自定义星期未选择';
    }
    if (config.mode === 'dateRange') {
      if (config.startDate && config.endDate) {
        return `${config.startDate} ~ ${config.endDate}`;
      }
      return '时间段未完整设置';
    }
    return '规则未设置';
  };

  const normalizeEightDigitDateInput = (value: string): string => {
    return value.replace(/\D/g, '').slice(0, 8);
  };

  const getGroupAutoSwitchConfig = (group: SceneGroup): SceneGroupAutoSwitchConfig => {
    return group.autoSwitch || { mode: 'disabled' };
  };

  const autoEnabledGroupCount = sceneGroupState.groups.filter(group => (
    getGroupAutoSwitchConfig(group).mode !== 'disabled'
  )).length;

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
      
      case 'principle':
      case 'reference':
        return null; // 原则和引用卡片不需要显示关联信息
      
      default:
        return null;
    }
  };

  // 检测时间段是否重叠
  const getCardPreviewContent = (card: SceneCardData): SceneCardPreviewContent => {
    if (card.type === 'principle' && card.principleSource === 'library') {
      const principle = principles.find(item => item.id === card.principleId);
      if (principle) {
        return {
          title: principle.title,
          frontText: principle.frontText,
          backText: principle.backText
        };
      }
    }

    return {
      title: card.title,
      frontText: card.frontText,
      backText: card.backText
    };
  };

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
      disableAutoSwitch: editingSlot.disableAutoSwitch,
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

  // 上移时间段
  const handleMoveSlotUp = (id: string) => {
    const index = timeSlots.findIndex(s => s.id === id);
    if (index <= 0) return; // 已经是第一个，无法上移
    
    const newSlots = [...timeSlots];
    [newSlots[index - 1], newSlots[index]] = [newSlots[index], newSlots[index - 1]];
    saveTimeSlots(newSlots);
    addToast('success', '时间段已上移');
  };

  // 下移时间段
  const handleMoveSlotDown = (id: string) => {
    const index = timeSlots.findIndex(s => s.id === id);
    if (index < 0 || index >= timeSlots.length - 1) return; // 已经是最后一个，无法下移
    
    const newSlots = [...timeSlots];
    [newSlots[index], newSlots[index + 1]] = [newSlots[index + 1], newSlots[index]];
    saveTimeSlots(newSlots);
    addToast('success', '时间段已下移');
  };

  // 添加/编辑快捷方式
  const handleSaveCard = () => {
    // 对于原则类型的随机选取模式，标题不是必填的
    const isTitleRequired = !(editingCard?.type === 'principle' && editingCard?.principleSource === 'random');
    
    if (!selectedSlotId || !editingCard || !editingCard.type || (isTitleRequired && !editingCard.title)) {
      addToast('error', '请填写完整信息');
      return;
    }

    const newCard: SceneCardData = {
      id: editingCard.id || `card-${Date.now()}`,
      type: editingCard.type,
      // 对于随机选取模式，标题可以为空，会在渲染时从原则库中获取
      title: editingCard.title || '',
      // 对于原则类型的随机选取或从库选择模式，frontText 和 backText 应该为空，会在渲染时从原则库中获取
      frontText: (editingCard.type === 'principle' && (editingCard.principleSource === 'random' || editingCard.principleSource === 'library')) 
        ? '' 
        : (editingCard.frontText || '现在开始！'),
      backText: (editingCard.type === 'principle' && (editingCard.principleSource === 'random' || editingCard.principleSource === 'library')) 
        ? '' 
        : (editingCard.backText || '完成了！'),
      action: editingCard.action || { type: 'none' },
      // 保存颜色字段
      ...(editingCard.color && { color: editingCard.color }),
      // 保存自动进入沉浸式计时字段（timer 和 todo 类型）
      // 注意：即使是 false 也要保存，不能用 && 判断
      ...((editingCard.type === 'timer' || editingCard.type === 'todo') && {
        autoEnterFocus: editingCard.autoEnterFocus ?? false
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
      // 日课卡片的完成状态
      ...(editingCard.type === 'checklist' && {
        isCompleted: editingCard.isCompleted
      }),
      // 保留原则卡片的特有字段
      ...(editingCard.type === 'principle' && {
        principleSource: editingCard.principleSource,
        principleId: editingCard.principleId
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

  // 打开复制快捷方式模态框
  const handleOpenCopyCard = (card: SceneCardData) => {
    setCopyingCard(card);
    setCopyTargetGroupId(activeGroup.id);
    setCopyTargetSlotId(selectedSlotId || '');
    setIsCopyCardModalOpen(true);
  };

  // 执行复制快捷方式
  const handleConfirmCopyCard = () => {
    if (!copyingCard || !copyTargetGroupId || !copyTargetSlotId) {
      addToast('error', '请选择目标场景组和时间段');
      return;
    }

    // 创建新的卡片副本（生成新ID）
    const newCard: SceneCardData = {
      ...JSON.parse(JSON.stringify(copyingCard)),
      id: `card-${Date.now()}`
    };

    // 更新目标场景组的目标时间段
    const updatedState: SceneGroupState = {
      ...sceneGroupState,
      groups: sceneGroupState.groups.map(group => {
        if (group.id === copyTargetGroupId) {
          return {
            ...group,
            timeSlots: group.timeSlots.map(slot => {
              if (slot.id === copyTargetSlotId) {
                return {
                  ...slot,
                  cards: [...slot.cards, newCard]
                };
              }
              return slot;
            })
          };
        }
        return group;
      })
    };

    persistSceneGroupState(updatedState);
    setIsCopyCardModalOpen(false);
    setCopyingCard(null);
    
    const targetGroup = sceneGroupState.groups.find(g => g.id === copyTargetGroupId);
    const targetSlot = targetGroup?.timeSlots.find(s => s.id === copyTargetSlotId);
    addToast('success', `已复制到「${targetGroup?.name} - ${targetSlot?.name}」`);
  };

  // 重设当前场景组为预设场景
  const handleResetToPresets = () => {
    setConfirmModal({
      isOpen: true,
      title: '重设当前场景组',
      description: `确定要重设「${activeGroup.name}」吗？\n\n这将清除当前组的自定义配置，恢复为默认的时间段和快捷方式。此操作不可撤销。`,
      type: 'warning',
      onConfirm: () => {
        saveTimeSlots(DEFAULT_SCENE_PRESETS);
        setSelectedSlotId(null);
        setConfirmModal({ ...confirmModal, isOpen: false });
        addToast('success', '当前场景组已重设为预设场景');
      }
    });
  };

  const selectedSlot = timeSlots.find(s => s.id === selectedSlotId);

  return (
    <div className="fixed inset-0 z-50 bg-[#faf9f6] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* 顶部导航 */}
      <div className="h-14 flex items-center justify-between px-5 bg-[#fdfbf7] border-b border-stone-100 sticky top-0 z-20">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-stone-400 hover:text-stone-600 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-serif font-bold text-lg text-stone-800">场景设置</h1>
        
        {/* 重设当前场景组按钮 */}
        <button
          onClick={handleResetToPresets}
          className="p-2 -mr-2 text-stone-400 hover:text-stone-600 transition-colors"
          title="重设当前场景组"
        >
          <RotateCcw size={20} />
        </button>
      </div>

      {/* 主体内容 - 单列布局 */}
      <div className="flex-1 overflow-y-auto">
        {/* 场景组内容管理 */}
        <div className="p-3 sm:p-4 border-b-4 border-stone-200 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-stone-700">场景组内容管理</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={handleCreateGroup}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors"
                title="新建场景组"
              >
                <Plus size={12} />
                新建
              </button>
              <button
                onClick={handleRenameGroup}
                className="p-1.5 text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded transition-colors"
                title="重命名场景组"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={handleDeleteGroup}
                disabled={sceneGroupState.groups.length <= 1}
                className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="删除场景组"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          <label className="block text-xs font-medium text-stone-700 mb-1">当前编辑场景组</label>
          <CustomSelect
            value={sceneGroupState.activeGroupId}
            onChange={(value) => handleSwitchGroup(value)}
            options={sceneGroupState.groups.map(group => ({
              value: group.id,
              label: `${group.name}（${group.timeSlots.length} 个时间段）`
            }))}
          />
          <p className="text-xs text-stone-500 mt-2">
            每个场景组独立保存一套时间段和快捷方式。
            {switchMode === 'manual'
              ? ' 当前编辑组会直接用于场景视图展示。'
              : ' 自动模式下，这里只用于编辑各组内容，实际展示由自动规则决定。'}
          </p>
        </div>

        {/* 切换模式管理入口 */}
        <div className="p-3 sm:p-4 border-b-4 border-stone-200 bg-white">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-stone-700">切换模式管理</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                {switchMode === 'manual'
                  ? `手动模式：场景视图固定显示「${activeGroup.name}」`
                  : `自动模式：已为 ${autoEnabledGroupCount} 个场景组启用规则，当前命中「${matchedAutoGroup?.name || activeGroup.name}」`}
              </p>
            </div>
            <button
              onClick={() => setIsModeConfigOpen(true)}
              className="px-3 py-1.5 text-xs bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors flex-shrink-0"
            >
              打开管理
            </button>
          </div>
        </div>

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
            {timeSlots.map((slot, index) => (
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
                        preferUiIcon
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
                        handleMoveSlotUp(slot.id);
                      }}
                      disabled={index === 0}
                      className={`p-1.5 rounded ${
                        index === 0
                          ? 'text-stone-300 cursor-not-allowed'
                          : 'hover:bg-stone-200 text-stone-600'
                      }`}
                      title="上移"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveSlotDown(slot.id);
                      }}
                      disabled={index === timeSlots.length - 1}
                      className={`p-1.5 rounded ${
                        index === timeSlots.length - 1
                          ? 'text-stone-300 cursor-not-allowed'
                          : 'hover:bg-stone-200 text-stone-600'
                      }`}
                      title="下移"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSlot(slot);
                        setIsEditingSlot(true);
                      }}
                      className="p-1.5 hover:bg-stone-200 rounded"
                      title="编辑"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSlot(slot.id);
                      }}
                      className="p-1.5 hover:bg-red-100 text-red-600 rounded"
                      title="删除"
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
                const previewContent = getCardPreviewContent(card);
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
                          <h3 className="font-bold text-stone-800 text-sm truncate">{previewContent.title}</h3>
                        </div>
                        {associationText && (
                          <p className="text-xs text-stone-500 mb-0.5 line-clamp-1">{associationText}</p>
                        )}
                        {/* 原则卡片根据模式显示不同内容 */}
                        {card.type === 'principle' ? (
                          <>
                            {card.principleSource === 'random' ? (
                              <p className="text-xs text-stone-600 mb-0.5 line-clamp-1">从原则库中随机</p>
                            ) : card.principleSource === 'library' ? (
                              <>
                                {previewContent.frontText && (
                                  <p className="text-xs text-stone-600 mb-0.5 line-clamp-1">正面：{previewContent.frontText}</p>
                                )}
                                {previewContent.backText && (
                                  <p className="text-xs text-stone-600 line-clamp-1">反面：{previewContent.backText}</p>
                                )}
                              </>
                            ) : (
                              <>
                                {previewContent.frontText && (
                                  <p className="text-xs text-stone-600 mb-0.5 line-clamp-1">正面：{previewContent.frontText}</p>
                                )}
                                {previewContent.backText && (
                                  <p className="text-xs text-stone-600 line-clamp-1">反面：{previewContent.backText}</p>
                                )}
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            {previewContent.frontText && (
                              <p className="text-xs text-stone-600 mb-0.5 line-clamp-1">正面：{previewContent.frontText}</p>
                            )}
                            {previewContent.backText && (
                              <p className="text-xs text-stone-600 line-clamp-1">反面：{previewContent.backText}</p>
                            )}
                          </>
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
                          onClick={() => handleOpenCopyCard(card)}
                          className="p-1.5 hover:bg-stone-100 rounded"
                          title="复制"
                        >
                          <Copy size={14} />
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

      {/* 编辑场景组弹窗 */}
      {isEditingGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold mb-4">
              {groupEditMode === 'create' ? '新建场景组' : '重命名场景组'}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-stone-700 mb-1">
                  场景组名称
                </label>
                <input
                  type="text"
                  value={groupNameDraft}
                  onChange={(e) => setGroupNameDraft(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-800"
                  placeholder={groupEditMode === 'create' ? '例如：工作日' : '请输入新的名称'}
                  autoFocus
                />
              </div>

              {groupEditMode === 'create' && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-stone-700 mb-2">
                    创建方式
                  </label>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setGroupCreateMode('empty')}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        groupCreateMode === 'empty'
                          ? 'border-stone-400 bg-stone-50'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-stone-800">从空白开始</span>
                        {groupCreateMode === 'empty' && (
                          <Check size={16} className="text-green-600" />
                        )}
                      </div>
                      <p className="text-xs text-stone-500 mt-1">新建后无时间段和快捷方式，手动配置。</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGroupCreateMode('copy')}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        groupCreateMode === 'copy'
                          ? 'border-stone-400 bg-stone-50'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-stone-800">复制已有场景组</span>
                        {groupCreateMode === 'copy' && (
                          <Check size={16} className="text-green-600" />
                        )}
                      </div>
                      <p className="text-xs text-stone-500 mt-1">复制模板组内容后再继续编辑。</p>
                    </button>
                  </div>

                  {groupCreateMode === 'copy' && (
                    <div className="mt-2">
                      <label className="block text-xs text-stone-700 mb-1">复制来源</label>
                      <CustomSelect
                        value={groupCopySourceId || activeGroup.id}
                        onChange={(value) => setGroupCopySourceId(value)}
                        options={sceneGroupState.groups.map(group => ({
                          value: group.id,
                          label: `${group.name}（${group.timeSlots.length} 个时间段）`
                        }))}
                        dropdownPosition="top"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => {
                  setIsEditingGroup(false);
                  setGroupNameDraft('');
                  setGroupCreateMode('empty');
                  setGroupCopySourceId(sceneGroupState.activeGroupId);
                }}
                className="flex-1 px-4 py-2 text-sm border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveGroup}
                className="flex-1 px-4 py-2 text-sm bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 模式切换管理弹窗 */}
      {isModeConfigOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-6 pb-3 border-b border-stone-200">
              <h2 className="text-lg sm:text-xl font-bold">切换模式管理</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">切换模式</label>
                <div className="inline-flex rounded-lg bg-stone-100 p-1">
                  <button
                    onClick={() => updateSwitchMode('manual')}
                    className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                      switchMode === 'manual'
                        ? 'scene-mode-selected bg-white text-stone-900'
                        : 'text-stone-600 hover:text-stone-800'
                    }`}
                  >
                    手动模式
                  </button>
                  <button
                    onClick={() => updateSwitchMode('auto')}
                    className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                      switchMode === 'auto'
                        ? 'scene-mode-selected bg-white text-stone-900'
                        : 'text-stone-600 hover:text-stone-800'
                    }`}
                  >
                    自动模式
                  </button>
                </div>
              </div>

              {switchMode === 'manual' ? (
                <div className="p-3 rounded-lg border border-stone-200 bg-stone-50">
                  <label className="block text-xs font-medium text-stone-700 mb-1">手动模式展示组</label>
                  <CustomSelect
                    value={sceneGroupState.activeGroupId}
                    onChange={(value) => handleSwitchGroup(value)}
                    options={sceneGroupState.groups.map(group => ({
                      value: group.id,
                      label: group.name
                    }))}
                    dropdownPosition="bottom"
                  />
                  <p className="text-xs text-stone-500 mt-2">手动模式下，场景视图仅渲染当前选中的场景组。</p>
                  <SceneGroupOrderList
                    groups={sceneGroupState.groups}
                    activeGroupId={sceneGroupState.activeGroupId}
                    onMoveGroup={handleMoveGroup}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {sceneGroupState.groups.map(group => {
                    const config = getGroupAutoSwitchConfig(group);
                    return (
                      <div key={group.id} className="p-3 rounded-lg border border-stone-200 bg-stone-50/60">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-2">
                          <h3 className="text-sm font-bold text-stone-700 truncate">{group.name}</h3>
                          <span className="text-[11px] text-stone-500 shrink-0">
                            今日命中：{isSceneGroupAutoSwitchMatched(group, new Date()) ? '是' : '否'}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <CustomSelect
                            value={config.mode}
                            onChange={(value) => {
                              const mode = value as SceneGroupAutoSwitchConfig['mode'];
                              updateGroupAutoSwitch(group.id, (current) => ({
                                ...current,
                                mode,
                                startDate: mode === 'dateRange' ? current.startDate : undefined,
                                endDate: mode === 'dateRange' ? current.endDate : undefined,
                                weekdays: mode === 'customWeekdays' ? current.weekdays : undefined
                              }));
                            }}
                            options={[
                              { value: 'disabled', label: '不启用' },
                              { value: 'weekday', label: '工作日（周一至周五）' },
                              { value: 'weekend', label: '周末（周六和周日）' },
                              { value: 'customWeekdays', label: '自定义星期（可多选）' },
                              { value: 'dateRange', label: '时间段（YYYYMMDD）' }
                            ]}
                          />

                          {config.mode === 'customWeekdays' && (
                            <div className="space-y-2">
                              <div className="grid grid-cols-7 gap-2">
                                {weekdayOptions.map(option => {
                                  const selected = (config.weekdays || []).includes(option.value);
                                  return (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() => {
                                        const currentWeekdays = config.weekdays || [];
                                        const nextWeekdays = selected
                                          ? currentWeekdays.filter(day => day !== option.value)
                                          : [...currentWeekdays, option.value];
                                        updateGroupAutoSwitch(group.id, (current) => ({
                                          ...current,
                                          weekdays: nextWeekdays
                                        }));
                                      }}
                                      className={`h-8 rounded-lg text-xs border transition-colors ${
                                        selected
                                          ? 'bg-stone-800 text-white border-stone-800'
                                          : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                                      }`}
                                      title={`周${option.label}`}
                                    >
                                      {option.label}
                                    </button>
                                  );
                                })}
                              </div>
                              <p className="text-[11px] text-stone-500">
                                选择该场景组生效的星期（可多选）
                              </p>
                            </div>
                          )}

                          {config.mode === 'dateRange' && (
                            <div className="space-y-2">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  maxLength={8}
                                  placeholder="开始 YYYYMMDD"
                                  value={config.startDate || ''}
                                  onChange={(e) => {
                                    const startDate = normalizeEightDigitDateInput(e.target.value) || undefined;
                                    const endDate = config.endDate;
                                    if (startDate?.length === 8 && endDate?.length === 8 && startDate > endDate) {
                                      addToast('error', '开始日期不能晚于结束日期');
                                      return;
                                    }
                                    updateGroupAutoSwitch(group.id, (current) => ({ ...current, startDate }));
                                  }}
                                  className="w-full px-2.5 py-1.5 text-xs sm:text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-800 font-mono"
                                />
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  maxLength={8}
                                  placeholder="结束 YYYYMMDD"
                                  value={config.endDate || ''}
                                  onChange={(e) => {
                                    const endDate = normalizeEightDigitDateInput(e.target.value) || undefined;
                                    const startDate = config.startDate;
                                    if (startDate?.length === 8 && endDate?.length === 8 && startDate > endDate) {
                                      addToast('error', '结束日期不能早于开始日期');
                                      return;
                                    }
                                    updateGroupAutoSwitch(group.id, (current) => ({ ...current, endDate }));
                                  }}
                                  className="w-full px-2.5 py-1.5 text-xs sm:text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-800 font-mono"
                                />
                              </div>
                              <p className="text-[11px] text-stone-500">
                                请输入 8 位数字日期，例如：20260115。
                              </p>
                            </div>
                          )}
                        </div>

                        <p className="text-xs text-stone-500 mt-2">当前规则：{getRuleSummary(config)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 sm:p-6 pt-3 border-t border-stone-200">
              <button
                onClick={() => setIsModeConfigOpen(false)}
                className="w-full px-4 py-2 text-sm bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors"
              >
                完成
              </button>
            </div>
          </div>
        </div>
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
          customColors={customColors}
          sceneCardTimerMode={sceneCardTimerMode}
        />
      )}

      {/* 复制快捷方式模态框 */}
      {isCopyCardModalOpen && copyingCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md flex flex-col">
            <div className="p-4 sm:p-6 pb-3 border-b border-stone-200">
              <h2 className="text-lg sm:text-xl font-bold">复制快捷方式</h2>
              <p className="text-xs text-stone-500 mt-1">
                将「{copyingCard.title}」复制到指定的场景组和时间段
              </p>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">目标场景组</label>
                <CustomSelect
                  value={copyTargetGroupId}
                  onChange={(value) => {
                    setCopyTargetGroupId(value);
                    // 切换场景组时，重置时间段选择
                    const targetGroup = sceneGroupState.groups.find(g => g.id === value);
                    if (targetGroup && targetGroup.timeSlots.length > 0) {
                      setCopyTargetSlotId(targetGroup.timeSlots[0].id);
                    } else {
                      setCopyTargetSlotId('');
                    }
                  }}
                  options={sceneGroupState.groups.map(group => ({
                    value: group.id,
                    label: group.name
                  }))}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">目标时间段</label>
                {(() => {
                  const targetGroup = sceneGroupState.groups.find(g => g.id === copyTargetGroupId);
                  if (!targetGroup || targetGroup.timeSlots.length === 0) {
                    return (
                      <div className="text-xs text-stone-500 p-3 bg-stone-50 rounded-lg">
                        该场景组暂无时间段
                      </div>
                    );
                  }
                  return (
                    <CustomSelect
                      value={copyTargetSlotId}
                      onChange={(value) => setCopyTargetSlotId(value)}
                      options={targetGroup.timeSlots.map(slot => ({
                        value: slot.id,
                        label: `${slot.name} (${slot.startTime} - ${slot.endTime})`
                      }))}
                    />
                  );
                })()}
              </div>
            </div>

            <div className="p-4 sm:p-6 pt-3 border-t border-stone-200 flex gap-2">
              <button
                onClick={() => {
                  setIsCopyCardModalOpen(false);
                  setCopyingCard(null);
                }}
                className="flex-1 px-4 py-2.5 text-sm bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmCopyCard}
                disabled={!copyTargetGroupId || !copyTargetSlotId}
                className="flex-1 px-4 py-2.5 text-sm bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认复制
              </button>
            </div>
          </div>
        </div>
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
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* 标题 */}
        <div className="p-4 sm:p-6 pb-3 border-b border-stone-200">
          <h2 className="text-lg sm:text-xl font-bold">
            {slot?.id ? '编辑时间段' : '添加时间段'}
          </h2>
        </div>

        {/* 内容区域 - 可滚动 */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
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
                      preferUiIcon
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

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-medium text-stone-700">
                不自动跳转到此时间段
              </label>
              <button
                onClick={() => onChange({ ...slot, disableAutoSwitch: !slot?.disableAutoSwitch })}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors`}
                style={{
                  backgroundColor: slot?.disableAutoSwitch ? 'var(--accent-color)' : '#d6d3d1'
                }}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    slot?.disableAutoSwitch ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            <p className="text-[10px] sm:text-xs text-stone-500 mt-1">
              开启后，系统不会根据当前时间自动切换到此时间段
            </p>
          </div>
        </div>
      </div>

      {/* 底部按钮 - 固定 */}
      <div className="flex gap-2 sm:gap-3 p-4 sm:p-6 pt-3 border-t border-stone-200">
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
  customColors: CustomColorItem[];
  sceneCardTimerMode: 'realtime' | 'backfill';
}> = ({
  card,
  onSave,
  onCancel,
  onChange,
  categories,
  todos,
  todoCategories,
  checkTemplates,
  customColors,
  sceneCardTimerMode,
}) => {
  const cardTypes: { value: SceneCardType; label: string }[] = [
    { value: 'timer', label: '计时' },
    { value: 'todo', label: '待办' },
    { value: 'checklist', label: '日课' },
    { value: 'navigation', label: '导航' },
    { value: 'principle', label: '原则' },
    { value: 'reference', label: '引用' },
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
          // 保留 action 里其它配置（比如 launchApp）
          ...card?.action,
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
          // 保留 action 里其它配置（比如 launchApp）
          ...card?.action,
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
          // 保留 action 里其它配置（比如 checkActionMode）
          ...card?.action,
          type: 'toggleCheck',
          checkItemId
        }
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* 标题 */}
        <div className="p-4 sm:p-6 pb-3 border-b border-stone-200">
          <h2 className="text-lg sm:text-xl font-bold">
            {card?.id ? '编辑快捷方式' : '添加快捷方式'}
          </h2>
        </div>

        {/* 内容区域 - 可滚动 */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
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

          {/* 原则来源选择（仅原则类型） */}
          {card?.type === 'principle' && (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-stone-700 mb-2">
                原则来源
              </label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => onChange({ 
                    ...card, 
                    principleSource: 'library',
                    frontText: '',
                    backText: '',
                    principleId: undefined
                  })}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    card?.principleSource === 'library'
                      ? 'border-stone-400 bg-stone-50'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-stone-800">从原则库中选择</span>
                    {card?.principleSource === 'library' && (
                      <Check size={16} className="text-green-600" />
                    )}
                  </div>
                  <p className="text-xs text-stone-500 mt-1">选择已保存的原则</p>
                </button>

                <button
                  type="button"
                  onClick={() => onChange({ 
                    ...card, 
                    principleSource: 'manual',
                    principleId: undefined
                  })}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    card?.principleSource === 'manual' || !card?.principleSource
                      ? 'border-stone-400 bg-stone-50'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-stone-800">手动输入</span>
                    {(card?.principleSource === 'manual' || !card?.principleSource) && (
                      <Check size={16} className="text-green-600" />
                    )}
                  </div>
                  <p className="text-xs text-stone-500 mt-1">自定义原则内容</p>
                </button>

                <button
                  type="button"
                  onClick={() => onChange({ 
                    ...card, 
                    principleSource: 'random',
                    frontText: '',
                    backText: '',
                    principleId: undefined
                  })}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    card?.principleSource === 'random'
                      ? 'border-stone-400 bg-stone-50'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-stone-800">随机选取</span>
                    {card?.principleSource === 'random' && (
                      <Check size={16} className="text-green-600" />
                    )}
                  </div>
                  <p className="text-xs text-stone-500 mt-1">每次从原则库中随机选择</p>
                </button>
              </div>
            </div>
          )}

          {/* 从原则库选择（仅当选择了library模式） */}
          {card?.type === 'principle' && card?.principleSource === 'library' && (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-stone-700 mb-2">
                选择原则
              </label>
              <PrincipleLibrarySelector
                selectedPrincipleId={card?.principleId}
                onSelect={(principle) => {
                  onChange({
                    ...card,
                    principleId: principle.id,
                    title: principle.title,
                    frontText: principle.frontText,
                    backText: principle.backText
                  });
                }}
              />
            </div>
          )}

          {/* 标题（所有类型，但随机选取模式下隐藏） */}
          {!(card?.type === 'principle' && card?.principleSource === 'random') && (
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
                disabled={card?.type === 'principle' && card?.principleSource === 'library'}
              />
              {card?.type === 'principle' && card?.principleSource === 'library' && (
                <p className="text-[10px] sm:text-xs text-stone-500 mt-1">
                  标题将自动从原则库获取
                </p>
              )}
            </div>
          )}

          {/* 正面文字（仅手动输入模式或非原则类型） */}
          {(card?.type !== 'principle' || card?.principleSource === 'manual' || !card?.principleSource) && (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-stone-700 mb-1">
                正面文字（可选）
              </label>
              <input
                type="text"
                value={card?.frontText || ''}
                onChange={(e) => onChange({ ...card, frontText: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-800"
                placeholder={card?.type === 'reference' ? '例如：昨日改进' : card?.type === 'principle' ? '例如：痛苦 + 反思 = 进步' : '现在开始！'}
              />
              {card?.type === 'reference' && (
                <p className="text-[10px] sm:text-xs text-stone-500 mt-1">
                  正面显示此文字，反面自动显示引用的答案内容
                </p>
              )}
            </div>
          )}

          {/* 反面文字（仅手动输入模式或非原则/引用类型） */}
          {card?.type !== 'reference' && (card?.type !== 'principle' || card?.principleSource === 'manual' || !card?.principleSource) && (
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
          )}

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
                    isStoredColorSelected(card?.color, opt.lightHex)
                      ? 'ring-[2px] ring-stone-300 ring-offset-0'
                      : ''
                  }`}
                />
              ))}
              {customColors.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onChange({ ...card, color: item.color })}
                  title={item.color}
                  className={`w-8 h-8 rounded-full border border-stone-300 transition-all hover:scale-110 ${
                    isStoredColorSelected(card?.color, item.color)
                      ? 'ring-[2px] ring-stone-300 ring-offset-0'
                      : ''
                  }`}
                  style={{ backgroundColor: item.color }}
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
              
              {/* 只在正计时模式下显示这两个选项 */}
              {sceneCardTimerMode === 'realtime' && (
                <>
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

                  {/* 应用跳转配置 */}
                  <AppLaunchConfig
                    launchApp={card?.action?.launchApp}
                    appPackageName={card?.action?.appPackageName}
                    appName={card?.action?.appName}
                    onChange={(launchApp, appPackageName, appName) => {
                      onChange({
                        ...card,
                        action: {
                          ...card?.action,
                          type: card?.action?.type || 'startTimer',
                          launchApp,
                          appPackageName,
                          appName
                        }
                      });
                    }}
                  />
                </>
              )}
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
              
              {/* 只在正计时模式下显示这两个选项 */}
              {sceneCardTimerMode === 'realtime' && (
                <>
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

                  {/* 应用跳转配置 */}
                  <AppLaunchConfig
                    launchApp={card?.action?.launchApp}
                    appPackageName={card?.action?.appPackageName}
                    appName={card?.action?.appName}
                    onChange={(launchApp, appPackageName, appName) => {
                      onChange({
                        ...card,
                        action: {
                          ...card?.action,
                          type: card?.action?.type || 'startTodo',
                          launchApp,
                          appPackageName,
                          appName
                        }
                      });
                    }}
                  />
                </>
              )}
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

          {card?.type === 'reference' && (
            <ReferenceSelector
              sourceType={card?.action?.sourceType}
              dateOffset={card?.action?.dateOffset}
              questionId={card?.action?.questionId}
              fallbackText={card?.action?.fallbackText}
              onChange={(config) => {
                onChange({
                  ...card,
                  action: {
                    type: 'reference',
                    ...config
                  }
                });
              }}
            />
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
      </div>

      {/* 底部按钮 - 固定 */}
      <div className="flex gap-2 sm:gap-3 p-4 sm:p-6 pt-3 border-t border-stone-200">
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
          点击此卡片将更新该日课的打卡进度
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


// 引用选择器组件
const ReferenceSelector: React.FC<{
  sourceType?: 'dailyReview' | 'weeklyReview' | 'monthlyReview';
  dateOffset?: 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth';
  questionId?: string;
  fallbackText?: string;
  onChange: (config: {
    sourceType: 'dailyReview' | 'weeklyReview' | 'monthlyReview';
    dateOffset: 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth';
    questionId: string;
    fallbackText?: string;
  }) => void;
}> = ({ sourceType, dateOffset, questionId, fallbackText, onChange }) => {
  const { reviewTemplates } = useReview();
  
  // 引用来源选项
  const sourceOptions = [
    { value: 'dailyReview-today', label: '今日回顾', sourceType: 'dailyReview' as const, dateOffset: 'today' as const },
    { value: 'dailyReview-yesterday', label: '昨日回顾', sourceType: 'dailyReview' as const, dateOffset: 'yesterday' as const },
    { value: 'weeklyReview-thisWeek', label: '本周回顾', sourceType: 'weeklyReview' as const, dateOffset: 'thisWeek' as const },
    { value: 'weeklyReview-lastWeek', label: '上周回顾', sourceType: 'weeklyReview' as const, dateOffset: 'lastWeek' as const },
    { value: 'monthlyReview-thisMonth', label: '本月回顾', sourceType: 'monthlyReview' as const, dateOffset: 'thisMonth' as const },
    { value: 'monthlyReview-lastMonth', label: '上月回顾', sourceType: 'monthlyReview' as const, dateOffset: 'lastMonth' as const },
  ];
  
  // 当前选中的来源
  const currentSourceValue = sourceType && dateOffset ? `${sourceType}-${dateOffset}` : '';
  
  // 获取当前来源类型对应的问题列表
  const getQuestionOptions = () => {
    if (!sourceType) return [];
    
    // 根据来源类型筛选对应的模板
    const filteredTemplates = reviewTemplates.filter(template => {
      if (sourceType === 'dailyReview') {
        return template.isDailyTemplate === true;
      } else if (sourceType === 'weeklyReview') {
        return template.isWeeklyTemplate === true;
      } else if (sourceType === 'monthlyReview') {
        return template.isMonthlyTemplate === true;
      }
      return false;
    });
    
    // 收集所有问题
    const questions: { value: string; label: string }[] = [];
    
    filteredTemplates.forEach(template => {
      template.questions.forEach(q => {
        questions.push({
          value: q.id,
          label: q.question
        });
      });
    });
    
    return questions;
  };
  
  const questionOptions = getQuestionOptions();
  
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs sm:text-sm font-medium text-stone-700 mb-2">
          引用来源
        </label>
        <CustomSelect
          value={currentSourceValue}
          onChange={(value) => {
            const selected = sourceOptions.find(opt => opt.value === value);
            if (selected) {
              onChange({
                sourceType: selected.sourceType,
                dateOffset: selected.dateOffset,
                questionId: questionId || '',
                fallbackText
              });
            }
          }}
          options={sourceOptions}
        />
      </div>
      
      {sourceType && questionOptions.length > 0 && (
        <div>
          <label className="block text-xs sm:text-sm font-medium text-stone-700 mb-2">
            引用问题
          </label>
          <CustomSelect
            value={questionId || ''}
            onChange={(value) => {
              onChange({
                sourceType,
                dateOffset: dateOffset || 'today',
                questionId: value,
                fallbackText
              });
            }}
            options={questionOptions}
            dropdownPosition="top"
          />
        </div>
      )}
      
      {sourceType && questionId && (
        <div>
          <label className="block text-xs sm:text-sm font-medium text-stone-700 mb-2">
            空状态提示（可选）
          </label>
          <input
            type="text"
            value={fallbackText || ''}
            onChange={(e) => {
              onChange({
                sourceType,
                dateOffset: dateOffset || 'today',
                questionId,
                fallbackText: e.target.value
              });
            }}
            placeholder="这里空空如也"
            className="w-full px-3 py-2 text-xs sm:text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
          <p className="text-[10px] sm:text-xs text-stone-500 mt-1">
            当找不到引用内容时显示的提示文字
          </p>
        </div>
      )}
      
      <div className="text-[10px] sm:text-xs text-stone-500 bg-stone-50 p-2 rounded-lg">
        引用卡片会动态显示指定来源中某个问题的回答内容。正面显示问题，反面显示回答。
      </div>
    </div>
  );
};

// 原则库选择器组件（用于从原则库中选择特定原则）
const PrincipleLibrarySelector: React.FC<{
  selectedPrincipleId?: string;
  onSelect: (principle: { id: string; title: string; frontText: string; backText: string }) => void;
}> = ({ selectedPrincipleId, onSelect }) => {
  const [principles, setPrinciples] = useState<Array<{ id: string; title: string; frontText: string; backText: string }>>([]);

  useEffect(() => {
    // 加载原则库
    const loadPrinciples = () => {
      const stored = localStorage.getItem('lumostime_principles');
      if (stored) {
        setPrinciples(JSON.parse(stored));
      } else {
        // 如果没有存储，使用默认预设
        const defaultPrinciples = [
          {
            id: 'preset-1',
            title: '拥抱现实',
            frontText: '痛苦 + 反思 = 进步',
            backText: '接受现实，从中学习'
          },
          {
            id: 'preset-2',
            title: '极度求真',
            frontText: '真理比正确更重要',
            backText: '保持开放心态，追求真相'
          },
          {
            id: 'preset-3',
            title: '五步流程',
            frontText: '目标 → 问题 → 诊断 → 方案 → 执行',
            backText: '系统化解决问题'
          }
        ];
        setPrinciples(defaultPrinciples);
      }
    };

    loadPrinciples();

    // 监听原则库变化
    const handlePrincipleChange = () => {
      loadPrinciples();
    };
    window.addEventListener('principleLibraryChanged', handlePrincipleChange);
    return () => {
      window.removeEventListener('principleLibraryChanged', handlePrincipleChange);
    };
  }, []);

  const selectedPrinciple = principles.find(p => p.id === selectedPrincipleId);

  return (
    <div className="space-y-2">
      {principles.length === 0 ? (
        <div className="p-3 text-xs text-stone-400 text-center bg-stone-50 rounded-lg">
          暂无原则，请先在设置中添加
        </div>
      ) : (
        <>
          {selectedPrinciple && (
            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
              <div className="text-sm font-medium text-stone-800 mb-1">{selectedPrinciple.title}</div>
              <div className="text-xs text-stone-500">{selectedPrinciple.frontText}</div>
            </div>
          )}
          <CustomSelect
            value={selectedPrincipleId || ''}
            onChange={(value) => {
              const principle = principles.find(p => p.id === value);
              if (principle) {
                onSelect(principle);
              }
            }}
            options={principles.map(p => ({
              value: p.id,
              label: p.title,
              icon: null
            }))}
            placeholder="选择原则"
          />
        </>
      )}
    </div>
  );
};

// 原则选择器组件（已废弃，保留用于兼容）
const PrincipleSelector: React.FC<{
  onSelect: (principle: { title: string; frontText: string; backText: string }) => void;
}> = ({ onSelect }) => {
  const [principles, setPrinciples] = useState<Array<{ id: string; title: string; frontText: string; backText: string }>>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // 加载原则库
    const loadPrinciples = () => {
      const stored = localStorage.getItem('lumostime_principles');
      if (stored) {
        setPrinciples(JSON.parse(stored));
      } else {
        // 如果没有存储，使用默认预设
        const defaultPrinciples = [
          {
            id: 'preset-1',
            title: '拥抱现实',
            frontText: '痛苦 + 反思 = 进步',
            backText: '接受现实，从中学习'
          },
          {
            id: 'preset-2',
            title: '极度求真',
            frontText: '真理比正确更重要',
            backText: '保持开放心态，追求真相'
          },
          {
            id: 'preset-3',
            title: '五步流程',
            frontText: '目标 → 问题 → 诊断 → 方案 → 执行',
            backText: '系统化解决问题'
          }
        ];
        setPrinciples(defaultPrinciples);
      }
    };

    loadPrinciples();

    // 监听原则库变化
    const handlePrincipleChange = () => {
      loadPrinciples();
    };
    window.addEventListener('principleLibraryChanged', handlePrincipleChange);
    return () => {
      window.removeEventListener('principleLibraryChanged', handlePrincipleChange);
    };
  }, []);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors flex items-center justify-between"
      >
        <span className="text-stone-600">从原则库选择</span>
        <ChevronRight size={16} className={`text-stone-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-stone-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {principles.length === 0 ? (
            <div className="p-3 text-xs text-stone-400 text-center">
              暂无原则，请先在设置中添加
            </div>
          ) : (
            principles.map((principle) => (
              <button
                key={principle.id}
                type="button"
                onClick={() => {
                  onSelect(principle);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-stone-50 transition-colors border-b border-stone-100 last:border-b-0"
              >
                <div className="text-sm font-medium text-stone-800">{principle.title}</div>
                <div className="text-xs text-stone-500 mt-0.5 line-clamp-1">{principle.frontText}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// 应用跳转配置组件
const AppLaunchConfig: React.FC<{
  launchApp?: boolean;
  appPackageName?: string;
  appName?: string;
  onChange: (launchApp: boolean, appPackageName?: string, appName?: string) => void;
}> = ({ launchApp, appPackageName, appName, onChange }) => {
  const [showAppSelector, setShowAppSelector] = useState(false);

  return (
    <>
      <div className="pt-3 border-t border-stone-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <label className="text-xs sm:text-sm font-medium text-stone-700">
              点击时启动应用
            </label>
            <p className="text-[10px] sm:text-xs text-stone-500 mt-0.5">
              点击卡片时自动打开指定的外部应用
            </p>
          </div>
          <button
            onClick={() => {
              const newValue = !launchApp;
              onChange(newValue, appPackageName, appName);
              if (!newValue) {
                // 关闭时清除应用选择
                onChange(false, undefined, undefined);
              }
            }}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors`}
            style={{
              backgroundColor: launchApp ? 'var(--accent-color)' : '#d6d3d1'
            }}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                launchApp ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {launchApp && (
          <div className="space-y-2">
            {appPackageName && appName ? (
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-stone-800">{appName}</div>
                    <div className="text-xs text-stone-500 mt-0.5 break-all">{appPackageName}</div>
                  </div>
                  <button
                    onClick={() => setShowAppSelector(true)}
                    className="text-xs text-blue-500 hover:text-blue-600 ml-2"
                  >
                    更改
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAppSelector(true)}
                className="w-full px-3 py-2 text-sm border-2 border-dashed border-stone-300 rounded-lg hover:border-stone-400 hover:bg-stone-50 transition-colors text-stone-600"
              >
                + 选择应用
              </button>
            )}
          </div>
        )}
      </div>

      {showAppSelector && (
        <AppSelector
          selectedPackageName={appPackageName}
          selectedAppName={appName}
          onSelect={(packageName, name) => {
            onChange(true, packageName, name);
          }}
          onClose={() => setShowAppSelector(false)}
        />
      )}
    </>
  );
};
