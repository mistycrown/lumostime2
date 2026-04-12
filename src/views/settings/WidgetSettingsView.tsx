/**
 * @file WidgetSettingsView.tsx
 * @input Widget slot config, categories, Android bridge availability
 * @output A minimal 4-slot widget configuration page
 * @pos View
 * @description Lets the user choose the four activities shown in the Android timer widget and push that config to native immediately.
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
    const options = [{ value: '', label: 'Not configured' }];
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
        onToast('success', 'Widget config saved');
      } else {
        onToast('info', 'Saved locally. Refresh requires native Android.');
      }
    } catch (error) {
      console.error('[WidgetSettingsView] Failed to save widget config', error);
      onToast('error', 'Failed to save widget config');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReloadLocalConfig = () => {
    setSlots(loadWidgetTimerSlotsFromStorage());
    onToast('success', 'Reloaded local widget config');
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={onBack} className="text-stone-400 hover:text-stone-600 p-1">
          <ChevronLeft size={24} />
        </button>
        <span className="text-stone-800 font-bold text-lg">Widget Timer</span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 pb-40 space-y-6">
        <div className="bg-white rounded-[28px] p-6 shadow-sm border border-stone-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
              <LayoutGrid size={20} />
            </div>
            <div>
              <h3 className="font-bold text-stone-800">4-slot timer widget</h3>
              <p className="text-xs text-stone-400">
                White card, four circles, tap to start, tap again to stop, and tap another one to auto-switch.
              </p>
            </div>
          </div>

          <div className="rounded-[28px] bg-white border border-stone-100 shadow-[0_12px_30px_rgba(15,23,42,0.06)] p-5">
            <div className="grid grid-cols-2 gap-4">
              {slots.map((slot) => (
                <div
                  key={slot.slotIndex}
                  className="aspect-square rounded-full flex items-center justify-center text-2xl border border-stone-100"
                  style={{ backgroundColor: slot.color || '#EEF2F7' }}
                >
                  <span>{slot.icon || '\u2022'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100 space-y-4">
          <div>
            <h3 className="font-bold text-stone-800">Slots</h3>
            <p className="text-xs text-stone-400 mt-1">
              First version uses one shared 4-slot config for all home-screen widget instances.
            </p>
          </div>

          {slots.map((slot, index) => (
            <div key={slot.slotIndex} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-stone-700">Slot {index + 1}</span>
                <span className="text-xs text-stone-400">{slot.label || 'Not configured'}</span>
              </div>
              <CustomSelect
                value={slot.activityId && slot.categoryId ? `${slot.categoryId}::${slot.activityId}` : ''}
                options={activityOptions}
                onChange={(value) => updateSlot(slot.slotIndex, value)}
                placeholder="Select an activity"
              />
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100 space-y-4">
          <div>
            <h3 className="font-bold text-stone-800">Status</h3>
            <p className="text-xs text-stone-400 mt-1">
              {isNativeAndroidWidgetSupported()
                ? 'Native Android widget support is active. Saving refreshes the widget immediately.'
                : 'Not running in native Android. Saving only updates the local config.'}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleReloadLocalConfig}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-stone-100 text-stone-700 font-bold active:scale-[0.98] transition-all"
            >
              <RefreshCw size={16} />
              Reload
            </button>
            <button
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-stone-800 text-white font-bold shadow-lg shadow-stone-200 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Save & Refresh'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
