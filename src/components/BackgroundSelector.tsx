/**
 * @file BackgroundSelector.tsx
 * @description 背景图片选择组件
 */

import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Check, Upload, X } from 'lucide-react';
import { backgroundService, BackgroundOption } from '../services/backgroundService';
import { ToastType } from './Toast';

interface BackgroundSelectorProps {
    onToast: (type: ToastType, message: string) => void;
}

export const BackgroundSelector: React.FC<BackgroundSelectorProps> = ({ onToast }) => {
    const [backgrounds, setBackgrounds] = useState<BackgroundOption[]>([]);
    const [currentBackground, setCurrentBackground] = useState<string>('default');
    const [backgroundOpacity, setBackgroundOpacity] = useState<number>(0.8);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadBackgrounds();
        setCurrentBackground(backgroundService.getCurrentBackground());
        setBackgroundOpacity(backgroundService.getBackgroundOpacity());
    }, []);

    const loadBackgrounds = () => {
        setBackgrounds(backgroundService.getAllBackgrounds());
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
            return (
                <img
                    src={background.thumbnail || background.url}
                    alt={background.name}
                    className="w-full h-full object-cover rounded-lg"
                />
            );
        }
    };

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600 text-lg">🖼️</span>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-stone-800">更换背景图片</h3>
                    <p className="text-sm text-stone-500">选择预设背景或添加自定义图片</p>
                </div>
            </div>

            {/* 背景选项网格 */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                {backgrounds.map((background) => (
                    <div
                        key={background.id}
                        className="relative"
                    >
                        <button
                            onClick={() => handleBackgroundSelect(background.id)}
                            className={`w-full aspect-video rounded-lg border-2 transition-all overflow-hidden ${
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
                        </button>

                        {/* 删除按钮（仅自定义背景） - 移到外层 */}
                        {background.type === 'custom' && (
                            <button
                                onClick={(e) => handleDeleteBackground(background.id, e)}
                                className="absolute top-1 left-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg transition-colors z-10"
                            >
                                <X size={10} className="text-white" />
                            </button>
                        )}

                        {/* 背景名称 */}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center">
                            {background.name}
                        </div>
                    </div>
                ))}

                {/* 添加自定义背景按钮 */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="aspect-video rounded-lg border-2 border-dashed border-stone-300 hover:border-stone-400 transition-all flex flex-col items-center justify-center gap-2 text-stone-500 hover:text-stone-600"
                >
                    {isUploading ? (
                        <div className="w-4 h-4 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <>
                            <Plus size={20} />
                            <span className="text-xs">添加图片</span>
                        </>
                    )}
                </button>
            </div>

            {/* 透明度调节 */}
            {currentBackground !== 'default' && (
                <div className="mt-4 p-4 bg-stone-50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-stone-700">背景透明度</label>
                        <span className="text-xs text-stone-500">{Math.round(backgroundOpacity * 100)}%</span>
                    </div>
                    <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.1"
                        value={backgroundOpacity}
                        onChange={handleOpacityChange}
                        className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-stone-400"
                    />
                    <div className="flex justify-between text-xs text-stone-400 mt-1">
                        <span>透明</span>
                        <span>不透明</span>
                    </div>
                </div>
            )}

            {/* 隐藏的文件输入 */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
            />

            {/* 提示信息 */}
            <div className="text-xs text-stone-500 bg-stone-50 rounded-lg p-3">
                <p>• 支持 JPG、PNG、GIF 等图片格式</p>
                <p>• 图片大小不超过 5MB</p>
                <p>• 自定义图片仅保存在本地，不会同步到云端</p>
            </div>
        </div>
    );
};