/**
 * @file navigationDecorationService.ts
 * @description 导航栏装饰管理服务
 */

export interface NavigationDecorationOption {
    id: string;
    name: string;
    url: string;
    thumbnail?: string;
    offsetY?: string; // 垂直偏移值，如 '0px', '-10px', '50%' 等
    offsetX?: string; // 水平位置（像素），如 '0px', '-20px', '50px' 等
    scale?: number;   // 缩放比例，默认 1 (100%)
    opacity?: number; // 透明度，默认 0.6
}

const STORAGE_KEY = 'navigation_decoration';
const CUSTOM_SETTINGS_KEY = 'navigation_decoration_custom_settings';

interface NavigationDecorationSettings {
    offsetY?: string;
    offsetX?: string;
    scale?: number;
    opacity?: number;
}

class NavigationDecorationService {
    private decorations: NavigationDecorationOption[] = [
        { id: 'default', name: '默认', url: '', offsetY: 'bottom', offsetX: '0px', scale: 1, opacity: 0.6 },
        { id: 'distant_mountain', name: '远山', url: '/dchh/distant_mountain.png', offsetY: '71px', offsetX: '0px', scale: 1, opacity: 0.6 },
        { id: 'little_prince', name: '小王子', url: '/dchh/little_prince.png', offsetY: '71px', offsetX: '0px', scale: 1, opacity: 0.6 },
        { id: 'book', name: '书本', url: '/dchh/book.png', offsetY: '71px', offsetX: '0px', scale: 1, opacity: 0.6 },
        { id: 'cloud', name: '云朵', url: '/dchh/cloud.png', offsetY: '71px', offsetX: '0px', scale: 1, opacity: 0.6 },
        { id: 'coffee', name: '咖啡', url: '/dchh/coffee.png', offsetY: '71px', offsetX: '0px', scale: 1, opacity: 0.6 },
        { id: 'fish', name: '鱼', url: '/dchh/fish.png', offsetY: '71px', offsetX: '0px', scale: 1, opacity: 0.6 },
        { id: 'flower', name: '花朵', url: '/dchh/flower.png', offsetY: '71px', offsetX: '0px', scale: 1, opacity: 0.6 },
        { id: 'grass', name: '草地', url: '/dchh/grass.png', offsetY: '71px', offsetX: '0px', scale: 1, opacity: 0.6 },
        { id: 'ink', name: '水墨', url: '/dchh/ink.png', offsetY: '71px', offsetX: '0px', scale: 1, opacity: 0.6 },
        { id: 'light', name: '灯光', url: '/dchh/light.png', offsetY: '71px', offsetX: '0px', scale: 1, opacity: 0.6 },
        { id: 'mushroom', name: '蘑菇', url: '/dchh/mushroom.png', offsetY: '71px', offsetX: '0px', scale: 1, opacity: 0.6 },
        { id: 'plant', name: '植物1', url: '/dchh/plant.png', offsetY: '71px', offsetX: '0px', scale: 1, opacity: 0.6 },
        { id: 'plant2', name: '植物2', url: '/dchh/plant2.png', offsetY: '71px', offsetX: '0px', scale: 1, opacity: 0.6 },
        { id: 'sea', name: '海洋', url: '/dchh/sea.png', offsetY: '71px', offsetX: '0px', scale: 1, opacity: 0.6 },
        { id: 'cat', name: '猫咪', url: '/dchh/cat.png', offsetY: '71px', offsetX: '0px', scale: 1, opacity: 0.6 },
        { id: 'cat2', name: '猫咪2', url: '/dchh/cat2.png', offsetY: '71px', offsetX: '0px', scale: 1, opacity: 0.6 },
        { id: 'sakura', name: '樱花', url: '/dchh/Sakura.png', offsetY: '71px', offsetX: '0px', scale: 1, opacity: 0.6 },
        // 新增的导航栏装饰
        { id: 'bird', name: '飞鸟', url: '/dchh/bird.png', offsetY: '71px', offsetX: '0px', scale: 1, opacity: 0.6 },
        { id: 'lemon', name: '柠檬', url: '/dchh/lemon.png', offsetY: '71px', offsetX: '0px', scale: 1, opacity: 0.6 },
        { id: 'star', name: '星星', url: '/dchh/star.png', offsetY: '71px', offsetX: '0px', scale: 1, opacity: 0.6 },
    ];

    getAllDecorations(): NavigationDecorationOption[] {
        return this.decorations;
    }

    getCurrentDecoration(): string {
        return localStorage.getItem(STORAGE_KEY) || 'default';
    }

    setCurrentDecoration(decorationId: string): void {
        localStorage.setItem(STORAGE_KEY, decorationId);
        // 触发自定义事件通知导航栏更新
        window.dispatchEvent(new CustomEvent('navigationDecorationChange', {
            detail: { decorationId }
        }));
    }

    getDecorationById(id: string): NavigationDecorationOption | undefined {
        const decoration = this.decorations.find(d => d.id === id);
        if (!decoration) return undefined;

        // 检查是否有自定义设置
        const customSettings = this.getCustomSettings();
        if (customSettings[id]) {
            return {
                ...decoration,
                ...customSettings[id]
            };
        }

        return decoration;
    }

    // 保存自定义设置
    saveCustomSettings(decorationId: string, settings: NavigationDecorationSettings): void {
        const customSettings = this.getCustomSettings();
        // Merge with existing settings
        customSettings[decorationId] = {
            ...customSettings[decorationId],
            ...settings
        };
        localStorage.setItem(CUSTOM_SETTINGS_KEY, JSON.stringify(customSettings));

        // 触发更新事件
        window.dispatchEvent(new CustomEvent('navigationDecorationChange', {
            detail: { decorationId }
        }));
    }

    // 获取所有自定义设置
    getCustomSettings(): Record<string, NavigationDecorationSettings> {
        const stored = localStorage.getItem(CUSTOM_SETTINGS_KEY);
        // Fallback backward compatibility for older 'custom_offsets' key if needed, or just ignore
        return stored ? JSON.parse(stored) : {};
    }

    // 获取特定装饰的偏移值（优先使用自定义值）
    getOffsetY(decorationId: string): string {
        const customSettings = this.getCustomSettings();
        if (customSettings[decorationId]?.offsetY) {
            return customSettings[decorationId].offsetY!;
        }

        const decoration = this.decorations.find(d => d.id === decorationId);
        return decoration?.offsetY || 'bottom';
    }
}

export const navigationDecorationService = new NavigationDecorationService();

/**
 * 获取导航装饰图片的降级路径（PNG → WebP）
 */
export const getNavigationDecorationFallbackUrl = (url: string): string => {
    return url.replace('.png', '.webp');
};
