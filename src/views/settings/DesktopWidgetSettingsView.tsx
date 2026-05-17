/**
 * @file DesktopWidgetSettingsView.tsx
 * @input window.desktopWidget IPC bridge（Electron 环境），localStorage 状态
 * @output 桌面小组件设置页面，含今日小组件开关
 * @pos View (Settings Subpage)
 * @description 桌面小组件设置子页面。当前仅支持"今日"小组件，后续可在此页面添加更多桌面小组件。
 *              开关打开时自动调用 Electron IPC 打开对应小组件窗口，关闭时隐藏。
 * @updated 2026-05-17: 初始版本，含今日小组件开关。
 */
import React, { useEffect, useState } from 'react';
import { ChevronLeft, LayoutGrid, Monitor } from 'lucide-react';

const DESKTOP_WIDGET_TODAY_KEY = 'lumostime_desktop_widget_today_enabled';

interface DesktopWidgetItem {
  id: string;
  label: string;
  description: string;
  storageKey: string;
  onEnable: () => void;
  onDisable: () => void;
}

interface DesktopWidgetSettingsViewProps {
  onBack: () => void;
}

export const DesktopWidgetSettingsView: React.FC<DesktopWidgetSettingsViewProps> = ({ onBack }) => {
  const isElectron = typeof window !== 'undefined' && !!(window as any).desktopWidget;

  const [todayEnabled, setTodayEnabled] = useState(() => {
    return localStorage.getItem(DESKTOP_WIDGET_TODAY_KEY) === 'true';
  });

  useEffect(() => {
    // 非 Electron 环境下强制重置为 false
    if (!isElectron) {
      setTodayEnabled(false);
    }
  }, [isElectron]);

  const handleToggleTodayWidget = () => {
    if (!isElectron) {
      return;
    }

    const nextEnabled = !todayEnabled;
    setTodayEnabled(nextEnabled);
    localStorage.setItem(DESKTOP_WIDGET_TODAY_KEY, String(nextEnabled));

    if (nextEnabled) {
      window.desktopWidget?.open();
    } else {
      window.desktopWidget?.close();
    }
  };

  const widgets: DesktopWidgetItem[] = [
    {
      id: 'today',
      label: '今日小组件',
      description: '在桌面显示今日待办任务，支持一键完成。',
      storageKey: DESKTOP_WIDGET_TODAY_KEY,
      onEnable: () => window.desktopWidget?.open(),
      onDisable: () => window.desktopWidget?.close()
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* 顶部导航 */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-stone-400 hover:text-stone-600 transition-colors"
        >
          <ChevronLeft size={22} />
        </button>
        <span className="text-stone-800 font-bold text-lg">桌面小组件</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
        {/* 环境提示（非 Electron 下） */}
        {!isElectron && (
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 flex items-start gap-3">
            <Monitor size={16} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-700 leading-relaxed">
              桌面小组件仅在 Windows 桌面版本中可用。
            </p>
          </div>
        )}

        {/* 小组件列表 */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider pl-2">
            可用小组件
          </h3>
          <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
            {/* 今日小组件 */}
            <button
              type="button"
              disabled={!isElectron}
              onClick={handleToggleTodayWidget}
              className="w-full flex items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-stone-50 disabled:cursor-default disabled:hover:bg-white"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50">
                <LayoutGrid size={18} className="text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-stone-800">今日小组件</div>
                <div className="text-xs text-stone-400 mt-0.5 leading-relaxed">
                  在桌面显示今日待办，支持一键完成
                </div>
              </div>
              {/* 开关 */}
              <div
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
                  todayEnabled && isElectron
                    ? 'bg-amber-400'
                    : 'bg-stone-200'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    todayEnabled && isElectron ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </button>
          </div>
        </div>

        {/* 说明 */}
        <div className="rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3 space-y-1.5">
          <p className="text-xs text-stone-500 leading-relaxed">
            桌面小组件是悬浮在桌面的独立窗口，不占用任务栏图标。关闭主程序后小组件也会同步关闭。
          </p>
          <p className="text-xs text-stone-400 leading-relaxed">
            更多小组件正在开发中。
          </p>
        </div>
      </div>
    </div>
  );
};
