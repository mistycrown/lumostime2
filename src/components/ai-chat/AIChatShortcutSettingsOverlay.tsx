/**
 * @file AIChatShortcutSettingsOverlay.tsx
 * @input Independent AI shortcuts, shortcut mutations, and AI chat theme tokens
 * @output Dedicated full-page shortcut management screen
 * @pos Component Support (AI Integration)
 * @description Keeps quick input templates separate from persona custom prompt blocks and call settings.
 */
import React, { useState } from 'react';
import { Check, Pencil, Plus, Trash2, X, Zap } from 'lucide-react';
import type { AIChatShortcut } from './AIBackfillChatShared';

interface AIChatShortcutSettingsTheme {
  activeBg: string;
  activeBorder: string;
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
  shortcuts: AIChatShortcut[];
  isOpen: boolean;
  onAddShortcut: () => string;
  onClose: () => void;
  onDeleteShortcut: (shortcutId: string) => void;
  onUpdateShortcut: (shortcutId: string, patch: Partial<Pick<AIChatShortcut, 'title' | 'content' | 'enabled'>>) => void;
  theme: AIChatShortcutSettingsTheme;
}

export const AIChatShortcutSettingsOverlay: React.FC<AIChatShortcutSettingsOverlayProps> = ({
  shortcuts,
  isOpen,
  onAddShortcut,
  onClose,
  onDeleteShortcut,
  onUpdateShortcut,
  theme
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [isNewDraft, setIsNewDraft] = useState(false);
  const editingShortcut = editingId ? shortcuts.find((shortcut) => shortcut.id === editingId) : null;

  if (!isOpen) return null;

  const closeEditor = (removeEmptyDraft = false) => {
    if (removeEmptyDraft && isNewDraft && editingId && (!draftTitle.trim() || !draftContent.trim())) {
      onDeleteShortcut(editingId);
    }
    setEditingId(null);
    setDraftTitle('');
    setDraftContent('');
    setIsNewDraft(false);
  };
  const openEditor = (shortcut: AIChatShortcut, newlyCreated = false) => {
    setEditingId(shortcut.id);
    setDraftTitle(shortcut.title);
    setDraftContent(shortcut.content);
    setIsNewDraft(newlyCreated);
  };
  const handleAdd = () => {
    const id = onAddShortcut();
    openEditor({ id, title: '', content: '', enabled: true }, true);
  };
  const handleSave = () => {
    if (!editingId || !draftTitle.trim() || !draftContent.trim()) return;
    onUpdateShortcut(editingId, { title: draftTitle.trim(), content: draftContent.trim(), enabled: editingShortcut?.enabled ?? true });
    closeEditor();
  };

  return (
    <div className="absolute inset-0 z-30 backdrop-blur-[10px]" style={{ backgroundColor: theme.overlayLight }}>
      <div className="flex h-full flex-col" style={{ paddingTop: 'var(--app-safe-area-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex h-14 shrink-0 items-center justify-between border-b px-4" style={{ borderColor: theme.panelBorder, backgroundColor: theme.panelBg }}>
          <div className="flex items-center gap-2.5"><Zap size={17} style={{ color: theme.textSecondary }} /><h3 className="font-serif text-lg font-bold" style={{ color: theme.textPrimary }}>快捷指令</h3></div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full" style={{ color: theme.textMuted }} title="关闭" aria-label="关闭"><X size={20} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8">
          <div className="mx-auto max-w-2xl">
            <div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-sm font-medium" style={{ color: theme.textPrimary }}>常用输入</p><p className="mt-1 text-xs" style={{ color: theme.textMuted }}>点击后填入对话输入框，不会自动发送。</p></div><button type="button" onClick={handleAdd} className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium" style={{ backgroundColor: theme.primaryButtonBg, color: theme.primaryButtonText }}><Plus size={14} /> 添加</button></div>
            {shortcuts.length === 0 ? <div className="border-y py-10 text-center text-sm" style={{ borderColor: theme.panelBorder, color: theme.textMuted }}>还没有快捷指令。</div> : <div className="border-y" style={{ borderColor: theme.panelBorder }}>{shortcuts.map((shortcut) => <div key={shortcut.id} className="flex items-center gap-3 border-b py-3.5 last:border-b-0" style={{ borderColor: theme.panelBorder }}><button type="button" onClick={() => onUpdateShortcut(shortcut.id, { enabled: !shortcut.enabled })} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: shortcut.enabled ? theme.activeBorder : theme.panelBorder, backgroundColor: shortcut.enabled ? theme.activeBg : theme.inputBg, color: shortcut.enabled ? theme.textPrimary : theme.textMuted }} title={shortcut.enabled ? '停用快捷指令' : '启用快捷指令'} aria-label={shortcut.enabled ? '停用快捷指令' : '启用快捷指令'}>{shortcut.enabled ? <Check size={14} /> : <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: theme.textMuted }} />}</button><button type="button" onClick={() => openEditor(shortcut)} className="min-w-0 flex-1 text-left"><p className="truncate text-sm font-medium" style={{ color: theme.textPrimary }}>{shortcut.title}</p><p className="mt-0.5 line-clamp-1 text-xs" style={{ color: theme.textMuted }}>{shortcut.content}</p></button><button type="button" onClick={() => openEditor(shortcut)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ color: theme.textMuted }} title="编辑快捷指令" aria-label="编辑快捷指令"><Pencil size={14} /></button><button type="button" onClick={() => onDeleteShortcut(shortcut.id)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ color: theme.dangerText }} title="删除快捷指令" aria-label="删除快捷指令"><Trash2 size={14} /></button></div>)}</div>}
            {editingShortcut && <div className="mt-5 rounded-[0.9rem] border p-4" style={{ borderColor: theme.panelBorder, backgroundColor: theme.panelBg }}><div className="flex items-center justify-between gap-3"><h4 className="text-sm font-bold" style={{ color: theme.textPrimary }}>{isNewDraft ? '添加快捷指令' : '编辑快捷指令'}</h4><button type="button" onClick={() => closeEditor(true)} className="flex h-8 w-8 items-center justify-center rounded-full" style={{ color: theme.textMuted }} title="关闭编辑" aria-label="关闭编辑"><X size={17} /></button></div><label className="mt-4 block"><span className="mb-1 block text-xs" style={{ color: theme.textMuted }}>名称</span><input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} autoFocus className="w-full rounded-[0.65rem] border px-3 py-2.5 text-sm outline-none" style={{ borderColor: theme.panelBorder, backgroundColor: theme.inputBg, color: theme.textPrimary }} /></label><label className="mt-3 block"><span className="mb-1 block text-xs" style={{ color: theme.textMuted }}>输入内容</span><textarea value={draftContent} onChange={(event) => setDraftContent(event.target.value)} className="min-h-28 w-full resize-y rounded-[0.65rem] border px-3 py-2.5 text-sm leading-6 outline-none" style={{ borderColor: theme.panelBorder, backgroundColor: theme.inputBg, color: theme.textPrimary }} /></label><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => closeEditor(true)} className="rounded-full border px-4 py-2 text-xs" style={{ borderColor: theme.panelBorder, color: theme.textMuted }}>取消</button><button type="button" onClick={handleSave} disabled={!draftTitle.trim() || !draftContent.trim()} className="rounded-full px-4 py-2 text-xs font-medium disabled:opacity-40" style={{ backgroundColor: theme.primaryButtonBg, color: theme.primaryButtonText }}>保存</button></div></div>}
          </div>
        </div>
      </div>
    </div>
  );
};
