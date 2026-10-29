/**
 * @file TodoExecutionTagPicker.tsx
 * @input Optional execution tags and an immediate change callback
 * @output Compact chip row and grouped preset/custom tag picker for todo editing
 * @pos Component (Todo editor)
 * @description Lets users add execution context casually as tags while keeping energy, scene, and time semantics structured for AI.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Tag, X } from 'lucide-react';
import type { TodoExecutionTag } from '../types';
import {
  createCustomTodoExecutionTag,
  normalizeTodoExecutionTags,
  TODO_EXECUTION_TAG_GROUP_LABELS,
  TODO_EXECUTION_TAG_PRESETS,
  toggleTodoExecutionTag
} from '../utils/todoExecutionTags';

interface TodoExecutionTagPickerProps {
  executionTags?: TodoExecutionTag[];
  onChange: (nextTags: TodoExecutionTag[]) => void;
  disabled?: boolean;
}

export const TodoExecutionTagPicker: React.FC<TodoExecutionTagPickerProps> = ({
  executionTags,
  onChange,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedTags = useMemo(() => normalizeTodoExecutionTags(executionTags), [executionTags]);
  const selectedIds = useMemo(() => new Set(selectedTags.map((tag) => tag.id)), [selectedTags]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen]);

  const handleToggle = (tag: TodoExecutionTag) => {
    onChange(toggleTodoExecutionTag(selectedTags, tag));
  };

  const handleAddCustom = () => {
    const customTag = createCustomTodoExecutionTag(customName);
    if (!customTag) return;

    onChange(toggleTodoExecutionTag(selectedTags, customTag));
    setCustomName('');
  };

  const handleCustomKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    handleAddCustom();
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-wrap items-center gap-2">
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs text-stone-600"
          >
            <span>{tag.name}</span>
            <button
              type="button"
              aria-label={`\u79fb\u9664${tag.name}`}
              disabled={disabled}
              onClick={() => onChange(selectedTags.filter((candidate) => candidate.id !== tag.id))}
              className="rounded-full text-stone-400 transition-colors hover:text-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <button
          type="button"
          disabled={disabled}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-stone-300 px-2.5 py-1 text-xs text-stone-500 transition-colors hover:border-stone-500 hover:text-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={13} />
          <span>{selectedTags.length > 0 ? '\u6dfb\u52a0' : '\u6dfb\u52a0\u6267\u884c\u6807\u7b7e'}</span>
        </button>
      </div>

      {isOpen && !disabled && (
        <div className="absolute left-0 top-full z-30 mt-2 w-full min-w-[18rem] max-w-[26rem] rounded-2xl border border-stone-200 bg-[#faf8f3] p-3 shadow-[0_18px_45px_rgba(60,45,30,0.16)]">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-stone-500">
            <Tag size={14} />
            <span>{'\u6267\u884c\u6807\u7b7e'}</span>
          </div>
          {(['energy', 'scene', 'time'] as const).map((group) => (
            <div key={group} className="mb-3 last:mb-0">
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">
                {TODO_EXECUTION_TAG_GROUP_LABELS[group]}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TODO_EXECUTION_TAG_PRESETS
                  .filter((preset) => preset.group === group)
                  .map((preset) => {
                    const isSelected = selectedIds.has(preset.id);
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => handleToggle(preset)}
                        className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${isSelected
                          ? 'border-stone-800 bg-stone-800 text-white'
                          : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400'
                          }`}
                      >
                        {preset.name}
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
          <div className="mt-3 flex items-center gap-2 border-t border-stone-200 pt-3">
            <input
              type="text"
              value={customName}
              onChange={(event) => setCustomName(event.target.value)}
              onKeyDown={handleCustomKeyDown}
              placeholder={'\u81ea\u5b9a\u4e49\u6807\u7b7e'}
              maxLength={60}
              className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 outline-none placeholder:text-stone-300 focus:border-stone-500"
            />
            <button
              type="button"
              onClick={handleAddCustom}
              disabled={!customName.trim()}
              className="rounded-xl bg-stone-800 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300"
            >{'\u6dfb\u52a0'}</button>
          </div>
        </div>
      )}
    </div>
  );
};
