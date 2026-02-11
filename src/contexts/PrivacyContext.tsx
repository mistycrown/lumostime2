/**
 * @file PrivacyContext.tsx
 * @input User privacy mode preference
 * @output Privacy mode state, Toggle function
 * @pos Context (Privacy Management)
 * @description 隐私模式上下文 - 管理应用的隐私模式状态，用于隐藏敏感信息
 * 
 * 核心功能：
 * - 隐私模式状态管理
 * - 全局切换函数
 * - LocalStorage 持久化
 * - 控制台调试接口
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SETTINGS_KEYS } from '../constants/storageKeys';

interface PrivacyContextType {
    isPrivacyMode: boolean;
    togglePrivacyMode: () => void;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export const usePrivacy = () => {
    const context = useContext(PrivacyContext);
    if (!context) {
        throw new Error('usePrivacy must be used within a PrivacyProvider');
    }
    return context;
};

declare global {
    interface Window {
        togglePrivacyMode: () => void;
        setPrivacyMode: (enabled: boolean) => void;
    }
}

export const PrivacyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isPrivacyMode, setIsPrivacyMode] = useState(() => {
        const stored = localStorage.getItem(SETTINGS_KEYS.PRIVACY_MODE);
        return stored === 'true';
    });

    const togglePrivacyMode = () => {
        setIsPrivacyMode(prev => {
            const newState = !prev;
            localStorage.setItem(SETTINGS_KEYS.PRIVACY_MODE, newState.toString());
            console.log(`Privacy Mode: ${newState ? 'ON' : 'OFF'}`);
            return newState;
        });
    };

    useEffect(() => {
        window.togglePrivacyMode = togglePrivacyMode;
        window.setPrivacyMode = (enabled: boolean) => {
            setIsPrivacyMode(enabled);
            localStorage.setItem(SETTINGS_KEYS.PRIVACY_MODE, enabled.toString());
            console.log(`Privacy Mode: ${enabled ? 'ON' : 'OFF'}`);
        };

        return () => {
            // @ts-ignore
            delete window.togglePrivacyMode;
            // @ts-ignore
            delete window.setPrivacyMode;
        };
    }, []);

    return (
        <PrivacyContext.Provider value={{ isPrivacyMode, togglePrivacyMode }}>
            {children}
        </PrivacyContext.Provider>
    );
};
