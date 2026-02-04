import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import AppUsage from '../plugins/AppUsagePlugin';
import { imageService } from '../services/imageService';
import { UpdateService } from '../services/updateService';
import { backgroundService } from '../services/backgroundService';
import { useData } from '../contexts/DataContext';

export const useAppInitialization = () => {
    const { setAppRules } = useSettings();
    const { addToast } = useToast();
    const { logs, setLogs } = useData();
    const hasCleanedImagesRef = useRef(false);

    // Load app rules on mount
    useEffect(() => {
        const loadAppRules = async () => {
            if (Capacitor.getPlatform() === 'android') {
                try {
                    const result = await AppUsage.getAppRules();
                    setAppRules(result.rules || {});
                    console.log('📋 已加载应用规则:', result.rules);
                } catch (e) {
                    console.error('加载应用规则失败:', e);
                }
            }
        };
        loadAppRules();
    }, []);

    // Check for Updates on Mount
    useEffect(() => {
        const checkUpdates = async () => {
            console.log('App: checking for updates...');
            try {
                const updateInfo = await UpdateService.checkNeedsUpdate();
                if (updateInfo) {
                    addToast('info', `发现新版本: ${updateInfo.version}`);
                    console.log('App: Update found', updateInfo);
                } else {
                    console.log('App check: No updates found (System is up to date)');
                }
            } catch (e) {
                console.error('App: Update check failed', e);
            }
        };
        checkUpdates();
    }, []);

    // Initialize background service
    useEffect(() => {
        backgroundService.init();
        console.log('🖼️ Background service initialized');
    }, []);

    // Auto-cleanup deleted images from logs on load
    /* 
    useEffect(() => {
        const cleanLogs = async () => {
            // Only run once when logs are loaded
            if (hasCleanedImagesRef.current || logs.length === 0) return;

            try {
                const validImages = new Set(await imageService.listImages());
                let changed = false;
                const newLogs = logs.map(log => {
                    if (!log.images || log.images.length === 0) return log;
                    const valid = log.images.filter(img => validImages.has(img));
                    if (valid.length !== log.images.length) {
                        changed = true;
                        return { ...log, images: valid };
                    }
                    return log;
                });

                if (changed) {
                    console.log('🧹 [Auto-Cleanup] Removed invalid image references from logs.');
                    setLogs(newLogs);
                }
                hasCleanedImagesRef.current = true;
            } catch (e) {
                console.error('Auto-cleanup failed', e);
            }
        };
        cleanLogs();
    }, [logs]);
    */
};
