/**
 * @file MoodCalendarBackgroundSelector.tsx
 * @input Toast callback and Memoir mood-calendar background service
 * @output Background selection, upload/delete actions, and debugger launch
 * @pos Component (Sponsorship Personalization)
 * @description Manages the background assets used only by the Memoir mood calendar.
 * @updated 2026-09-26: Added independent background selection and image tuning entry point.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Check, Plus, Settings, X } from 'lucide-react';
import { ToastType } from './Toast';
import {
    moodCalendarBackgroundService,
    MOOD_CALENDAR_BACKGROUND_CHANGE_EVENT
} from '../services/moodCalendarBackgroundService';

interface MoodCalendarBackgroundSelectorProps {
    onToast: (type: ToastType, message: string) => void;
    onOpenDebugger?: () => void;
}

export const MoodCalendarBackgroundSelector: React.FC<MoodCalendarBackgroundSelectorProps> = ({ onToast, onOpenDebugger }) => {
    const [backgrounds, setBackgrounds] = useState(() => moodCalendarBackgroundService.getAllBackgrounds());
    const [currentId, setCurrentId] = useState(() => moodCalendarBackgroundService.getCurrentBackground());
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const reload = () => {
        setBackgrounds(moodCalendarBackgroundService.getAllBackgrounds());
        setCurrentId(moodCalendarBackgroundService.getCurrentBackground());
    };

    useEffect(() => {
        window.addEventListener(MOOD_CALENDAR_BACKGROUND_CHANGE_EVENT, reload);
        return () => window.removeEventListener(MOOD_CALENDAR_BACKGROUND_CHANGE_EVENT, reload);
    }, []);

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            onToast('error', '请选择图片文件');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            onToast('error', '图片文件不能超过 10MB');
            return;
        }

        setIsUploading(true);
        try {
            const background = await moodCalendarBackgroundService.addCustomBackground(file);
            moodCalendarBackgroundService.setCurrentBackground(background.id);
            reload();
            onToast('success', '心情日历背景已添加');
        } catch (error) {
            console.error('[MoodCalendarBackgroundSelector] Failed to upload background', error);
            onToast('error', '添加心情日历背景失败');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async (id: string, event: React.MouseEvent) => {
        event.stopPropagation();
        if (await moodCalendarBackgroundService.deleteCustomBackground(id)) {
            reload();
            onToast('success', '心情日历背景已删除');
        }
    };

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h3 className="text-sm font-medium text-stone-700">心情日历背景</h3>
                    <p className="mt-1 text-xs text-stone-500">用于 Memoir 顶部月历</p>
                </div>
                <button
                    type="button"
                    onClick={() => onOpenDebugger?.()}
                    className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-medium text-stone-600 shadow-sm hover:bg-stone-100"
                >
                    <Settings size={14} /> 调整
                </button>
            </div>

            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))' }}>
                {backgrounds.map((background) => (
                    <div
                        key={background.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`选择心情日历背景：${background.name}`}
                        aria-pressed={currentId === background.id}
                        onClick={() => moodCalendarBackgroundService.setCurrentBackground(background.id)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                moodCalendarBackgroundService.setCurrentBackground(background.id);
                            }
                        }}
                        className={`relative aspect-[3/2] overflow-hidden rounded-lg border-2 bg-stone-50 ${currentId === background.id ? 'border-stone-500 ring-2 ring-stone-200' : 'border-stone-200 hover:border-stone-300'}`}
                    >
                        {background.url ? (
                            <img src={background.thumbnail || background.url} alt={background.name} className="h-full w-full object-cover" />
                        ) : (
                            <span className="flex h-full items-center justify-center text-xs text-stone-400">无背景</span>
                        )}
                        {currentId === background.id && (
                            <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-stone-800 text-white shadow">
                                <Check size={12} />
                            </span>
                        )}
                        {background.type === 'custom' && (
                            <button
                                type="button"
                                aria-label={`删除心情日历背景：${background.name}`}
                                onClick={(event) => void handleDelete(background.id, event)}
                                className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow"
                            >
                                <X size={10} />
                            </button>
                        )}
                    </div>
                ))}
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="aspect-[3/2] rounded-lg border-2 border-dashed border-stone-300 text-stone-500 hover:border-stone-400"
                >
                    {isUploading ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-stone-400 border-t-transparent" /> : <span className="inline-flex items-center gap-1 text-xs"><Plus size={15} /> 添加</span>}
                </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        </section>
    );
};
