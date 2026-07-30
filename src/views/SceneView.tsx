/**
 * @file SceneView.tsx
 * @input Scene groups, cards, categories, todos, reviews, active sessions, and background settings
 * @output Interactive scene dashboard with quick actions, card status, and review navigation
 * @pos View (Scene)
 * @description Scene dashboard for time-slot cards, timer starts, todo focus, daily checks, stats, and review navigation.
 * @updated 2026-07-30: Removed historical mojibake comments and replaced garbled warning logs.
 * @updated 2026-07-22: Added the shared dark-mode background layering used by the main tab pages.
 * @updated 2026-05-11: Manual scene-group quick switching now follows the saved group order from SceneSettingsView.
 * @updated 2026-05-10: Timer and todo scene cards now auto-flip only when the current slot has a matching timeline record, and that forced back side disables swipe-to-front until the record condition clears.
 * @updated 2026-05-05: Reworked the custom-background surface stack so the whole scene page gets one shared base scrim and the right content panel adds a second warm overlay, matching TodoView and RecordView without a center seam.
 * @updated 2026-05-05: Fixed SceneView widget-session matching by reading active sessions from SessionContext instead of DataContext, preventing undefined access crashes in scene cards.
 * @updated 2026-05-05: Scoped scene-widget-triggered card flips to the tapped scene group and time slot so identical cards in other slots stay untouched.
 * @updated 2026-07-30: Excluded disabled daily check template items from scene check creation and actions.
 * @updated 2026-05-01: Added a manual-mode scene-group dropdown on the scene header chip so users can quickly switch groups directly from the scene page.
 * @updated 2026-04-25: Added flex min-height guards for the scene sidebar and card list so long card stacks keep scrolling instead of being clipped on some mobile WebViews.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Clock, ChevronDown, Check } from 'lucide-react';
import { IconRenderer } from '../components/IconRenderer';
import { UIIcon } from '../components/UIIcon';
import { SceneCard } from '../components/SceneCard';
import { TimeSlot, SceneCardData, Activity, Category, TodoItem, DailyReview, CheckItem, WeeklyReview, MonthlyReview, AppView, SceneGroupState } from '../types';
import { DEFAULT_SCENE_PRESETS } from '../constants/scenePresets';
import { useReview } from '../contexts/ReviewContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import { useToast } from '../contexts/ToastContext';
import { useSettings } from '../contexts/SettingsContext';
import { getLocalDateStr } from '../utils/dateUtils';
import { findAutoSwitchTargetGroup, getActiveSceneGroup, loadSceneGroupStateFromStorage, saveSceneGroupStateToStorage } from '../utils/sceneGroupStorage';
import { updateLocalDataTimestamp } from '../utils/localDataTimestamp';
import { useBackgroundDisplay } from '../hooks/useBackgroundDisplay';
import { doesSceneCardMatchCurrentSlotTimeline, getCurrentSceneSlotWindow } from '../utils/sceneTimelineMatchUtils';
import { isCheckTemplateItemEnabled } from '../utils/dailyCheckUtils';

interface SceneViewProps {
  onConfigureSlots?: () => void;
  onStartActivity: (activity: Activity, categoryId: string, autoEnterFocus?: boolean) => void;
  onStartTodoFocus?: (todo: TodoItem, autoEnterFocus?: boolean) => void;
  onAddLog?: (startTime?: number, endTime?: number, prefilledData?: { categoryId?: string; activityId?: string; linkedTodoId?: string }) => void;
  categories: Category[];
  todos?: TodoItem[];
}

export const SceneView: React.FC<SceneViewProps> = ({ 
  onConfigureSlots,
  onStartActivity,
  onStartTodoFocus,
  onAddLog,
  categories,
  todos = []
}) => {
  const { dailyReviews, checkTemplates, reviewTemplates, setDailyReviews, weeklyReviews, setWeeklyReviews, monthlyReviews, setMonthlyReviews } = useReview();
  const { logs } = useData();
  const { activeSessions } = useSession();
  const { addToast } = useToast();
  const { sceneCardTimerMode } = useSettings();
  const { 
    setCurrentView, 
    setIsDailyReviewOpen, 
    setCurrentReviewDate, 
    setIsWeeklyReviewOpen, 
    setCurrentWeeklyReviewStart,
    setCurrentWeeklyReviewEnd,
    setIsMonthlyReviewOpen, 
    setCurrentMonthlyReviewStart,
    setCurrentMonthlyReviewEnd,
    setPreviousView,
    setStatsRange
  } = useNavigation();
  const { backgroundUrl, hasBackground, panelOverlayOpacity, useReducedEffects } = useBackgroundDisplay();
  const pageOverlayOpacity = hasBackground
    ? Math.min(0.64, Math.max(0.46, panelOverlayOpacity + 0.06))
    : 0.5;
  const pageSurfaceColor = `rgba(250, 249, 246, ${pageOverlayOpacity})`;
  const panelLayerOpacity = hasBackground
    ? Math.max(0.18, panelOverlayOpacity - 0.08)
    : panelOverlayOpacity;
  const panelSurfaceColor = `rgba(250, 249, 246, ${panelLayerOpacity})`;
  
  const [sceneGroupState, setSceneGroupState] = useState<SceneGroupState>(() => loadSceneGroupStateFromStorage());
  const activeGroup = getActiveSceneGroup(sceneGroupState);
  const matchedAutoGroup = sceneGroupState.switchMode === 'auto'
    ? findAutoSwitchTargetGroup(sceneGroupState, new Date())
    : null;
  const displayedGroup = matchedAutoGroup || activeGroup;
  const timeSlots: TimeSlot[] = displayedGroup?.timeSlots || DEFAULT_SCENE_PRESETS;
  
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);
  const [isGroupMenuOpen, setIsGroupMenuOpen] = useState(false);
  const groupMenuRef = useRef<HTMLDivElement | null>(null);
  
  const [statsUpdateTrigger, setStatsUpdateTrigger] = useState(0);
  const isManualSceneGroupMode = sceneGroupState.switchMode !== 'auto';

  const loadSceneGroups = () => {
    const loaded = loadSceneGroupStateFromStorage();
    setSceneGroupState(loaded);
  };

  const persistSceneGroupState = (nextState: SceneGroupState) => {
    const saved = saveSceneGroupStateToStorage(nextState);
    setSceneGroupState(saved);
    updateLocalDataTimestamp();
    window.dispatchEvent(new Event('sceneGroupsUpdated'));
    window.dispatchEvent(new Event('sceneTimeSlotsUpdated'));
  };

  const handleManualGroupSelect = (groupId: string) => {
    setIsGroupMenuOpen(false);
    if (!isManualSceneGroupMode || sceneGroupState.activeGroupId === groupId) {
      return;
    }
    const exists = sceneGroupState.groups.some(group => group.id === groupId);
    if (!exists) {
      return;
    }
    persistSceneGroupState({
      ...sceneGroupState,
      activeGroupId: groupId
    });
  };

  useEffect(() => {
    loadSceneGroups();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sceneGroupState' || e.key === 'sceneTimeSlots') {
        loadSceneGroups();
      }
    };

    const handleSceneUpdate = () => {
      loadSceneGroups();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('sceneGroupsUpdated', handleSceneUpdate);
    window.addEventListener('sceneTimeSlotsUpdated', handleSceneUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sceneGroupsUpdated', handleSceneUpdate);
      window.removeEventListener('sceneTimeSlotsUpdated', handleSceneUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadSceneGroups();
      }
    };
    const handleFocus = () => {
      loadSceneGroups();
    };
    const handleRecordViewActivated = () => {
      loadSceneGroups();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('recordViewActivated', handleRecordViewActivated);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('recordViewActivated', handleRecordViewActivated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isGroupMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (groupMenuRef.current && !groupMenuRef.current.contains(event.target as Node)) {
        setIsGroupMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isGroupMenuOpen]);

  useEffect(() => {
    if (!isManualSceneGroupMode) {
      setIsGroupMenuOpen(false);
    }
  }, [isManualSceneGroupMode]);

  useEffect(() => {
    setIsGroupMenuOpen(false);
  }, [sceneGroupState.activeGroupId]);

  const getCurrentTimeSlotIndex = (): number => {
    if (timeSlots.length === 0) return 0;
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    for (let i = 0; i < timeSlots.length; i++) {
      const slot = timeSlots[i];
      
      if (slot.disableAutoSwitch) {
        continue;
      }
      
      const [startHour, startMin] = slot.startTime.split(':').map(Number);
      const [endHour, endMin] = slot.endTime.split(':').map(Number);
      
      let startMinutes = startHour * 60 + startMin;
      let endMinutes = endHour * 60 + endMin;
      
      if (endMinutes < startMinutes) {
        if (currentMinutes >= startMinutes || currentMinutes < endMinutes) {
          return i;
        }
      } else {
        if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
          return i;
        }
      }
    }
    
    return 0;
  };

  useEffect(() => {
    if (timeSlots.length === 0) return;
    
    const autoSlotIndex = getCurrentTimeSlotIndex();
    
    const savedSlotKey = `lastSelectedSlotIndex_${displayedGroup.id}`;
    const savedSlotIndex = localStorage.getItem(savedSlotKey);
    
    let targetIndex = autoSlotIndex;
    
    if (savedSlotIndex !== null) {
      const savedIndex = parseInt(savedSlotIndex, 10);
      
      if (savedIndex >= 0 && savedIndex < timeSlots.length) {
        const currentSlot = timeSlots[autoSlotIndex];
        const savedSlot = timeSlots[savedIndex];
        
        if (savedSlot.disableAutoSwitch || currentSlot.disableAutoSwitch) {
          targetIndex = savedIndex;
        }
      }
    }
    
    setSelectedSlotIndex(targetIndex);
    
    const handleVisibilityChange = () => {
      if (!document.hidden && timeSlots.length > 0) {
        const autoIndex = getCurrentTimeSlotIndex();
        const currentSlot = timeSlots[selectedSlotIndex];
        
        if (!currentSlot?.disableAutoSwitch) {
          setSelectedSlotIndex(autoIndex);
        }
      }
    };
    
    const handleFocus = () => {
      if (timeSlots.length > 0) {
        const autoIndex = getCurrentTimeSlotIndex();
        const currentSlot = timeSlots[selectedSlotIndex];
        
        if (!currentSlot?.disableAutoSwitch) {
          setSelectedSlotIndex(autoIndex);
        }
      }
    };
    
    const handleRecordViewActivated = () => {
      if (timeSlots.length > 0) {
        const autoIndex = getCurrentTimeSlotIndex();
        const currentSlot = timeSlots[selectedSlotIndex];
        
        if (!currentSlot?.disableAutoSwitch) {
          setSelectedSlotIndex(autoIndex);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('recordViewActivated', handleRecordViewActivated);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('recordViewActivated', handleRecordViewActivated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeSlots, displayedGroup.id]);

  useEffect(() => {
    if (timeSlots.length > 0 && selectedSlotIndex >= 0) {
      const savedSlotKey = `lastSelectedSlotIndex_${displayedGroup.id}`;
      localStorage.setItem(savedSlotKey, selectedSlotIndex.toString());
    }
  }, [selectedSlotIndex, timeSlots, displayedGroup.id]);

  const currentSlot = timeSlots[selectedSlotIndex];
  const currentCards = currentSlot?.cards || [];
  const currentSlotWindow = currentSlot ? getCurrentSceneSlotWindow(currentSlot, new Date()) : null;

  useEffect(() => {
    const hasStatsCard = currentCards.some(card => card.type === 'stats');
    
    if (!hasStatsCard) {
      return;
    }
    
    const interval = setInterval(() => {
      setStatsUpdateTrigger(prev => prev + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, [currentCards]);

  const calculateStatsDuration = (filterActivityIds?: string[]): string => {
    const minutes = calculateStatsDurationMinutes(filterActivityIds);
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    } else {
      return `${mins}m`;
    }
  };

  const getReferencedContent = (
    sourceType: 'dailyReview' | 'weeklyReview' | 'monthlyReview',
    dateOffset: 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth',
    questionId: string
  ): { question: string; answer: string } | null => {
    const getTargetDate = (): string => {
      const today = new Date();
      
      if (sourceType === 'dailyReview') {
        if (dateOffset === 'today') {
          return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        } else if (dateOffset === 'yesterday') {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          return `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
        }
      } else if (sourceType === 'weeklyReview') {
        const dayOfWeek = today.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(today);
        monday.setDate(today.getDate() + diff);
        
        if (dateOffset === 'lastWeek') {
          monday.setDate(monday.getDate() - 7);
        }
        
        return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
      } else if (sourceType === 'monthlyReview') {
        let year = today.getFullYear();
        let month = today.getMonth() + 1;
        
        if (dateOffset === 'lastMonth') {
          month -= 1;
          if (month === 0) {
            month = 12;
            year -= 1;
          }
        }
        
        return `${year}-${String(month).padStart(2, '0')}-01`;
      }
      
      return '';
    };
    
    const targetDate = getTargetDate();
    if (!targetDate) return null;
    
    let review: DailyReview | WeeklyReview | MonthlyReview | undefined;
    
    if (sourceType === 'dailyReview') {
      review = dailyReviews.find(r => r.date === targetDate);
    } else if (sourceType === 'weeklyReview') {
      review = weeklyReviews.find(r => r.weekStartDate === targetDate);
    } else if (sourceType === 'monthlyReview') {
      review = monthlyReviews.find(r => r.monthStartDate === targetDate);
    }
    
    if (!review) return null;
    
    const answer = review.answers.find(a => a.questionId === questionId);
    if (!answer) return null;
    
    return {
      question: answer.question,
      answer: answer.answer
    };
  };

  const calculateStatsDurationMinutes = (filterActivityIds?: string[]): number => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    const currentTime = Date.now();

    const dayLogs = logs.filter(log => {
      return log.startTime >= startOfDay.getTime() && log.startTime <= endOfDay.getTime();
    });

    let totalSeconds = 0;

    dayLogs.forEach(log => {
      if (filterActivityIds && filterActivityIds.length > 0) {
        if (filterActivityIds.includes(log.activityId)) {
          totalSeconds += log.duration;
        }
      } else {
        totalSeconds += log.duration;
      }
    });

    if (activeSessions && activeSessions.length > 0) {
      activeSessions.forEach(session => {
        if (session.startTime >= startOfDay.getTime() && session.startTime <= endOfDay.getTime()) {
          let shouldCount = false;
          
          if (filterActivityIds && filterActivityIds.length > 0) {
            shouldCount = filterActivityIds.includes(session.activityId);
          } else {
            shouldCount = true;
          }
          
          if (shouldCount) {
            const sessionDuration = Math.floor((currentTime - session.startTime) / 1000);
            totalSeconds += sessionDuration;
          }
        }
      });
    }

    return Math.floor(totalSeconds / 60);
  };

  if (timeSlots.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-[#faf9f6]">
        <div className="text-center">
          <p className="text-stone-400 mb-4">No scene configuration yet.</p>
          {onConfigureSlots && (
            <button
              onClick={onConfigureSlots}
              className="px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors"
            >
              Open settings
            </button>
          )}
        </div>
      </div>
    );
  }

  const handleCardAction = (action: SceneCardData['action'], autoEnterFocus?: boolean) => {
    if (sceneCardTimerMode === 'backfill' && (action.type === 'startTimer' || action.type === 'startTodo')) {
      if (!onAddLog) {
        addToast('error', 'The selected activity could not be found.');
        return;
      }

      const now = Date.now();
      const sortedLogs = [...logs].sort((a, b) => b.endTime - a.endTime);
      const lastLog = sortedLogs[0];
      const startTime = lastLog ? lastLog.endTime : now - 3600000;
      
      const prefilledData: { categoryId?: string; activityId?: string; linkedTodoId?: string } = {};
      
      if (action.type === 'startTimer' && action.activityId && action.categoryId) {
        const category = categories.find(c => c.id === action.categoryId);
        const activity = category?.activities.find(a => a.id === action.activityId);
        
        if (activity && category) {
          prefilledData.categoryId = category.id;
          prefilledData.activityId = activity.id;
        } else {
          addToast('error', 'The selected activity could not be found.');
          return;
        }
      } else if (action.type === 'startTodo' && action.todoId) {
        const todo = todos.find(t => t.id === action.todoId);
        
        if (todo) {
          prefilledData.linkedTodoId = todo.id;
        } else {
          addToast('error', 'The selected activity could not be found.');
          return;
        }
      }
      
      onAddLog(startTime, now, prefilledData);
      return;
    }

    switch (action.type) {
      case 'startTimer':
        if (action.activityId && action.categoryId) {
          const category = categories.find(c => c.id === action.categoryId);
          const activity = category?.activities.find(a => a.id === action.activityId);
          
          if (activity && category) {
            onStartActivity(activity, category.id, autoEnterFocus);
          } else {
            addToast('error', 'The selected activity could not be found.');
          }
        }
        break;
      case 'startTodo':
        if (action.todoId && onStartTodoFocus) {
          const todo = todos.find(t => t.id === action.todoId);
          
          if (todo) {
            onStartTodoFocus(todo, autoEnterFocus);
          } else {
            addToast('error', 'The selected activity could not be found.');
          }
        }
        break;
      case 'toggleCheck':
        if (action.checkItemId) {
          handleToggleCheckItem(action.checkItemId, action.checkActionMode);
        }
        break;
      case 'navigate':
        if (action.targetView) {
          handleNavigation(action.targetView);
        }
        break;
    }
  };

  const getCheckTemplateMeta = (
    checkItemId: string
  ): { content: string; category: string; manualMode: 'binary' | 'count'; targetCount: number } | null => {
    for (const template of checkTemplates) {
      if (!template.enabled || !template.isDaily) {
        continue;
      }

      const item = template.items.find(i => i.id === checkItemId && isCheckTemplateItemEnabled(i));
      if (item) {
        const manualMode = item.type === 'auto'
          ? 'binary'
          : (item.manualMode === 'count' ? 'count' : 'binary');
        const targetCount = manualMode === 'count'
          ? Math.max(1, Math.floor(Number(item.targetCount) || 1))
          : 1;
        return {
          content: item.content,
          category: template.title,
          manualMode,
          targetCount
        };
      }
    }
    return null;
  };

  const findCheckItemIndexInReview = (review: DailyReview, checkItemId: string): number => {
    const checkItems = review.checkItems || [];
    const idMatchedIndex = checkItems.findIndex(item => item.id === checkItemId);
    if (idMatchedIndex >= 0) {
      return idMatchedIndex;
    }

    const templateMeta = getCheckTemplateMeta(checkItemId);
    if (!templateMeta) {
      return -1;
    }

    const categoryAndContentMatchedIndex = checkItems.findIndex(item =>
      item.category === templateMeta.category && item.content === templateMeta.content
    );
    if (categoryAndContentMatchedIndex >= 0) {
      return categoryAndContentMatchedIndex;
    }

    return checkItems.findIndex(item => item.content === templateMeta.content);
  };

  const getCountState = (item: CheckItem) => {
    const target = Math.max(1, Math.floor(item.targetCount || 1));
    const currentRaw = typeof item.currentCount === 'number'
      ? item.currentCount
      : (item.isCompleted ? target : 0);
    const current = Math.min(target, Math.max(0, Math.floor(currentRaw)));
    return {
      current,
      target,
      isCompleted: current >= target
    };
  };

  const buildCheckCategorySyncMap = (): { [category: string]: boolean } => {
    const syncMap: { [category: string]: boolean } = {};
    checkTemplates
      .filter(template => template.enabled && template.isDaily)
      .sort((a, b) => a.order - b.order)
      .forEach(template => {
        syncMap[template.title] = template.syncToTimeline || false;
      });
    return syncMap;
  };

  const buildDailyCheckItems = (): CheckItem[] => {
    const checkItems: CheckItem[] = [];

    checkTemplates
      .filter(template => template.enabled && template.isDaily)
      .sort((a, b) => a.order - b.order)
      .forEach(template => {
        template.items.forEach(item => {
          if (!isCheckTemplateItemEnabled(item)) {
            return;
          }

          const type = item.type || 'manual';
          const manualMode = type === 'manual'
            ? (item.manualMode === 'count' ? 'count' : 'binary')
            : undefined;
          const targetCount = type === 'manual'
            ? (manualMode === 'count'
              ? Math.max(1, Math.floor(Number(item.targetCount) || 1))
              : 1)
            : undefined;
          checkItems.push({
            id: item.id || crypto.randomUUID(),
            category: template.title,
            content: item.content,
            icon: item.icon,
            uiIcon: item.uiIcon,
            isCompleted: false,
            type,
            manualMode,
            currentCount: type === 'manual' ? 0 : undefined,
            targetCount,
            autoConfig: item.autoConfig
          });
        });
      });

    return checkItems;
  };

  const buildDailyTemplateSnapshot = () => {
    return reviewTemplates
      .filter(t => t.isDailyTemplate)
      .sort((a, b) => a.order - b.order)
      .map(t => ({
        id: t.id,
        title: t.title,
        questions: t.questions,
        order: t.order,
        syncToTimeline: t.syncToTimeline
      }));
  };

  const createDailyReviewFromTemplates = (dateStr: string): DailyReview => {
    const now = Date.now();
    return {
      id: crypto.randomUUID(),
      date: dateStr,
      createdAt: now,
      updatedAt: now,
      answers: [],
      checkItems: buildDailyCheckItems(),
      checkCategorySyncToTimeline: buildCheckCategorySyncMap(),
      templateSnapshot: buildDailyTemplateSnapshot()
    };
  };

  const normalizeDailyReviewForScene = (review: DailyReview): DailyReview => {
    let updatedReview = review;

    if (!updatedReview.checkCategorySyncToTimeline) {
      const syncMap = buildCheckCategorySyncMap();
      const itemCategories = (updatedReview.checkItems || [])
        .map(item => item.category)
        .filter((category): category is string => Boolean(category));
      itemCategories.forEach(category => {
        if (typeof syncMap[category] === 'undefined') {
          syncMap[category] = false;
        }
      });
      updatedReview = {
        ...updatedReview,
        checkCategorySyncToTimeline: syncMap
      };
    }

    if (!updatedReview.templateSnapshot) {
      updatedReview = {
        ...updatedReview,
        templateSnapshot: buildDailyTemplateSnapshot()
      };
    }

    return updatedReview;
  };

  const handleToggleCheckItem = (
    checkItemId: string,
    actionMode: SceneCardData['action']['checkActionMode'] = 'toggle'
  ) => {
    if (!getCheckTemplateMeta(checkItemId)) {
      addToast('error', 'The selected activity could not be found.');
      return;
    }

    const today = new Date();
    const dateStr = getLocalDateStr(today); // YYYY-MM-DD

    let todayReview = dailyReviews.find(r => r.date === dateStr);

    if (!todayReview) {
      todayReview = createDailyReviewFromTemplates(dateStr);
    } else {
      todayReview = normalizeDailyReviewForScene(todayReview);
    }

    const checkItems = todayReview.checkItems || [];
    const checkItemIndex = findCheckItemIndexInReview(todayReview, checkItemId);

    if (checkItemIndex === -1) {
      console.warn('[SceneView] Daily check item not found:', checkItemId);
      addToast('error', 'The selected activity could not be found.');
      return;
    }

    const updatedCheckItems = [...checkItems];
    const matchedItem = updatedCheckItems[checkItemIndex];
    if (matchedItem.type === 'auto') {
      addToast('error', 'The selected activity could not be found.');
      return;
    }

    const effectiveActionMode = actionMode || 'toggle';
    let nextItem: CheckItem;
    if (matchedItem.manualMode === 'count') {
      const { current, target, isCompleted } = getCountState(matchedItem);
      const nextCurrent = effectiveActionMode === 'reset'
        ? 0
        : (effectiveActionMode === 'increment'
          ? Math.min(target, current + 1)
          : (isCompleted ? Math.max(0, current - 1) : Math.min(target, current + 1)));
      nextItem = {
        ...matchedItem,
        id: checkItemId,
        manualMode: 'count',
        targetCount: target,
        currentCount: nextCurrent,
        isCompleted: nextCurrent >= target
      };
    } else {
      const isCompleted = effectiveActionMode === 'reset'
        ? false
        : (effectiveActionMode === 'increment' ? true : !matchedItem.isCompleted);
      nextItem = {
        ...matchedItem,
        id: checkItemId,
        manualMode: 'binary',
        targetCount: 1,
        currentCount: isCompleted ? 1 : 0,
        isCompleted
      };
    }

    updatedCheckItems[checkItemIndex] = {
      ...nextItem
    };

    const updatedReview: DailyReview = {
      ...todayReview,
      checkItems: updatedCheckItems,
      updatedAt: Date.now()
    };

    const existingReviewIndex = dailyReviews.findIndex(r => r.date === dateStr);
    if (existingReviewIndex >= 0) {
      setDailyReviews(dailyReviews.map(r => r.date === dateStr ? updatedReview : r));
    } else {
      setDailyReviews([...dailyReviews, updatedReview]);
    }
  };

  const getCheckItemProgress = (checkItemId: string): {
    isCompleted: boolean;
    manualMode: 'binary' | 'count';
    currentCount: number;
    targetCount: number;
  } => {
    const today = new Date();
    const dateStr = getLocalDateStr(today);
    const todayReview = dailyReviews.find(r => r.date === dateStr);
    const templateMeta = getCheckTemplateMeta(checkItemId);
    if (!templateMeta) {
      return {
        isCompleted: false,
        manualMode: 'binary',
        currentCount: 0,
        targetCount: 1
      };
    }

    const defaultManualMode = templateMeta?.manualMode || 'binary';
    const defaultTarget = templateMeta?.targetCount || 1;
    
    if (!todayReview || !todayReview.checkItems) {
      return {
        isCompleted: false,
        manualMode: defaultManualMode,
        currentCount: 0,
        targetCount: defaultTarget
      };
    }

    const checkItemIndex = findCheckItemIndexInReview(todayReview, checkItemId);
    if (checkItemIndex === -1) {
      return {
        isCompleted: false,
        manualMode: defaultManualMode,
        currentCount: 0,
        targetCount: defaultTarget
      };
    }

    const item = todayReview.checkItems[checkItemIndex];
    if (!item) {
      return {
        isCompleted: false,
        manualMode: defaultManualMode,
        currentCount: 0,
        targetCount: defaultTarget
      };
    }
    if (item.type !== 'auto' && item.manualMode === 'count') {
      const { current, target, isCompleted } = getCountState(item);
      return {
        isCompleted,
        manualMode: 'count',
        currentCount: current,
        targetCount: target
      };
    }
    return {
      isCompleted: item.isCompleted || false,
      manualMode: 'binary',
      currentCount: item.isCompleted ? 1 : 0,
      targetCount: 1
    };
  };

  const getCheckItemContent = (checkItemId: string): string | undefined => {
    const templateMeta = getCheckTemplateMeta(checkItemId);
    if (templateMeta) {
      return templateMeta.content;
    }

    if (!checkTemplates || checkTemplates.length === 0) {
      return undefined;
    }
    
    for (const template of checkTemplates) {
      if (!template.enabled || !template.isDaily) {
        continue;
      }

      const item = template.items.find(i => i.id === checkItemId && isCheckTemplateItemEnabled(i));
      if (item) {
        return item.content;
      }
    }
    return undefined;
  };

  const handleNavigation = (targetView: string) => {
    // Set Scene as the previous view before navigating away
    setPreviousView(AppView.SCENE);
    
    switch (targetView) {
      case 'daily-review-today':
        handleNavigateToDailyReview(0);
        break;
      case 'daily-review-yesterday':
        handleNavigateToDailyReview(-1);
        break;
      case 'weekly-review':
        handleNavigateToWeeklyReview();
        break;
      case 'monthly-review':
        handleNavigateToMonthlyReview();
        break;
      case 'stats-today':
        setStatsRange('day');
        setCurrentView(AppView.STATS);
        break;
      case 'stats-week':
        setStatsRange('week');
        setCurrentView(AppView.STATS);
        break;
      default:
        console.warn('[SceneView] Unknown navigation target:', targetView);
    }
  };

  const handleNavigateToDailyReview = (dayOffset: number) => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + dayOffset);
    const dateStr = getLocalDateStr(targetDate);

    let review = dailyReviews.find(r => r.date === dateStr);
    let shouldPersistReview = false;

    if (!review) {
      review = createDailyReviewFromTemplates(dateStr);
      shouldPersistReview = true;
    } else {
      const normalizedReview = normalizeDailyReviewForScene(review);
      if (normalizedReview !== review) {
        review = normalizedReview;
        shouldPersistReview = true;
      }
    }

    if (shouldPersistReview && review) {
      const exists = dailyReviews.some(r => r.date === dateStr);
      if (exists) {
        setDailyReviews(dailyReviews.map(r => r.date === dateStr ? review : r));
      } else {
        setDailyReviews([...dailyReviews, review]);
      }
    }

    setCurrentReviewDate(targetDate);
    setIsDailyReviewOpen(true);
  };

  const handleNavigateToWeeklyReview = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    let review = weeklyReviews.find(r => r.weekStartDate === weekStartStr);

    if (!review) {
      review = {
        id: `weekly-${Date.now()}`,
        weekStartDate: weekStartStr,
        weekEndDate: weekEndStr,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        answers: []
      };

      setWeeklyReviews([...weeklyReviews, review]);
    }

    setCurrentWeeklyReviewStart(weekStart);
    setCurrentWeeklyReviewEnd(weekEnd);
    setIsWeeklyReviewOpen(true);
  };

  const handleNavigateToMonthlyReview = () => {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const monthStartStr = monthStart.toISOString().split('T')[0];
    const monthEndStr = monthEnd.toISOString().split('T')[0];

    let review = monthlyReviews.find(r => r.monthStartDate === monthStartStr);

    if (!review) {
      review = {
        id: `monthly-${Date.now()}`,
        monthStartDate: monthStartStr,
        monthEndDate: monthEndStr,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        answers: []
      };

      setMonthlyReviews([...monthlyReviews, review]);
    }

    setCurrentMonthlyReviewStart(monthStart);
    setCurrentMonthlyReviewEnd(monthEnd);
    setIsMonthlyReviewOpen(true);
  };

  return (
    <div 
      className="flex h-full min-h-0 relative isolate"
      style={{
        backgroundColor: hasBackground ? 'transparent' : '#faf9f6'
      }}
    >
      {hasBackground && (
        <div 
          className="absolute inset-0 -z-20"
          style={{
            backgroundImage: `url(${backgroundUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            transform: 'translateZ(0)'
          }}
        />
      )}
      
      <div className="page-background-overlay absolute inset-0 -z-10" style={{ backgroundColor: pageSurfaceColor }}></div>

      <div className="flex-shrink-0 flex h-full min-h-0 flex-col overflow-y-auto pt-6 pb-20 pl-0 pr-2 no-scrollbar z-0 transition-all duration-300 relative w-16 items-center">
        <div className="flex-1 w-full">
          {timeSlots.map((slot, index) => {
            const isSelected = selectedSlotIndex === index;
            return (
              <button
                key={slot.id}
                onClick={() => {
                  setSelectedSlotIndex(index);
                }}
                className={`
                  flex items-center justify-center gap-2 mb-1 transition-all duration-200 text-left relative rounded-r-2xl group
                  w-12 h-12 md:w-14 md:h-14
                  ${isSelected
                    ? 'text-stone-900 font-bold bg-white shadow-[2px_2px_10px_rgba(0,0,0,0.02)] z-10'
                    : 'text-stone-600 hover:text-stone-800'
                  }
                `}
                title={slot.name}
              >
                {isSelected && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full" style={{ backgroundColor: 'var(--accent-color)' }}></div>
                )}
                <div className="flex-shrink-0">
                  <IconRenderer 
                    icon={slot.icon || 'clock'}
                    uiIcon={slot.uiIcon}
                    size={20}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div 
        className="flex-1 min-h-0 overflow-hidden flex flex-col p-5 md:p-10 rounded-tl-[2rem] shadow-[-5px_0_20px_rgba(0,0,0,0.08)] z-10 ml-[-10px] relative"
        id="scene-content"
      >
        <div 
          className={`page-content-panel absolute inset-0 -z-10 rounded-tl-[2rem] ${useReducedEffects ? '' : 'backdrop-blur-sm'}`}
          style={{
            backgroundColor: panelSurfaceColor
          }}
        />

        <div className="mb-8 md:mb-10 flex items-center mt-2 md:mt-0">
          <h1 className="text-xl md:text-2xl font-mono font-light text-stone-600 tracking-tight">
            {currentSlot.displayTitle || `${currentSlot.startTime} - ${currentSlot.endTime}`}
          </h1>
          <div className="h-px flex-1 bg-stone-100 mx-4"></div>
          {isManualSceneGroupMode ? (
            <div ref={groupMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsGroupMenuOpen(prev => !prev)}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] md:text-xs text-stone-500 border border-stone-200 rounded-full bg-white/70 transition-colors hover:border-stone-300 hover:text-stone-700"
                aria-haspopup="menu"
                aria-expanded={isGroupMenuOpen}
                title="切换场景组"
              >
                <span>{displayedGroup.name}</span>
                <ChevronDown size={12} className={`transition-transform ${isGroupMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isGroupMenuOpen && (
                <div className="scene-group-menu absolute right-0 top-full z-30 mt-2 min-w-[10rem] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
                  <div className="max-h-72 overflow-y-auto py-1">
                    {sceneGroupState.groups.map((group) => {
                      const isSelected = group.id === sceneGroupState.activeGroupId;
                      return (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => handleManualGroupSelect(group.id)}
                          className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors ${
                            isSelected ? 'scene-group-menu-selected font-bold' : 'text-stone-700 hover:bg-stone-50'
                          }`}
                          style={isSelected ? {
                            backgroundColor: 'color-mix(in srgb, var(--accent-color) 12%, white)',
                            color: 'var(--accent-color)'
                          } : undefined}
                        >
                          <span className="truncate">{group.name}</span>
                          {isSelected && <Check size={15} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <span className="px-2 py-0.5 text-[11px] md:text-xs text-stone-500 border border-stone-200 rounded-full bg-white/70">
              {displayedGroup.name}
            </span>
          )}
        </div>

        <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto pb-24 no-scrollbar">
          {currentCards.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center text-stone-400">
                <p className="text-sm leading-relaxed">No cards in this scene yet. Open scene settings to add cards and quick actions.</p>
              </div>
            </div>
          ) : (
            currentCards.map((card) => {
              let cardWithStatus = card;
              
              if (card.type === 'checklist' && card.action.checkItemId) {
                const progress = getCheckItemProgress(card.action.checkItemId);
                const checkItemContent = getCheckItemContent(card.action.checkItemId);
                cardWithStatus = { 
                  ...card, 
                  isCompleted: progress.isCompleted,
                  checkItemContent,
                  checkManualMode: progress.manualMode,
                  checkCurrentCount: progress.currentCount,
                  checkTargetCount: progress.targetCount
                };
              }
              
              if (card.type === 'stats') {
                const statValue = calculateStatsDuration(card.filterActivityIds);
                const statMinutes = calculateStatsDurationMinutes(card.filterActivityIds);
                cardWithStatus = { 
                  ...cardWithStatus, 
                  statValue,
                  statMinutes
                };
              }
              
              if (card.type === 'reference' && card.action.type === 'reference') {
                const { sourceType, dateOffset, questionId, fallbackText } = card.action;
                
                if (sourceType && dateOffset && questionId) {
                  const referenced = getReferencedContent(sourceType, dateOffset, questionId);
                  
                  if (referenced) {
                    cardWithStatus = {
                      ...cardWithStatus,
                      referencedQuestion: referenced.question,
                      referencedAnswer: referenced.answer
                    };
                  } else {
                    cardWithStatus = {
                      ...cardWithStatus,
                      referencedQuestion: fallbackText || 'No synced content yet.',
                      referencedAnswer: fallbackText || 'No synced content yet.'
                    };
                  }
                }
              }
              
              return (
                <SceneCard
                  key={card.id}
                  data={cardWithStatus}
                  dailyReviews={dailyReviews}
                  logs={logs}
                  onAction={handleCardAction}
                  sceneCardTimerMode={sceneCardTimerMode}
                  forceBackSide={doesSceneCardMatchCurrentSlotTimeline(card, logs, currentSlotWindow)}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
