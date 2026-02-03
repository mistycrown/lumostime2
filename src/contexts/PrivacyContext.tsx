import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
    const [isPrivacyMode, setIsPrivacyMode] = useState(false);

    const togglePrivacyMode = () => {
        setIsPrivacyMode(prev => {
            const newState = !prev;
            console.log(`Privacy Mode: ${newState ? 'ON' : 'OFF'}`);
            return newState;
        });
    };

    useEffect(() => {
        window.togglePrivacyMode = togglePrivacyMode;
        window.setPrivacyMode = (enabled: boolean) => {
            setIsPrivacyMode(enabled);
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
