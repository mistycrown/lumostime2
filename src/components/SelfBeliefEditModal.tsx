/**
 * @file SelfBeliefEditModal.tsx
 * @input Self-belief edit state, description drafts, and modal action callbacks
 * @output Shared self-belief add/edit modal used by the principle library and AI chat results
 * @pos Component (Settings / AI Integration)
 * @description Keeps self-belief title and description editing reusable so AI-created self-beliefs can be corrected without leaving the chat.
 * @updated 2026-07-06: Extracted from PrincipleLibraryView for reuse inside AI chat applied-action cards.
 */
import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';

export type SelfBeliefDescriptionSource = 'manual' | 'ai';

export interface SelfBeliefDescriptionDraft {
  id: string;
  text: string;
  date?: string;
  source: SelfBeliefDescriptionSource;
  createdAt: string;
  updatedAt: string;
}

interface SelfBeliefEditModalProps {
  isEditing: boolean;
  title: string;
  descriptionDrafts: SelfBeliefDescriptionDraft[];
  newDescriptionText: string;
  editingDescriptionId: string | null;
  editingDescriptionText: string;
  onChange: (value: string) => void;
  onNewDescriptionTextChange: (value: string) => void;
  onAddDescription: () => void;
  onStartEditDescription: (description: SelfBeliefDescriptionDraft) => void;
  onEditingDescriptionTextChange: (value: string) => void;
  onSaveDescriptionEdit: () => void;
  onCancelDescriptionEdit: () => void;
  onDeleteDescription: (descriptionId: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const SelfBeliefEditModal: React.FC<SelfBeliefEditModalProps> = ({
  isEditing,
  title,
  descriptionDrafts,
  newDescriptionText,
  editingDescriptionId,
  editingDescriptionText,
  onChange,
  onNewDescriptionTextChange,
  onAddDescription,
  onStartEditDescription,
  onEditingDescriptionTextChange,
  onSaveDescriptionEdit,
  onCancelDescriptionEdit,
  onDeleteDescription,
  onSave,
  onCancel
}) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
      <h2 className="text-lg sm:text-xl font-bold mb-4">
        {isEditing ? '编辑自我认知' : '添加自我认知'}
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-xs sm:text-sm font-medium text-stone-700 mb-1">
            标题 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(event) => onChange(event.target.value)}
            placeholder="例如：我是一个学习能力很强的人"
            className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-800"
          />
        </div>

        <div className="border-t border-stone-100 pt-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs sm:text-sm font-medium text-stone-700">描述</label>
            <span className="text-xs text-stone-400">{descriptionDrafts.length} 条</span>
          </div>

          <div className="border-y border-stone-100">
            {descriptionDrafts.length === 0 ? (
              <p className="py-3 text-xs text-stone-400">还没有描述</p>
            ) : (
              descriptionDrafts.map((description) => {
                const isEditingDescription = editingDescriptionId === description.id;
                return (
                  <div key={description.id} className="py-3 border-b border-stone-100 last:border-b-0">
                    {isEditingDescription ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingDescriptionText}
                          onChange={(event) => onEditingDescriptionTextChange(event.target.value)}
                          rows={2}
                          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-800 resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={onSaveDescriptionEdit}
                            disabled={!editingDescriptionText.trim()}
                            className="flex-1 rounded-lg bg-stone-800 px-3 py-2 text-sm text-white transition-colors hover:bg-stone-700 disabled:opacity-50"
                          >
                            保存
                          </button>
                          <button
                            onClick={onCancelDescriptionEdit}
                            className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-600 transition-colors hover:bg-stone-100"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm leading-6 text-stone-700">{description.text}</p>
                          <p className="mt-1 text-xs text-stone-400">{description.date || '自动记录日期'}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => onStartEditDescription(description)}
                            className="p-1.5 hover:bg-blue-50 rounded transition-colors"
                            title="编辑描述"
                          >
                            <Edit2 size={15} className="text-blue-500" />
                          </button>
                          <button
                            onClick={() => onDeleteDescription(description.id)}
                            className="p-1.5 hover:bg-red-50 rounded transition-colors"
                            title="删除描述"
                          >
                            <Trash2 size={15} className="text-red-500" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-3 space-y-2">
            <textarea
              value={newDescriptionText}
              onChange={(event) => onNewDescriptionTextChange(event.target.value)}
              placeholder="添加一条具体经历或说明"
              rows={2}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-800 resize-none"
            />
            <button
              onClick={onAddDescription}
              disabled={!newDescriptionText.trim()}
              className="w-full rounded-lg bg-stone-800 px-4 py-2 text-sm text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              添加描述
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-6">
        <button
          onClick={onCancel}
          className="flex-1 py-2 border border-stone-300 rounded-lg text-sm text-stone-600 hover:bg-stone-50 transition-colors"
        >
          取消
        </button>
        <button
          onClick={onSave}
          disabled={!title.trim()}
          className="flex-1 py-2 bg-stone-800 text-white rounded-lg text-sm hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isEditing ? '保存' : '创建'}
        </button>
      </div>
    </div>
  </div>
);
