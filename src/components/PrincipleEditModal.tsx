/**
 * @file PrincipleEditModal.tsx
 * @updated 2026-10-18: Uses the shared themed group dropdown.
 * @updated 2026-10-18: Adds optional principle group assignment.
 * @input Principle edit form state and modal action callbacks
 * @output Shared principle add/edit modal used by settings and AI chat writeback results
 * @pos Component (Settings / AI Integration)
 * @description Keeps the principle editing UI in one place so manual library edits and AI-created principle corrections use the same form.
 * @updated 2026-07-06: Extracted from PrincipleLibraryView for reuse inside AI chat applied-action cards.
 */
import React from 'react';
import { CustomSelect } from './CustomSelect';
import type { PrincipleGroup } from '../utils/principleGroupUtils';

export interface PrincipleEditFormData {
  title: string;
  frontText: string;
  backText: string;
  groupId?: string;
}

interface PrincipleEditModalProps {
  isEditing: boolean;
  formData: PrincipleEditFormData;
  groups?: PrincipleGroup[];
  onChange: (data: PrincipleEditFormData) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const PrincipleEditModal: React.FC<PrincipleEditModalProps> = ({
  isEditing,
  formData,
  groups,
  onChange,
  onSave,
  onCancel
}) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
      <h2 className="text-lg sm:text-xl font-bold mb-4">
        {isEditing ? '编辑原则' : '添加新原则'}
      </h2>

      <div className="space-y-3 sm:space-y-4">
        {groups && (
          <div>
            <CustomSelect
              ariaLabel="原则分组"
              label="分组"
              value={formData.groupId || ''}
              onChange={(value) => onChange({ ...formData, groupId: value || undefined })}
              options={[{ value: '', label: '未分组' }, ...groups.map((group) => ({ value: group.id, label: group.name }))]}
              renderDropdownInPortal
            />
          </div>
        )}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-stone-700 mb-1">
            标题 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(event) => onChange({ ...formData, title: event.target.value })}
            placeholder="例如：拥抱现实"
            className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-800"
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-stone-700 mb-1">
            正面文字 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.frontText}
            onChange={(event) => onChange({ ...formData, frontText: event.target.value })}
            placeholder="例如：痛苦 + 反思 = 进步"
            rows={3}
            className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-800 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-stone-700 mb-1">
            反面文字
          </label>
          <textarea
            value={formData.backText}
            onChange={(event) => onChange({ ...formData, backText: event.target.value })}
            placeholder="例如：接受现实，从中学习"
            rows={3}
            className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-800 resize-none"
          />
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
          disabled={!formData.title.trim() || !formData.frontText.trim()}
          className="flex-1 py-2 bg-stone-800 text-white rounded-lg text-sm hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isEditing ? '保存' : '创建'}
        </button>
      </div>
    </div>
  </div>
);
