/**
 * @file TimePalSettings.tsx
 * @description 时光小友设置组件，可在多个页面复用。
 * @input categories: Category[] - 活动分类列表
 * @output 时光小友设置界面，包含选择、筛选、自定义名言和点击切换开关
 * @pos Component
 */
import React, { useEffect, useRef, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { Category } from '../types';
import { TIMEPAL_OPTIONS, getTimePalEmoji, isCustomTimePalType } from '../constants/timePalConfig';
import { TIMEPAL_KEYS, storage } from '../constants/storageKeys';
import { TagMultipleAssociation } from './TagMultipleAssociation';
import { ToastType } from './Toast';
import { imageService } from '../services/imageService';
import { CustomTimePalItem, timePalCustomService, TIMEPAL_CUSTOM_CHANGED_EVENT } from '../services/timePalCustomService';
import { CustomTimePalModal } from './CustomTimePalModal';
import { ConfirmModal } from './ConfirmModal';

const TIMEPAL_CLICK_SWITCH_CHANGED_EVENT = 'timepal-click-switch-changed';

interface TimePalSettingsProps {
    categories: Category[];
    onToast?: (type: ToastType, message: string) => void;
}

export const TimePalSettings: React.FC<TimePalSettingsProps> = ({ categories, onToast }) => {
    const [selectedType, setSelectedType] = useState<string>(() => {
        const saved = storage.get(TIMEPAL_KEYS.TYPE);
        if (!saved || saved === 'none') return 'none';
        return saved;
    });
    const [customItems, setCustomItems] = useState<CustomTimePalItem[]>([]);
    const [customPreviewUrls, setCustomPreviewUrls] = useState<Record<string, string>>({});
    const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
    const [isCustomItemsLoaded, setIsCustomItemsLoaded] = useState(false);
    const [deletingCustomItem, setDeletingCustomItem] = useState<CustomTimePalItem | null>(null);
    const [filterActivityIds, setFilterActivityIds] = useState<string[]>(() => {
        return storage.getJSON<string[]>(TIMEPAL_KEYS.FILTER_ACTIVITIES, []);
    });
    const [customQuotesEnabled, setCustomQuotesEnabled] = useState<boolean>(() => {
        return storage.getBoolean(TIMEPAL_KEYS.CUSTOM_QUOTES_ENABLED, false);
    });
    const [customQuotes, setCustomQuotes] = useState<string>(() => {
        const quotes = storage.getJSON<string[]>(TIMEPAL_KEYS.CUSTOM_QUOTES, []);
        return quotes.join('\n');
    });
    const [clickSwitchEnabled, setClickSwitchEnabled] = useState<boolean>(() => {
        return storage.getBoolean(TIMEPAL_KEYS.CLICK_SWITCH_ENABLED, true);
    });
    const previewUrlsRef = useRef<Record<string, string>>({});

    const revokeBlobUrls = (urlMap: Record<string, string>) => {
        Object.values(urlMap).forEach(url => {
            if (url && url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        });
    };

    const loadCustomItems = async () => {
        const items = timePalCustomService.getAllItems();
        setCustomItems(items);

        if (items.length === 0) {
            revokeBlobUrls(previewUrlsRef.current);
            previewUrlsRef.current = {};
            setCustomPreviewUrls({});
            setIsCustomItemsLoaded(true);
            return;
        }

        const nextUrls: Record<string, string> = {};
        await Promise.all(items.map(async (item) => {
            try {
                const firstStageFilename = item.stageFilenames[0];
                const url = await imageService.getImageUrl(firstStageFilename, 'original');
                if (url) {
                    nextUrls[item.id] = url;
                }
            } catch (error) {
                console.warn('[TimePalSettings] 自定义小友预览加载失败:', item.id, error);
            }
        }));

        revokeBlobUrls(previewUrlsRef.current);
        previewUrlsRef.current = nextUrls;
        setCustomPreviewUrls(nextUrls);
        setIsCustomItemsLoaded(true);
    };

    useEffect(() => {
        loadCustomItems();

        const handleCustomChanged = () => {
            loadCustomItems();
        };

        window.addEventListener(TIMEPAL_CUSTOM_CHANGED_EVENT, handleCustomChanged);
        return () => {
            window.removeEventListener(TIMEPAL_CUSTOM_CHANGED_EVENT, handleCustomChanged);
            revokeBlobUrls(previewUrlsRef.current);
            previewUrlsRef.current = {};
        };
    }, []);

    useEffect(() => {
        if (!isCustomItemsLoaded) {
            return;
        }
        if (!isCustomTimePalType(selectedType)) {
            return;
        }

        const exists = customItems.some(item => timePalCustomService.getSelectionValue(item.id) === selectedType);
        if (!exists) {
            handleSelectType('none');
            onToast?.('info', '已删除当前自定义小友，已切换为不使用');
        }
    }, [customItems, selectedType, isCustomItemsLoaded]);

    const handleSelectType = (type: string) => {
        setSelectedType(type);
        storage.set(TIMEPAL_KEYS.TYPE, type);
        window.dispatchEvent(new Event('timepal-type-changed'));
    };

    useEffect(() => {
        storage.setJSON(TIMEPAL_KEYS.FILTER_ACTIVITIES, filterActivityIds);
        storage.setBoolean(TIMEPAL_KEYS.FILTER_ENABLED, filterActivityIds.length > 0);
    }, [filterActivityIds]);

    useEffect(() => {
        storage.setBoolean(TIMEPAL_KEYS.CUSTOM_QUOTES_ENABLED, customQuotesEnabled);
    }, [customQuotesEnabled]);

    useEffect(() => {
        storage.setBoolean(TIMEPAL_KEYS.CLICK_SWITCH_ENABLED, clickSwitchEnabled);
        window.dispatchEvent(new Event(TIMEPAL_CLICK_SWITCH_CHANGED_EVENT));
    }, [clickSwitchEnabled]);

    const handleCustomQuotesChange = (value: string) => {
        setCustomQuotes(value);
        const quotesArray = value
            .split('\n')
            .map(q => q.trim())
            .filter(q => q.length > 0);
        storage.setJSON(TIMEPAL_KEYS.CUSTOM_QUOTES, quotesArray);
    };

    const handleCustomCreated = (item: CustomTimePalItem) => {
        const selectionValue = timePalCustomService.getSelectionValue(item.id);
        handleSelectType(selectionValue);
        loadCustomItems();
        onToast?.('info', '自定义的时间小友不参加云同步');
    };

    const handleDeleteCustomItem = (item: CustomTimePalItem, event: React.MouseEvent) => {
        event.stopPropagation();
        setDeletingCustomItem(item);
    };

    const handleConfirmDeleteCustomItem = async () => {
        if (!deletingCustomItem) {
            return;
        }

        try {
            const success = await timePalCustomService.deleteItem(deletingCustomItem.id);
            if (!success) {
                onToast?.('error', '删除失败，请重试');
                return;
            }

            onToast?.('success', '自定义时间小友已删除');
            loadCustomItems();
        } catch (error) {
            console.error('[TimePalSettings] 删除自定义时间小友失败:', error);
            onToast?.('error', '删除失败，请重试');
        } finally {
            setDeletingCustomItem(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(64px, 1fr))' }}>
                <button
                    type="button"
                    onClick={() => handleSelectType('none')}
                    className={`relative rounded-lg border-2 transition-all overflow-hidden ${
                        selectedType === 'none'
                            ? 'border-stone-400 ring-2 ring-stone-200'
                            : 'border-stone-200 hover:border-stone-300'
                    }`}
                    style={{ aspectRatio: '4/5' }}
                >
                    <div className="w-full h-full flex items-center justify-center p-1">
                        <span className="text-xs text-stone-400">不使用</span>
                    </div>
                    {selectedType === 'none' && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-stone-800 rounded-full flex items-center justify-center shadow-lg">
                            <Check size={12} className="text-white" />
                        </div>
                    )}
                </button>

                {TIMEPAL_OPTIONS.map(option => {
                    const isSelected = selectedType === option.type;
                    return (
                        <button
                            key={option.type}
                            type="button"
                            onClick={() => handleSelectType(option.type)}
                            className={`relative rounded-lg border-2 transition-all overflow-hidden ${
                                isSelected
                                    ? 'border-stone-400 ring-2 ring-stone-200'
                                    : 'border-stone-200 hover:border-stone-300'
                            }`}
                            style={{ aspectRatio: '4/5' }}
                        >
                            <div className="w-full h-full flex items-center justify-center p-1">
                                <img
                                    src={option.preview}
                                    alt={option.name}
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        const parent = e.currentTarget.parentElement;
                                        if (parent) {
                                            parent.innerHTML = `<span class="text-3xl">${getTimePalEmoji(option.type)}</span>`;
                                        }
                                    }}
                                />
                            </div>

                            {isSelected && (
                                <div className="absolute top-1 right-1 w-5 h-5 bg-stone-800 rounded-full flex items-center justify-center shadow-lg">
                                    <Check size={12} className="text-white" />
                                </div>
                            )}
                        </button>
                    );
                })}

                {customItems.map(item => {
                    const selectionValue = timePalCustomService.getSelectionValue(item.id);
                    const isSelected = selectedType === selectionValue;
                    const previewUrl = customPreviewUrls[item.id];

                    return (
                        <div
                            key={item.id}
                            onClick={() => handleSelectType(selectionValue)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    handleSelectType(selectionValue);
                                }
                            }}
                            role="button"
                            tabIndex={0}
                            className={`relative rounded-lg border-2 transition-all overflow-hidden ${
                                isSelected
                                    ? 'border-stone-400 ring-2 ring-stone-200'
                                    : 'border-stone-200 hover:border-stone-300'
                            }`}
                            style={{ aspectRatio: '4/5' }}
                            title={item.name}
                        >
                            <div className="w-full h-full flex items-center justify-center p-1 bg-white">
                                {previewUrl ? (
                                    <img
                                        src={previewUrl}
                                        alt={item.name}
                                        className="w-full h-full object-contain"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            const parent = e.currentTarget.parentElement;
                                            if (parent) {
                                                parent.innerHTML = '<span class="text-3xl">🫥</span>';
                                            }
                                        }}
                                    />
                                ) : (
                                    <span className="text-3xl">🫥</span>
                                )}
                            </div>
                            {isSelected && (
                                <div className="absolute top-1 right-1 w-5 h-5 bg-stone-800 rounded-full flex items-center justify-center shadow-lg">
                                    <Check size={12} className="text-white" />
                                </div>
                            )}
                            <button
                                onClick={(event) => handleDeleteCustomItem(item, event)}
                                className="absolute top-1 left-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg transition-colors z-10"
                                title={`删除 ${item.name}`}
                                type="button"
                            >
                                <X size={10} className="text-white" />
                            </button>
                        </div>
                    );
                })}

                <button
                    type="button"
                    onClick={() => setIsCustomModalOpen(true)}
                    className="relative rounded-lg border-2 border-dashed border-stone-300 hover:border-stone-400 transition-all overflow-hidden text-stone-500 hover:text-stone-700 bg-white"
                    style={{ aspectRatio: '4/5' }}
                    title="添加自定义时间小友"
                >
                    <div className="w-full h-full flex flex-col items-center justify-center">
                        <Plus size={16} />
                        <span className="text-[10px] mt-1">自定义</span>
                    </div>
                </button>
            </div>

            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                自定义的时间小友不参加云同步
            </div>

            <div className="pt-4 border-t border-stone-200 bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-stone-400 uppercase tracking-wider">
                        点击切换
                        <span className="text-stone-300 ml-1">（可选）</span>
                    </label>
                    <button
                        type="button"
                        onClick={() => setClickSwitchEnabled(!clickSwitchEnabled)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                            clickSwitchEnabled
                                ? 'bg-stone-900 text-white'
                                : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                        }`}
                    >
                        {clickSwitchEnabled ? '已开启' : '关闭'}
                    </button>
                </div>
                <p className="text-xs text-stone-500">
                    开启后，可在脉络页顶部卡片中点击小友图片切换类型。
                </p>
            </div>

            <div className="pt-4 border-t border-stone-200 bg-white rounded-lg p-4 shadow-sm">
                <TagMultipleAssociation
                    categories={categories}
                    selectedActivityIds={filterActivityIds}
                    onChange={setFilterActivityIds}
                    showToggle={true}
                    toggleLabel="限定标签（Activity）"
                    description="仅统计选中标签的时间记录"
                />
            </div>

            <div className="pt-4 border-t border-stone-200 bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-stone-400 uppercase tracking-wider">
                        自定义名言
                        <span className="text-stone-300 ml-1">（可选）</span>
                    </label>
                    <button
                        type="button"
                        onClick={() => {
                            setCustomQuotesEnabled(!customQuotesEnabled);
                            if (customQuotesEnabled) {
                                setCustomQuotes('');
                                storage.remove(TIMEPAL_KEYS.CUSTOM_QUOTES);
                            }
                        }}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                            customQuotesEnabled
                                ? 'bg-stone-900 text-white'
                                : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                        }`}
                    >
                        {customQuotesEnabled ? '已开启' : '关闭'}
                    </button>
                </div>
                <p className="text-xs text-stone-500 mb-3">
                    开启后使用自定义名言，每行一句
                </p>

                {customQuotesEnabled && (
                    <div className="animate-in slide-in-from-top-2">
                        <textarea
                            value={customQuotes}
                            onChange={(e) => handleCustomQuotesChange(e.target.value)}
                            placeholder={'输入你的名言，每行一句\n例如：\n种一棵树最好的时间是十年前，其次是现在\n万物皆有裂痕，那是光照进来的地方'}
                            className="w-full h-32 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all resize-none"
                        />
                        <div className="mt-2 text-xs text-stone-400">
                            已输入 {customQuotes.split('\n').filter(q => q.trim().length > 0).length} 条名言
                        </div>
                    </div>
                )}
            </div>

            <CustomTimePalModal
                isOpen={isCustomModalOpen}
                onClose={() => setIsCustomModalOpen(false)}
                onCreated={handleCustomCreated}
                onToast={onToast}
            />

            <ConfirmModal
                isOpen={!!deletingCustomItem}
                onClose={() => setDeletingCustomItem(null)}
                onConfirm={handleConfirmDeleteCustomItem}
                title="删除自定义时间小友"
                description={
                    deletingCustomItem
                        ? `确定删除“${deletingCustomItem.name}”吗？\n此操作无法撤销。`
                        : '确定删除该自定义时间小友吗？'
                }
                confirmText="确认删除"
                cancelText="取消"
                type="danger"
            />
        </div>
    );
};
