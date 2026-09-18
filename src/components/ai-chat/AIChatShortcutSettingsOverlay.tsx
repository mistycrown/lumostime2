/**
 * @file AIChatShortcutSettingsOverlay.tsx
 * @input Custom prompt templates, template mutations, and AI chat theme tokens
 * @output A focused modal for managing homepage quick-command templates
 * @pos Component Support (AI Integration)
 * @description Keeps shortcut-template management separate from the larger persona settings surface.
 */
import React, { useEffect, useState } from 'react';
import { Check, Pencil, Plus, Trash2, X, Zap } from 'lucide-react';
import type { AIChatCustomPromptBlock } from './AIBackfillChatShared';

interface AIChatShortcutSettingsTheme {
  activeBg: string;
  activeBorder: string;
  dangerBg: string;
  dangerBorder: string;
  dangerText: string;
  inputBg: string;
  overlayLight: string;
  panelBg: string;
  panelBorder: string;
  primaryButtonBg: string;
  primaryButtonText: string;
  textMuted: string;
  textPrimary: string;
  textSecondary: string;
}

interface AIChatShortcutSettingsOverlayProps {
  customPromptBlocks: AIChatCustomPromptBlock[];
  isOpen: boolean;
  onAddCustomPromptBlock: () => string;
  onClose: () => void;
  onDeleteCustomPromptBlock: (blockId: string) => void;
  onUpdateCustomPromptBlock: (blockId: string, patch: { title?: string; content?: string; enabled?: boolean }) => void;
  theme: AIChatShortcutSettingsTheme;
}

