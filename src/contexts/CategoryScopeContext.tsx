/**
 * @file CategoryScopeContext.tsx
 * @description Manages categories, scopes, goals, and major goals with async repository hydration and persistence.
 * @updated 2026-08-11: Reports failed category and goal hydration through the bootstrap recovery screen.
 */
import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { CATEGORIES, INITIAL_GOALS, SCOPES } from '../constants';
import { dataRepository } from '../repositories/dataRepository';
import { ActiveSession, Category, Goal, MajorGoal, Scope } from '../types';
import {
  getLocalDataTimestamp,
  isLocalDataTimestampUpdateLocked,
  updateLocalDataTimestamp
} from '../utils/localDataTimestamp';
import { reportCriticalDataError } from '../services/errorReporting';
import { setCategoryArchiveState } from '../utils/archiveUtils';

interface CategoryScopeContextType {
  isReady: boolean;

  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  handleUpdateCategories: (newCategories: Category[]) => void;
  handleUpdateCategory: (updatedCategory: Category) => void;

  scopes: Scope[];
  setScopes: React.Dispatch<React.SetStateAction<Scope[]>>;
  handleUpdateScopes: (newScopes: Scope[]) => void;

  goals: Goal[];
  setGoals: React.Dispatch<React.SetStateAction<Goal[]>>;

  majorGoals: MajorGoal[];
  setMajorGoals: React.Dispatch<React.SetStateAction<MajorGoal[]>>;

  handleUpdateActivity: (updatedActivity: any) => void;
  handleCategoryChange: (activityId: string, newCategoryId: string) => void;
}

const CategoryScopeContext = createContext<CategoryScopeContextType | undefined>(undefined);

export const useCategoryScope = () => {
  const context = useContext(CategoryScopeContext);
  if (!context) {
    throw new Error('useCategoryScope must be used within a CategoryScopeProvider');
  }
  return context;
};

interface CategoryScopeProviderProps {
  children: ReactNode;
  activeSessions: ActiveSession[];
  setActiveSessions: React.Dispatch<React.SetStateAction<ActiveSession[]>>;
  logs: any[];
  setLogs: React.Dispatch<React.SetStateAction<any[]>>;
}

