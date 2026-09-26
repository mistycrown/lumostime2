/**
 * @file MoodCalendarBackgroundSelector.tsx
 * @input Toast callback and paired Memoir mood-calendar background files
 * @output Background selection, paired upload/delete actions, and debugger launch
 * @pos Component (Sponsorship Personalization)
 * @description Manages five-week and six-week background image pairs with a navigation-icon-style upload modal.
 * @updated 2026-09-26: Requires separate five-week and six-week images for each uploaded background.
 * @updated 2026-09-26: Constrained mood calendar background cards to a 96px left-aligned grid.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Plus, Settings, Upload, X } from 'lucide-react';
import { ToastType } from './Toast';
import { moodCalendarBackgroundService, MOOD_CALENDAR_BACKGROUND_CHANGE_EVENT } from '../services/moodCalendarBackgroundService';

interface MoodCalendarBackgroundSelectorProps {
    onToast: (type: ToastType, message: string) => void;
    onOpenDebugger?: () => void;
}

type UploadSlot = 'fiveWeek' | 'sixWeek';

export const MoodCalendarBackgroundSelector: React.FC<MoodCalendarBackgroundSelectorProps> = ({ onToast, onOpenDebugger }) => {
    const [backgrounds, setBackgrounds] = useState(() => moodCalendarBackgroundService.getAllBackgrounds());
    const [currentId, setCurrentId] = useState(() => moodCalendarBackgroundService.getCurrentBackground());
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [backgroundName, setBackgroundName] = useState('');
    const [files, setFiles] = useState<{ fiveWeek?: File; sixWeek?: File }>({});
    const fileInputRef = useRef<HTMLInputElement>(null);
    const uploadSlotRef = useRef<UploadSlot | null>(null);

    const reload = () => {
        setBackgrounds(moodCalendarBackgroundService.getAllBackgrounds());
        setCurrentId(moodCalendarBackgroundService.getCurrentBackground());
    };

    useEffect(() => {
        window.addEventListener(MOOD_CALENDAR_BACKGROUND_CHANGE_EVENT, reload);
        return () => window.removeEventListener(MOOD_CALENDAR_BACKGROUND_CHANGE_EVENT, reload);
    }, []);

    const openAddModal = () => {
        setBackgroundName('');
        setFiles({});
        setIsAddModalOpen(true);
    };

    const closeAddModal = () => {
        if (isUploading) return;
        setIsAddModalOpen(false);
        setFiles({});
    };

    const pickFile = (slot: UploadSlot) => {
        uploadSlotRef.current = slot;
        fileInputRef.current?.click();
    };

    const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        const slot = uploadSlotRef.current;
        if (!file || !slot) return;
        if (!file.type.startsWith('image/')) {
            onToast('error', '请选择图片文件');
        } else if (file.size > 10 * 1024 * 1024) {
            onToast('error', '图片文件不能超过 10MB');
        } else {
            setFiles((current) => ({ ...current, [slot]: file }));
            if (slot === 'fiveWeek' && !backgroundName) setBackgroundName(file.name.replace(/\.[^/.]+$/, ''));
        }
        uploadSlotRef.current = null;
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const submitAdd = async () => {
        if (!files.fiveWeek || !files.sixWeek) {
            onToast('error', '请先上传五周和六周两张背景图');
            return;
        }
        setIsUploading(true);
        try {
            const background = await moodCalendarBackgroundService.addCustomBackground(files.fiveWeek, files.sixWeek, backgroundName);
            moodCalendarBackgroundService.setCurrentBackground(background.id);
            reload();
            setIsAddModalOpen(false);
            setFiles({});
            onToast('success', '心情日历背景已添加');
        } catch (error) {
            console.error('[MoodCalendarBackgroundSelector] Failed to upload paired background', error);
            onToast('error', '添加心情日历背景失败');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id: string, event: React.MouseEvent) => {
        event.stopPropagation();
        if (await moodCalendarBackgroundService.deleteCustomBackground(id)) {
            reload();
            onToast('success', '心情日历背景已删除');
        }
    };

    const renderUploadSlot = (slot: UploadSlot, label: string) => {
        const file = files[slot];
        return (
            <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
                <span className="text-xs text-stone-600">{label}</span>
                <button type="button" onClick={() => pickFile(slot)} className={`relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl border bg-white transition-colors ${file ? 'border-stone-300' : 'border-dashed border-stone-300'}`} aria-label={`上传${label}背景图`}>
                    {file ? <img src={URL.createObjectURL(file)} alt={file.name} className="h-full w-full object-contain" /> : <span className="flex flex-col items-center gap-1 text-stone-400"><Upload size={17} /><span className="text-[10px]">上传</span></span>}
                </button>
                {file && <span className="max-w-full truncate text-[10px] text-stone-400">{file.name}</span>}
            </div>
        );
    };

    const editor = isAddModalOpen ? (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="添加心情日历背景" onClick={closeAddModal}>
            <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-[24px] bg-[#fdfbf7] shadow-2xl" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between border-b border-stone-100 px-5 py-5">
                    <h3 className="text-lg font-medium text-stone-800">添加心情日历背景</h3>
                    <button type="button" onClick={closeAddModal} aria-label="关闭" className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"><X size={19} /></button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                    <label className="block text-xs text-stone-500">方案名称<input value={backgroundName} onChange={(event) => setBackgroundName(event.target.value)} maxLength={20} placeholder="例如：兔子云朵" className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-200" /></label>
                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-stone-100 pt-4">{renderUploadSlot('fiveWeek', '五周背景图')}{renderUploadSlot('sixWeek', '六周背景图')}</div>
                    <p className="mt-3 text-[11px] leading-5 text-stone-400">日历为五周时使用第一张图，六周时使用第二张图。两张图片都会保留原始比例。</p>
                </div>
                <div className="flex shrink-0 justify-end gap-3 border-t border-stone-100 bg-white px-5 py-4"><button type="button" onClick={closeAddModal} className="rounded-xl px-4 py-2 text-xs text-stone-500 hover:bg-stone-100">取消</button><button type="button" onClick={() => void submitAdd()} disabled={isUploading} className="rounded-xl bg-stone-800 px-4 py-2 text-xs text-white hover:bg-stone-700 disabled:opacity-50">{isUploading ? '添加中…' : '添加背景'}</button></div>
            </div>
        </div>
    ) : null;

    return (
        <>
            <section className="space-y-4">
                <div className="flex items-center justify-between gap-4"><div><h3 className="text-sm font-medium text-stone-700">心情日历背景</h3><p className="mt-1 text-xs text-stone-500">用于 Memoir 顶部月历</p></div><button type="button" onClick={() => onOpenDebugger?.()} className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-medium text-stone-600 shadow-sm hover:bg-stone-100"><Settings size={14} /> 调整</button></div>
                <div className="grid justify-start gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, 96px)' }}>
                    {backgrounds.map((background) => <div key={background.id} role="button" tabIndex={0} aria-label={`选择心情日历背景：${background.name}`} aria-pressed={currentId === background.id} onClick={() => moodCalendarBackgroundService.setCurrentBackground(background.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); moodCalendarBackgroundService.setCurrentBackground(background.id); } }} className={`relative w-full max-w-24 justify-self-start aspect-[3/2] overflow-hidden rounded-lg border-2 bg-stone-50 ${currentId === background.id ? 'border-stone-500 ring-2 ring-stone-200' : 'border-stone-200 hover:border-stone-300'}`}>
                        {background.url ? <img src={background.thumbnail || background.url} alt={background.name} className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-xs text-stone-400">无背景</span>}
                        {currentId === background.id && <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-stone-800 text-white shadow"><Check size={12} /></span>}
                        {background.type === 'custom' && <button type="button" aria-label={`删除心情日历背景：${background.name}`} onClick={(event) => void handleDelete(background.id, event)} className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow"><X size={10} /></button>}
                    </div>)}
                    <button type="button" onClick={openAddModal} className="w-full max-w-24 justify-self-start aspect-[3/2] rounded-lg border-2 border-dashed border-stone-300 text-stone-500 hover:border-stone-400"><span className="inline-flex items-center gap-1 text-xs"><Plus size={15} /> 添加</span></button>
                </div>
            </section>
            {editor && (typeof document === 'undefined' ? editor : createPortal(editor, document.body))}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        </>
    );
};
