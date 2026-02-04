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
        { id: 'bamboo', name: '竹子', url: '/dchh/未标题-1.png', offsetY: '97px' },
        { id: 'watercolor1', name: '水彩1', url: '/dchh/watercolor-trailing.png', offsetY: '71px' },
        { id: 'pattern', name: '图案', url: '/dchh/Snipaste_2026-02-04_20-58-18.png', offsetY: '71px' },
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
