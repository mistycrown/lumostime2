/**
 * @file NoteTemplateEditorModal.tsx
 * @input Current note template draft, save/delete callbacks
 * @output Modal-based note template editing interactions
 * @pos Component (Modal)
 * @description Provides a dedicated editor for note template name/content pairs so category, scope, and activity detail pages share the same add/edit experience.
 * @updated 2026-04-19: Added shared note template add/edit modal.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { NoteTemplate } from '../types';

interface NoteTemplateEditorModalProps {
  isOpen: boolean;
  initialTemplate?: NoteTemplate | null;
  onClose: () => void;
  onSave: (value: Pick<NoteTemplate, 'name' | 'content'>) => void;
  onDelete?: () => void;
}

export const NoteTemplateEditorModal: React.FC<NoteTemplateEditorModalProps> = ({
  isOpen,
  initialTemplate,
  onClose,
  onSave,
  onDelete
}) => {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setName(initialTemplate?.name || '');
    setContent(initialTemplate?.content || '');
    setNameError(null);
    setContentError(null);
  }, [initialTemplate, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const isEditing = Boolean(initialTemplate);
  const isValid = useMemo(() => name.trim().length > 0 && content.trim().length > 0, [content, name]);

  const handleSave = () => {
    const trimmedName = name.trim();
    const trimmedContent = content.trim();

    let hasError = false;
    if (!trimmedName) {
      setNameError('请填写模板名');
      hasError = true;
    }

    if (!trimmedContent) {
      setContentError('请填写模板内容');
      hasError = true;
    }

    if (hasError) {
      return;
    }

    onSave({
      name: trimmedName,
      content: trimmedContent
    });
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-[2rem] bg-[#fdfbf7] shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-8 pb-6">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-bold text-stone-800">{isEditing ? '编辑模板' : '添加模板'}</h3>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
              aria-label="关闭"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-400">模板名</label>
              <input
                type="text"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (nameError) {
                    setNameError(null);
                  }
                }}
                placeholder="比如：读书摘录"
                autoFocus
                maxLength={40}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-stone-800 outline-none transition-colors focus:border-stone-400"
              />
              {nameError && <p className="mt-1.5 text-xs font-medium text-red-500">{nameError}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-400">模板内容</label>
              <textarea
                value={content}
                onChange={(event) => {
                  setContent(event.target.value);
                  if (contentError) {
                    setContentError(null);
                  }
                }}
                placeholder="写下点击后要插入备注框的内容"
                rows={6}
                className="w-full resize-none rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-800 outline-none transition-colors focus:border-stone-400"
              />
              {contentError && <p className="mt-1.5 text-xs font-medium text-red-500">{contentError}</p>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-stone-100 bg-white p-5">
          {onDelete ? (
            <button
              onClick={() => {
                onDelete();
                onClose();
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-4 py-3 text-sm font-bold text-red-500 transition-colors hover:bg-red-50"
            >
              <Trash2 size={16} />
              删除
            </button>
          ) : (
            <div className="hidden sm:block" />
          )}

          <div className="ml-auto flex flex-1 gap-3 sm:flex-initial">
            <button
              onClick={onClose}
              className="flex-1 rounded-2xl border border-stone-200 bg-white py-3.5 font-bold text-stone-600 transition-colors hover:bg-stone-50"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={!isValid}
              className={`flex-1 rounded-2xl py-3.5 font-bold transition-all ${
                isValid
                  ? 'bg-stone-800 text-white shadow-lg hover:bg-stone-900 hover:scale-[1.01] active:scale-[0.99]'
                  : 'cursor-not-allowed bg-stone-200 text-stone-400'
              }`}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
