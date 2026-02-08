/**
 * @file CategoryScopeContext.tsx
 * @description 管理 Categories、Scopes、Goals 的状态和逻辑
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Category, Goal, ActiveSession, Scope } from '../types';
import { CATEGORIES, SCOPES, INITIAL_GOALS } from '../constants';

interface CategoryScopeContextType {
    // Categories
    categories: Category[];
    setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
    handleUpdateCategories: (newCategories: Category[]) => void;
    handleUpdateCategory: (updatedCategory: Category) => void;

    // Scopes
    scopes: Scope[];
    setScopes: React.Dispatch<React.SetStateAction<Scope[]>>;
    handleUpdateScopes: (newScopes: Scope[]) => void;

    // Goals
    goals: Goal[];
    setGoals: React.Dispatch<React.SetStateAction<Goal[]>>;

    // Activity管理
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
    logs: any[];  // Log[] type
    setLogs: React.Dispatch<React.SetStateAction<any[]>>;
}

export const CategoryScopeProvider: React.FC<CategoryScopeProviderProps> = ({
    children,
    activeSessions,
    setActiveSessions,
    logs,
    setLogs
}) => {
    // Categories State
    const [categories, setCategories] = useState<Category[]>(() => {
        const stored = localStorage.getItem('lumostime_categories');
        return stored ? JSON.parse(stored) : CATEGORIES;
    });

    // Scopes State
    const [scopes, setScopes] = useState<Scope[]>(() => {
        const stored = localStorage.getItem('lumostime_scopes');
        return stored ? JSON.parse(stored) : SCOPES;
    });

    // Goals State
    const [goals, setGoals] = useState<Goal[]>(() => {
        const stored = localStorage.getItem('lumostime_goals');
        return stored ? JSON.parse(stored) : INITIAL_GOALS;
    });

    // 持久化到 localStorage
    useEffect(() => {
        localStorage.setItem('lumostime_categories', JSON.stringify(categories));
    }, [categories]);

    useEffect(() => {
        localStorage.setItem('lumostime_scopes', JSON.stringify(scopes));
    }, [scopes]);

    useEffect(() => {
        localStorage.setItem('lumostime_goals', JSON.stringify(goals));
    }, [goals]);

    // Categories 更新逻辑
    const handleUpdateCategories = (newCategories: Category[]) => {
        setCategories(newCategories);

        // 同步更新 active sessions 中的 activity 信息
        setActiveSessions(prevSessions => prevSessions.map(session => {
            const category = newCategories.find(c => c.id === session.categoryId);
            if (!category) return session;

            const activity = category.activities.find(a => a.id === session.activityId);
            if (!activity) return session;

            // 更新 session 如果 name 或 icon 改变了
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
        setCategories(prev => prev.map(c => c.id === updatedCategory.id ? updatedCategory : c));

        // 同步更新 active sessions
        setActiveSessions(prevSessions => prevSessions.map(session => {
            if (session.categoryId !== updatedCategory.id) return session;

            const activity = updatedCategory.activities.find(a => a.id === session.activityId);
            if (!activity) return session;

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

    // Scopes 更新逻辑
    const handleUpdateScopes = (newScopes: Scope[]) => {
        setScopes(newScopes);
    };

    // Activity 更新逻辑
    const handleUpdateActivity = (updatedActivity: any) => {
        setCategories(prev => prev.map(cat => {
            const activityIndex = cat.activities.findIndex(a => a.id === updatedActivity.id);
            if (activityIndex > -1) {
                const newActivities = [...cat.activities];
                newActivities[activityIndex] = updatedActivity;
                return { ...cat, activities: newActivities };
            }
            return cat;
        }));

        // Sync active sessions
        setActiveSessions(prev => prev.map(s => {
            if (s.activityId === updatedActivity.id) {
                return {
                    ...s,
                    activityName: updatedActivity.name,
                    activityIcon: updatedActivity.icon
                };
            }
            return s;
        }));
    };

    // Category 变更逻辑
    const handleCategoryChange = (activityId: string, newCategoryId: string) => {
        let activityToMove: any | undefined;
        let oldCategoryId: string | undefined;

        // Find the activity and its current category
        for (const cat of categories) {
            const foundActivity = cat.activities.find(a => a.id === activityId);
            if (foundActivity) {
                activityToMove = foundActivity;
                oldCategoryId = cat.id;
                break;
            }
        }

        if (!activityToMove || !oldCategoryId || oldCategoryId === newCategoryId) {
            return;
        }

        // Move the activity to the new category
        setCategories(prev => prev.map(cat => {
            if (cat.id === oldCategoryId) {
                // Remove activity from old category
                return {
                    ...cat,
                    activities: cat.activities.filter(a => a.id !== activityId)
                };
            } else if (cat.id === newCategoryId) {
                // Add activity to new category
                return {
                    ...cat,
                    activities: [...cat.activities, activityToMove!]
                };
            }
            return cat;
        }));

        // Update categoryId in all logs for this activity
        setLogs(prev => prev.map(log => {
            if (log.activityId === activityId) {
                return { ...log, categoryId: newCategoryId };
            }
            return log;
        }));

        // Update active sessions
        setActiveSessions(prev => prev.map(s => {
            if (s.activityId === activityId) {
                return {
                    ...s,
                    categoryId: newCategoryId
                };
            }
            return s;
        }));
    };

    return (
        <CategoryScopeContext.Provider value={{
            categories,
            setCategories,
            handleUpdateCategories,
            handleUpdateCategory,
            scopes,
            setScopes,
            handleUpdateScopes,
            goals,
            setGoals,
            handleUpdateActivity,
            handleCategoryChange
        }}>
            {children}
        </CategoryScopeContext.Provider>
    );
};
