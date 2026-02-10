/**
 * @file useFloatingWindow.ts
 * @input SessionContext (activeSessions), ToastContext (addToast), handleStopActivity callback
 * @output Floating Window Listener (stopFocusFromFloating event handler)
 * @pos Hook (System Integration)
 * @description 悬浮窗 Hook - 监听 Android 悬浮窗的结束计时事件，自动停止所有活动会话
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useSession } from '../contexts/SessionContext';
import { useToast } from '../contexts/ToastContext';

export const useFloatingWindow = (
    handleStopActivity: (sessionId: string) => void
) => {
    const { activeSessions } = useSession();
    const { addToast } = useToast();

    useEffect(() => {
        const setupFloatingWindowListener = () => {
            const handleStopFromFloating = () => {
                console.log('📥 收到悬浮球结束计时事件');

                if (activeSessions.length > 0) {
                    console.log(`🛑 结束 ${activeSessions.length} 个活动会话`);
                    activeSessions.forEach(session => {
                        handleStopActivity(session.id);
                    });
                    addToast('success', '已从悬浮球结束计时');
                } else {
                    console.log('⚠️ 没有活动会话需要结束');
                }
            };

            window.addEventListener('stopFocusFromFloating', handleStopFromFloating);
            return () => {
                window.removeEventListener('stopFocusFromFloating', handleStopFromFloating);
            };
        };

        const platform = Capacitor.getPlatform();
        if (platform === 'android') {
            const cleanup = setupFloatingWindowListener();
            return cleanup;
        }
    }, [activeSessions]);
};
