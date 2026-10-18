/**
 * @file FilterExpressionInput.tsx
 * @input Filter expression, change handler and optional input styling
 * @output Shared expression input and syntax hint
 * @pos Component (Custom Filters)
 * @updated 2026-10-18: Unifies custom-filter and auto-check expression editing.
 */
import React, { useId } from 'react';

interface FilterExpressionInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const FilterExpressionInput: React.FC<FilterExpressionInputProps> = ({
  id,
  value,
  onChange,
  className = 'w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-800 font-mono outline-none focus:border-stone-400'
}) => {
  const hintId = useId();

  return (
    <>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={hintId}
        className={className}
        placeholder="例如：#学习 %专业输入，或 #阅读 OR 写作"
      />
      <p id={hintId} className="text-[10px] text-stone-400 mt-1.5">
        空格或 AND 表示“且”，OR 表示同类条件“或”；# 标签，% 领域，@ 待办/分类，^ Reaction，无符号=备注，- 排除（不参与 OR）
      </p>
    </>
  );
};
