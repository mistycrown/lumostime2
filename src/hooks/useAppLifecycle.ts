import { useEffect } from 'react';
import { useScrollTracker } from './useScrollTracker';

export const useAppLifecycle = () => {
    // Scroll tracker
    const isHeaderScrolled = useScrollTracker();

    // Since useSyncManager handles visibility sync, we might not need to duplicate it here if we use useSyncManager.
    // However, App.tsx had a visibility listener in '3. App Hide -> Upload'.
    // If we moved that to useSyncManager (which we did), we don't need it here.

    // So this hook might be just for other lifecycle things or lightweight UI states.
    // For now, let's just export the scrolled state helper if we want to keep it separated.

    return { isHeaderScrolled };
};
