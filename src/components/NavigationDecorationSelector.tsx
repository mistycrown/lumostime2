/**
 * @file NavigationDecorationSelector.tsx
 * @input onToast (callback), currentDecoration (optional string), onDecorationChange (optional callback)
 * @output Toast Messages (onToast), Decoration Selection (onDecorationChange or navigationDecorationService)
 * @pos Component (Selector)
 * @description 导航栏装饰选择组件 - 支持预设装饰样式、自定义装饰上传、调试工具
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Check, Settings, Plus, X } from 'lucide-react';
import { navigationDecorationService, NavigationDecorationOption, getNavigationDecorationFallbackUrl } from '../services/navigationDecorationService';
import { ToastType } from './Toast';

interface NavigationDecorationSelectorProps {
    onToast: (type: ToastType, message: string) => void;
    currentDecoration?: string;
    onDecorationChange?: (decorationId: string) => void;
}

export const NavigationDecorationSelector: React.FC<NavigationDecorationSelectorProps> = ({ 
    onToast,
    currentDecoration: controlledDecoration,
    onDecorationChange
}) => {
    const [decorations, setDecorations] = useState<NavigationDecorationOption[]>([]);
    const [internalDecoration, setInternalDecoration] = useState<string>('default');
    const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
    const [imageSources, setImageSources] = useState<Record<string, string>>({});
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Use controlled or internal state
    const currentDecoration = controlledDecoration !== undefined ? controlledDecoration : internalDecoration;
    const isControlled = controlledDecoration !== undefined;

    const loadDecorations = () => {
        const allDecorations = navigationDecorationService.getAllDecorations();
        setDecorations(allDecorations);
        
        // 初始化图片源为 PNG 格式
        const sources: Record<string, string> = {};
        allDecorations.forEach(deco => {
            if (deco.url) {
                sources[deco.id] = deco.url;
            }
        });
        setImageSources(sources);
    };

    useEffect(() => {
        loadDecorations();
        if (!isControlled) {
            setInternalDecoration(navigationDecorationService.getCurrentDecoration());
        }
    }, [isControlled]);

    const handleDecorationSelect = (decorationId: string) => {
        if (isControlled && onDecorationChange) {
            // Controlled mode - just notify parent
            onDecorationChange(decorationId);
        } else {
            // Uncontrolled mode - update service and internal state
            navigationDecorationService.setCurrentDecoration(decorationId);
            setInternalDecoration(decorationId);
            onToast('success', '标题栏样式已更换');
        }
    };

    const handleOpenDebugger = () => {
        if (currentDecoration === 'default') {
            onToast('info', '请先选择一个装饰样式');
            return;
        }
        (window as any).LumosTime?.debug?.enableNavDeco?.();
        onToast('success', '调试工具已开启');
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
            await navigationDecorationService.addCustomDecoration(file);
            loadDecorations();
            onToast('success', '装饰图片已添加');
        } catch (error) {
            console.error('Failed to add decoration:', error);
            onToast('error', '添加装饰图片失败');
        } finally {
            setIsUploading(false);
            // 清空文件输入
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDeleteDecoration = (decorationId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        
        const success = navigationDecorationService.deleteCustomDecoration(decorationId);
        if (success) {
            loadDecorations();
            onToast('success', '装饰图片已删除');
        } else {
            onToast('error', '删除失败');
        }
    };

    const renderDecorationPreview = (decoration: NavigationDecorationOption) => {
        if (decoration.id === 'default') {
            return (
                <div className="w-full h-full bg-stone-100 flex items-center justify-center text-stone-400 text-xs rounded-lg">
                    默认
                </div>
            );
        } else {
            const imgSrc = imageSources[decoration.id] || decoration.url;
            const hasError = imageErrors[decoration.id];
            
            return (
                <div className="w-full h-full relative overflow-hidden rounded-lg bg-stone-50">
                    {/* 预览容器 - 显示图片中间部分 */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        {!hasError ? (
                            <img
                                src={imgSrc}
                                alt={decoration.name}
                                className="w-full h-auto"
                                style={{
                                    objectFit: 'cover',
                                    objectPosition: 'center',
                                    minHeight: '100%'
                                }}
                                onError={() => {
                                    // 如果 PNG 加载失败，尝试 webp 格式
                                    if (imgSrc.endsWith('.png')) {
                                        setImageSources(prev => ({
                                            ...prev,
                                            [decoration.id]: getNavigationDecorationFallbackUrl(imgSrc)
                                        }));
                                    } else {
                                        // webp 也失败了，标记为错误
                                        setImageErrors(prev => ({
                                            ...prev,
                                            [decoration.id]: true
                                        }));
                                    }
                                }}
                            />
                        ) : (
                            <div className="text-stone-400 text-xs">加载失败</div>
                        )}
                    </div>
                </div>
            );
        }
    };

    return (
        <div className="space-y-4">
            {/* 说明文字和调试按钮 */}
            <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-stone-500 flex-1">
                    选择后打开调试工具并返回主菜单，调整导航栏位置
                </p>
                <button
                    onClick={handleOpenDebugger}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-600 bg-white hover:bg-stone-100 rounded-lg transition-colors shadow-sm flex-shrink-0"
                >
                    <Settings size={14} />
                    <span>调试</span>
                </button>
            </div>

            {/* 装饰选项网格 */}
            <div className="grid gap-2" style={{ 
                gridTemplateColumns: 'repeat(auto-fit, minmax(64px, 1fr))'
            }}>
                {decorations.map((decoration) => (
                    <button
                        key={decoration.id}
                        onClick={() => handleDecorationSelect(decoration.id)}
                        className={`relative aspect-square rounded-lg border-2 transition-all overflow-hidden ${
                            currentDecoration === decoration.id
                                ? 'border-stone-400 ring-2 ring-stone-200'
                                : 'border-stone-200 hover:border-stone-300'
                        }`}
                    >
                        {renderDecorationPreview(decoration)}
                        
                        {/* 选中状态指示器 */}
                        {currentDecoration === decoration.id && (
                            <div className="absolute top-1 right-1 w-5 h-5 bg-stone-800 rounded-full flex items-center justify-center shadow-lg z-10">
                                <Check size={12} className="text-white" />
                            </div>
                        )}

                        {/* 删除按钮（仅自定义背景） */}
                        {decoration.type === 'custom' && (
                            <button
                                onClick={(e) => handleDeleteDecoration(decoration.id, e)}
                                className="absolute top-1 left-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg transition-colors z-20"
                            >
                                <X size={10} className="text-white" />
                            </button>
                        )}
                    </button>
                ))}

                {/* 添加自定义装饰按钮 */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="aspect-square rounded-lg border-2 border-dashed border-stone-300 hover:border-stone-400 transition-all flex flex-col items-center justify-center gap-1 text-stone-500 hover:text-stone-600"
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

            {/* 提示信息 */}
            <div className="text-xs text-stone-500 bg-white rounded-lg p-3 shadow-sm mt-4">
                <p>• 提示：推荐上传透明的长条形无缝 PNG 图片以获得最佳效果</p>
                <p>• 图片大小不超过 5MB，自定义图片仅保存在本地</p>
            </div>
        </div>
    );
};
