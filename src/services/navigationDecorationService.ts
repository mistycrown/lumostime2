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

class NavigationDecorationService {
    private decorations: NavigationDecorationOption[] = [
        { id: 'default', name: '默认', url: '', offsetY: 'bottom' },
        { id: 'bamboo', name: '竹子', url: '/dchh/未标题-1.png', offsetY: 'bottom' },
        { id: 'watercolor1', name: '水彩1', url: '/dchh/watercolor-trailing.png', offsetY: '-15px' },
        { id: 'watercolor2', name: '水彩2', url: '/dchh/watercolor-flowing.png', offsetY: '-15px' },
        { id: 'pattern', name: '图案', url: '/dchh/Snipaste_2026-02-04_20-58-18.png', offsetY: '-15px' },
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
        return this.decorations.find(d => d.id === id);
    }
}

export const navigationDecorationService = new NavigationDecorationService();
