/**
 * @file WidgetSettingsView.tsx
 * @input Widget slot config, categories, Android bridge availability
 * @output A minimal 4-slot widget configuration page
 * @pos View
 * @description Lets the user choose the four activities shown in the Android timer widget and push that config to native immediately.
 * @updated 2026-04-13: Localized widget settings UI text to Chinese.
 * @updated 2026-04-13: Align preview slot background opacity with record view.
 */
import React, { useMemo, useState } from 'react';
import { ChevronLeft, LayoutGrid, RefreshCw, Save } from 'lucide-react';
import { CustomSelect } from '../../components/CustomSelect';
import { ToastType } from '../../components/Toast';
import WidgetBridge from '../../plugins/WidgetBridgePlugin';
import {
  WidgetTimerSlotConfig,
  buildWidgetTimerSlotConfig,
  isNativeAndroidWidgetSupported,
  loadWidgetTimerSlotsFromStorage,
  normalizeWidgetTimerSlots,
  saveWidgetTimerSlotsToStorage
} from '../../services/widgetTimerService';
import { getSoftColorCircleStyle } from '../../utils/colorAdapterUtils';
import { Category } from '../../types';

interface WidgetSettingsViewProps {
  onBack: () => void;
  onToast: (type: ToastType, message: string) => void;
  categories: Category[];
}

export const WidgetSettingsView: React.FC<WidgetSettingsViewProps> = ({
  onBack,
  onToast,
  categories
}) => {
  const [slots, setSlots] = useState<WidgetTimerSlotConfig[]>(() => loadWidgetTimerSlotsFromStorage());
  const [isSaving, setIsSaving] = useState(false);

  const activityOptions = useMemo(() => {
    const options = [{ value: '', label: '未配置' }];
    categories.forEach((category) => {
      category.activities.forEach((activity) => {
        options.push({
          value: `${category.id}::${activity.id}`,
          label: `${category.icon} ${category.name} / ${activity.icon} ${activity.name}`
        });
      });
    });
    return options;
  }, [categories]);

  const updateSlot = (slotIndex: number, value: string) => {
    setSlots((prevSlots) => {
      const nextSlots = [...prevSlots];
      if (!value) {
        nextSlots[slotIndex] = {
          slotIndex,
          activityId: null,
          categoryId: null,
          icon: null,
          label: null,
          color: null
        };
        return normalizeWidgetTimerSlots(nextSlots);
      }

      const [categoryId, activityId] = value.split('::');
      const category = categories.find((item) => item.id === categoryId);
      const activity = category?.activities.find((item) => item.id === activityId);
      if (!category || !activity) {
        return prevSlots;
      }

      nextSlots[slotIndex] = buildWidgetTimerSlotConfig(category, activity, slotIndex);
      return normalizeWidgetTimerSlots(nextSlots);
    });
  };

  const handleSave = async () => {
    const normalizedSlots = normalizeWidgetTimerSlots(slots);
    setIsSaving(true);
    saveWidgetTimerSlotsToStorage(normalizedSlots);

    try {
      if (isNativeAndroidWidgetSupported()) {
        await WidgetBridge.saveConfig({ slots: normalizedSlots });
        await WidgetBridge.refreshWidget();
        onToast('success', '小组件配置已保存');
      } else {
        onToast('info', '已保存到本地，刷新需在 Android 原生环境中进行。');
      }
    } catch (error) {
      console.error('[WidgetSettingsView] Failed to save widget config', error);
      onToast('error', '保存小组件配置失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReloadLocalConfig = () => {
    setSlots(loadWidgetTimerSlotsFromStorage());
    onToast('success', '已重新加载本地小组件配置');
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={onBack} className="text-stone-400 hover:text-stone-600 p-1">
          <ChevronLeft size={24} />
        </button>
        <span className="text-stone-800 font-bold text-lg">小组件计时器</span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 pb-40 space-y-6">
        <div className="bg-white rounded-[28px] p-6 shadow-sm border border-stone-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
              <LayoutGrid size={20} />
            </div>
            <div>
              <h3 className="font-bold text-stone-800">4 槽位计时小组件</h3>
              <p className="text-xs text-stone-400">
                白色卡片，四个圆点，点一下开始，再点停止，点另一个自动切换。
              </p>
            </div>
          </div>

          <div className="rounded-[28px] bg-white border border-stone-100 shadow-[0_12px_30px_rgba(15,23,42,0.06)] p-5">
            <div className="grid grid-cols-2 gap-4">
              {slots.map((slot) => (
                <div
                  key={slot.slotIndex}
                  className="aspect-square rounded-full flex items-center justify-center text-2xl border border-stone-100"
                  style={getSoftColorCircleStyle(slot.color || '#EEF2F7', 0.15)}
                >
                  <span>{slot.icon || '\u2022'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100 space-y-4">
          <div>
            <h3 className="font-bold text-stone-800">槽位</h3>
            <p className="text-xs text-stone-400 mt-1">
              当前版本所有桌面小组件共用一套 4 槽位配置。
            </p>
          </div>

          {slots.map((slot, index) => (
            <div key={slot.slotIndex} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-stone-700">槽位 {index + 1}</span>
                <span className="text-xs text-stone-400">{slot.label || '未配置'}</span>
              </div>
              <CustomSelect
                value={slot.activityId && slot.categoryId ? `${slot.categoryId}::${slot.activityId}` : ''}
                options={activityOptions}
                onChange={(value) => updateSlot(slot.slotIndex, value)}
                placeholder="选择一个活动"
              />
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100 space-y-4">
          <div>
            <h3 className="font-bold text-stone-800">状态</h3>
            <p className="text-xs text-stone-400 mt-1">
              {isNativeAndroidWidgetSupported()
                ? '已检测到原生 Android 小组件支持，保存后会立即刷新。'
                : '当前不是原生 Android 环境，保存仅更新本地配置。'}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleReloadLocalConfig}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-stone-100 text-stone-700 font-bold active:scale-[0.98] transition-all"
            >
              <RefreshCw size={16} />
              重新加载
            </button>
            <button
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-stone-800 text-white font-bold shadow-lg shadow-stone-200 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              <Save size={16} />
              {isSaving ? '保存中...' : '保存并刷新'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
