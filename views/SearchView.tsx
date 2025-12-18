import React, { useState, useMemo } from 'react';
import { Search, X, ChevronLeft, FileText } from 'lucide-react';
import { Log, Category, TodoItem, TodoCategory, Scope, Goal, DailyReview, WeeklyReview, MonthlyReview } from '../types';

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

type SearchType = 'record' | 'category' | 'activity' | 'todo' | 'scope' | 'review';

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
    const [query, setQuery] = useState('');
    const [searchMode, setSearchMode] = useState<'all' | 'partial'>('all');
    const [selectedTypes, setSelectedTypes] = useState<SearchType[]>([]);

    const toggleType = (type: SearchType) => {
        setSelectedTypes(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type]
        );
    };

    // 搜索结果
    const searchResults = useMemo(() => {
        if (!query.trim()) return null;

        const lowerQuery = query.toLowerCase().trim();
        const typesToSearch = searchMode === 'all'
            ? ['record', 'category', 'activity', 'todo', 'scope', 'review'] as SearchType[]
            : selectedTypes;

        const results = {
            records: [] as { log: Log; category: Category; activity: { name: string; icon: string } }[],
            categories: [] as Category[],
            activities: [] as { activity: { name: string; icon: string; id: string; color: string }; category: Category }[],
            todos: [] as { todo: TodoItem; category: TodoCategory }[],
            scopes: [] as Scope[],
            reviews: [] as { type: 'daily' | 'weekly' | 'monthly'; date: string; id: string; title: string; snippet?: string }[]
        };

        // 搜索复盘
        if (typesToSearch.includes('review')) {
            const getSnippet = (text: string, query: string): string | undefined => {
                const lowerText = text.toLowerCase();
                const index = lowerText.indexOf(query);
                if (index === -1) return undefined;

                const start = Math.max(0, index - 10);
                const end = Math.min(text.length, index + query.length + 20);
                return (start > 0 ? '...' : '') + text.substring(start, end) + (end < text.length ? '...' : '');
            };

            const getReviewMatch = (review: { answers: { answer: string }[], narrative?: string }, query: string) => {
                // Check answers
                const answerMatch = review.answers?.find(ans => ans.answer && ans.answer.toLowerCase().includes(query));
                if (answerMatch) {
                    return getSnippet(answerMatch.answer, query);
                }
                // Check narrative
                if (review.narrative && review.narrative.toLowerCase().includes(query)) {
                    return getSnippet(review.narrative, query);
                }
                return undefined;
            };

            // Daily Reviews
            dailyReviews.forEach(review => {
                const snippet = getReviewMatch(review, lowerQuery);
                const dateMatch = review.date.includes(lowerQuery);

                if (snippet || dateMatch) {
                    results.reviews.push({
                        type: 'daily',
                        date: review.date,
                        id: review.date,
                        title: `${review.date} 日报`,
                        snippet: snippet || (dateMatch ? '日期匹配' : undefined)
                    });
                }
            });

            // Weekly Reviews
            weeklyReviews.forEach(review => {
                const snippet = getReviewMatch(review, lowerQuery);
                const dateMatch = review.weekStartDate.includes(lowerQuery);

                if (snippet || dateMatch) {
                    results.reviews.push({
                        type: 'weekly',
                        date: review.weekStartDate,
                        id: review.id,
                        title: `${review.weekStartDate} 周报`,
                        snippet: snippet || (dateMatch ? '日期匹配' : undefined)
                    });
                }
            });

            // Monthly Reviews
            monthlyReviews.forEach(review => {
                const snippet = getReviewMatch(review, lowerQuery);
                const dateMatch = review.monthStartDate.includes(lowerQuery);

                if (snippet || dateMatch) {
                    results.reviews.push({
                        type: 'monthly',
                        date: review.monthStartDate,
                        id: review.id,
                        title: `${review.monthStartDate.substring(0, 7)} 月报`,
                        snippet: snippet || (dateMatch ? '日期匹配' : undefined)
                    });
                }
            });
        }

        // 搜索记录
        if (typesToSearch.includes('record')) {
            logs.forEach(log => {
                const category = categories.find(c => c.id === log.categoryId);
                const activity = category?.activities.find(a => a.id === log.activityId);
                // Handle possibly missing activity or category gracefully
                if (!category || !activity) return;

                if (
                    log.title?.toLowerCase().includes(lowerQuery) ||
                    log.note?.toLowerCase().includes(lowerQuery) ||
                    activity.name.toLowerCase().includes(lowerQuery)
                ) {
                    results.records.push({ log, category, activity });
                }
            });
        }

        // 搜索分类
        if (typesToSearch.includes('category')) {
            categories.forEach(cat => {
                if (cat.name.toLowerCase().includes(lowerQuery)) {
                    results.categories.push(cat);
                }
            });
        }

        // 搜索活动标签
        if (typesToSearch.includes('activity')) {
            categories.forEach(cat => {
                cat.activities.forEach(act => {
                    if (act.name.toLowerCase().includes(lowerQuery)) {
                        results.activities.push({ activity: act, category: cat });
                    }
                });
            });
        }

        // 搜索待办
        if (typesToSearch.includes('todo')) {
            todos.forEach(todo => {
                const category = todoCategories.find(c => c.id === todo.categoryId);
                if (
                    todo.title.toLowerCase().includes(lowerQuery) ||
                    todo.note?.toLowerCase().includes(lowerQuery)
                ) {
                    // Safe guard for missing category
                    if (category) {
                        results.todos.push({ todo, category });
                    }
                }
            });
        }

        // 搜索领域
        if (typesToSearch.includes('scope')) {
            scopes.forEach(scope => {
                if (
                    scope.name.toLowerCase().includes(lowerQuery) ||
                    scope.description?.toLowerCase().includes(lowerQuery)
                ) {
                    results.scopes.push(scope);
                }
            });
        }

        return results;
    }, [query, searchMode, selectedTypes, logs, categories, todos, todoCategories, scopes, dailyReviews, weeklyReviews, monthlyReviews]);

    const totalResults = searchResults
        ? searchResults.records.length +
        searchResults.categories.length +
        searchResults.activities.length +
        searchResults.todos.length +
        searchResults.scopes.length +
        searchResults.reviews.length
        : 0;

    return (
        <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col pt-[env(safe-area-inset-top)] animate-in slide-in-from-right duration-300">
            {/* Header */}
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
                {/* 搜索框和筛选按钮 */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex flex-col gap-3">
                        <div className="flex gap-2 w-full">
                            {/* 原搜索框 */}
                            <div className="flex-1 min-w-0 flex items-center gap-2 bg-stone-50 px-3 py-2 rounded-xl focus-within:ring-2 focus-within:ring-stone-300 transition-all">
                                <Search size={18} className="text-stone-400 flex-shrink-0" />
                                <input
                                    type="text"
                                    placeholder="搜索记录、待办、标签..."
                                    className="flex-1 w-full min-w-0 bg-transparent border-none outline-none text-stone-700 placeholder:text-stone-300 text-sm"
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
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

                            {/* 搜索模式切换 */}
                            <div className="flex gap-1 flex-shrink-0 items-center">
                                <button
                                    onClick={() => setSearchMode('all')}
                                    className={`px-3 py-2 h-full rounded-xl text-xs font-bold transition-all flex items-center ${searchMode === 'all'
                                        ? 'bg-stone-900 text-white'
                                        : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                                        }`}
                                >
                                    全部
                                </button>
                                <button
                                    onClick={() => setSearchMode('partial')}
                                    className={`px-3 py-2 h-full rounded-xl text-xs font-bold transition-all flex items-center ${searchMode === 'partial'
                                        ? 'bg-stone-900 text-white'
                                        : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                                        }`}
                                >
                                    部分
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 类型选择（仅在部分模式下显示） */}
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
                                    className={`px-0 py-2 rounded-lg text-xs font-medium border transition-all flex justify-center items-center ${selectedTypes.includes(type)
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

                {/* 搜索结果 */}
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

                        {/* 复盘结果 */}
                        {searchResults.reviews.length > 0 && (
                            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                                <div className="px-4 py-2 bg-stone-50 border-b border-stone-100">
                                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                                        复盘 ({searchResults.reviews.length})
                                    </span>
                                </div>
                                {searchResults.reviews.map((review, idx) => (
                                    <button
                                        key={`${review.type}-${review.id}`}
                                        onClick={() => {
                                            if (review.type === 'daily') onSelectDailyReview(review.date);
                                            else if (review.type === 'weekly') onSelectWeeklyReview(review.id, review.date);
                                            else if (review.type === 'monthly') onSelectMonthlyReview(review.id, review.date);
                                        }}
                                        className={`w-full text-left px-4 py-3 hover:bg-stone-50 transition-colors ${idx < searchResults.reviews.length - 1 ? 'border-b border-stone-50' : ''
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm"><FileText size={16} className="text-stone-400" /></span>
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

                        {/* 记录结果 */}
                        {searchResults.records.length > 0 && (
                            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                                <div className="px-4 py-2 bg-stone-50 border-b border-stone-100">
                                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                                        时间记录 ({searchResults.records.length})
                                    </span>
                                </div>
                                {searchResults.records.map(({ log, category, activity }, idx) => (
                                    <button
                                        key={log.id}
                                        onClick={() => onSelectLog(log)}
                                        className={`w-full text-left px-4 py-3 hover:bg-stone-50 transition-colors ${idx < searchResults.records.length - 1 ? 'border-b border-stone-50' : ''
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            {/* 左侧：图标、标题、备注 */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm flex-shrink-0">{activity?.icon}</span>
                                                    <span className="text-sm font-bold text-stone-800 truncate">
                                                        {log.title || activity?.name}
                                                    </span>
                                                </div>
                                                {log.note && (
                                                    <p className="text-xs text-stone-500 line-clamp-1 ml-6">{log.note}</p>
                                                )}
                                            </div>

                                            {/* 右侧：日期和分类 */}
                                            <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                                                <span className="text-[10px] text-stone-400 whitespace-nowrap">
                                                    {new Date(log.startTime).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                                                </span>
                                                <span className="text-[10px] text-stone-400 whitespace-nowrap">
                                                    {category?.name}
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* 分类结果 */}
                        {searchResults.categories.length > 0 && (
                            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                                <div className="px-4 py-2 bg-stone-50 border-b border-stone-100">
                                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                                        分类 ({searchResults.categories.length})
                                    </span>
                                </div>
                                {searchResults.categories.map((cat, idx) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => onSelectCategory(cat)}
                                        className={`w-full text-left px-4 py-3 hover:bg-stone-50 transition-colors ${idx < searchResults.categories.length - 1 ? 'border-b border-stone-50' : ''
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">{cat.icon}</span>
                                            <span className="text-sm font-bold text-stone-800">
                                                {cat.name}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* 标签(活动)结果 */}
                        {searchResults.activities.length > 0 && (
                            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                                <div className="px-4 py-2 bg-stone-50 border-b border-stone-100">
                                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                                        标签 ({searchResults.activities.length})
                                    </span>
                                </div>
                                {searchResults.activities.map(({ activity, category }, idx) => (
                                    <button
                                        key={activity.id}
                                        onClick={() => onSelectActivity(activity, category.id)}
                                        className={`w-full text-left px-4 py-3 hover:bg-stone-50 transition-colors ${idx < searchResults.activities.length - 1 ? 'border-b border-stone-50' : ''
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${activity.color || 'bg-stone-100'}`}>
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

                        {/* 待办结果 */}
                        {searchResults.todos.length > 0 && (
                            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                                <div className="px-4 py-2 bg-stone-50 border-b border-stone-100">
                                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                                        待办任务 ({searchResults.todos.length})
                                    </span>
                                </div>
                                {searchResults.todos.map(({ todo, category }, idx) => (
                                    <button
                                        key={todo.id}
                                        onClick={() => onSelectTodo(todo)}
                                        className={`w-full text-left px-4 py-3 hover:bg-stone-50 transition-colors ${idx < searchResults.todos.length - 1 ? 'border-b border-stone-50' : ''
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm">{category?.icon}</span>
                                            <span className={`text-sm font-bold ${todo.isCompleted ? 'text-stone-400 line-through' : 'text-stone-800'
                                                }`}>
                                                {todo.title}
                                            </span>
                                        </div>
                                        {todo.note && (
                                            <p className="text-xs text-stone-500 line-clamp-1">{todo.note}</p>
                                        )}
                                        <span className="text-[10px] text-stone-400">
                                            {category?.name}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* 领域结果 */}
                        {searchResults.scopes.length > 0 && (
                            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                                <div className="px-4 py-2 bg-stone-50 border-b border-stone-100">
                                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                                        领域 ({searchResults.scopes.length})
                                    </span>
                                </div>
                                {searchResults.scopes.map((scope, idx) => (
                                    <button
                                        key={scope.id}
                                        onClick={() => onSelectScope(scope)}
                                        className={`w-full text-left px-4 py-3 hover:bg-stone-50 transition-colors ${idx < searchResults.scopes.length - 1 ? 'border-b border-stone-50' : ''
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm">{scope.icon}</span>
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
