/**
 * @file backgroundService.ts
 * @input Background image files, DOM elements
 * @output Background display operations, Custom background management, Status bar updates
 * @pos Service (UI Customization)
 * @description 背景图片管理服务 - 支持预设背景和自定义背景图片，直接操作 DOM 元素，并自动更新状态栏样式
 * 
 * 核心功能：
 * - 预设背景图片管理
 * - 自定义背景上传和存储
 * - DOM 元素背景样式应用
 * - 背景图片删除和清理
 * - 根据背景自动调整状态栏样式
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { statusBarService } from './statusBarService';

export interface BackgroundOption {
    id: string;
    name: string;
    type: 'preset' | 'custom';
    url: string;
    thumbnail?: string;
    filePath?: string;
}

const PRESET_BACKGROUNDS: BackgroundOption[] = [
    {
        id: 'default',
        name: '默认',
        type: 'preset',
        url: '',
    },
    {
        id: 'little_prince',
        name: '小王子',
        type: 'preset',
        url: '/background/little_prince.webp',
        thumbnail: '/background/little_prince.webp',
    },
    {
        id: 'abstract',
        name: '抽象',
        type: 'preset',
        url: '/background/abstract.webp',
        thumbnail: '/background/abstract.webp',
    },
    {
        id: 'ancient',
        name: '古风',
        type: 'preset',
        url: '/background/ancient.webp',
        thumbnail: '/background/ancient.webp',
    },
    {
        id: 'bank',
        name: '河岸',
        type: 'preset',
        url: '/background/bank.webp',
        thumbnail: '/background/bank.webp',
    },
    {
        id: 'black',
        name: '黑色',
        type: 'preset',
        url: '/background/black.webp',
        thumbnail: '/background/black.webp',
    },
    {
        id: 'brown',
        name: '棕色',
        type: 'preset',
        url: '/background/brown.webp',
        thumbnail: '/background/brown.webp',
    },
    {
        id: 'green',
        name: '绿意',
        type: 'preset',
        url: '/background/green.webp',
        thumbnail: '/background/green.webp',
    },
    {
        id: 'green2',
        name: '绿意2',
        type: 'preset',
        url: '/background/green2.webp',
        thumbnail: '/background/green2.webp',
    },
    {
        id: 'grenn3',
        name: '绿意3',
        type: 'preset',
        url: '/background/grenn3.webp',
        thumbnail: '/background/grenn3.webp',
    },
    {
        id: 'greenpink',
        name: '绿粉',
        type: 'preset',
        url: '/background/greenpink.webp',
        thumbnail: '/background/greenpink.webp',
    },
    {
        id: 'hehua',
        name: '荷花',
        type: 'preset',
        url: '/background/hehua.webp',
        thumbnail: '/background/hehua.webp',
    },
    {
        id: 'forest',
        name: '森林',
        type: 'preset',
        url: '/background/forest.webp',
        thumbnail: '/background/forest.webp',
    },
    {
        id: 'kamon',
        name: '家纹',
        type: 'preset',
        url: '/background/kamon.webp',
        thumbnail: '/background/kamon.webp',
    },
    {
        id: 'knit',
        name: '编织',
        type: 'preset',
        url: '/background/knit.webp',
        thumbnail: '/background/knit.webp',
    },
    {
        id: 'night',
        name: '夜晚',
        type: 'preset',
        url: '/background/night.webp',
        thumbnail: '/background/night.webp',
    },
    {
        id: 'pencil',
        name: '铅笔',
        type: 'preset',
        url: '/background/pencil.webp',
        thumbnail: '/background/pencil.webp',
    },
    {
        id: 'plant',
        name: '植物',
        type: 'preset',
        url: '/background/plant.webp',
        thumbnail: '/background/plant.webp',
    },
    {
        id: 'pinkblue',
        name: '粉蓝',
        type: 'preset',
        url: '/background/pinkblue.webp',
        thumbnail: '/background/pinkblue.webp',
    },
    {
        id: 'purple',
        name: '紫色',
        type: 'preset',
        url: '/background/purple.webp',
        thumbnail: '/background/purple.webp',
    },
    {
        id: 'red',
        name: '红色',
        type: 'preset',
        url: '/background/red.webp',
        thumbnail: '/background/red.webp',
    },
    {
        id: 'sea',
        name: '海洋',
        type: 'preset',
        url: '/background/sea.webp',
        thumbnail: '/background/sea.webp',
    },
];

/**
 * 获取背景图片的降级路径（PNG → WebP）
 */
export const getBackgroundFallbackUrl = (url: string): string => {
    return url.replace('.png', '.webp');
};

