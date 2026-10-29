/**
 * @file GoalFilterEditor.tsx
 * @input Goal filter expression and association data
 * @output Editable expression with tag, scope, todo, and saved-filter shortcuts
 * @pos Component (Goal Editor)
 */
import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Category, Filter, Scope, TodoCategory, TodoItem } from '../types';
import { TagMultipleAssociation } from './TagMultipleAssociation';
import { ScopeAssociation } from './ScopeAssociation';
import { TodoAssociation } from './TodoAssociation';

interface GoalFilterEditorProps {
  expression: string;
  onExpressionChange: (expression: string) => void;
  categories: Category[];
  scopes: Scope[];
  todos: TodoItem[];
  todoCategories: TodoCategory[];
  filters?: Filter[];
  disabled?: boolean;
  mode: 'record' | 'todo';
}

type Picker = 'tags' | 'scopes' | 'todos' | 'filters' | null;

const appendToken = (expression: string, token: string): string => {
  const trimmed = expression.trim();
  if (!token || trimmed.split(/\s+/).includes(token)) return trimmed;
  return trimmed ? `${trimmed} ${token}` : token;
};

export const GoalFilterEditor: React.FC<GoalFilterEditorProps> = ({
  expression, onExpressionChange, categories, scopes, todos, todoCategories, filters = [], disabled = false, mode
}) => {
  const [picker, setPicker] = useState<Picker>(null);
  const selectedTagIds = useMemo(() => {
    const names = new Set((expression.match(/(?:^|\s)#([^\s]+)/g) || []).map(item => item.trim().slice(1).toLowerCase()));
    return categories.flatMap(category => category.activities.filter(activity => names.has(activity.name.toLowerCase())).map(activity => activity.id));
  }, [categories, expression]);
  const togglePicker = (next: Exclude<Picker, null>) => setPicker(current => current === next ? null : next);

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-stone-400">筛选式</label>
        <input
          value={expression}
          disabled={disabled}
          onChange={event => onExpressionChange(event.target.value)}
          placeholder={mode === 'todo' ? '@待办 或 %领域' : '#标签 %领域 @待办'}
          className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition-colors focus:border-stone-400 disabled:bg-stone-100"
          aria-label="目标筛选式"
        />
      </div>
      {!disabled && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {([
              ['tags', '标签'], ['scopes', '领域'], ['todos', '待办'], ['filters', '筛选器']
            ] as const).map(([key, label]) => (
              <button key={key} type="button" onClick={() => togglePicker(key)} className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${picker === key ? 'border-stone-700 bg-stone-800 text-white' : 'border-stone-200 bg-white text-stone-500 hover:border-stone-300'}`}>
                {picker === key ? <ChevronDown size={13} /> : <ChevronRight size={13} />}{label}
              </button>
            ))}
          </div>
          {picker === 'tags' && (
            <TagMultipleAssociation categories={categories} selectedActivityIds={selectedTagIds} onChange={ids => {
              const selected = ids.map(id => categories.flatMap(category => category.activities).find(activity => activity.id === id)).filter(Boolean);
              onExpressionChange(selected.reduce((value, activity) => appendToken(value, `#${activity!.name}`), expression));
            }} />
          )}
          {picker === 'scopes' && (
            <ScopeAssociation scopes={scopes} selectedScopeIds={[]} onSelect={ids => {
              const selected = (ids || []).map(id => scopes.find(scope => scope.id === id)).filter(Boolean);
              onExpressionChange(selected.reduce((value, scope) => appendToken(value, `%${scope!.name}`), expression));
            }} hideTitle />
          )}
          {picker === 'todos' && (
            <TodoAssociation todos={todos} todoCategories={todoCategories} linkedTodoId={undefined} onChange={id => {
              const todo = todos.find(item => item.id === id);
              if (todo) onExpressionChange(appendToken(expression, `@${todo.title}`));
            }} enableHierarchy hideTitle />
          )}
          {picker === 'filters' && (
            <div className="grid gap-1.5">
              {filters.length === 0 && <span className="px-1 text-xs text-stone-400">暂无已保存筛选器</span>}
              {filters.map(filter => (
                <button key={filter.id} type="button" onClick={() => onExpressionChange(filter.filterExpression)} className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2 text-left text-xs text-stone-600 hover:border-stone-400">
                  <span className="font-medium">{filter.name}</span><span className="ml-3 truncate text-stone-400">{filter.filterExpression}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

