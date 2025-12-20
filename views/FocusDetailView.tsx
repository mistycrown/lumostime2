import React, { useState, useEffect, useRef } from 'react';
import { ActiveSession, TodoItem, Category, Activity, TodoCategory, Scope, AutoLinkRule } from '../types';
import { X, Check, ChevronDown, TrendingUp, Plus, Minus, Lightbulb, CheckCircle2 } from 'lucide-react';
import { TodoAssociation } from '../components/TodoAssociation';
import { ScopeAssociation } from '../components/ScopeAssociation';
import { FocusScoreSelector } from '../components/FocusScoreSelector';
import FocusNotification from '../plugins/FocusNotificationPlugin';
import { Capacitor } from '@capacitor/core';

interface FocusDetailViewProps {
    session: ActiveSession;
    todos: TodoItem[];
    categories: Category[];
    todoCategories: TodoCategory[];
    scopes: Scope[];
    autoLinkRules?: AutoLinkRule[];
    onClose: () => void;
    onComplete: (session: ActiveSession) => void;
    onUpdate: (session: ActiveSession) => void;
}

export const FocusDetailView: React.FC<FocusDetailViewProps> = ({ session, todos, categories, todoCategories, scopes, autoLinkRules = [], onClose, onComplete, onUpdate }) => {
    const [elapsed, setElapsed] = useState(0);
    const [note, setNote] = useState(session.note || '');
    const [isActivitySelectorOpen, setIsActivitySelectorOpen] = useState(false);

    // Progress Increment State
    const [progressAmount, setProgressAmount] = useState(0);
    const noteRef = useRef<HTMLTextAreaElement>(null);

    // Auto-focus note input
    useEffect(() => {
        // Delay focus allowing for animation
        const timer = setTimeout(() => {
            if (noteRef.current) {
                noteRef.current.focus({ preventScroll: false });
                // Smooth scroll to ensure it's visible even with keyboard
                setTimeout(() => {
                    noteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, []);

    // Unified Suggestion State
    const [suggestions, setSuggestions] = useState<{
        activity?: { id: string; categoryId: string; name: string; icon: string; reason: string; matchedKeyword?: string };
        scopes: { id: string; name: string; icon: string; reason: string }[];
    }>({ scopes: [] });

    // Unified Suggestion Logic
    useEffect(() => {
        const newSuggestions: typeof suggestions = { scopes: [] };

        const linkedTodo = todos.find(t => t.id === session.linkedTodoId);

        // 1. Activity Suggestions (Priority: Linked Todo > Note Keywords)
        if (linkedTodo?.linkedActivityId && linkedTodo.linkedCategoryId) {
            if (linkedTodo.linkedActivityId !== session.activityId) {
                const cat = categories.find(c => c.id === linkedTodo.linkedCategoryId);
                const act = cat?.activities.find(a => a.id === linkedTodo.linkedActivityId);
                if (cat && act) {
                    newSuggestions.activity = {
                        id: act.id, categoryId: cat.id, name: act.name, icon: act.icon, reason: '关联待办'
                    };
                }
            }
        }

        // If no todo suggestion, check Note Keywords
        if (!newSuggestions.activity && note) {
            for (const cat of categories) {
                for (const act of cat.activities) {
                    if (act.id === session.activityId) continue;
                    for (const kw of (act.keywords || [])) {
                        if (note.includes(kw)) {
                            newSuggestions.activity = {
                                id: act.id, categoryId: cat.id, name: act.name, icon: act.icon, reason: '关键词匹配', matchedKeyword: kw
                            };
                            break;
                        }
                    }
                    if (newSuggestions.activity) break;
                }
                if (newSuggestions.activity) break;
            }
        }

        // 2. Scope Suggestions
        const candidateScopes = new Map<string, { id: string; name: string; icon: string; reason: string }>();
        const currentScopeIds = session.scopeIds || [];

        // From Linked Todo
        if (linkedTodo?.defaultScopeIds) {
            for (const sId of linkedTodo.defaultScopeIds) {
                if (currentScopeIds.includes(sId)) continue;
                const s = scopes.find(scope => scope.id === sId);
                if (s) {
                    candidateScopes.set(sId, { id: s.id, name: s.name, icon: s.icon, reason: '关联待办' });
                }
            }
        }

        // From AutoLink Rules
        const activeRules = autoLinkRules.filter(r => r.activityId === session.activityId);
        for (const rule of activeRules) {
            if (currentScopeIds.includes(rule.scopeId)) continue;
            const s = scopes.find(scope => scope.id === rule.scopeId);
            if (s) {
                if (!candidateScopes.has(rule.scopeId)) {
                    candidateScopes.set(rule.scopeId, { id: s.id, name: s.name, icon: s.icon, reason: '自动规则' });
                }
            }
        }

        newSuggestions.scopes = Array.from(candidateScopes.values());
        setSuggestions(newSuggestions);

    }, [session.linkedTodoId, note, session.activityId, session.scopeIds, categories, todos, scopes, autoLinkRules]);

    const handleAcceptActivity = () => {
        if (suggestions.activity) {
            const cat = categories.find(c => c.id === suggestions.activity!.categoryId);
            const act = cat?.activities.find(a => a.id === suggestions.activity!.id);
            if (act && cat) {
                handleActivitySelect(act, cat.id);
            }
        }
    };

    const handleAcceptScope = (scopeId: string) => {
        const current = session.scopeIds || [];
        if (!current.includes(scopeId)) {
            onUpdate({ ...session, scopeIds: [...current, scopeId] });
        }
    };

    const hasSuggestions = suggestions.activity || suggestions.scopes.length > 0;

    // 计时器
    useEffect(() => {
        const interval = setInterval(() => {
            const newElapsed = Math.floor((Date.now() - session.startTime) / 1000);
            setElapsed(newElapsed);
        }, 1000);

        return () => clearInterval(interval);
    }, [session.startTime]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Auto-save note
    useEffect(() => {
        onUpdate({ ...session, note });
    }, [note]);

    const handleActivitySelect = (activity: Activity, categoryId: string) => {
        onUpdate({
            ...session,
            activityId: activity.id,
            categoryId: categoryId,
            activityName: activity.name,
            activityIcon: activity.icon
        });
        setIsActivitySelectorOpen(false);
    };

    const handleTodoSelect = (todoId: string | undefined) => {
        onUpdate({ ...session, linkedTodoId: todoId });
        setProgressAmount(0); // Reset progress check when changing todo
    };

    const linkedTodo = todos.find(t => t.id === session.linkedTodoId);

    const handleComplete = () => {
        // 停止通知（仅Android平台）
        if (Capacitor.getPlatform() === 'android') {
            FocusNotification.stopFocusNotification().catch(err => {
                console.error('停止专注通知失败:', err);
            });
        }

        onComplete({
            ...session,
            note,
            progressIncrement: progressAmount
        });
    };

    return (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in slide-in-from-bottom-[100%] duration-500 ease-out pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-6 shrink-0">
                <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-stone-100 transition-colors text-stone-500">
                    <X size={28} />
                </button>
                <button
                    onClick={handleComplete}
                    className="w-12 h-12 rounded-full bg-stone-900 flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
                >
                    <Check size={24} strokeWidth={3} />
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center overflow-y-auto no-scrollbar pt-4 pb-[50vh]">

                {/* Timer Display */}
                <div className="flex flex-col items-center mb-10">
                    <div className="text-[80px] mb-4 animate-bounce-slow cursor-pointer hover:scale-105 transition-transform" onClick={() => setIsActivitySelectorOpen(true)}>
                        {session.activityIcon}
                    </div>
                    <div className="text-6xl font-mono font-medium text-stone-800 tracking-wider">
                        {formatTime(elapsed)}
                    </div>
                </div>

                {/* Activity Selector (Dropdown/Modal) */}
                <div className="w-full px-8 mb-8">
                    <button
                        onClick={() => setIsActivitySelectorOpen(!isActivitySelectorOpen)}
                        className="w-full flex items-center justify-between bg-stone-50 border border-stone-200 rounded-2xl p-4 active:scale-[0.99] transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">{session.activityIcon}</span>
                            <span className="text-lg font-bold text-stone-700">{session.activityName}</span>
                        </div>
                        <ChevronDown size={20} className="text-stone-400" />
                    </button>

                    {isActivitySelectorOpen && (
                        <div className="mt-4 bg-white border border-stone-100 rounded-2xl shadow-xl p-4 animate-in fade-in zoom-in-95 duration-200">
                            <div className="grid grid-cols-4 gap-3">
                                {categories.flatMap(cat => cat.activities.map(act => (
                                    <button
                                        key={act.id}
                                        onClick={() => handleActivitySelect(act, cat.id)}
                                        className={`flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-stone-50 ${session.activityId === act.id ? 'bg-stone-100 ring-1 ring-stone-200' : ''}`}
                                    >
                                        <span className="text-2xl">{act.icon}</span>
                                        <span className="text-[10px] text-stone-500 font-medium truncate w-full text-center">{act.name}</span>
                                    </button>
                                )))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Todo Association */}
                <div className="w-full px-8 mb-4">
                    <TodoAssociation
                        todos={todos}
                        todoCategories={todoCategories}
                        linkedTodoId={session.linkedTodoId}
                        onChange={handleTodoSelect}
                        renderExtraContent={(tId) => {
                            const t = todos.find(x => x.id === tId);
                            if (!t?.isProgress) return null;
                            return (
                                <div className="pt-0 flex items-center justify-between animate-in slide-in-from-top-2">
                                    {/* Left: Label + Stats */}
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-stone-400">P.</span>
                                        <div className="flex items-center gap-1.5 text-[10px] text-stone-400 px-2 py-1 rounded-md border border-stone-100 bg-stone-50">
                                            <TrendingUp size={10} />
                                            <span className="font-mono">{t.completedUnits || 0} / {t.totalAmount}</span>
                                        </div>
                                    </div>

                                    {/* Right: Controls */}
                                    <div className="flex items-center rounded-lg p-0.5 scale-90 origin-right">
                                        <button
                                            onClick={() => setProgressAmount(Math.max(0, progressAmount - 1))}
                                            className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-100/50 rounded-md transition-colors active:scale-95"
                                        >
                                            <Minus size={16} />
                                        </button>
                                        <div className="flex items-center justify-center min-w-[40px]">
                                            {progressAmount > 0 && <span className="text-xs font-bold text-stone-800 mr-0.5">+</span>}
                                            <input
                                                type="number"
                                                min={0}
                                                value={progressAmount}
                                                onChange={(e) => setProgressAmount(Math.max(0, parseInt(e.target.value) || 0))}
                                                className={`w-8 text-left text-sm font-bold tabular-nums bg-transparent outline-none p-0 border-none focus:ring-0 ${progressAmount > 0 ? 'text-stone-800' : 'text-stone-300'}`}
                                            />
                                        </div>
                                        <button
                                            onClick={() => setProgressAmount(progressAmount + 1)}
                                            className="w-8 h-8 flex items-center justify-center text-stone-600 hover:bg-stone-100/50 rounded-md transition-colors active:scale-95"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        }}
                    />
                </div>

                {/* Scope Association */}
                <div className="w-full px-8 mb-4">
                    <ScopeAssociation
                        scopes={scopes}
                        selectedScopeIds={session.scopeIds}
                        onSelect={(scopeIds) => onUpdate({ ...session, scopeIds })}
                    />
                </div>

                {/* Focus Score Selector */}
                {(() => {
                    const currentCategory = categories.find(c => c.id === session.categoryId);
                    const currentActivity = currentCategory?.activities.find(a => a.id === session.activityId);

                    // Check if should show focus score: activity > category > any associated scope
                    let shouldShowFocus = currentActivity?.enableFocusScore ?? currentCategory?.enableFocusScore;

                    // Also check if any of the selected scopes has enableFocusScore
                    if (!shouldShowFocus && session.scopeIds && session.scopeIds.length > 0) {
                        shouldShowFocus = session.scopeIds.some(sid => {
                            const scope = scopes.find(s => s.id === sid);
                            return scope?.enableFocusScore === true;
                        });
                    }

                    if (shouldShowFocus) {
                        return (
                            <div className="w-full px-8 mb-8">
                                <FocusScoreSelector
                                    value={session.focusScore}
                                    onChange={(score) => onUpdate({ ...session, focusScore: score || undefined })}
                                />
                            </div>
                        );
                    }
                    return null;
                })()}

                {/* Smart Association Suggestion (Unified) */}
                {hasSuggestions && (
                    <div className="w-full px-8 mb-4 animate-in slide-in-from-top-2">
                        <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl">
                            <div className="flex items-start gap-2">
                                <Lightbulb size={16} className="text-purple-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-purple-900 mb-2">建议关联</p>
                                    <div className="flex flex-wrap gap-2">
                                        {/* Activity Suggestions */}
                                        {suggestions.activity && (
                                            <button
                                                onClick={handleAcceptActivity}
                                                className="flex items-center gap-1 px-2 py-1 bg-white border border-purple-200 rounded-lg text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors active:scale-95"
                                            >
                                                <span className="opacity-70 text-[10px] mr-0.5">[{suggestions.activity.reason}]</span>
                                                <span>{suggestions.activity.icon}</span>
                                                <span>{suggestions.activity.name}</span>
                                                <CheckCircle2 size={12} />
                                            </button>
                                        )}
                                        {/* Scope Suggestions */}
                                        {suggestions.scopes.map(scope => (
                                            <button
                                                key={scope.id}
                                                onClick={() => handleAcceptScope(scope.id)}
                                                className="flex items-center gap-1 px-2 py-1 bg-white border border-purple-200 rounded-lg text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors active:scale-95"
                                            >
                                                <span className="opacity-70 text-[10px] mr-0.5">[{scope.reason}]</span>
                                                <span>{scope.icon}</span>
                                                <span>{scope.name}</span>
                                                <CheckCircle2 size={12} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Note Input */}
                <div className="w-full px-8 mb-8">
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 block px-1">Note</span>
                    <textarea
                        ref={noteRef}
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="Add a note..."
                        className="w-full bg-white border border-stone-200 rounded-2xl p-4 text-stone-800 text-sm min-h-[100px] shadow-sm focus:outline-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900 transition-all resize-none placeholder:text-stone-300 font-serif"
                    />
                </div>

            </div>

        </div>
    );
};
