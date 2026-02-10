/**
 * @file useScrollTracker.ts
 * @input Window scroll events
 * @output Scroll State (isHeaderScrolled: boolean)
 * @pos Hook (UI Helper)
 * @description 滚动追踪 Hook - 监听页面滚动，返回是否滚动超过阈值（50px）
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import { useState, useEffect } from 'react';

export const useScrollTracker = () => {
    const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            setIsHeaderScrolled(scrollTop > 50);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return isHeaderScrolled;
};
