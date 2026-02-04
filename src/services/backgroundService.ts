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
        id: 'gradient-sunset',
        name: '日落渐变',
        type: 'preset',
        url: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)',
    },
    {
        id: 'gradient-ocean',
        name: '海洋渐变',
        type: 'preset',
        url: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    {
        id: 'gradient-forest',
        name: '森林渐变',
        type: 'preset',
        url: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    },
    {
        id: 'gradient-lavender',
        name: '薰衣草渐变',
        type: 'preset',
        url: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    },
    {
        id: 'gradient-warm',
        name: '温暖渐变',
        type: 'preset',
        url: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
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
    'chronicle-content'    // Chronicle页面
];

class BackgroundService {
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
        // 确保透明度在0-1之间
        const clampedOpacity = Math.max(0, Math.min(1, opacity));
        const currentOpacity = this.getBackgroundOpacity();
        
        if (Math.abs(currentOpacity - clampedOpacity) < 0.01) {
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
        return stored ? parseFloat(stored) : 0.8; // 默认透明度为0.8
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
        const background = this.getCurrentBackgroundOption();
        const opacity = this.getBackgroundOpacity();
        
        console.log('🖼️ Applying background to elements:', { background: background?.id, opacity });
        
        TARGET_ELEMENTS.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (!element) {
                console.log(`🖼️ Element not found: ${elementId}`);
                return;
            }
            
            // 清除之前的背景样式
            element.style.removeProperty('background');
            element.style.removeProperty('background-image');
            element.style.removeProperty('background-size');
            element.style.removeProperty('background-position');
            element.style.removeProperty('background-repeat');
            element.classList.remove('bg-with-gradient', 'bg-with-image');
            
            if (!background || background.id === 'default') {
                console.log(`🖼️ Removing background from ${elementId}`);
                return;
            }
            
            if (background.url.startsWith('linear-gradient')) {
                // 渐变背景
                console.log(`🖼️ Applying gradient background to ${elementId}`);
                element.style.background = background.url;
                element.style.opacity = opacity.toString();
            } else {
                // 图片背景
                console.log(`🖼️ Applying image background to ${elementId}`);
                element.style.backgroundImage = `url(${background.url})`;
                element.style.backgroundSize = 'cover';
                element.style.backgroundPosition = 'center';
                element.style.backgroundRepeat = 'no-repeat';
                element.style.opacity = opacity.toString();
            }
        });
    }

    /**
     * 初始化背景服务
     */
    init(): void {
        const currentBackground = this.getCurrentBackground();
        console.log('🖼️ Background service initializing with background:', currentBackground);
        
        // 延迟执行确保DOM已经准备好
        setTimeout(() => {
            this.applyBackgroundToElements();
            console.log('🖼️ Background service initialized and applied');
        }, 500);
        
        // 监听页面变化，重新应用背景
        const observer = new MutationObserver(() => {
            setTimeout(() => {
                this.applyBackgroundToElements();
            }, 100);
        });
        
        // 观察body的子元素变化
        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }
}

export const backgroundService = new BackgroundService();