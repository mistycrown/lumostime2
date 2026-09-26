/**
 * @file CardBackgroundSelector.tsx
 * @input User card-background groups, uploaded images, alignment and opacity controls
 * @output Selected synchronized card backgrounds and group management actions
 * @pos Component (Sponsorship Personalization)
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ImagePlus, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import { ToastType } from './Toast';
import {
  CARD_BACKGROUND_CHANGED_EVENT,
  CARD_BACKGROUND_OPACITY_EVENT,
  cardBackgroundService,
  getCardBackgroundPosition,
  type CardBackgroundAlignment,
  type CardBackgroundGroup
} from '../services/cardBackgroundService';
import { imageService } from '../services/imageService';
import { APPEARANCE_RESTORED_EVENT } from '../services/appearanceBackupService';

interface CardBackgroundSelectorProps {
  onToast: (type: ToastType, message: string) => void;
}

const ALIGNMENT_OPTIONS: { value: CardBackgroundAlignment; label: string }[] = [
  { value: 'right', label: '右' },
  { value: 'right-top', label: '右上' },
  { value: 'right-bottom', label: '右下' }
];

export const CardBackgroundSelector: React.FC<CardBackgroundSelectorProps> = ({ onToast }) => {
  const [groups, setGroups] = useState(() => cardBackgroundService.getGroups());
  const [currentId, setCurrentId] = useState(() => cardBackgroundService.getCurrentGroupId());
  const [opacity, setOpacity] = useState(() => cardBackgroundService.getOpacity());
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [modalImageUrls, setModalImageUrls] = useState<Record<string, string>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CardBackgroundGroup | null>(null);
  const [groupName, setGroupName] = useState('');
  const [alignment, setAlignment] = useState<CardBackgroundAlignment>('right');
  const [retainedFilenames, setRetainedFilenames] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<Record<string, string>>({});
  const modalImageUrlsRef = useRef<Record<string, string>>({});
  const isMountedRef = useRef(false);

  const clearModalImageUrls = () => {
    Object.values(modalImageUrlsRef.current).forEach((url) => {
      if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    });
    modalImageUrlsRef.current = {};
    setModalImageUrls({});
  };

  const reload = async () => {
    const nextGroups = cardBackgroundService.getGroups();
    setGroups(nextGroups);
    setCurrentId(cardBackgroundService.getCurrentGroupId());
    setOpacity(cardBackgroundService.getOpacity());
    const nextUrls: Record<string, string> = {};
    await Promise.all(nextGroups.map(async (group) => {
      const url = await imageService.getImageUrl(group.imageFilenames[0], 'thumbnail');
      if (url) nextUrls[group.id] = url;
    }));
    if (!isMountedRef.current) {
      Object.values(nextUrls).forEach((url) => { if (url.startsWith('blob:')) URL.revokeObjectURL(url); });
      return;
    }
    Object.values(previewUrlsRef.current).forEach((url) => { if (url.startsWith('blob:')) URL.revokeObjectURL(url); });
    previewUrlsRef.current = nextUrls;
    setPreviewUrls(nextUrls);
  };

  useEffect(() => {
    isMountedRef.current = true;
    void reload();
    window.addEventListener(CARD_BACKGROUND_CHANGED_EVENT, reload);
    window.addEventListener(APPEARANCE_RESTORED_EVENT, reload);
    const updateOpacity = () => setOpacity(cardBackgroundService.getOpacity());
    window.addEventListener(CARD_BACKGROUND_OPACITY_EVENT, updateOpacity);
    return () => {
      isMountedRef.current = false;
      window.removeEventListener(CARD_BACKGROUND_CHANGED_EVENT, reload);
      window.removeEventListener(APPEARANCE_RESTORED_EVENT, reload);
      window.removeEventListener(CARD_BACKGROUND_OPACITY_EVENT, updateOpacity);
      Object.values(previewUrlsRef.current).forEach((url) => { if (url.startsWith('blob:')) URL.revokeObjectURL(url); });
      clearModalImageUrls();
    };
  }, []);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setFilePreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  const openCreateModal = () => {
    clearModalImageUrls();
    setEditingGroup(null);
    setGroupName('');
    setAlignment('right');
    setRetainedFilenames([]);
    setFiles([]);
    setIsDeleteConfirmOpen(false);
    setIsModalOpen(true);
  };

  const openEditModal = async (group: CardBackgroundGroup) => {
    clearModalImageUrls();
    setEditingGroup(group);
    setGroupName(group.name);
    setAlignment(group.alignment);
    setRetainedFilenames(group.imageFilenames);
    setFiles([]);
    setIsDeleteConfirmOpen(false);
    setIsModalOpen(true);
    const urls: Record<string, string> = {};
    await Promise.all(group.imageFilenames.map(async (filename) => {
      const url = await imageService.getImageUrl(filename, 'thumbnail');
      if (url) urls[filename] = url;
    }));
    if (!isMountedRef.current) {
      Object.values(urls).forEach((url) => { if (url.startsWith('blob:')) URL.revokeObjectURL(url); });
      return;
    }
    Object.values(modalImageUrlsRef.current).forEach((url) => { if (url.startsWith('blob:')) URL.revokeObjectURL(url); });
    modalImageUrlsRef.current = urls;
    setModalImageUrls(urls);
  };

  const closeModal = (force = false) => {
    if (isSaving && !force) return;
    setIsModalOpen(false);
    setEditingGroup(null);
    setFiles([]);
    setRetainedFilenames([]);
    setIsDeleteConfirmOpen(false);
    clearModalImageUrls();
  };

  const addFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(event.target.files || []);
    const invalid = incoming.find((file) => !file.type.startsWith('image/') || file.size > 10 * 1024 * 1024);
    if (invalid) {
      onToast('error', invalid.type.startsWith('image/') ? '单张图片不能超过 10MB' : '请选择图片文件');
    } else if (incoming.length > 0) {
      setFiles((previous) => [...previous, ...incoming]);
    }
    event.target.value = '';
  };

  const saveGroup = async () => {
    setIsSaving(true);
    try {
      if (editingGroup) {
        await cardBackgroundService.updateGroup(editingGroup.id, groupName, retainedFilenames, files, alignment);
        onToast('success', '卡片背景组已更新');
      } else {
        await cardBackgroundService.addGroup(groupName, files, alignment);
        onToast('success', '卡片背景组已添加');
      }
      await reload();
      closeModal(true);
    } catch (error) {
      onToast('error', error instanceof Error ? error.message : '保存卡片背景失败');
    } finally {
      setIsSaving(false);
    }
  };

  const removeGroup = async () => {
    if (!editingGroup) return;
    setIsSaving(true);
    try {
      await cardBackgroundService.deleteGroup(editingGroup.id);
      await reload();
      closeModal(true);
      onToast('success', '卡片背景组已删除');
    } catch (error) {
      onToast('error', error instanceof Error ? error.message : '删除卡片背景失败');
    } finally {
      setIsSaving(false);
    }
  };

  const modal = isModalOpen ? (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={editingGroup ? '编辑卡片背景组' : '新建卡片背景组'} onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-[#fdfbf7] shadow-2xl">
        <div className="flex items-start justify-between border-b border-stone-100 px-5 py-5"><h3 className="text-lg font-medium text-stone-800">{editingGroup ? '编辑卡片背景组' : '新建卡片背景组'}</h3><button type="button" onClick={() => closeModal()} aria-label="关闭" className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"><X size={19} /></button></div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <label className="block text-xs text-stone-500">分组名称<input value={groupName} onChange={(event) => setGroupName(event.target.value)} maxLength={30} placeholder="输入名称" className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-stone-400" /></label>
          <div><div className="mb-2 flex items-center justify-between"><span className="text-xs text-stone-500">背景图片</span><span className="text-[11px] text-stone-400">最多 10MB / 张</span></div><div className="grid grid-cols-4 gap-2">
            {retainedFilenames.map((filename) => <div key={filename} className="relative aspect-square overflow-hidden rounded-lg border border-stone-200 bg-white">{modalImageUrls[filename] ? <img src={modalImageUrls[filename]} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-stone-300"><ImagePlus size={17} /></span>}<button type="button" onClick={() => setRetainedFilenames((previous) => previous.filter((item) => item !== filename))} aria-label="移除图片" className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"><X size={13} /></button></div>)}
            {files.map((file, index) => <div key={`${file.name}-${file.size}-${index}`} className="relative aspect-square overflow-hidden rounded-lg border border-stone-200 bg-white"><img src={filePreviews[index]} alt={file.name} className="h-full w-full object-cover" /><button type="button" onClick={() => setFiles((previous) => previous.filter((_, fileIndex) => fileIndex !== index))} aria-label={`移除 ${file.name}`} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"><X size={13} /></button></div>)}
            <button type="button" onClick={() => fileInputRef.current?.click()} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-stone-300 text-stone-400 transition-colors hover:border-stone-500 hover:text-stone-700"><Upload size={17} /><span className="text-[10px]">添加图片</span></button>
          </div></div>
          <fieldset><legend className="mb-2 text-xs text-stone-500">背景对齐</legend><div role="group" aria-label="背景对齐方式" className="inline-flex border-b border-stone-200">{ALIGNMENT_OPTIONS.map((option) => <button key={option.value} type="button" aria-pressed={alignment === option.value} onClick={() => setAlignment(option.value)} className={`px-4 py-2 text-xs transition-colors ${alignment === option.value ? 'border-b-2 border-stone-800 font-medium text-stone-900' : 'text-stone-400 hover:text-stone-700'}`}>{option.label}</button>)}</div></fieldset>
          {editingGroup && isDeleteConfirmOpen && <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-3 text-xs text-rose-700"><p>确定删除“{editingGroup.name}”及组内图片吗？</p><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setIsDeleteConfirmOpen(false)} className="rounded-lg px-3 py-1.5 text-rose-600 hover:bg-rose-100">取消</button><button type="button" onClick={() => void removeGroup()} disabled={isSaving} className="rounded-lg bg-rose-600 px-3 py-1.5 text-white hover:bg-rose-700 disabled:opacity-40">确认删除</button></div></div>}
        </div>
        <div className="flex shrink-0 items-center justify-between border-t border-stone-100 bg-white px-5 py-4">{editingGroup ? <button type="button" onClick={() => setIsDeleteConfirmOpen(true)} disabled={isSaving} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-40"><Trash2 size={14} />删除分组</button> : <span /> }<div className="flex gap-2"><button type="button" onClick={() => closeModal()} className="rounded-lg px-4 py-2 text-xs text-stone-500 hover:bg-stone-100">取消</button><button type="button" onClick={() => void saveGroup()} disabled={isSaving || !groupName.trim() || retainedFilenames.length + files.length === 0} className="rounded-lg bg-stone-800 px-4 py-2 text-xs text-white hover:bg-stone-700 disabled:opacity-40">{isSaving ? '保存中…' : '保存分组'}</button></div></div>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={addFiles} className="hidden" />
    </div>
  ) : null;

  return (
    <section className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h4 className="font-bold text-stone-700">卡片背景</h4><p className="mt-1 text-xs leading-5 text-stone-400">场景、松散待办和 Memoir 回顾卡片</p></div><button type="button" onClick={openCreateModal} aria-label="新建卡片背景组" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-stone-200 text-stone-500 transition-colors hover:border-stone-400 hover:text-stone-800"><Plus size={17} /></button></div>
        <label className="mt-4 flex items-center gap-3 text-xs text-stone-600"><span className="shrink-0">图片透明度</span><input aria-label="卡片背景图片透明度" type="range" min="0" max="100" step="1" value={Math.round(opacity * 100)} onChange={(event) => cardBackgroundService.setOpacity(Number(event.target.value) / 100)} className="h-1.5 min-w-0 flex-1 accent-stone-700" /><span className="w-9 text-right font-mono text-stone-500">{Math.round(opacity * 100)}%</span></label>
        <div className="mt-4 grid justify-start gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 96px))' }}>
          <button type="button" onClick={() => cardBackgroundService.setCurrentGroup(null)} aria-pressed={!currentId} aria-label="不使用卡片背景" className={`relative aspect-[4/3] w-full overflow-hidden rounded-xl border-2 bg-white text-xs text-stone-400 ${!currentId ? 'border-stone-500 ring-2 ring-stone-200' : 'border-stone-200 hover:border-stone-300'}`}>不使用{!currentId && <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-stone-800 text-white"><Check size={12} /></span>}</button>
          {groups.map((group) => <div key={group.id} className={`relative aspect-[4/3] w-full overflow-hidden rounded-xl border-2 bg-stone-50 ${currentId === group.id ? 'border-stone-500 ring-2 ring-stone-200' : 'border-stone-200 hover:border-stone-300'}`}><button type="button" onClick={() => void openEditModal(group)} aria-label={`编辑卡片背景组：${group.name}`} className="absolute inset-0 w-full text-left">{previewUrls[group.id] ? <img src={previewUrls[group.id]} alt="" className="h-full w-full object-cover" style={{ objectPosition: getCardBackgroundPosition(group.alignment) }} /> : <span className="flex h-full items-center justify-center text-stone-300"><ImagePlus size={20} /></span>}<span className="absolute inset-x-0 bottom-0 truncate bg-white/85 px-1.5 py-1 text-[10px] text-stone-700">{group.name} · {group.imageFilenames.length}</span></button><button type="button" onClick={() => void openEditModal(group)} aria-label={`编辑卡片背景组：${group.name}`} className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"><Pencil size={10} /></button><button type="button" onClick={(event) => { event.stopPropagation(); cardBackgroundService.setCurrentGroup(currentId === group.id ? null : group.id); }} aria-label={currentId === group.id ? `取消使用：${group.name}` : `使用卡片背景：${group.name}`} aria-pressed={currentId === group.id} className={`absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full ${currentId === group.id ? 'bg-stone-800 text-white' : 'bg-white/85 text-transparent hover:text-stone-500'}`}><Check size={12} /></button></div>)}
          <button type="button" onClick={openCreateModal} aria-label="新建卡片背景组" className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-stone-300 text-stone-500 transition-colors hover:border-stone-500 hover:text-stone-700"><Plus size={17} /><span className="text-[10px]">新建组</span></button>
        </div>
      </div>
      {modal && (typeof document === 'undefined' ? modal : createPortal(modal, document.body))}
    </section>
  );
};
