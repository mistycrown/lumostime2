/**
 * @file stickerService.ts
 * @description 贴纸服务 - 管理自定义心情贴纸集合
 */

import { buildCustomStickerViewSets, getStoredCustomStickerState } from './customStickerAssetService';

export interface Sticker {
    path: string;      // 图片路径（不含扩展名），如 "/sticker/water/01"，渲染时会自动尝试 .webp 和 .png
    label?: string;    // 显示标签（可选），如 "Cat"
    thumbnail?: string; // 缩略图路径（可选）
}

export interface StickerSet {
    id: string;                    // 贴纸集 ID，如 "watercolor", "pixel"
    name: string;                  // 显示名称，如 "水彩风格"
    description?: string;          // 描述
    stickers: Sticker[];           // 贴纸列表（数量不限）
    isCustom: boolean;             // 是否是自定义贴纸集
}

// 预设的贴纸集
const PRESET_STICKER_SETS: StickerSet[] = [
    {
        id: 'water1',
        name: 'Water1 水彩',
        isCustom: false,
        stickers: [
            { path: '/sticker/water1/01' },
            { path: '/sticker/water1/02' },
            { path: '/sticker/water1/03' },
            { path: '/sticker/water1/04' },
            { path: '/sticker/water1/05' },
            { path: '/sticker/water1/06' },
            { path: '/sticker/water1/07' },
            { path: '/sticker/water1/08' },
            { path: '/sticker/water1/09' },
            { path: '/sticker/water1/10' },
            { path: '/sticker/water1/11' },
            { path: '/sticker/water1/12' },
            { path: '/sticker/water1/13' },
            { path: '/sticker/water1/14' },
            { path: '/sticker/water1/15' },
            { path: '/sticker/water1/16' },
        ]
    },
    {
        id: 'water2',
        name: 'Water2 水彩',
        isCustom: false,
        stickers: [
            { path: '/sticker/water2/01' },
            { path: '/sticker/water2/02' },
            { path: '/sticker/water2/03' },
            { path: '/sticker/water2/04' },
            { path: '/sticker/water2/05' },
            { path: '/sticker/water2/06' },
            { path: '/sticker/water2/07' },
            { path: '/sticker/water2/08' },
            { path: '/sticker/water2/09' },
            { path: '/sticker/water2/10' },
            { path: '/sticker/water2/11' },
            { path: '/sticker/water2/12' },
            { path: '/sticker/water2/13' },
            { path: '/sticker/water2/14' },
            { path: '/sticker/water2/15' },
            { path: '/sticker/water2/16' },
        ]
    },
    {
        id: 'water3',
        name: 'Water3 水彩',
        isCustom: false,
        stickers: [
            { path: '/sticker/water3/01' },
            { path: '/sticker/water3/02' },
            { path: '/sticker/water3/03' },
            { path: '/sticker/water3/04' },
            { path: '/sticker/water3/05' },
            { path: '/sticker/water3/06' },
            { path: '/sticker/water3/07' },
            { path: '/sticker/water3/08' },
            { path: '/sticker/water3/09' },
            { path: '/sticker/water3/10' },
            { path: '/sticker/water3/11' },
            { path: '/sticker/water3/12' },
            { path: '/sticker/water3/13' },
            { path: '/sticker/water3/14' },
            { path: '/sticker/water3/15' },
            { path: '/sticker/water3/16' },
        ]
    },
    {
        id: 'things1',
        name: 'Things1 物件',
        isCustom: false,
        stickers: [
            { path: '/sticker/things1/01' },
            { path: '/sticker/things1/02' },
            { path: '/sticker/things1/03' },
            { path: '/sticker/things1/04' },
            { path: '/sticker/things1/05' },
            { path: '/sticker/things1/06' },
            { path: '/sticker/things1/07' },
            { path: '/sticker/things1/08' },
            { path: '/sticker/things1/09' },
            { path: '/sticker/things1/10' },
            { path: '/sticker/things1/11' },
            { path: '/sticker/things1/12' },
            { path: '/sticker/things1/13' },
            { path: '/sticker/things1/14' },
            { path: '/sticker/things1/15' },
            { path: '/sticker/things1/16' },
        ]
    },
    {
        id: 'things2',
        name: 'Things2 物件',
        isCustom: false,
        stickers: [
            { path: '/sticker/things2/01' },
            { path: '/sticker/things2/02' },
            { path: '/sticker/things2/03' },
            { path: '/sticker/things2/04' },
            { path: '/sticker/things2/05' },
            { path: '/sticker/things2/06' },
            { path: '/sticker/things2/07' },
            { path: '/sticker/things2/08' },
            { path: '/sticker/things2/09' },
            { path: '/sticker/things2/10' },
            { path: '/sticker/things2/11' },
            { path: '/sticker/things2/12' },
            { path: '/sticker/things2/13' },
            { path: '/sticker/things2/14' },
            { path: '/sticker/things2/15' },
            { path: '/sticker/things2/16' },
        ]
    }
];

