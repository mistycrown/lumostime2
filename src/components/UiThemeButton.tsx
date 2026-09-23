/**
 * @file UiThemeButton.tsx
 * @description UI theme preview and download control.
 * @input Theme state and selection/download callbacks
 * @output Theme preview button
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
            className={`relative overflow-hidden rounded-lg border-2 transition-all ${
                isSelected ? 'border-stone-400 ring-2 ring-stone-200' : 'border-stone-200 hover:border-stone-300'
            }`}
            style={{ aspectRatio: '4/5' }}
        >
            <button
                type="button"
                onClick={() => isDownloaded && onThemeChange(theme)}
                disabled={!isDownloaded}
                className="h-full w-full bg-white"
                aria-label={isDownloaded ? `选择 ${theme} UI 图标主题` : `${theme} UI 图标主题未下载`}
            >
                <div className="grid h-full w-full grid-cols-2 gap-0.5 bg-white p-1">
                    {[1, 2, 3, 4].map((number) => (
                        <div key={`${theme}-${number}`} className="flex items-center justify-center rounded bg-stone-50">
                            <img
                                src={resolveAssetPath(`/uiicon/${theme}/${String(number).padStart(2, '0')}.webp`)}
                                alt={`icon-${number}`}
                                className="h-full w-full object-contain p-0.5"
                            />
                        </div>
                    ))}
                </div>
            </button>

            {!isDownloaded && (
                <button
                    type="button"
                    onClick={() => !isDownloading && onDownload(theme)}
                    disabled={isDownloading}
                    className="absolute bottom-1 left-1 right-1 flex items-center justify-center gap-1 rounded-md bg-white/95 px-1.5 py-1 text-[10px] text-stone-600 shadow-sm disabled:cursor-default"
                    title={isDownloading ? `${downloadProgress}%` : '下载主题'}
                    aria-label={isDownloading ? `${theme} ${downloadProgress}%` : `下载 ${theme} UI 图标主题`}
                >
                    {isDownloading ? (
                        <>
                            <LoaderCircle size={12} className="animate-spin" />
                            <span>{downloadProgress}%</span>
                        </>
                    ) : (
                        <>
                            <Download size={12} />
                            <span>下载</span>
                        </>
                    )}
                </button>
            )}

            {isSelected && (
                <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-stone-800 shadow-lg">
                    <Check size={12} className="text-white" />
                </div>
            )}
        </div>
    );
};
