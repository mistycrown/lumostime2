/**
 * @file SearchView.tsx
 * @input All App Data (Logs, Todos, Reviews, etc.)
 * @output Navigation Event (Select Item)
 * @pos View (Global Overlay)
 * @description A global search interface that allows users to find Logs, Categories, Activities, Todos, Scopes, and Reviews. Supports partial filtering and full-text search.
 *
 * @updated 2026-07-04: Reused the shared search-all utility so manual search and assistant local-query flows follow the same matching rules.
 */
import React, { useMemo } from 'react';
import { Search, X, ChevronLeft, FileText } from 'lucide-react';
import {
  type Category,
  type DailyReview,
  type Goal,
  type Log,
  type MonthlyReview,
  type Scope,
  type SearchType,
  type TodoCategory,
  type TodoItem,
  type WeeklyReview
} from '../types';
import { useNavigation } from '../contexts/NavigationContext';
import { IconRenderer } from '../components/IconRenderer';
import { usePrivacy } from '../contexts/PrivacyContext';
import { getSoftColorCircleStyle } from '../utils/colorAdapterUtils';
import { countSearchAllResults, runSearchAll } from '../utils/searchAllUtils';

interface SearchViewProps {
  logs: Log[];
  categories: Category[];
  todos: TodoItem[];
  todoCategories: TodoCategory[];
  scopes: Scope[];
  goals: Goal[];
  dailyReviews: DailyReview[];
  weeklyReviews: WeeklyReview[];
  monthlyReviews: MonthlyReview[];
  onClose: () => void;
  onSelectLog: (log: Log) => void;
  onSelectTodo: (todo: TodoItem) => void;
  onSelectScope: (scope: Scope) => void;
  onSelectCategory: (category: Category) => void;
  onSelectActivity: (activity: { id: string }, categoryId: string) => void;
  onSelectDailyReview: (date: string) => void;
  onSelectWeeklyReview: (id: string, weekStartDate: string) => void;
  onSelectMonthlyReview: (id: string, monthStr: string) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  logs,
  categories,
  todos,
  todoCategories,
  scopes,
  goals,
  dailyReviews,
  weeklyReviews,
  monthlyReviews,
  onClose,
  onSelectLog,
  onSelectTodo,
  onSelectScope,
  onSelectCategory,
  onSelectActivity,
  onSelectDailyReview,
  onSelectWeeklyReview,
  onSelectMonthlyReview
}) => {
  const { isPrivacyMode } = usePrivacy();
  const {
    searchQuery: query,
    setSearchQuery: setQuery,
    searchMode,
    setSearchMode,
    selectedSearchTypes: selectedTypes,
    setSelectedSearchTypes: setSelectedTypes
  } = useNavigation();

  const toggleType = (type: SearchType) => {
    setSelectedTypes(
      selectedTypes.includes(type)
        ? selectedTypes.filter((item) => item !== type)
        : [...selectedTypes, type]
    );
  };

  const searchResults = useMemo(() => runSearchAll({
    query,
    searchMode,
    selectedTypes,
    logs,
    categories,
    todos,
    todoCategories,
    scopes,
    dailyReviews,
    weeklyReviews,
    monthlyReviews
  }), [
    categories,
    dailyReviews,
    logs,
    monthlyReviews,
    query,
    scopes,
    searchMode,
    selectedTypes,
    todoCategories,
    todos,
    weeklyReviews
  ]);

  const totalResults = countSearchAllResults(searchResults);

  return (
    <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col pt-[var(--app-safe-area-top)] animate-in slide-in-from-right duration-300">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0">
        <button
          onClick={onClose}
          className="text-stone-400 hover:text-stone-600 p-1"
        >
          <ChevronLeft size={24} />
        </button>
        <span className="text-stone-800 font-bold text-lg">搜索</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="flex gap-2 w-full">
              <div className="flex-1 min-w-0 flex items-center gap-2 bg-stone-50 px-3 py-2 rounded-xl focus-within:ring-2 focus-within:ring-stone-300 transition-all">
                <Search size={18} className="text-stone-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="搜索记录、待办、标签..."
                  className="flex-1 w-full min-w-0 bg-transparent border-none outline-none text-stone-700 placeholder:text-stone-300 text-sm"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  autoFocus
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="text-stone-300 hover:text-stone-500 transition-colors flex-shrink-0"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="flex gap-1 flex-shrink-0 items-center">
                <button
                  onClick={() => setSearchMode('all')}
                  className={`px-3 py-2 h-full rounded-xl text-xs font-bold transition-all flex items-center ${
                    searchMode === 'all'
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                  }`}
                >
                  全部
                </button>
                <button
                  onClick={() => setSearchMode('partial')}
                  className={`px-3 py-2 h-full rounded-xl text-xs font-bold transition-all flex items-center ${
                    searchMode === 'partial'
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                  }`}
                >
                  部分
                </button>
              </div>
            </div>
          </div>

          {searchMode === 'partial' && (
            <div className="mt-3 grid grid-cols-6 gap-1.5 animate-in slide-in-from-top-2">
              {[
                { type: 'record' as const, label: '记录' },
                { type: 'review' as const, label: '复盘' },
                { type: 'category' as const, label: '分类' },
                { type: 'activity' as const, label: '标签' },
                { type: 'todo' as const, label: '待办' },
                { type: 'scope' as const, label: '领域' }
              ].map(({ type, label }) => (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`px-0 py-2 rounded-lg text-xs font-medium border transition-all flex justify-center items-center ${
                    selectedTypes.includes(type)
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-stone-50 text-stone-500 border-stone-100 hover:bg-stone-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {query && searchResults && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                搜索结果
              </h3>
              <span className="text-xs text-stone-500 font-mono">
                {totalResults} 项
              </span>
            </div>

            {searchResults.reviews.length > 0 && (
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 py-2 bg-stone-50 border-b border-stone-100">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                    复盘 ({searchResults.reviews.length})
                  </span>
                </div>
                {searchResults.reviews.map((review, index) => (
                  <button
                    key={`${review.type}-${review.id}`}
                    onClick={() => {
                      if (review.type === 'daily') {
                        onSelectDailyReview(review.date);
                      } else if (review.type === 'weekly') {
                        onSelectWeeklyReview(review.id, review.date);
                      } else if (review.type === 'monthly') {
                        onSelectMonthlyReview(review.id, review.date);
                      }
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-stone-50 transition-colors ${
                      index < searchResults.reviews.length - 1 ? 'border-b border-stone-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">
                        <FileText size={16} className="text-stone-400" />
                      </span>
                      <span className="text-sm font-bold text-stone-800">
                        {review.title}
                      </span>
                    </div>
                    {review.snippet && (
                      <p className="text-xs text-stone-500 line-clamp-1 ml-6">{review.snippet}</p>
                    )}
                  </button>
                ))}
              </div>
            )}

            {searchResults.records.length > 0 && (
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 py-2 bg-stone-50 border-b border-stone-100">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                    时间记录 ({searchResults.records.length})
                  </span>
                </div>
                {searchResults.records.map(({ log, category, activity }, index) => (
                  <button
                    key={log.id}
                    onClick={() => onSelectLog(log)}
                    className={`w-full text-left px-4 py-3 hover:bg-stone-50 transition-colors ${
                      index < searchResults.records.length - 1 ? 'border-b border-stone-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm flex-shrink-0">{activity.icon}</span>
                          <span className="text-sm font-bold text-stone-800 truncate">
                            {log.title || activity.name}
                          </span>
                        </div>
                        {log.note && (
                          <p className={`text-xs text-stone-500 line-clamp-1 ml-6 ${isPrivacyMode ? 'blur-sm select-none' : ''}`}>
                            {log.note}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                        <span className="text-[10px] text-stone-400 whitespace-nowrap">
                          {new Date(log.startTime).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                        </span>
                        <span className="text-[10px] text-stone-400 whitespace-nowrap">
                          {category.name}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchResults.categories.length > 0 && (
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 py-2 bg-stone-50 border-b border-stone-100">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                    分类 ({searchResults.categories.length})
                  </span>
                </div>
                {searchResults.categories.map((category, index) => (
                  <button
                    key={category.id}
                    onClick={() => onSelectCategory(category)}
                    className={`w-full text-left px-4 py-3 hover:bg-stone-50 transition-colors ${
                      index < searchResults.categories.length - 1 ? 'border-b border-stone-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <IconRenderer icon={category.icon} className="text-xl" />
                      <span className="text-sm font-bold text-stone-800">
                        {category.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchResults.activities.length > 0 && (
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 py-2 bg-stone-50 border-b border-stone-100">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                    标签 ({searchResults.activities.length})
                  </span>
                </div>
                {searchResults.activities.map(({ activity, category }, index) => (
                  <button
                    key={activity.id}
                    onClick={() => onSelectActivity(activity, category.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-stone-50 transition-colors ${
                      index < searchResults.activities.length - 1 ? 'border-b border-stone-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                        style={getSoftColorCircleStyle(activity.color || '', 0.15)}
                      >
                        {activity.icon}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-stone-800">
                          {activity.name}
                        </span>
                        <span className="text-[10px] text-stone-400">
                          {category.name}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchResults.todos.length > 0 && (
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 py-2 bg-stone-50 border-b border-stone-100">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                    待办任务 ({searchResults.todos.length})
                  </span>
                </div>
                {searchResults.todos.map(({ todo, category }, index) => (
                  <button
                    key={todo.id}
                    onClick={() => onSelectTodo(todo)}
                    className={`w-full text-left px-4 py-3 hover:bg-stone-50 transition-colors ${
                      index < searchResults.todos.length - 1 ? 'border-b border-stone-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{category.icon}</span>
                      <span className={`text-sm font-bold ${
                        todo.isCompleted ? 'text-stone-400 line-through' : 'text-stone-800'
                      }`}>
                        {todo.title}
                      </span>
                    </div>
                    {todo.note && (
                      <p className={`text-xs text-stone-500 line-clamp-1 ${isPrivacyMode ? 'blur-sm select-none' : ''}`}>
                        {todo.note}
                      </p>
                    )}
                    <span className="text-[10px] text-stone-400">
                      {category.name}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {searchResults.scopes.length > 0 && (
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 py-2 bg-stone-50 border-b border-stone-100">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                    领域 ({searchResults.scopes.length})
                  </span>
                </div>
                {searchResults.scopes.map((scope, index) => (
                  <button
                    key={scope.id}
                    onClick={() => onSelectScope(scope)}
                    className={`w-full text-left px-4 py-3 hover:bg-stone-50 transition-colors ${
                      index < searchResults.scopes.length - 1 ? 'border-b border-stone-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <IconRenderer
                        icon={scope.icon}
                        uiIcon={scope.uiIcon}
                        className="text-sm"
                      />
                      <span className="text-sm font-bold text-stone-800">
                        {scope.name}
                      </span>
                    </div>
                    {scope.description && (
                      <p className="text-xs text-stone-500 line-clamp-1">{scope.description}</p>
                    )}
                  </button>
                ))}
              </div>
            )}

            {totalResults === 0 && (
              <div className="text-center py-12 text-stone-400">
                <Search size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">未找到匹配的结果</p>
              </div>
            )}
          </div>
        )}

        {!query && (
          <div className="text-center py-12 text-stone-400">
            <Search size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">输入关键词开始搜索</p>
          </div>
        )}
      </div>
    </div>
  );
};
