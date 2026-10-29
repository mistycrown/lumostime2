/**
 * @file TodoExecutionTagModal.tsx
 * @input Label library, current selection, all tasks and persistence callbacks
 * @output Modal label selection, label/category CRUD and confirmed unlinking
 * @pos Component (Todo execution context)
 * @updated 2026-10-29: Adds reusable labels with category management, moves and usage-aware deletion.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Plus, Tag, Trash2, X } from 'lucide-react';
import type { TodoExecutionTag, TodoItem } from '../types';
import { createCustomTodoExecutionTag, normalizeTodoExecutionTags, toggleTodoExecutionTag } from '../utils/todoExecutionTags';
import {
  deleteExecutionCategory, deleteExecutionTag, getExecutionCategoryId, resolveExecutionTags,
  updateExecutionTagAssociations, type TodoExecutionLibrary
} from '../utils/todoExecutionLibrary';
import { todoExecutionLibraryService } from '../services/todoExecutionLibraryService';
import { registerHardwareBackHandler } from '../utils/hardwareBackHandlerStack';

interface TodoExecutionTagModalProps {
  library: TodoExecutionLibrary;
  selectedTags: TodoExecutionTag[];
  todos: TodoItem[];
  currentTodoId?: string;
  onChange: (tags: TodoExecutionTag[]) => void;
  onSaveTodo?: (todo: TodoItem) => void;
  onClose: () => void;
}

const inputClass = 'min-w-0 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none focus:border-stone-500';
const buttonClass = 'rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-40';

export const TodoExecutionTagModal: React.FC<TodoExecutionTagModalProps> = ({
  library, selectedTags, todos, currentTodoId, onChange, onSaveTodo, onClose
}) => {
  const [managing, setManaging] = useState(false);
  const [query, setQuery] = useState('');
  const [tagName, setTagName] = useState('');
  const [categoryId, setCategoryId] = useState('custom');
  const [categoryName, setCategoryName] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState<{ type: 'tag' | 'category'; id: string; name: string } | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const selectedIds = new Set(selectedTags.map((tag) => tag.id));

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const unregisterBack = registerHardwareBackHandler(() => {
      if (pending) setPending(null); else onClose();
      return true;
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (pending) setPending(null); else onClose();
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, [tabindex="0"]') || []);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    dialogRef.current?.querySelector<HTMLElement>('[data-initial-focus]')?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      unregisterBack();
      document.removeEventListener('keydown', handleKeyDown, true);
      previousFocus?.focus();
    };
  }, [onClose, pending]);

  const commit = (next: TodoExecutionLibrary): boolean => {
    try {
      todoExecutionLibraryService.save(next);
      // Preserve current editor fields; its own autosave handles the draft selection.
      updateExecutionTagAssociations(todos, next).forEach((todo, index) => {
        if (todo !== todos[index] && todo.id !== currentTodoId) onSaveTodo?.(todo);
      });
      onChange(resolveExecutionTags(selectedTags, next));
      setError('');
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '保存失败，请重试');
      return false;
    }
  };

  const usageCount = (id: string) => todos.filter((todo) => todo.id !== currentTodoId
    && normalizeTodoExecutionTags(todo.executionTags).some((tag) => tag.id === id)).length
    + (selectedIds.has(id) ? 1 : 0);

  const updateTag = (id: string, changes: Partial<TodoExecutionTag>) => {
    const original = library.tags.find((tag) => tag.id === id);
    if (!original) return;
    const updated = { ...original, ...changes };
    updated.name = updated.name.trim().slice(0, 60);
    if (!updated.name) { setError('标签名称不能为空'); return; }
    if (library.tags.some((tag) => tag.id !== id && getExecutionCategoryId(tag) === getExecutionCategoryId(updated)
      && tag.name.toLocaleLowerCase() === updated.name.toLocaleLowerCase())) {
      setError('该分类中已有同名标签'); return;
    }
    commit({ ...library, tags: library.tags.map((tag) => tag.id === id ? updated : tag) });
  };

  const addTag = () => {
    const custom = createCustomTodoExecutionTag(tagName);
    if (!custom) return;
    const target = library.categories.some((category) => category.id === categoryId) ? categoryId : 'custom';
    const existing = library.tags.find((tag) => getExecutionCategoryId(tag) === target
      && tag.name.toLocaleLowerCase() === custom.name.toLocaleLowerCase());
    const tag = existing || { ...custom, categoryId: target };
    if (existing || commit({ ...library, tags: [...library.tags, tag] })) {
      if (!selectedIds.has(tag.id)) onChange(toggleTodoExecutionTag(selectedTags, tag));
      setTagName('');
    }
  };

  const addCategory = () => {
    const name = categoryName.trim();
    if (!name) return;
    if (library.categories.some((category) => category.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setError('已有同名分类'); return;
    }
    const id = 'category:' + crypto.randomUUID();
    if (commit({ ...library, categories: [...library.categories, { id, name }] })) {
      setCategoryName(''); setCategoryId(id);
    }
  };

  const renameCategory = (id: string, value: string) => {
    const name = value.trim();
    if (!name) { setError('分类名称不能为空'); return; }
    if (library.categories.some((category) => category.id !== id && category.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setError('已有同名分类'); return;
    }
    commit({ ...library, categories: library.categories.map((category) => category.id === id ? { ...category, name } : category) });
  };

  const confirmDelete = () => {
    if (!pending) return;
    const next = pending.type === 'tag' ? deleteExecutionTag(library, pending.id) : deleteExecutionCategory(library, pending.id);
    if (commit(next)) { setPending(null); if (categoryId === pending.id) setCategoryId('custom'); }
  };

  const close = () => { if (pending) setPending(null); else onClose(); };
  const queryKey = query.trim().toLocaleLowerCase();

  return createPortal(
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/25 px-4 py-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm"
      onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div ref={dialogRef} role={pending ? 'alertdialog' : 'dialog'} aria-modal="true" aria-labelledby="execution-tag-modal-title"
        className="flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-[#faf9f6] shadow-2xl">
        <header className="flex shrink-0 items-center gap-2 border-b border-stone-200 px-5 py-4">
          <Tag size={18} className="text-stone-500" />
          <h2 id="execution-tag-modal-title" className="flex-1 text-base font-semibold text-stone-800">{pending ? `删除${pending.type === 'tag' ? '标签' : '分类'}` : '执行标签'}</h2>
          {!pending && <button type="button" className={buttonClass} onClick={() => { setManaging(!managing); setError(''); }}>{managing ? '完成管理' : '管理'}</button>}
          <button type="button" className="p-2 text-stone-400 hover:text-stone-700" aria-label="关闭执行标签" onClick={close}><X size={18} /></button>
        </header>
        {pending ? <div className="px-5 py-6">
          <p className="text-sm leading-6 text-stone-600">{pending.type === 'tag'
            ? usageCount(pending.id) > 0 ? `「${pending.name}」已关联 ${usageCount(pending.id)} 个任务。删除后将解除这些关联。` : `确认删除「${pending.name}」？`
            : `删除「${pending.name}」后，其中的 ${library.tags.filter((tag) => getExecutionCategoryId(tag) === pending.id).length} 个标签将移至「${library.categories.find((category) => category.id === 'custom')?.name}」，保留任务关联。`}</p>
          {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
          <div className="mt-6 flex justify-end gap-2">
            <button data-initial-focus type="button" className={buttonClass} onClick={() => setPending(null)}>取消</button>
            <button type="button" className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white" onClick={confirmDelete}>{pending.type === 'tag' && usageCount(pending.id) ? '解除关联并删除' : '删除'}</button>
          </div>
        </div> : <>
          <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-4">
            <input data-initial-focus aria-label="搜索执行标签" placeholder="搜索标签" value={query} onChange={(event) => setQuery(event.target.value)} className={`${inputClass} mb-5 w-full`} />
            {library.categories.map((category) => {
              const tags = library.tags.filter((tag) => getExecutionCategoryId(tag) === category.id
                && (!queryKey || tag.name.toLocaleLowerCase().includes(queryKey)));
              if (!managing && !tags.length) return null;
              return <section key={category.id} className="mb-5 last:mb-0">
                <div className="mb-2 flex items-center gap-2">
                  {managing ? <input key={`${category.id}:${category.name}`} aria-label={`分类名称：${category.name}`} defaultValue={category.name} maxLength={60}
                    onBlur={(event) => {
                      const value = event.target.value;
                      event.target.value = category.name;
                      if (value !== category.name) renameCategory(category.id, value);
                    }}
                    onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} className="min-w-0 flex-1 border-b border-transparent bg-transparent py-1 text-xs font-semibold text-stone-500 outline-none focus:border-stone-400" />
                    : <h3 className="text-xs font-semibold tracking-wider text-stone-400">{category.name}</h3>}
                  {managing && category.id !== 'custom' && <button type="button" aria-label={`删除分类${category.name}`} className="p-2 text-stone-400 hover:text-red-500" onClick={() => setPending({ type: 'category', id: category.id, name: category.name })}><Trash2 size={14} /></button>}
                </div>
                <div className={managing ? 'divide-y divide-stone-200/70' : 'flex flex-wrap gap-2'}>
                  {tags.map((tag) => managing ? <div key={tag.id} className="flex items-center gap-2 py-2">
                    <input key={`${tag.id}:${tag.name}`} aria-label={`标签名称：${tag.name}`} defaultValue={tag.name} maxLength={60}
                      onBlur={(event) => {
                        const value = event.target.value;
                        event.target.value = tag.name;
                        if (value !== tag.name) updateTag(tag.id, { name: value });
                      }}
                      onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} className="min-w-0 flex-1 bg-transparent text-sm text-stone-700 outline-none" />
                    <select aria-label={`移动${tag.name}到分类`} value={getExecutionCategoryId(tag)} onChange={(event) => updateTag(tag.id, { categoryId: event.target.value })} className="max-w-[7rem] rounded border border-stone-200 bg-white px-1 py-1.5 text-xs text-stone-500">
                      {library.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                    <button type="button" aria-label={`删除标签${tag.name}`} className="p-2 text-stone-400 hover:text-red-500" onClick={() => setPending({ type: 'tag', id: tag.id, name: tag.name })}><Trash2 size={14} /></button>
                  </div> : <button key={tag.id} type="button" aria-pressed={selectedIds.has(tag.id)} onClick={() => onChange(toggleTodoExecutionTag(selectedTags, tag))}
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition-colors ${selectedIds.has(tag.id) ? 'border-stone-800 bg-stone-800 text-white' : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400'}`}>
                    {selectedIds.has(tag.id) && <Check size={12} />}{tag.name}
                  </button>)}
                </div>
              </section>;
            })}
            {queryKey && !library.tags.some((tag) => tag.name.toLocaleLowerCase().includes(queryKey)) && <p className="py-4 text-center text-sm text-stone-400">没有匹配的标签</p>}
          </div>
          <footer className="shrink-0 space-y-3 border-t border-stone-200 px-5 py-4">
            {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
            {managing && <div className="flex gap-2">
              <input aria-label="新分类名称" placeholder="新分类" value={categoryName} maxLength={60} onChange={(event) => setCategoryName(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCategory(); } }} className={`${inputClass} flex-1`} />
              <button type="button" disabled={!categoryName.trim()} className={buttonClass} onClick={addCategory}>添加分类</button>
            </div>}
            <div className="flex flex-wrap gap-2">
              <input aria-label="新执行标签名称" placeholder="新标签" value={tagName} maxLength={60} onChange={(event) => setTagName(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addTag(); } }} className={`${inputClass} w-24 flex-1`} />
              <select aria-label="新标签分类" value={library.categories.some((category) => category.id === categoryId) ? categoryId : 'custom'} onChange={(event) => setCategoryId(event.target.value)} className={`${inputClass} max-w-[7rem]`}>
                {library.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
              <button type="button" aria-label="添加新执行标签" disabled={!tagName.trim()} onClick={addTag} className="rounded-lg bg-stone-800 px-3 py-2 text-white disabled:opacity-40"><Plus size={18} /></button>
            </div>
            <button type="button" onClick={onClose} className="w-full rounded-lg bg-stone-800 py-2.5 text-sm text-white">完成</button>
          </footer>
        </>}
      </div>
    </div>, document.body
  );
};
