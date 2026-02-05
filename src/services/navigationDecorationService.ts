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
}

const STORAGE_KEY = 'navigation_decoration';
const CUSTOM_OFFSET_KEY = 'navigation_decoration_custom_offsets';

class NavigationDecorationService {
    private decorations: NavigationDecorationOption[] = [
        { id: 'default', name: '默认', url: '', offsetY: 'bottom' },
        { id: 'distant_mountain', name: '远山', url: '/dchh/distant_mountain.png', offsetY: '71px' },
        { id: 'little_prince', name: '小王子', url: '/dchh/little_prince.png', offsetY: '71px' },
        { id: 'book', name: '书本', url: '/dchh/book.png', offsetY: '71px' },
        { id: 'cloud', name: '云朵', url: '/dchh/cloud.png', offsetY: '71px' },
        { id: 'coffee', name: '咖啡', url: '/dchh/coffee.png', offsetY: '71px' },
        { id: 'fish', name: '鱼', url: '/dchh/fish.png', offsetY: '71px' },
        { id: 'flower', name: '花朵', url: '/dchh/flower.png', offsetY: '71px' },
        { id: 'grass', name: '草地', url: '/dchh/grass.png', offsetY: '71px' },
        { id: 'ink', name: '水墨', url: '/dchh/ink.png', offsetY: '71px' },
        { id: 'light', name: '灯光', url: '/dchh/light.png', offsetY: '71px' },
        { id: 'mushroom', name: '蘑菇', url: '/dchh/mushroom.png', offsetY: '71px' },
        { id: 'plant', name: '植物1', url: '/dchh/plant.png', offsetY: '71px' },
        { id: 'plant2', name: '植物2', url: '/dchh/plant2.png', offsetY: '71px' },
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

        // 检查是否有自定义偏移值
        const customOffsets = this.getCustomOffsets();
        if (customOffsets[id]) {
            return {
                ...decoration,
                offsetY: customOffsets[id]
            };
        }

        return decoration;
    }

    // 获取所有自定义偏移值
    getCustomOffsets(): Record<string, string> {
        const stored = localStorage.getItem(CUSTOM_OFFSET_KEY);
        return stored ? JSON.parse(stored) : {};
    }

    // 保存自定义偏移值
    saveCustomOffset(decorationId: string, offsetY: string): void {
        const customOffsets = this.getCustomOffsets();
        customOffsets[decorationId] = offsetY;
        localStorage.setItem(CUSTOM_OFFSET_KEY, JSON.stringify(customOffsets));

        // 触发更新事件
        window.dispatchEvent(new CustomEvent('navigationDecorationChange', {
            detail: { decorationId }
        }));
    }

    // 获取特定装饰的偏移值（优先使用自定义值）
    getOffsetY(decorationId: string): string {
        const customOffsets = this.getCustomOffsets();
        if (customOffsets[decorationId]) {
            return customOffsets[decorationId];
        }

        const decoration = this.decorations.find(d => d.id === decorationId);
        return decoration?.offsetY || 'bottom';
    }
}

export const navigationDecorationService = new NavigationDecorationService();
