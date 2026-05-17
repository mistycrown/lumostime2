/**
 * @file DesktopTimerWidgetView.tsx
 * @description 桌面计时器小组件的极致微缩版，物理尺寸固定为宽 80px x 高 32px 的雅致微圆角小方框。
 * 调整为 rounded-md 微圆角。最外层直接支持 WebkitAppRegion: 'drag'，整个背景任意位置均可自由拖拽。
 * 将 WebkitAppRegion: 'no-drag' 与 onDoubleClick 极其精准地绑定在数字文本 span 本身以及按钮组容器上，
 * 完美实现了“背景自由拖拽移动”与“双击极速切换主题”的双重无冲突极简交互。
 * @updated 2026-05-17: 升级为 rounded-md 微圆角；将 drag 移至最外层，将 no-drag 精准局限于数字 span 和按钮组，完美恢复了桌面窗口的物理拖动调整位置功能，双击换色 100% 灵敏生效。
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Square, ExternalLink } from 'lucide-react';
import {
  DesktopTimerWidgetSnapshot,
  loadDesktopTimerWidgetSnapshotFromStorage
} from '../../services/desktopWidgetService';

const APP_READY_EVENT = 'lumostime:app-ready';

export const DesktopTimerWidgetView: React.FC = () => {
  const [snapshot, setSnapshot] = useState<DesktopTimerWidgetSnapshot | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [elapsedText, setElapsedText] = useState('00:00');
  const [theme, setThemeState] = useState<'light' | 'dark'>('dark');

  const timerRef = useRef<number | null>(null);
  const opacity = 0.85; // 舒适的毛玻璃半透明度

  // 刷新最新快照
  const refreshSnapshot = useCallback(() => {
    try {
      const result = loadDesktopTimerWidgetSnapshotFromStorage();
      setSnapshot(result);
    } catch (error) {
      console.error('Failed to load timer widget snapshot', error);
    }
  }, []);

  // 格式化计时器流逝时间
  const updateElapsedText = useCallback(() => {
    if (!snapshot?.session?.startTime) {
      setElapsedText('00:00');
      return;
    }

    const diffMs = Date.now() - snapshot.session.startTime;
    if (diffMs < 0) {
      setElapsedText('00:00');
      return;
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');

    if (hours > 0) {
      setElapsedText(`${hours}:${pad(minutes)}:${pad(seconds)}`);
    } else {
      setElapsedText(`${pad(minutes)}:${pad(seconds)}`);
    }
  }, [snapshot]);

  // 1. 初始化时拉取偏好与快照，并通知 App Ready
  useEffect(() => {
    try {
      const saved = localStorage.getItem('desktop-timer-widget:display-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.theme) {
          setThemeState(parsed.theme);
          window.desktopWidget?.setTheme?.(parsed.theme);
        }
      }
    } catch (e) {
      console.error('Failed to load timer widget display settings', e);
    }

    // 初始化 Electron 窗口的半透明度底色
    window.desktopWidget?.setOpacity?.(opacity);

    refreshSnapshot();
    window.dispatchEvent(new Event(APP_READY_EVENT));
  }, [refreshSnapshot]);

  // 2. 兜底同步机制：IndexedDB/Storage变更监听与静默定时器轮询
  useEffect(() => {
    const handleStorage = () => refreshSnapshot();
    const handleFocus = () => refreshSnapshot();

    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);

    const pollInterval = window.setInterval(refreshSnapshot, 5000);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
      window.clearInterval(pollInterval);
    };
  }, [refreshSnapshot]);

  // 3. 动态时间流逝计算定时器驱动（本地计算，零高频IPC）
  useEffect(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (snapshot?.session?.startTime) {
      updateElapsedText();
      timerRef.current = window.setInterval(updateElapsedText, 1000);
    } else {
      setElapsedText('00:00');
    }

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [snapshot, updateElapsedText]);

  // 双击小组件切换主题
  const handleToggleTheme = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setThemeState(nextTheme);
    window.desktopWidget?.setTheme?.(nextTheme);
    localStorage.setItem(
      'desktop-timer-widget:display-settings',
      JSON.stringify({ theme: nextTheme })
    );
  };

  // IPC动作：结束并保存专注
  const handleStopAndSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!snapshot?.session?.sessionId) return;
    window.desktopWidget?.requestMainAction({
      type: 'stop_active_session_and_save',
      sessionId: snapshot.session.sessionId
    });
    setSnapshot((prev) => prev ? { ...prev, session: null } : null);
  };

  // IPC动作：打开主应用
  const handleOpenMainApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.desktopWidget?.openMainApp();
  };

  const hasActiveSession = !!snapshot?.session;
  const isDark = theme === 'dark';

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: isDark
          ? `rgba(24, 24, 27, ${isHovered ? 0.96 : opacity})`
          : `rgba(250, 250, 249, ${isHovered ? 0.96 : opacity})`,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        WebkitAppRegion: 'drag' // 最外层容器直接承载 drag，除 no-drag 元素外整片背景均可自由拖拽！
      } as React.CSSProperties}
      className={`relative w-screen h-screen rounded-md flex items-center justify-center select-none overflow-hidden transition-all duration-300 cursor-move ${
        isDark
          ? 'text-stone-100 bg-zinc-900/90 shadow-[0_2px_8px_rgba(0,0,0,0.3)]'
          : 'text-stone-800 bg-stone-50/90 shadow-[0_2px_8px_rgba(120,113,108,0.1)]'
      }`}
    >
      {/* 强力样式重置：清空 html, body 和 #root 的默认 margin 溢出，并重置为透明底色 */}
      <style dangerouslySetInnerHTML={{ __html: `
        html, body, #root {
          margin: 0 !important;
          padding: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          overflow: hidden !important;
          background: transparent !important;
        }
        @keyframes pulseActiveTimerMicro {
          0%, 100% {
            text-shadow: 0 0 3px ${isDark ? 'rgba(245,158,11,0.25)' : 'rgba(217,119,6,0.18)'};
            transform: scale(1);
          }
          50% {
            text-shadow: 0 0 8px ${isDark ? 'rgba(245,158,11,0.45)' : 'rgba(217,119,6,0.28)'};
            transform: scale(1.01);
          }
        }
        .timer-micro-glow {
          animation: pulseActiveTimerMicro 3s infinite ease-in-out;
        }
      ` }} />

      {/* 大字计时区域：Hover 时淡出隐藏 */}
      <div
        className={`z-20 flex items-center justify-center transition-all duration-300 transform origin-center ${
          isHovered ? 'opacity-0 scale-90 pointer-events-none' : 'opacity-100 scale-100'
        }`}
      >
        {/* 精准控制：仅在数字文本 span 上加 no-drag，支持局部双击换色，大字以外的广袤背景仍百分百用于拖拽拖动！ */}
        <span
          onDoubleClick={handleToggleTheme}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          className={`cursor-pointer px-2 py-1 font-mono text-[15px] font-extrabold tracking-tight select-all tabular-nums transition-colors duration-300 ${
            hasActiveSession
              ? 'timer-micro-glow ' + (isDark ? 'text-amber-500' : 'text-amber-600')
              : isDark ? 'text-stone-600' : 'text-stone-300'
          }`}
          title="双击切换深浅色主题"
        >
          {elapsedText}
        </span>
      </div>

      {/* 控制按钮区域：Hover 时直接在最中央淡入浮现，极简紧凑定位以绝不遮挡底层背景的 drag 拖拽区域 */}
      <div
        onDoubleClick={handleToggleTheme}
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex items-center justify-center gap-2.5 transition-all duration-300 transform cursor-pointer w-auto h-auto ${
          isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
        }`}
        title="双击切换深浅色主题"
      >
        {hasActiveSession && (
          <button
            type="button"
            onClick={handleStopAndSave}
            className={`flex h-5 w-5 items-center justify-center rounded-full transition ${
              isDark
                ? 'bg-red-500/15 text-red-400 hover:bg-red-500 hover:text-white'
                : 'bg-red-50 hover:bg-red-500 hover:text-white text-red-500'
            }`}
            title="结束并提交专注"
          >
            <Square size={6} fill="currentColor" strokeWidth={0} />
          </button>
        )}

        <button
          type="button"
          onClick={handleOpenMainApp}
          className={`flex h-5 w-5 items-center justify-center rounded-full transition ${
            isDark
              ? 'bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
          }`}
          title="打开主页面"
        >
          <ExternalLink size={8} strokeWidth={2.5} />
        </button>
      </div>

    </div>
  );
};