class StickerService {
    /**
     * 获取所有可用的贴纸集（包括预设和自定义）
     */
    getAllStickerSets(): StickerSet[] {
        const customSets = this.getCustomStickerSets();
        return [...PRESET_STICKER_SETS, ...customSets];
    }

    /**
     * 获取自定义贴纸集
     */
    getCustomStickerSets(): StickerSet[] {
        const { customStickerSets, customStickers } = getStoredCustomStickerState();
        return buildCustomStickerViewSets(customStickerSets, customStickers);
    }

    /**
     * 获取指定贴纸集
     */
    getStickerSet(setId: string): StickerSet | null {
        const allSets = this.getAllStickerSets();
        return allSets.find(set => set.id === setId) || null;
    }

    /**
     * 获取所有贴纸（扁平化列表）
     */
    getAllStickers(): Sticker[] {
        const allSets = this.getAllStickerSets();
        return allSets.flatMap(set => set.stickers);
    }

    /**
     * 检查字符串是否是贴纸路径
     */
    isStickerPath(str: string): boolean {
        return str.startsWith('image:');
    }

    /**
     * 检查字符串是否是 emoji
     */
    isEmoji(str: string): boolean {
        // Emoji 通常是 1-4 个字符，且不包含 "image:" 或 "ui:" 前缀
        return str.length <= 4 && !str.startsWith('image:') && !str.startsWith('ui:');
    }

    /**
     * 添加自定义贴纸集
     */
    addCustomStickerSet(stickerSet: StickerSet): void {
        const customSets = this.getCustomStickerSets();
        customSets.push(stickerSet);
        localStorage.setItem('lumostime_custom_sticker_sets', JSON.stringify(customSets));
        
        // 触发事件通知其他组件
        window.dispatchEvent(new CustomEvent('stickerSetsChanged'));
    }

    /**
     * 更新自定义贴纸集
     */
    updateCustomStickerSet(setId: string, updates: Partial<StickerSet>): void {
        const customSets = this.getCustomStickerSets();
        const index = customSets.findIndex(set => set.id === setId);
        
        if (index !== -1) {
            customSets[index] = { ...customSets[index], ...updates };
            localStorage.setItem('lumostime_custom_sticker_sets', JSON.stringify(customSets));
            
            // 触发事件通知其他组件
            window.dispatchEvent(new CustomEvent('stickerSetsChanged'));
        }
    }

    /**
     * 删除自定义贴纸集
     */
    removeCustomStickerSet(setId: string): void {
        const customSets = this.getCustomStickerSets();
        const filtered = customSets.filter(set => set.id !== setId);
        localStorage.setItem('lumostime_custom_sticker_sets', JSON.stringify(filtered));
        
        // 触发事件通知其他组件
        window.dispatchEvent(new CustomEvent('stickerSetsChanged'));
    }

    /**
     * 从路径获取贴纸信息
     */
    getStickerByPath(path: string): Sticker | null {
        const allStickers = this.getAllStickers();
        // 移除 "image:" 前缀进行比较
        const cleanPath = path.startsWith('image:') ? path.substring(6) : path;
        return allStickers.find(s => s.path === cleanPath || s.path === path) || null;
    }

    /**
     * 将贴纸路径转换为完整的图标字符串
     */
    toIconString(path: string): string {
        if (path.startsWith('image:')) {
            return path;
        }
        return `image:${path}`;
    }

    /**
     * 从图标字符串提取贴纸路径
     */
    fromIconString(iconStr: string): string {
        if (iconStr.startsWith('image:')) {
            return iconStr.substring(6);
        }
        return iconStr;
    }
}

export const stickerService = new StickerService();
