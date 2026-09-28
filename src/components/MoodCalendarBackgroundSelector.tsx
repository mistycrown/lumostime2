/**
 * @file MoodCalendarBackgroundSelector.tsx
 * @input Toast callback and Memoir mood-calendar background file
 * @output Single-image background selection, upload, delete, and opacity controls
 * @pos Component (Sponsorship Personalization)
 * @description Manages one clipped fill image for each Memoir mood-calendar background.
 * @updated 2026-09-28: Reuses one revocable preview URL instead of allocating blob URLs during render.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Plus, Upload, X } from 'lucide-react';
import { ToastType } from './Toast';
import { moodCalendarBackgroundService, MOOD_CALENDAR_BACKGROUND_CHANGE_EVENT } from '../services/moodCalendarBackgroundService';

interface MoodCalendarBackgroundSelectorProps {
    onToast: (type: ToastType, message: string) => void;
}

export const MoodCalendarBackgroundSelector: React.FC<MoodCalendarBackgroundSelectorProps> = ({ onToast }) => {
    const [backgrounds, setBackgrounds] = useState(() => moodCalendarBackgroundService.getAllBackgrounds());
    const [currentId, setCurrentId] = useState(() => moodCalendarBackgroundService.getCurrentBackground());
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [backgroundName, setBackgroundName] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [filePreviewUrl, setFilePreviewUrl] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const selectedOpacity = moodCalendarBackgroundService.getBackgroundById(currentId)?.opacity ?? 1;

    const reload = () => {
        setBackgrounds(moodCalendarBackgroundService.getAllBackgrounds());
        setCurrentId(moodCalendarBackgroundService.getCurrentBackground());
    };

    useEffect(() => {
        window.addEventListener(MOOD_CALENDAR_BACKGROUND_CHANGE_EVENT, reload);
        void moodCalendarBackgroundService.hydrateCustomBackgrounds();
        return () => window.removeEventListener(MOOD_CALENDAR_BACKGROUND_CHANGE_EVENT, reload);
    }, []);

    useEffect(() => {
        if (!file) {
            setFilePreviewUrl('');
            return;
        }

        const url = URL.createObjectURL(file);
        setFilePreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const openAddModal = () => {
        setBackgroundName('');
        setFile(null);
        setIsAddModalOpen(true);
    };

    const closeAddModal = () => {
        if (isUploading) return;
        setIsAddModalOpen(false);
        setFile(null);
    };

    const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const nextFile = event.target.files?.[0];
        if (!nextFile) return;
        if (!nextFile.type.startsWith('image/')) {
            onToast('error', '请选择图片文件');
        } else if (nextFile.size > 10 * 1024 * 1024) {
            onToast('error', '图片文件不能超过 10MB');
        } else {
            setFile(nextFile);
            if (!backgroundName) setBackgroundName(nextFile.name.replace(/\.[^/.]+$/, ''));
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const submitAdd = async () => {
        if (!file) {
            onToast('error', '请先上传背景图');
            return;
        }
        setIsUploading(true);
        try {
            const background = await moodCalendarBackgroundService.addCustomBackground(file, backgroundName);
            moodCalendarBackgroundService.setCurrentBackground(background.id);
            reload();
            setIsAddModalOpen(false);
            setFile(null);
            onToast('success', '心情日历背景已添加');
        } catch (error) {
            console.error('[MoodCalendarBackgroundSelector] Failed to upload background', error);
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

    const editor = isAddModalOpen ? (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="添加心情日历背景" onClick={closeAddModal}>
            <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-[24px] bg-[#fdfbf7] shadow-2xl" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between border-b border-stone-100 px-5 py-5">
                    <h3 className="text-lg font-medium text-stone-800">添加心情日历背景</h3>
                    <button type="button" onClick={closeAddModal} aria-label="关闭" className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"><X size={19} /></button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                    <label className="block text-xs text-stone-500">方案名称<input value={backgroundName} onChange={(event) => setBackgroundName(event.target.value)} maxLength={20} placeholder="例如：兔子云朵" className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-200" /></label>
                    <div className="mt-4 border-t border-stone-100 pt-4">
                        <span className="text-xs text-stone-600">背景图片</span>
                        <button type="button" onClick={() => fileInputRef.current?.click()} className={`relative mt-1.5 flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl border bg-white transition-colors ${file ? 'border-stone-300' : 'border-dashed border-stone-300'}`} aria-label="上传背景图片">
                            {file && filePreviewUrl ? <img src={filePreviewUrl} alt={file.name} className="h-full w-full object-contain" /> : <span className="flex flex-col items-center gap-1 text-stone-400"><Upload size={17} /><span className="text-[10px]">上传</span></span>}
                        </button>
                        {file && <span className="mt-1.5 block max-w-full truncate text-[10px] text-stone-400">{file.name}</span>}
                    </div>
                </div>
                <div className="flex shrink-0 justify-end gap-3 border-t border-stone-100 bg-white px-5 py-4"><button type="button" onClick={closeAddModal} className="rounded-xl px-4 py-2 text-xs text-stone-500 hover:bg-stone-100">取消</button><button type="button" onClick={() => void submitAdd()} disabled={isUploading} className="rounded-xl bg-stone-800 px-4 py-2 text-xs text-white hover:bg-stone-700 disabled:opacity-50">{isUploading ? '添加中…' : '添加背景'}</button></div>
            </div>
        </div>
    ) : null;

    return (
        <>
            <section className="space-y-4">
                <div><h3 className="text-sm font-medium text-stone-700">心情日历背景</h3><p className="mt-1 text-xs text-stone-500">用于 Memoir 顶部月历</p></div>
                {currentId !== 'none' && <label className="flex items-center gap-3 text-xs text-stone-600"><span className="shrink-0">图片透明度</span><input type="range" min="0" max="100" step="1" value={Math.round(selectedOpacity * 100)} onChange={(event) => moodCalendarBackgroundService.saveCustomSettings(currentId, { opacity: Number(event.target.value) / 100 })} className="h-1.5 min-w-0 flex-1 accent-stone-700" /><span className="w-9 text-right font-mono text-stone-500">{Math.round(selectedOpacity * 100)}%</span></label>}
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
