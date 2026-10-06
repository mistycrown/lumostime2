/**
 * @file nodeRendererMocks.tsx
 * @input Offline node renderer scenarios
 * @output Isolated platform settings, navigation and deterministic AI adapter
 * @pos Test Support (Nodes)
 * @updated 2026-10-06: Keeps renderer checks isolated from user profiles and network services.
 */
import { useSyncExternalStore } from 'react';
import type { Category, Log } from '../../types';
import { DEFAULT_TIMELINE_STYLE_CONFIGS } from '../../services/timelineStyleService';

export const categories: Category[] = [{ id: 'c', name: '生活', icon: '○', themeColor: '#78716c', activities: [{ id: 'a', name: '日常', icon: '○', color: '#78716c' }] }];
export const useCategoryScope = () => ({ categories });
export const useSettings = () => ({ timelineStyleTheme: 'default', timelineStyleConfigs: DEFAULT_TIMELINE_STYLE_CONFIGS, customStickerSets: [], customStickers: [], emojiStyle: 'native' });
export const useAIChatWindow = () => ({ isAIChatOpen: false });

const listeners = new Set<() => void>();
let navigation = { isAddModalOpen: false, editingLog: null as Log | null, initialLogTimes: null, isTodoModalOpen: false, currentDate: new Date() };
const updateNavigation = (patch: Partial<typeof navigation>) => {
  navigation = { ...navigation, ...patch };
  listeners.forEach((listener) => listener());
};
const setters = {
  setIsAddModalOpen: (value: boolean) => updateNavigation({ isAddModalOpen: value }),
  setEditingLog: (value: Log | null) => updateNavigation({ editingLog: value }),
  setInitialLogTimes: (value: null) => updateNavigation({ initialLogTimes: value })
};
export const useNavigation = () => ({ ...useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener); }, () => navigation), ...setters });

export const aiRequests: { prompt: string; systemPrompt: string; resolve: (value: string) => void }[] = [];
export const aiService = {
  getConfig: () => ({ apiKey: 'offline-test' }),
  generateNarrative: (prompt: string, systemPrompt: string) => new Promise<string>((resolve) => aiRequests.push({ prompt, systemPrompt, resolve }))
};
