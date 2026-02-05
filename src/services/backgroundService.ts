/**
 * @file backgroundService.ts
 * @description 背景图片管理服务，支持预设背景和自定义背景图片，直接操作DOM元素
 */

export interface BackgroundOption {
    id: string;
    name: string;
    type: 'preset' | 'custom';
    url: string;
    thumbnail?: string;
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
        id: 'bank',
        name: '河岸',
        type: 'preset',
        url: '/background/bank.webp',
        thumbnail: '/background/bank.webp',
    },
    {
        id: 'bird',
        name: '飞鸟',
        type: 'preset',
        url: '/background/bird.webp',
        thumbnail: '/background/bird.webp',
    },
    {
        id: 'green',
        name: '绿意',
        type: 'preset',
        url: '/background/green.webp',
        thumbnail: '/background/green.webp',
    },
];

const STORAGE_KEY = 'lumos_custom_backgrounds';
const CURRENT_BACKGROUND_KEY = 'lumos_current_background';
const BACKGROUND_OPACITY_KEY = 'lumos_background_opacity';

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
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Failed to load custom backgrounds:', error);
            return [];
        }
    }

    /**
     * 添加自定义背景
     */
    async addCustomBackground(file: File): Promise<BackgroundOption> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const dataUrl = e.target?.result as string;
                    const customBackground: BackgroundOption = {
                        id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
                        name: file.name.replace(/\.[^/.]+$/, ''), // 移除文件扩展名
                        type: 'custom',
                        url: dataUrl,
                        thumbnail: dataUrl, // 对于小图片，直接使用原图作为缩略图
                    };

                    const customBackgrounds = this.getCustomBackgrounds();
                    customBackgrounds.push(customBackground);

                    localStorage.setItem(STORAGE_KEY, JSON.stringify(customBackgrounds));
                    resolve(customBackground);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }

    /**
     * 删除自定义背景
     */
    deleteCustomBackground(backgroundId: string): boolean {
        try {
            const customBackgrounds = this.getCustomBackgrounds();
            const filteredBackgrounds = customBackgrounds.filter(bg => bg.id !== backgroundId);

            if (filteredBackgrounds.length !== customBackgrounds.length) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredBackgrounds));

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
                    bgLayer.style.backgroundImage = `url(${background.url})`;
                    bgLayer.style.backgroundSize = 'cover'; // 填满屏幕，保持比例
                    bgLayer.style.backgroundPosition = 'center center'; // 居中显示
                    bgLayer.style.backgroundRepeat = 'no-repeat';
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