export const CategoryScopeProvider: React.FC<CategoryScopeProviderProps> = ({
  children,
  activeSessions,
  setActiveSessions,
  logs,
  setLogs
}) => {
  const [isReady, setIsReady] = useState(false);
  const [canPersist, setCanPersist] = useState(false);
  const [categories, setCategories] = useState<Category[]>(CATEGORIES);
  const [scopes, setScopes] = useState<Scope[]>(SCOPES);
  const [goals, setGoals] = useState<Goal[]>(INITIAL_GOALS);
  const [majorGoals, setMajorGoals] = useState<MajorGoal[]>([]);
  const isHydratingRef = useRef(true);
  const isTimestampTrackingReadyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      let hydratedSuccessfully = false;

      try {
        const snapshot = await dataRepository.loadCategoryScopeSnapshot();
        if (cancelled) {
          return;
        }

        hydratedSuccessfully = true;
        setCategories(snapshot.categories);
        setScopes(snapshot.scopes);
        setGoals(snapshot.goals);
        setMajorGoals(snapshot.majorGoals);
      } catch (error) {
        console.error('[CategoryScopeContext] Failed to hydrate category/scope data from repository', error);
        if (!cancelled) {
          reportCriticalDataError(error, '读取本地分类和目标数据失败，请重试。', {
            dataArea: 'categories_and_goals'
          });
        }
      } finally {
        if (!cancelled) {
          setCanPersist(hydratedSuccessfully);
          setIsReady(true);
          window.setTimeout(() => {
            if (!cancelled) {
              isHydratingRef.current = false;
              isTimestampTrackingReadyRef.current = true;
            }
          }, 0);
        }
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isReady || !canPersist) {
      return;
    }

    void dataRepository.saveCategories(categories).catch((error) => {
      console.error('[CategoryScopeContext] Failed to persist categories', error);
    });
  }, [canPersist, isReady, categories]);

  useEffect(() => {
    if (!isReady || !canPersist) {
      return;
    }

    void dataRepository.saveScopes(scopes).catch((error) => {
      console.error('[CategoryScopeContext] Failed to persist scopes', error);
    });
  }, [canPersist, isReady, scopes]);

  useEffect(() => {
    if (!isReady || !canPersist) {
      return;
    }

    void dataRepository.saveGoals(goals).catch((error) => {
      console.error('[CategoryScopeContext] Failed to persist goals', error);
    });
  }, [canPersist, isReady, goals]);

  useEffect(() => {
    if (!isReady || !canPersist) {
      return;
    }

    void dataRepository.saveMajorGoals(majorGoals).catch((error) => {
      console.error('[CategoryScopeContext] Failed to persist major goals', error);
    });
  }, [canPersist, isReady, majorGoals]);

  useEffect(() => {
    if (!isReady || !canPersist || isHydratingRef.current || !isTimestampTrackingReadyRef.current) {
      return;
    }

    if (isLocalDataTimestampUpdateLocked()) {
      console.log('[CategoryScopeContext] Skipping local data timestamp update (locked during restore)');
      return;
    }

    const previous = getLocalDataTimestamp();
    const now = updateLocalDataTimestamp();
    console.log(
      `[CategoryScopeContext] Data changed, updated local timestamp: ${previous} -> ${now} (${new Date(now).toLocaleTimeString()})`
    );
  }, [canPersist, categories, goals, isReady, majorGoals, scopes]);

  const handleUpdateCategories = (newCategories: Category[]) => {
    setCategories(newCategories);

    setActiveSessions((prevSessions) => prevSessions.map((session) => {
      const category = newCategories.find((item) => item.id === session.categoryId);
      if (!category) {
        return session;
      }

      const activity = category.activities.find((item) => item.id === session.activityId);
      if (!activity) {
        return session;
      }

      if (session.activityName !== activity.name || session.activityIcon !== activity.icon) {
        return {
          ...session,
          activityName: activity.name,
          activityIcon: activity.icon,
          activityUiIcon: activity.uiIcon
        };
      }

      return session;
    }));
  };

  const handleUpdateCategory = (updatedCategory: Category) => {
    const nextCategory = updatedCategory.isArchived !== undefined
      ? setCategoryArchiveState(updatedCategory, updatedCategory.isArchived === true)
      : updatedCategory;

    setCategories((prev) => prev.map((category) => (
      category.id === nextCategory.id ? nextCategory : category
    )));

    setActiveSessions((prevSessions) => prevSessions.map((session) => {
      if (session.categoryId !== nextCategory.id) {
        return session;
      }

      const activity = nextCategory.activities.find((item) => item.id === session.activityId);
      if (!activity) {
        return session;
      }

      if (session.activityName !== activity.name || session.activityIcon !== activity.icon) {
        return {
          ...session,
          activityName: activity.name,
          activityIcon: activity.icon,
          activityUiIcon: activity.uiIcon
        };
      }

      return session;
    }));
  };

  const handleUpdateScopes = (newScopes: Scope[]) => {
    setScopes(newScopes);
  };

  const handleUpdateActivity = (updatedActivity: any) => {
    setCategories((prev) => prev.map((category) => {
      const activityIndex = category.activities.findIndex((activity) => activity.id === updatedActivity.id);
      if (activityIndex === -1) {
        return category;
      }

      const newActivities = [...category.activities];
      newActivities[activityIndex] = updatedActivity;
      return {
        ...category,
        activities: newActivities
      };
    }));

    setActiveSessions((prev) => prev.map((session) => {
      if (session.activityId !== updatedActivity.id) {
        return session;
      }

      return {
        ...session,
        activityName: updatedActivity.name,
        activityIcon: updatedActivity.icon
      };
    }));
  };

  const handleCategoryChange = (activityId: string, newCategoryId: string) => {
    let activityToMove: any | undefined;
    let oldCategoryId: string | undefined;

    for (const category of categories) {
      const foundActivity = category.activities.find((activity) => activity.id === activityId);
      if (foundActivity) {
        activityToMove = foundActivity;
        oldCategoryId = category.id;
        break;
      }
    }

    if (!activityToMove || !oldCategoryId || oldCategoryId === newCategoryId) {
      return;
    }

    setCategories((prev) => prev.map((category) => {
      if (category.id === oldCategoryId) {
        return {
          ...category,
          activities: category.activities.filter((activity) => activity.id !== activityId)
        };
      }

      if (category.id === newCategoryId) {
        return {
          ...category,
          activities: [...category.activities, activityToMove]
        };
      }

      return category;
    }));

    setLogs((prev) => prev.map((log) => {
      if (log.activityId === activityId) {
        return { ...log, categoryId: newCategoryId };
      }
      return log;
    }));

    setActiveSessions((prev) => prev.map((session) => {
      if (session.activityId === activityId) {
        return {
          ...session,
          categoryId: newCategoryId
        };
      }
      return session;
    }));
  };

  return (
    <CategoryScopeContext.Provider
      value={{
        isReady,
        categories,
        setCategories,
        handleUpdateCategories,
        handleUpdateCategory,
        scopes,
        setScopes,
        handleUpdateScopes,
        goals,
        setGoals,
        majorGoals,
        setMajorGoals,
        handleUpdateActivity,
        handleCategoryChange
      }}
    >
      {children}
    </CategoryScopeContext.Provider>
  );
};
