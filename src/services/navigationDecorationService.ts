/**
 * @file navigationDecorationService.ts
 * @input Decoration images, Custom settings (offset, scale, opacity)
 * @output Navigation bar decoration display, Custom decoration management
 * @pos Service (UI Customization)
 * @description 导航栏装饰管理服务 - 管理导航栏顶部的装饰图片
 * 
 * 核心功能：
 * - 预设装饰图片管理
 * - 自定义装饰上传和存储
 * - 装饰位置和样式调整（偏移、缩放、透明度）
 * - 装饰图片删除和清理
 * 
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { resolveAssetPath } from '../utils/assetPath';

export interface NavigationDecorationOption {
    id: string;
    name: string;
    type?: 'preset' | 'custom';
    url: string;
    thumbnail?: string;
    filePath?: string;
    offsetY?: string; // 垂直偏移值，如 '0px', '-10px', '50%' 等
    offsetX?: string; // 水平位置（像素），如 '0px', '-20px', '50px' 等
    scale?: number;   // 缩放比例，默认 1 (100%)
    opacity?: number; // 透明度，默认 0.6
}

const STORAGE_KEY = 'navigation_decoration';
const CUSTOM_SETTINGS_KEY = 'navigation_decoration_custom_settings';
const CUSTOM_DECORATIONS_KEY = 'navigation_decoration_custom_list';
const DECORATION_DIRECTORY = 'navigation_decorations';

interface NavigationDecorationSettings {
    offsetY?: string;
    offsetX?: string;
    scale?: number;
    opacity?: number;
}

class NavigationDecorationService {
    private decorations: NavigationDecorationOption[] = [
        { id: 'default', name: '默认', url: '', offsetY: 'bottom', offsetX: '0px', scale: 1, opacity: 0.6 },
        { id: 'bird', name: '飞鸟', url: '/dchh/bird.webp', offsetY: '56px', offsetX: '0px', scale: 1, opacity: 0.6 },
        { id: 'blue', name: '蓝色', url: '/dchh/blue.webp', offsetY: '71px', offsetX: '66px', scale: 1, opacity: 0.6 },
        { id: 'boat', name: '小船', url: '/dchh/boat.webp', offsetY: '46px', offsetX: '65px', scale: 1.5, opacity: 0.6 },
        { id: 'book', name: '书本', url: '/dchh/book.webp', offsetY: '76px', offsetX: '0px', scale: 1, opacity: 0.6 },
        { id: 'cat', name: '猫咪', url: '/dchh/cat.webp', offsetY: '71px', offsetX: '0px', scale: 1, opacity: 0.6 },
        { id: 'cat2', name: '猫咪2', url: '/dchh/cat2.webp', offsetY: '61px', offsetX: '0px', scale: 1, opacity: 0.6 },
        { id: 'chrismas', name: '圣诞', url: '/dchh/chrismas.webp', offsetY: '61px', offsetX: '0px', scale: 1, opacity: 0.6 },
        { id: 'cloud', name: '云朵', url: '/dchh/cloud.webp', offsetY: '86px', offsetX: '0px', scale: 1, opacity: 0.6 },
        { id: 'distant_mountain', name: '远山', url: '/dchh/distant_mountain.webp', offsetY: '62px', offsetX: '50px', scale: 1, opacity: 0.6 },
        { id: 'fish', name: '鱼', url: '/dchh/fish.webp', offsetY: '61px', offsetX: '0px', scale: 1, opacity: 0.6 },
        { id: 'flower', name: '花朵', url: '/dchh/flower.webp', offsetY: '61px', offsetX: '0px', scale: 1.05, opacity: 0.6 },
        { id: 'fly', name: '飞行', url: '/dchh/fly.webp', offsetY: '56px', offsetX: '-135px', scale: 1.3, opacity: 0.6 },
        { id: 'ghost', name: '幽灵', url: '/dchh/ghost.webp', offsetY: '61px', offsetX: '0px', scale: 1, opacity: 0.6 },
        { id: 'grass', name: '草地', url: '/dchh/grass.webp', offsetY: '71px', offsetX: '0px', scale: 1, opacity: 0.6 },
        { id: 'ink', name: '水墨', url: '/dchh/ink.webp', offsetY: '61px', offsetX: '0px', scale: 1, opacity: 0.6 },
        { id: 'kamon', name: '家纹', url: '/dchh/kamon.webp', offsetY: '61px', offsetX: '0px', scale: 1, opacity: 0.6 },
        { id: 'knit', name: '编织', url: '/dchh/knit.webp', offsetY: '61px', offsetX: '0px', scale: 1, opacity: 0.6 },
        { id: 'lemon', name: '柠檬', url: '/dchh/lemon.webp', offsetY: '71px', offsetX: '85px', scale: 1, opacity: 0.6 },
        { id: 'light', name: '灯光', url: '/dchh/light.webp', offsetY: '71px', offsetX: '0px', scale: 1.25, opacity: 0.6 },
        { id: 'light2', name: '灯光2', url: '/dchh/light2.webp', offsetY: '72px', offsetX: '-130px', scale: 1.2, opacity: 0.6 },
        { id: 'little_prince', name: '小王子', url: '/dchh/little_prince.webp', offsetY: '61px', offsetX: '-55px', scale: 1, opacity: 0.6 },
        { id: 'mushroom', name: '蘑菇', url: '/dchh/mushroom.webp', offsetY: '50px', offsetX: '10px', scale: 0.95, opacity: 0.65 },
        { id: 'night', name: '夜晚', url: '/dchh/night.webp', offsetY: '61px', offsetX: '0px', scale: 1, opacity: 0.6 },
        { id: 'paper', name: '纸艺', url: '/dchh/paper.webp', offsetY: '76px', offsetX: '-30px', scale: 1.07, opacity: 1 },
        { id: 'pencil', name: '铅笔', url: '/dchh/pencil.webp', offsetY: '61px', offsetX: '0px', scale: 1, opacity: 0.6 },
        { id: 'plant', name: '植物1', url: '/dchh/plant.webp', offsetY: '66px', offsetX: '35px', scale: 1, opacity: 0.6 },
        { id: 'plant2', name: '植物2', url: '/dchh/plant2.webp', offsetY: '89px', offsetX: '0px', scale: 0.5, opacity: 0.6 },
        { id: 'purple', name: '紫色', url: '/dchh/purple.webp', offsetY: '46px', offsetX: '74px', scale: 1.45, opacity: 0.6 },
        { id: 'rabbit', name: '兔子', url: '/dchh/rabbit.webp', offsetY: '51px', offsetX: '80px', scale: 1.4, opacity: 0.6 },
        { id: 'red', name: '红色', url: '/dchh/red.webp', offsetY: '80px', offsetX: '78px', scale: 0.87, opacity: 0.58 },
        { id: 'sakura', name: '樱花', url: '/dchh/Sakura.webp', offsetY: '71px', offsetX: '0px', scale: 1, opacity: 0.6 },
        { id: 'sea', name: '海洋', url: '/dchh/sea.webp', offsetY: '41px', offsetX: '0px', scale: 1.3, opacity: 0.6 },
        { id: 'siyecao', name: '四叶草', url: '/dchh/siyecao.webp', offsetY: '71px', offsetX: '45px', scale: 0.85, opacity: 0.63 },
        { id: 'songguo', name: '松果', url: '/dchh/songguo.webp', offsetY: '51px', offsetX: '90px', scale: 1.3, opacity: 0.6 },
        { id: 'strawberry', name: '草莓', url: '/dchh/Strawberry.webp', offsetY: '51px', offsetX: '75px', scale: 1.45, opacity: 0.6 },
        { id: 'sun', name: '太阳', type: 'preset', url: '/dchh/sun.webp', offsetY: '61px', offsetX: '80px', scale: 1.35, opacity: 0.75 },
        { id: 'ya', name: '芽', type: 'preset', url: '/dchh/ya.webp', offsetY: '21px', offsetX: '23px', scale: 1.95, opacity: 0.6 },
    ].map(d => ({ ...d, type: d.type || 'preset' })) as NavigationDecorationOption[];

    private loadStoredCustomDecorations(): NavigationDecorationOption[] {
        try {
            const stored = localStorage.getItem(CUSTOM_DECORATIONS_KEY);
            if (!stored) return [];
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error('Failed to load custom decorations:', error);
            return [];
        }
    }

    private saveCustomDecorations(customDecorations: NavigationDecorationOption[]): void {
        localStorage.setItem(CUSTOM_DECORATIONS_KEY, JSON.stringify(customDecorations));
    }

    private async ensureDecorationDirectory(): Promise<void> {
        if (!Capacitor.isNativePlatform()) return;
        try {
            await Filesystem.mkdir({
                path: DECORATION_DIRECTORY,
                directory: Directory.Data,
                recursive: true
            });
        } catch (error: any) {
            if (!String(error?.message || '').includes('exist')) {
                console.warn('[NavigationDecorationService] Failed to ensure decoration directory:', error);
            }
        }
    }

    private readBlobAsDataUrl(file: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Failed to read decoration file'));
            reader.readAsDataURL(file);
        });
    }

    private getExtensionFromMimeType(mimeType?: string, fallbackName?: string): string {
        const normalized = mimeType?.toLowerCase() || '';
        if (normalized.includes('png')) return 'png';
        if (normalized.includes('webp')) return 'webp';
        if (normalized.includes('gif')) return 'gif';
        if (normalized.includes('bmp')) return 'bmp';
        if (normalized.includes('svg')) return 'svg';
        if (normalized.includes('jpeg') || normalized.includes('jpg')) return 'jpg';
        const fileExt = fallbackName?.split('.').pop()?.toLowerCase();
        return fileExt || 'png';
    }

    private getMimeTypeFromDataUrl(dataUrl: string): string | undefined {
        const match = dataUrl.match(/^data:(.+?);base64,/);
        return match?.[1];
    }

    private async persistNativeDecorationFile(
        dataUrl: string,
        decorationId: string,
        fallbackName?: string
    ): Promise<Pick<NavigationDecorationOption, 'url' | 'thumbnail' | 'filePath'>> {
        await this.ensureDecorationDirectory();

        const pureBase64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        const extension = this.getExtensionFromMimeType(this.getMimeTypeFromDataUrl(dataUrl), fallbackName);
        const fileName = `${decorationId}.${extension}`;
        const relativePath = `${DECORATION_DIRECTORY}/${fileName}`;

        await Filesystem.writeFile({
            path: relativePath,
            data: pureBase64,
            directory: Directory.Data,
            recursive: true
        });

        const uriResult = await Filesystem.getUri({
            path: relativePath,
            directory: Directory.Data
        });
        const fileUrl = Capacitor.convertFileSrc(uriResult.uri);

        return {
            url: fileUrl,
            thumbnail: fileUrl,
            filePath: fileName
        };
    }

    private async deleteNativeDecorationFile(filePath?: string): Promise<void> {
        if (!Capacitor.isNativePlatform() || !filePath) return;
        await Filesystem.deleteFile({
            path: `${DECORATION_DIRECTORY}/${filePath}`,
            directory: Directory.Data
        }).catch(() => undefined);
    }

    getCustomDecorations(): NavigationDecorationOption[] {
        return this.loadStoredCustomDecorations();
    }

    getAllDecorations(): NavigationDecorationOption[] {
        return [
            ...this.decorations.map(decoration => ({
                ...decoration,
                url: decoration.url ? resolveAssetPath(decoration.url) : decoration.url,
                thumbnail: decoration.thumbnail ? resolveAssetPath(decoration.thumbnail) : decoration.thumbnail
            })),
            ...this.getCustomDecorations()
        ];
    }

    async addCustomDecoration(file: File): Promise<NavigationDecorationOption> {
        const decorationId = `custom_deco_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const dataUrl = await this.readBlobAsDataUrl(file);

        let customDecoration: NavigationDecorationOption = {
            id: decorationId,
            name: file.name.replace(/\.[^/.]+$/, ''),
            type: 'custom',
            url: dataUrl,
            thumbnail: dataUrl,
            offsetY: '60px', // 默认设置，使图片位于顶部附近，与预设对齐
            offsetX: '0px',
            scale: 1,
            opacity: 1
        };

        if (Capacitor.isNativePlatform()) {
            const persisted = await this.persistNativeDecorationFile(dataUrl, decorationId, file.name);
            customDecoration = {
                ...customDecoration,
                ...persisted
            };
        }

        const customDecorations = this.getCustomDecorations();
        customDecorations.push(customDecoration);
        this.saveCustomDecorations(customDecorations);

        return customDecoration;
    }

    deleteCustomDecoration(decorationId: string): boolean {
        try {
            const customDecorations = this.getCustomDecorations();
            const decorationToDelete = customDecorations.find(d => d.id === decorationId);
            const filteredDecorations = customDecorations.filter(d => d.id !== decorationId);

            if (filteredDecorations.length !== customDecorations.length) {
                this.saveCustomDecorations(filteredDecorations);

                if (decorationToDelete?.filePath) {
                    void this.deleteNativeDecorationFile(decorationToDelete.filePath);
                }

                // 如果删除的是当前装饰，重置为默认
                const currentDecoration = this.getCurrentDecoration();
                if (currentDecoration === decorationId) {
                    this.setCurrentDecoration('default');
                }

                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to delete custom decoration:', error);
            return false;
        }
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
        const allDecorations = this.getAllDecorations();
        const decoration = allDecorations.find(d => d.id === id);
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

        const allDecorations = this.getAllDecorations();
        const decoration = allDecorations.find(d => d.id === decorationId);
        return decoration?.offsetY || 'bottom';
    }
}

export const navigationDecorationService = new NavigationDecorationService();

/**
 * 获取导航装饰图片的降级路径（PNG → WebP）
 */
export const getNavigationDecorationFallbackUrl = (url: string): string => {
    return resolveAssetPath(url.replace('.png', '.webp'));
};
