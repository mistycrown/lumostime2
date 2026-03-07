/**
 * @file CustomTimePalModal.tsx
 * @description 自定义时光小友创建模态框
 * @input 名称、5 张阶段图片（建议 PNG 1:1）
 * @output 创建成功后的自定义时光小友
 * @pos Component (Modal)
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload } from 'lucide-react';
import { ToastType } from './Toast';
import { CustomTimePalItem, timePalCustomService } from '../services/timePalCustomService';

interface CustomTimePalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (item: CustomTimePalItem) => void;
    onToast?: (type: ToastType, message: string) => void;
}

const STAGE_COUNT = 5;

export const CustomTimePalModal: React.FC<CustomTimePalModalProps> = ({
    isOpen,
    onClose,
    onCreated,
    onToast
}) => {
    const [name, setName] = useState('');
    const [stageFiles, setStageFiles] = useState<(File | null)[]>(Array.from({ length: STAGE_COUNT }, () => null));
    const [stagePreviews, setStagePreviews] = useState<(string | null)[]>(Array.from({ length: STAGE_COUNT }, () => null));
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRefs = useRef<Array<HTMLInputElement | null>>([]);

    const filledCount = useMemo(() => stageFiles.filter(Boolean).length, [stageFiles]);
    const canSubmit = name.trim().length > 0 && filledCount === STAGE_COUNT && !isSaving;

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setName('');
        setStageFiles(Array.from({ length: STAGE_COUNT }, () => null));
        setStagePreviews(Array.from({ length: STAGE_COUNT }, () => null));
        setIsSaving(false);
    }, [isOpen]);

    useEffect(() => {
        return () => {
            stagePreviews.forEach((url) => {
                if (url && url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            });
        };
    }, [stagePreviews]);

    const handlePickStage = (stageIndex: number) => {
        fileInputRefs.current[stageIndex]?.click();
    };

    const handleFileChange = (stageIndex: number, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        const nextFiles = [...stageFiles];
        nextFiles[stageIndex] = file;
        setStageFiles(nextFiles);

        const nextPreviews = [...stagePreviews];
        const oldPreview = nextPreviews[stageIndex];
        if (oldPreview && oldPreview.startsWith('blob:')) {
            URL.revokeObjectURL(oldPreview);
        }
        nextPreviews[stageIndex] = URL.createObjectURL(file);
        setStagePreviews(nextPreviews);

        // 允许同一个文件重复选择
        event.target.value = '';
    };

    const handleSubmit = async () => {
        if (!canSubmit) {
            return;
        }

        setIsSaving(true);
        try {
            const files = stageFiles.filter((f): f is File => !!f);
            const item = await timePalCustomService.addItem(name.trim(), files);
            onToast?.('success', '自定义时间小友已保存');
            onCreated(item);
            onClose();
        } catch (error: any) {
            console.error('[CustomTimePalModal] 创建失败:', error);
            onToast?.('error', error?.message || '保存失败，请重试');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) {
        return null;
    }

    const modalContent = (
        <div
            className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-[#fdfbf7] w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-stone-800">添加自定义时间小友</h3>
                        <p className="text-xs text-stone-500 mt-1">上传 5 张图片，分别对应 5 个阶段</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition-colors"
                        aria-label="关闭"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-stone-700">
                            时间小友名称
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={20}
                            placeholder="例如：晨光猫咪"
                            className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-300 transition-all"
                        />
                        <div className="text-xs text-stone-400 text-right">{name.length}/20</div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-stone-700">阶段图片</label>
                            <span className="text-xs text-stone-500">{filledCount}/{STAGE_COUNT}</span>
                        </div>

                        <div className="grid grid-cols-5 gap-2">
                            {Array.from({ length: STAGE_COUNT }).map((_, index) => {
                                const previewUrl = stagePreviews[index];
                                const file = stageFiles[index];
                                const stageNo = index + 1;
                                return (
                                    <button
                                        key={stageNo}
                                        onClick={() => handlePickStage(index)}
                                        className="aspect-square rounded-xl border border-dashed border-stone-300 bg-white hover:border-stone-400 transition-colors overflow-hidden"
                                        title={`上传第 ${stageNo} 阶段`}
                                    >
                                        {previewUrl ? (
                                            <img
                                                src={previewUrl}
                                                alt={`阶段 ${stageNo}`}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-stone-400">
                                                <Upload size={14} />
                                                <span className="text-[10px] mt-1">阶段{stageNo}</span>
                                            </div>
                                        )}
                                        <input
                                            ref={(el) => {
                                                fileInputRefs.current[index] = el;
                                            }}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => handleFileChange(index, e)}
                                        />
                                        {file && (
                                            <div className="absolute sr-only">{file.name}</div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                        <p className="text-xs text-amber-800">
                            自定义的时间小友不参加云同步
                        </p>
                        <p className="text-[11px] text-amber-700 mt-1">
                            建议上传 1:1 的 PNG 图片，否则效果会有所影响
                        </p>
                        <p className="text-[11px] text-amber-700 mt-1">
                            支持 JPG / PNG / WebP 等常见图片格式，仅保存在当前设备本地
                        </p>
                    </div>
                </div>

                <div className="p-5 bg-white border-t border-stone-100 flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="flex-1 py-3 bg-white border border-stone-200 text-stone-600 rounded-2xl font-bold hover:bg-stone-50 transition-colors disabled:opacity-60"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className={`flex-1 py-3 rounded-2xl font-bold transition-all ${
                            canSubmit
                                ? 'bg-stone-800 text-white hover:bg-stone-900'
                                : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                        }`}
                    >
                        {isSaving ? '保存中...' : '保存'}
                    </button>
                </div>
            </div>
        </div>
    );

    if (typeof document === 'undefined') {
        return modalContent;
    }

    return createPortal(modalContent, document.body);
};
