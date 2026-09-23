/**
 * @file UiThemeButton.tsx
 * @description UI 主题选择按钮组件
 * @input theme: 主题名称, currentTheme: 当前主题, onThemeChange: 主题切换回调
 * @output 主题选择按钮
 * @pos Component
 */
import React from 'react';
import { Check, Download, LoaderCircle } from 'lucide-react';
import { resolveAssetPath } from '../utils/assetPath';

interface UiThemeButtonProps {
    theme: string;
    currentTheme: string;
    isDownloaded: boolean;
    isDownloading: boolean;
    downloadProgress?: number;
    onThemeChange: (theme: string) => void;
    onDownload: (theme: string) => void;
}

export const UiThemeButton: React.FC<UiThemeButtonProps> = ({
    theme,
    currentTheme,
    isDownloaded,
    isDownloading,
    downloadProgress = 0,
    onThemeChange,
    onDownload
}) => {
    const isSelected = currentTheme === theme;
    
    return (
        <div
            className={`relative rounded-lg border-2 transition-all overflow-hidden ${
                isSelected
                    ? 'border-stone-400 ring-2 ring-stone-200'
                    : 'border-stone-200 hover:border-stone-300'
            }`}
            style={{ aspectRatio: '4/5' }}
        >
            <button
                type="button"
                onClick={() => isDownloaded && onThemeChange(theme)}
                disabled={!isDownloaded}
                className="w-full h-full bg-white"
                aria-label={isDownloaded ? `选择 ${theme} UI 图标主题` : `${theme} UI 图标主题未下载`}
            >
                <div className="w-full h-full grid grid-cols-2 gap-0.5 p-1 bg-white">
                    {[1, 2, 3, 4].map((number) => (
                        <div key={`${theme}-${number}`} className="bg-stone-50 rounded flex items-center justify-center">
                            <img
                                src={resolveAssetPath(`/uiicon/${theme}/${String(number).padStart(2, '0')}.webp`)}
                                alt={`icon-${number}`}
                                className="w-full h-full object-contain p-0.5"
                            />
                        </div>
                    ))}
                </div>
            </button>

            <button
                type="button"
                onClick={() => !isDownloaded && !isDownloading && onDownload(theme)}
                disabled={isDownloaded || isDownloading}
                className="absolute bottom-1 left-1 right-1 flex items-center justify-center gap-1 rounded-md bg-white/95 px-1.5 py-1 text-[10px] text-stone-600 shadow-sm disabled:cursor-default disabled:opacity-90"
                title={isDownloaded ? '已下载' : '下载主题'}
                aria-label={isDownloaded ? `${theme} 已下载` : `下载 ${theme} UI 图标主题`}
            >
                {isDownloading ? (
                    <>
                        <LoaderCircle size={12} className="animate-spin" />
                        <span>{downloadProgress}%</span>
                    </>
                ) : isDownloaded ? (
                    <>
                        <Check size={12} />
                        <span>已下载</span>
                    </>
                ) : (
                    <>
                        <Download size={12} />
                        <span>下载</span>
                    </>
                )}
            </button>

            {isSelected && isDownloaded && (
                <div className="absolute top-1 right-1 w-5 h-5 bg-stone-800 rounded-full flex items-center justify-center shadow-lg">
                    <Check size={12} className="text-white" />
                </div>
            )}
        </div>
    );
};