export const AIChatShortcutSettingsOverlay: React.FC<AIChatShortcutSettingsOverlayProps> = ({
  customPromptBlocks,
  isOpen,
  onAddCustomPromptBlock,
  onClose,
  onDeleteCustomPromptBlock,
  onUpdateCustomPromptBlock,
  theme
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [isNewDraft, setIsNewDraft] = useState(false);

  const editingBlock = editingId ? customPromptBlocks.find((block) => block.id === editingId) : null;

  useEffect(() => {
    if (!isOpen) {
      setEditingId(null);
      setDraftTitle('');
      setDraftContent('');
      setIsNewDraft(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const closeEditor = (removeEmptyDraft = false) => {
    if (removeEmptyDraft && isNewDraft && editingId && (!draftTitle.trim() || !draftContent.trim())) {
      onDeleteCustomPromptBlock(editingId);
    }
    setEditingId(null);
    setDraftTitle('');
    setDraftContent('');
    setIsNewDraft(false);
  };

  const openEditor = (block: AIChatCustomPromptBlock, newlyCreated = false) => {
    setEditingId(block.id);
    setDraftTitle(block.title);
    setDraftContent(block.content);
    setIsNewDraft(newlyCreated);
  };

  const handleAdd = () => {
    const id = onAddCustomPromptBlock();
    openEditor({ id, title: '', content: '', enabled: true }, true);
  };

  const handleSave = () => {
    if (!editingId || !draftTitle.trim() || !draftContent.trim()) return;
    onUpdateCustomPromptBlock(editingId, {
      title: draftTitle.trim(),
      content: draftContent.trim(),
      enabled: editingBlock?.enabled ?? true
    });
    closeEditor();
  };

  const handleDelete = (blockId: string) => {
    onDeleteCustomPromptBlock(blockId);
    if (editingId === blockId) closeEditor();
  };

  return (
    <div className="absolute inset-0 z-30 backdrop-blur-[10px]" style={{ backgroundColor: theme.overlayLight }}>
      <div className="flex h-full flex-col" style={{ paddingTop: 'var(--app-safe-area-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex h-14 shrink-0 items-center justify-between border-b px-4" style={{ borderColor: theme.panelBorder, backgroundColor: theme.panelBg }}>
          <div className="flex items-center gap-2.5">
            <Zap size={17} style={{ color: theme.textSecondary }} />
            <h3 className="font-serif text-lg font-bold" style={{ color: theme.textPrimary }}>快捷指令</h3>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full" style={{ color: theme.textMuted }} title="关闭" aria-label="关闭"><X size={20} /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8">
          <div className="mx-auto max-w-2xl">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-sm font-medium" style={{ color: theme.textPrimary }}>模板提示词</p>
                <p className="mt-1 text-xs" style={{ color: theme.textMuted }}>把常用表达保存成一键发送的快捷指令。</p>
              </div>
              <button type="button" onClick={handleAdd} className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium" style={{ backgroundColor: theme.primaryButtonBg, color: theme.primaryButtonText }}><Plus size={14} /> 添加模板</button>
            </div>

            {customPromptBlocks.length === 0 ? (
              <div className="border-y py-10 text-center text-sm" style={{ borderColor: theme.panelBorder, color: theme.textMuted }}>还没有快捷模板，先添加一个吧。</div>
            ) : (
              <div className="border-y" style={{ borderColor: theme.panelBorder }}>
                {customPromptBlocks.map((block) => (
                  <div key={block.id} className="flex items-center gap-3 border-b py-3.5 last:border-b-0" style={{ borderColor: theme.panelBorder }}>
                    <button type="button" onClick={() => onUpdateCustomPromptBlock(block.id, { enabled: !block.enabled })} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: block.enabled ? theme.activeBorder : theme.panelBorder, backgroundColor: block.enabled ? theme.activeBg : theme.inputBg, color: block.enabled ? theme.textPrimary : theme.textMuted }} title={block.enabled ? '停用模板' : '启用模板'} aria-label={block.enabled ? '停用模板' : '启用模板'}>{block.enabled ? <Check size={14} /> : <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: theme.textMuted }} />}</button>
                    <button type="button" onClick={() => openEditor(block)} className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-medium" style={{ color: theme.textPrimary }}>{block.title.trim() || '未命名模板'}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs" style={{ color: theme.textMuted }}>{block.content.trim() || '点击编辑提示词内容'}</p>
                    </button>
                    <button type="button" onClick={() => openEditor(block)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ color: theme.textMuted }} title="编辑模板" aria-label="编辑模板"><Pencil size={14} /></button>
                    <button type="button" onClick={() => handleDelete(block.id)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ color: theme.dangerText }} title="删除模板" aria-label="删除模板"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {editingBlock && (
        <div className="absolute inset-0 z-10 flex items-end justify-center bg-black/10 p-3 sm:items-center sm:p-6">
          <div className="w-full max-w-lg rounded-[0.9rem] border p-4 shadow-xl" style={{ borderColor: theme.panelBorder, backgroundColor: theme.panelBg }}>
            <div className="flex items-center justify-between gap-3"><h4 className="font-serif text-base font-bold" style={{ color: theme.textPrimary }}>{isNewDraft ? '添加模板' : '编辑模板'}</h4><button type="button" onClick={() => closeEditor(true)} className="flex h-8 w-8 items-center justify-center rounded-full" style={{ color: theme.textMuted }} title="关闭编辑" aria-label="关闭编辑"><X size={17} /></button></div>
            <label className="mt-4 block"><span className="mb-1 block text-xs" style={{ color: theme.textMuted }}>模板名称</span><input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} autoFocus className="w-full rounded-[0.65rem] border px-3 py-2.5 text-sm outline-none" style={{ borderColor: theme.panelBorder, backgroundColor: theme.inputBg, color: theme.textPrimary }} placeholder="例如：生成小报" /></label>
            <label className="mt-3 block"><span className="mb-1 block text-xs" style={{ color: theme.textMuted }}>提示词内容</span><textarea value={draftContent} onChange={(event) => setDraftContent(event.target.value)} className="min-h-32 w-full resize-y rounded-[0.65rem] border px-3 py-2.5 text-sm leading-6 outline-none" style={{ borderColor: theme.panelBorder, backgroundColor: theme.inputBg, color: theme.textPrimary }} placeholder="例如：请把今天的记录整理成一份简洁的小报。" /></label>
            <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => closeEditor(true)} className="rounded-full border px-4 py-2 text-xs" style={{ borderColor: theme.panelBorder, color: theme.textSecondary }}>取消</button><button type="button" onClick={handleSave} disabled={!draftTitle.trim() || !draftContent.trim()} className="rounded-full px-4 py-2 text-xs font-medium disabled:opacity-40" style={{ backgroundColor: theme.primaryButtonBg, color: theme.primaryButtonText }}>保存模板</button></div>
          </div>
        </div>
      )}
    </div>
  );
};
