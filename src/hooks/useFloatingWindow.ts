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
