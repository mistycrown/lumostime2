/**
 * @file BackgroundSelector.tsx
 * @description 背景图片选择组件
 */

import React, { useState, useRef, useEffect } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { backgroundService, BackgroundOption, getBackgroundFallbackUrl } from '../services/backgroundService';
import { ToastType } from './Toast';

interface BackgroundSelectorProps {
    onToast: (type: ToastType, message: string) => void;
}

export const BackgroundSelector: React.FC<BackgroundSelectorProps> = ({ onToast }) => {
    const [backgrounds, setBackgrounds] = useState<BackgroundOption[]>([]);
    const [currentBackground, setCurrentBackground] = useState<string>('default');
    const [backgroundOpacity, setBackgroundOpacity] = useState<number>(0.1);
    const [isUploading, setIsUploading] = useState(false);
    const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
    const [imageSources, setImageSources] = useState<Record<string, string>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadBackgrounds();
        setCurrentBackground(backgroundService.getCurrentBackground());
        setBackgroundOpacity(backgroundService.getBackgroundOpacity());
    }, []);

    const loadBackgrounds = () => {
        const allBackgrounds = backgroundService.getAllBackgrounds();
        setBackgrounds(allBackgrounds);
        
        // 初始化图片源为 PNG 格式（预设背景）
        const sources: Record<string, string> = {};
        allBackgrounds.forEach(bg => {
            if (bg.url && bg.type === 'preset') {
                sources[bg.id] = bg.url; // 已经是 PNG 格式
            } else if (bg.url && bg.type === 'custom') {
                sources[bg.id] = bg.url; // 自定义背景保持原样
            }
        });
        setImageSources(sources);
    };

    const handleBackgroundSelect = (backgroundId: string) => {
        backgroundService.setCurrentBackground(backgroundId);
        setCurrentBackground(backgroundId);
        onToast('success', '背景已更换');
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // 检查文件类型
        if (!file.type.startsWith('image/')) {
            onToast('error', '请选择图片文件');
            return;
        }

        // 检查文件大小（限制为5MB）
        if (file.size > 5 * 1024 * 1024) {
            onToast('error', '图片文件不能超过5MB');
            return;
        }

        setIsUploading(true);
        try {
            await backgroundService.addCustomBackground(file);
            loadBackgrounds();
            onToast('success', '背景图片已添加');
        } catch (error) {
            console.error('Failed to add background:', error);
            onToast('error', '添加背景图片失败');
        } finally {
            setIsUploading(false);
            // 清空文件输入
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleOpacityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const opacity = parseFloat(event.target.value);
        setBackgroundOpacity(opacity);
        
        // 使用防抖来避免频繁触发
        clearTimeout(opacityTimeoutRef.current);
        opacityTimeoutRef.current = setTimeout(() => {
            backgroundService.setBackgroundOpacity(opacity);
        }, 100);
    };

    const opacityTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    useEffect(() => {
        return () => {
            if (opacityTimeoutRef.current) {
                clearTimeout(opacityTimeoutRef.current);
            }
        };
    }, []);

    const handleDeleteBackground = (backgroundId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        
        const success = backgroundService.deleteCustomBackground(backgroundId);
        if (success) {
            loadBackgrounds();
            onToast('success', '背景图片已删除');
        } else {
            onToast('error', '删除失败');
        }
    };

    const renderBackgroundPreview = (background: BackgroundOption) => {
        if (background.id === 'default') {
            return (
                <div className="w-full h-full bg-stone-100 flex items-center justify-center text-stone-400 text-xs">
                    默认
                </div>
            );
        } else if (background.url.startsWith('linear-gradient')) {
            return (
                <div 
                    className="w-full h-full rounded-lg"
                    style={{ background: background.url }}
                />
            );
        } else {
            const imgSrc = imageSources[background.id] || background.thumbnail || background.url;
            const hasError = imageErrors[background.id];
            
            return (
                <>
                    {!hasError ? (
                        <img
                            src={imgSrc}
                            alt={background.name}
                            className="w-full h-full object-cover rounded-lg"
                            onError={() => {
                                // 只对预设背景尝试降级
                                if (background.type === 'preset' && imgSrc.endsWith('.png')) {
                                    setImageSources(prev => ({
                                        ...prev,
                                        [background.id]: getBackgroundFallbackUrl(imgSrc)
                                    }));
                                } else {
                                    // 自定义背景或 webp 失败，标记为错误
                                    setImageErrors(prev => ({
                                        ...prev,
                                        [background.id]: true
                                    }));
                                }
                            }}
                        />
                    ) : (
                        <div className="w-full h-full bg-stone-100 flex items-center justify-center text-stone-400 text-xs">
                            加载失败
                        </div>
                    )}
                </>
            );
        }
    };

    return (
        <div className="space-y-4">
            {/* 背景选项网格 */}
            <div className="grid gap-2" style={{ 
                gridTemplateColumns: 'repeat(auto-fit, minmax(64px, 1fr))'
            }}>
                {backgrounds.map((background) => (
                    <button
                        key={background.id}
                        onClick={() => handleBackgroundSelect(background.id)}
                        className={`relative aspect-[4/5] rounded-lg border-2 transition-all overflow-hidden ${
                            currentBackground === background.id
                                ? 'border-stone-400 ring-2 ring-stone-200'
                                : 'border-stone-200 hover:border-stone-300'
                        }`}
                    >
                        {renderBackgroundPreview(background)}
                        
                        {/* 选中状态指示器 */}
                        {currentBackground === background.id && (
                            <div className="absolute top-1 right-1 w-5 h-5 bg-stone-800 rounded-full flex items-center justify-center shadow-lg">
                                <Check size={12} className="text-white" />
                            </div>
                        )}

                        {/* 删除按钮（仅自定义背景） */}
                        {background.type === 'custom' && (
                            <button
                                onClick={(e) => handleDeleteBackground(background.id, e)}
                                className="absolute top-1 left-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg transition-colors z-10"
                            >
                                <X size={10} className="text-white" />
                            </button>
                        )}
                    </button>
                ))}

                {/* 添加自定义背景按钮 */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="aspect-[4/5] rounded-lg border-2 border-dashed border-stone-300 hover:border-stone-400 transition-all flex flex-col items-center justify-center gap-1 text-stone-500 hover:text-stone-600"
                >
                    {isUploading ? (
                        <div className="w-4 h-4 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <>
                            <Plus size={16} />
                            <span className="text-xs">添加</span>
                        </>
                    )}
                </button>
            </div>

            {/* 隐藏的文件输入 */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
            />

            {/* 透明度调节 - 仅在非默认背景时显示 */}
            {currentBackground !== 'default' && (
                <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-stone-700">
                            背景透明度
                        </label>
                        <span className="text-sm font-semibold text-stone-600">
                            {Math.round(backgroundOpacity * 100)}%
                        </span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="0.4"
                        step="0.02"
                        value={backgroundOpacity}
                        onChange={handleOpacityChange}
                        className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer slider"
                        style={{
                            background: `linear-gradient(to right, #57534e 0%, #57534e ${(backgroundOpacity / 0.4) * 100}%, #e7e5e4 ${(backgroundOpacity / 0.4) * 100}%, #e7e5e4 100%)`
                        }}
                    />
                    <div className="flex justify-between text-xs text-stone-400 mt-1">
                        <span>0%</span>
                        <span>40%</span>
                    </div>
                </div>
            )}

            {/* 提示信息 */}
            <div className="text-xs text-stone-500 bg-white rounded-lg p-3 shadow-sm">
                <p>• 图片大小不超过 5MB</p>
                <p>• 自定义图片仅保存在本地，不会同步到云端</p>
            </div>
        </div>
    );
};