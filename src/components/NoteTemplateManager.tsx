/**
 * @file NoteTemplateManager.tsx
 * @input Note template arrays plus change callbacks
 * @output Capsule-style note template management card
 * @pos Component
 * @description Renders note templates with keyword-like capsules and reuses a shared modal editor so detail pages can add, edit, and remove templates consistently.
 * @updated 2026-04-19: Added shared note template management card for detail views.
 */
import React, { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { NoteTemplate } from '../types';
import { sortNoteTemplates } from '../utils/noteTemplateUtils';
import { NoteTemplateEditorModal } from './NoteTemplateEditorModal';

interface NoteTemplateManagerProps {
  templates?: NoteTemplate[];
  onChange: (templates: NoteTemplate[]) => void;
  emptyText?: string;
}

const TEMPLATE_TONES = [
  'bg-red-100 text-red-600 border-red-200 hover:bg-red-200',
  'bg-cyan-100 text-cyan-600 border-cyan-200 hover:bg-cyan-200',
  'bg-yellow-100 text-yellow-600 border-yellow-200 hover:bg-yellow-200',
  'bg-blue-100 text-blue-600 border-blue-200 hover:bg-blue-200',
  'bg-orange-100 text-orange-600 border-orange-200 hover:bg-orange-200',
  'bg-teal-100 text-teal-600 border-teal-200 hover:bg-teal-200',
  'bg-amber-100 text-amber-600 border-amber-200 hover:bg-amber-200',
  'bg-indigo-100 text-indigo-600 border-indigo-200 hover:bg-indigo-200',
  'bg-lime-100 text-lime-600 border-lime-200 hover:bg-lime-200',
  'bg-violet-100 text-violet-600 border-violet-200 hover:bg-violet-200'
];

const getTemplateTone = (templateName: string, index: number) => {
  let hash = index;
  for (let i = 0; i < templateName.length; i += 1) {
    hash = templateName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TEMPLATE_TONES[Math.abs(hash) % TEMPLATE_TONES.length];
};

export const NoteTemplateManager: React.FC<NoteTemplateManagerProps> = ({
  templates,
  onChange,
  emptyText = '还没有添加备注模板。'
}) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NoteTemplate | null>(null);

  const sortedTemplates = useMemo(() => sortNoteTemplates(templates), [templates]);

  const handleSave = (value: Pick<NoteTemplate, 'name' | 'content'>) => {
    if (editingTemplate) {
      onChange(sortedTemplates.map((template) => (
        template.id === editingTemplate.id
          ? { ...template, name: value.name, content: value.content }
          : template
      )));
      return;
    }

    const nextOrder = sortedTemplates.reduce((maxOrder, template) => (
      typeof template.order === 'number' ? Math.max(maxOrder, template.order) : maxOrder
    ), -1) + 1;

    onChange([
      ...sortedTemplates,
      {
        id: crypto.randomUUID(),
        name: value.name,
        content: value.content,
        order: nextOrder
      }
    ]);
  };

  const handleDelete = () => {
    if (!editingTemplate) {
      return;
    }

    onChange(sortedTemplates.filter((template) => template.id !== editingTemplate.id));
  };

  return (
    <>
      <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-stone-400">备注模板</h3>
          </div>
          <button
            onClick={() => {
              setEditingTemplate(null);
              setIsEditorOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1.5 text-xs font-bold text-stone-600 transition-colors hover:bg-stone-50"
          >
            <Plus size={14} />
            添加
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {sortedTemplates.length > 0 ? sortedTemplates.map((template, index) => (
            <button
              key={template.id}
              onClick={() => {
                setEditingTemplate(template);
                setIsEditorOpen(true);
              }}
              title={template.content}
              className={`truncate rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors ${getTemplateTone(template.name, index)}`}
            >
              {template.name}
            </button>
          )) : (
            <span className="text-xs italic text-stone-300">{emptyText}</span>
          )}
        </div>
      </div>

      <NoteTemplateEditorModal
        isOpen={isEditorOpen}
        initialTemplate={editingTemplate}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSave}
        onDelete={editingTemplate ? handleDelete : undefined}
      />
    </>
  );
};
