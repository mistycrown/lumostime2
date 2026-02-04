/**
 * @file backgroundService.ts
 * @description 背景图片管理服务，支持预设背景和自定义背景图片
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
        localStorage.setItem(CURRENT_BACKGROUND_KEY, backgroundId);
        
        // 触发背景变更事件
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('backgroundChanged', {
                detail: { backgroundId }
            }));
        }
    }

    /**
     * 获取当前背景ID
     */
    getCurrentBackground(): string {
        return localStorage.getItem(CURRENT_BACKGROUND_KEY) || 'default';
    }

    /**
     * 获取当前背景选项
     */
    getCurrentBackgroundOption(): BackgroundOption | null {
        const currentId = this.getCurrentBackground();
        const allBackgrounds = this.getAllBackgrounds();
        return allBackgrounds.find(bg => bg.id === currentId) || null;
    }

    /**
     * 应用背景到页面
     */
    applyBackground(backgroundId?: string): void {
        const id = backgroundId || this.getCurrentBackground();
        const background = this.getAllBackgrounds().find(bg => bg.id === id);
        
        if (!background) return;

        const body = document.body;
        
        if (background.id === 'default') {
            // 默认背景
            body.style.background = '';
            body.style.backgroundImage = '';
        } else if (background.url.startsWith('linear-gradient')) {
            // 渐变背景
            body.style.background = background.url;
            body.style.backgroundImage = '';
        } else {
            // 图片背景
            body.style.background = '';
            body.style.backgroundImage = `url(${background.url})`;
            body.style.backgroundSize = 'cover';
            body.style.backgroundPosition = 'center';
            body.style.backgroundRepeat = 'no-repeat';
            body.style.backgroundAttachment = 'fixed';
        }
    }

    /**
     * 初始化背景服务
     */
    init(): void {
        // 应用当前背景
        this.applyBackground();
        
        // 监听背景变更事件
        if (typeof window !== 'undefined') {
            window.addEventListener('backgroundChanged', (event: any) => {
                this.applyBackground(event.detail.backgroundId);
            });
        }
    }
}

export const backgroundService = new BackgroundService();