const STORAGE_KEY = 'lumos_custom_backgrounds';
const CURRENT_BACKGROUND_KEY = 'lumos_current_background';
const BACKGROUND_OPACITY_KEY = 'lumos_background_opacity';
const BACKGROUND_DIRECTORY = 'backgrounds';

// 需要应用背景的页面元素ID
const TARGET_ELEMENTS = [
    'timeline-content',    // Timeline页面
    'memoir-content',      // Memoir页面  
    'scopes-content',      // Scopes页面
    'tags-content',        // Tags页面
    'chronicle-content',   // Chronicle页面
    'todo-content',        // Todo页面
    'record-content'       // Record页面
];

class BackgroundService {
    private lastFoundElements?: string;
    private isApplying = false; // 防止重复应用
    private isMigratingLegacyBackgrounds = false;

    private loadStoredCustomBackgrounds(): BackgroundOption[] {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) {
                return [];
            }

            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error('Failed to load custom backgrounds:', error);
            return [];
        }
    }

    private saveCustomBackgrounds(customBackgrounds: BackgroundOption[]): void {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(customBackgrounds));
    }

    private async ensureBackgroundDirectory(): Promise<void> {
        if (!Capacitor.isNativePlatform()) {
            return;
        }

        try {
            await Filesystem.mkdir({
                path: BACKGROUND_DIRECTORY,
                directory: Directory.Data,
                recursive: true
            });
        } catch (error: any) {
            if (!String(error?.message || '').includes('exist')) {
                console.warn('[BackgroundService] Failed to ensure background directory:', error);
            }
        }
    }

    private readBlobAsDataUrl(file: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Failed to read background file'));
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
        return fileExt || 'jpg';
    }

    private getMimeTypeFromDataUrl(dataUrl: string): string | undefined {
        const match = dataUrl.match(/^data:(.+?);base64,/);
        return match?.[1];
    }

    private async persistNativeBackgroundFile(
        dataUrl: string,
        backgroundId: string,
        fallbackName?: string
    ): Promise<Pick<BackgroundOption, 'url' | 'thumbnail' | 'filePath'>> {
        await this.ensureBackgroundDirectory();

        const pureBase64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        const extension = this.getExtensionFromMimeType(this.getMimeTypeFromDataUrl(dataUrl), fallbackName);
        const fileName = `${backgroundId}.${extension}`;
        const relativePath = `${BACKGROUND_DIRECTORY}/${fileName}`;

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

    private async deleteNativeBackgroundFile(filePath?: string): Promise<void> {
        if (!Capacitor.isNativePlatform() || !filePath) {
            return;
        }

        await Filesystem.deleteFile({
            path: `${BACKGROUND_DIRECTORY}/${filePath}`,
            directory: Directory.Data
        }).catch(() => undefined);
    }

    private async migrateLegacyCustomBackgrounds(): Promise<void> {
        if (!Capacitor.isNativePlatform() || this.isMigratingLegacyBackgrounds) {
            return;
        }

        const customBackgrounds = this.loadStoredCustomBackgrounds();
        const needsMigration = customBackgrounds.some(bg => bg.type === 'custom' && bg.url.startsWith('data:'));
        if (!needsMigration) {
            return;
        }

        this.isMigratingLegacyBackgrounds = true;

        try {
            let didMigrate = false;
            const migratedBackgrounds = await Promise.all(customBackgrounds.map(async (background) => {
                if (background.type !== 'custom' || !background.url.startsWith('data:')) {
                    return background;
                }

                try {
                    const persisted = await this.persistNativeBackgroundFile(background.url, background.id, background.name);
                    didMigrate = true;
                    return {
                        ...background,
                        ...persisted
                    };
                } catch (error) {
                    console.error('[BackgroundService] Failed to migrate custom background:', background.id, error);
                    return background;
                }
            }));

            if (didMigrate) {
                this.saveCustomBackgrounds(migratedBackgrounds);
                this.applyBackgroundToElements();
                void this.updateStatusBar();
            }
        } finally {
            this.isMigratingLegacyBackgrounds = false;
        }
    }

    /**
     * 获取所有背景选项（预设 + 自定义）
     */
    getAllBackgrounds(): BackgroundOption[] {
        const customBackgrounds = this.getCustomBackgrounds();
        return [...PRESET_BACKGROUNDS, ...customBackgrounds];
    }

    /**
     * 获取预设背景
     */
    getPresetBackgrounds(): BackgroundOption[] {
        return PRESET_BACKGROUNDS;
    }

    /**
     * 获取自定义背景
     */
    getCustomBackgrounds(): BackgroundOption[] {
        return this.loadStoredCustomBackgrounds();
    }

    /**
     * 添加自定义背景
     */
    async addCustomBackground(file: File): Promise<BackgroundOption> {
        const backgroundId = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const dataUrl = await this.readBlobAsDataUrl(file);

        let customBackground: BackgroundOption = {
            id: backgroundId,
            name: file.name.replace(/\.[^/.]+$/, ''),
            type: 'custom',
            url: dataUrl,
            thumbnail: dataUrl,
        };

        if (Capacitor.isNativePlatform()) {
            const persisted = await this.persistNativeBackgroundFile(dataUrl, backgroundId, file.name);
            customBackground = {
                ...customBackground,
                ...persisted
            };
        }

        const customBackgrounds = this.getCustomBackgrounds();
        customBackgrounds.push(customBackground);
        this.saveCustomBackgrounds(customBackgrounds);

        return customBackground;
    }

    /**
     * 删除自定义背景
     */
    deleteCustomBackground(backgroundId: string): boolean {
        try {
            const customBackgrounds = this.getCustomBackgrounds();
            const backgroundToDelete = customBackgrounds.find(bg => bg.id === backgroundId);
            const filteredBackgrounds = customBackgrounds.filter(bg => bg.id !== backgroundId);

            if (filteredBackgrounds.length !== customBackgrounds.length) {
                this.saveCustomBackgrounds(filteredBackgrounds);

                if (backgroundToDelete?.filePath) {
                    void this.deleteNativeBackgroundFile(backgroundToDelete.filePath);
                }

                // 如果删除的是当前背景，重置为默认
                const currentBackground = this.getCurrentBackground();
                if (currentBackground === backgroundId) {
                    this.setCurrentBackground('default');
                }

                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to delete custom background:', error);
            return false;
        }
    }

    /**
     * 设置当前背景
     */
    setCurrentBackground(backgroundId: string): void {
        const currentId = this.getCurrentBackground();
        if (currentId === backgroundId) {
            return; // 如果是相同的背景，不触发更新
        }

        localStorage.setItem(CURRENT_BACKGROUND_KEY, backgroundId);

        // 立即应用背景到所有目标元素
        this.applyBackgroundToElements();
        
        // 更新状态栏样式
        this.updateStatusBar();
    }

    /**
     * 获取当前背景ID
     */
    getCurrentBackground(): string {
        return localStorage.getItem(CURRENT_BACKGROUND_KEY) || 'default';
    }

    /**
     * 设置背景透明度
     */
    setBackgroundOpacity(opacity: number): void {
        // 确保透明度在0-0.4之间
        const clampedOpacity = Math.max(0, Math.min(0.4, opacity));
        const currentOpacity = this.getBackgroundOpacity();

        if (Math.abs(currentOpacity - clampedOpacity) < 0.001) {
            return; // 如果透明度变化很小，不触发更新
        }

        localStorage.setItem(BACKGROUND_OPACITY_KEY, clampedOpacity.toString());

        // 立即应用透明度到所有目标元素
        this.applyBackgroundToElements();
        
        // 更新状态栏样式
        this.updateStatusBar();
    }

    /**
     * 获取背景透明度
     */
    getBackgroundOpacity(): number {
        const stored = localStorage.getItem(BACKGROUND_OPACITY_KEY);
        return stored ? parseFloat(stored) : 0.1; // 默认透明度为10%
    }

    getCurrentBackgroundOption(): BackgroundOption | null {
        const currentId = this.getCurrentBackground();
        const allBackgrounds = this.getAllBackgrounds();
        return allBackgrounds.find(bg => bg.id === currentId) || null;
    }

    /**
     * 更新状态栏样式以匹配当前背景
     */
    private async updateStatusBar(): Promise<void> {
        const background = this.getCurrentBackgroundOption();
        
        if (!background || background.id === 'default') {
            // 默认背景，使用浅色状态栏
            await statusBarService.updateForBackground(null);
        } else {
            // 使用背景图片URL更新状态栏
            await statusBarService.updateForBackground(background.url);
        }
    }

    /**
     * 直接应用背景到目标DOM元素
     */
    applyBackgroundToElements(): void {
        // 防止重复应用
        if (this.isApplying) {
            return;
        }

        this.isApplying = true;

        try {
            const background = this.getCurrentBackgroundOption();
            const opacity = this.getBackgroundOpacity();

            TARGET_ELEMENTS.forEach(elementId => {
                const element = document.getElementById(elementId);
                if (!element) {
                    return;
                }

                // 移除之前的背景层
                const existingBgLayer = element.querySelector('.bg-layer');
                if (existingBgLayer) {
                    existingBgLayer.remove();
                }

                if (!background || background.id === 'default') {
                    return;
                }

                // 确保元素有相对定位
                const computedStyle = getComputedStyle(element);
                if (computedStyle.position === 'static') {
                    element.style.position = 'relative';
                }

                // 创建背景层 div
                const bgLayer = document.createElement('div');
                bgLayer.className = 'bg-layer';
                bgLayer.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 100vh;
                    z-index: 0;
                    pointer-events: none;
                    opacity: ${opacity};
                `;

                if (background.url.startsWith('linear-gradient')) {
                    // 渐变背景
                    bgLayer.style.background = background.url;
                } else {
                    // 图片背景 - 固定位置，填满屏幕
                    // 优先尝试 PNG，如果失败则降级到 webp
                    const imageUrl = background.url;
                    bgLayer.style.backgroundImage = `url(${imageUrl})`;
                    bgLayer.style.backgroundSize = 'cover'; // 填满屏幕，保持比例
                    bgLayer.style.backgroundPosition = 'center center'; // 居中显示
                    bgLayer.style.backgroundRepeat = 'no-repeat';
                    
                    // 添加图片加载错误处理
                    const testImg = new Image();
                    testImg.onload = () => {
                        // 图片加载成功，不需要做任何事
                    };
                    testImg.onerror = () => {
                        // PNG 加载失败，尝试 webp
                        if (imageUrl.endsWith('.png')) {
                            const webpUrl = imageUrl.replace('.png', '.webp');
                            bgLayer.style.backgroundImage = `url(${webpUrl})`;
                        }
                    };
                    testImg.src = imageUrl;
                }

                // 将背景层插入到元素的第一个子元素之前
                element.insertBefore(bgLayer, element.firstChild);

                // 确保元素的直接子元素有正确的 z-index
                Array.from(element.children).forEach((child) => {
                    if (child !== bgLayer && child instanceof HTMLElement) {
                        const childStyle = getComputedStyle(child);
                        if (childStyle.position === 'static') {
                            child.style.position = 'relative';
                        }
                        if (!child.style.zIndex || child.style.zIndex === 'auto') {
                            child.style.zIndex = '1';
                        }
                    }
                });
            });
        } finally {
            setTimeout(() => {
                this.isApplying = false;
            }, 100);
        }
    }

    /**
     * 手动触发背景应用（用于调试）
     */
    forceApplyBackground(): void {
        console.log('🖼️ Force applying background...');
        this.applyBackgroundToElements();
    }

    /**
     * 初始化背景服务
     */
    init(): void {
        const currentBackground = this.getCurrentBackground();
        void this.migrateLegacyCustomBackgrounds();

        // 初始化状态栏服务
        statusBarService.init().then(() => {
            // 状态栏初始化完成后，根据当前背景更新状态栏
            this.updateStatusBar();
        });

        // 延迟执行确保DOM已经准备好
        setTimeout(() => {
            this.applyBackgroundToElements();
        }, 500);

        // 监听页面变化，重新应用背景
        const observer = new MutationObserver((mutations) => {
            let shouldReapply = false;
            mutations.forEach(mutation => {
                // 忽略 head 中的变化和我们自己添加的背景层
                if (mutation.target === document.head ||
                    (mutation.target as Element).closest?.('head') ||
                    (mutation.target as Element).classList?.contains('bg-layer') ||
                    (mutation.target as Element).querySelector?.('.bg-layer') === mutation.addedNodes[0]) {
                    return;
                }

                // 检查是否有目标元素被添加
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const element = node as Element;
                            // 忽略背景层
                            if (element.classList?.contains('bg-layer')) {
                                return;
                            }
                            // 检查是否是目标元素或包含目标元素
                            if (TARGET_ELEMENTS.some(id =>
                                element.id === id || element.querySelector(`#${id}`)
                            )) {
                                shouldReapply = true;
                            }
                        }
                    });
                }
            });

            if (shouldReapply) {
                setTimeout(() => {
                    this.applyBackgroundToElements();
                }, 100);
            }
        });

        // 只观察body的变化，不观察head
        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        // 监听路由变化（React Router或其他路由系统）
        window.addEventListener('popstate', () => {
            setTimeout(() => {
                this.applyBackgroundToElements();
            }, 200);
        });

        // 监听hash变化
        window.addEventListener('hashchange', () => {
            setTimeout(() => {
                this.applyBackgroundToElements();
            }, 200);
        });

        // 定期检查并重新应用背景（作为备用机制）
        setInterval(() => {
            // 只在有新元素出现时才重新应用
            const currentElements = TARGET_ELEMENTS.filter(id => document.getElementById(id));
            const currentElementsStr = currentElements.join(',');

            if (!this.lastFoundElements || this.lastFoundElements !== currentElementsStr) {
                this.lastFoundElements = currentElementsStr;
                this.applyBackgroundToElements();
            }
        }, 500); // 减少到500ms，更快响应
    }
}

export const backgroundService = new BackgroundService();

// 在开发环境中暴露到全局，便于调试
if (typeof window !== 'undefined') {
    (window as any).backgroundService = backgroundService;
}
