/**
 * @file backgroundService.ts
 * @input Background image files, DOM elements
 * @output Background display operations, Custom background management, Status bar updates
 * @pos Service (UI Customization)
 * @description 闁煎啿鏈▍娆撳炊閸撗冾暬缂佺媴绱曢幃濠囧嫉瀹ュ懎顫?- 闁衡偓椤栨稑鐦Λ鏉垮椤旀洟鎳楃仦鐐彲闁告粌鐭侀崵婊呪偓瑙勭煯缁犵喖鎳楃仦鐐彲闁搞儱澧芥晶鏍晬瀹€鈧ú鍧楀箳閵夛附鎯欏ù?DOM 闁稿繐鍟扮粈宀勬晬鐏炲€熷珯闁煎浜滄慨鈺呭即鐎涙ɑ鐓€闁绘鍩栭埀顑跨劍閻栴噣寮藉畡鎵
 * 
 * 闁哄秶顭堢缓楣冨礉閻旇鍘撮柨?
 * - 濡澘瀚鏇㈡嚄鐏炵偓鐝柛銉ュ⒔婢ф牜绮婚敍鍕€?
 * - 闁煎浜滈悾鐐▕婢跺骸鍓归柡鍜佸灟缁楀倹瀵奸悩鍙夊閻庢稒锚閸?
 * - DOM 闁稿繐鍟扮粈宀勬嚄鐏炵偓鐝柡宥呭槻缁扁剝鎯旈弮鍌涙殢
 * - 闁煎啿鏈▍娆撳炊閸撗冾暬闁告帞濞€濞呭酣宕仦鍓ь伕闁?
 * - 闁哄秷顫夊畵渚€鎳楃仦鐐彲闁煎浜滄慨鈺冩嫬閸愨晜娈婚柣妯垮煐閳ь兛鐒﹂悥顕€寮藉畡鎵
 * 
 * 闁宠法濯寸粭?Once I am updated, be sure to update my header comment and the folder's md.
 * @updated 2026-04-20: Added event-driven background subscriptions, image preloading, and lighter reapply scheduling to reduce mobile jank and white flashes.
 */

import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { statusBarService } from './statusBarService';
import { resolveAssetPath } from '../utils/assetPath';

export interface BackgroundOption {
    id: string;
    name: string;
    type: 'preset' | 'custom';
    url: string;
    thumbnail?: string;
    filePath?: string;
}

export interface BackgroundSnapshot {
    background: BackgroundOption | null;
    opacity: number;
}

const PRESET_BACKGROUNDS: BackgroundOption[] = [
    {
        id: 'default',
        name: 'Default',
        type: 'preset',
        url: '',
    },
    {
        id: 'little_prince',
        name: 'Little Prince',
        type: 'preset',
        url: '/background/little_prince.webp',
        thumbnail: '/background/little_prince.webp',
    },
    {
        id: 'abstract',
        name: 'Abstract',
        type: 'preset',
        url: '/background/abstract.webp',
        thumbnail: '/background/abstract.webp',
    },
    {
        id: 'ancient',
        name: 'Ancient',
        type: 'preset',
        url: '/background/ancient.webp',
        thumbnail: '/background/ancient.webp',
    },
    {
        id: 'bank',
        name: 'Bank',
        type: 'preset',
        url: '/background/bank.webp',
        thumbnail: '/background/bank.webp',
    },
    {
        id: 'black',
        name: 'Black',
        type: 'preset',
        url: '/background/black.webp',
        thumbnail: '/background/black.webp',
    },
    {
        id: 'brown',
        name: 'Brown',
        type: 'preset',
        url: '/background/brown.webp',
        thumbnail: '/background/brown.webp',
    },
    {
        id: 'green',
        name: 'Green',
        type: 'preset',
        url: '/background/green.webp',
        thumbnail: '/background/green.webp',
    },
    {
        id: 'green2',
        name: 'Green 2',
        type: 'preset',
        url: '/background/green2.webp',
        thumbnail: '/background/green2.webp',
    },
    {
        id: 'grenn3',
        name: 'Green 3',
        type: 'preset',
        url: '/background/grenn3.webp',
        thumbnail: '/background/grenn3.webp',
    },
    {
        id: 'greenpink',
        name: 'Green Pink',
        type: 'preset',
        url: '/background/greenpink.webp',
        thumbnail: '/background/greenpink.webp',
    },
    {
        id: 'hehua',
        name: 'Lotus',
        type: 'preset',
        url: '/background/hehua.webp',
        thumbnail: '/background/hehua.webp',
    },
    {
        id: 'forest',
        name: 'Forest',
        type: 'preset',
        url: '/background/forest.webp',
        thumbnail: '/background/forest.webp',
    },
    {
        id: 'kamon',
        name: 'Kamon',
        type: 'preset',
        url: '/background/kamon.webp',
        thumbnail: '/background/kamon.webp',
    },
    {
        id: 'knit',
        name: 'Knit',
        type: 'preset',
        url: '/background/knit.webp',
        thumbnail: '/background/knit.webp',
    },
    {
        id: 'night',
        name: 'Night',
        type: 'preset',
        url: '/background/night.webp',
        thumbnail: '/background/night.webp',
    },
    {
        id: 'pencil',
        name: 'Pencil',
        type: 'preset',
        url: '/background/pencil.webp',
        thumbnail: '/background/pencil.webp',
    },
    {
        id: 'plant',
        name: 'Plant',
        type: 'preset',
        url: '/background/plant.webp',
        thumbnail: '/background/plant.webp',
    },
    {
        id: 'pinkblue',
        name: 'Pink Blue',
        type: 'preset',
        url: '/background/pinkblue.webp',
        thumbnail: '/background/pinkblue.webp',
    },
    {
        id: 'purple',
        name: 'Purple',
        type: 'preset',
        url: '/background/purple.webp',
        thumbnail: '/background/purple.webp',
    },
    {
        id: 'red',
        name: 'Red',
        type: 'preset',
        url: '/background/red.webp',
        thumbnail: '/background/red.webp',
    },
    {
        id: 'sea',
        name: 'Sea',
        type: 'preset',
        url: '/background/sea.webp',
        thumbnail: '/background/sea.webp',
    },
];

/**
 * 闁兼儳鍢茶ぐ鍥嚄鐏炵偓鐝柛銉ュ⒔婢ф牠鎯冮崟顖涱€栫紒鐙欏棛鐔呯€垫澘瀚哥槐姗甆G 闁?WebP闁?
 */
export const getBackgroundFallbackUrl = (url: string): string => {
    return resolveAssetPath(url.replace('.png', '.webp'));
};

const STORAGE_KEY = 'lumos_custom_backgrounds';
const CURRENT_BACKGROUND_KEY = 'lumos_current_background';
const BACKGROUND_OPACITY_KEY = 'lumos_background_opacity';
const BACKGROUND_DIRECTORY = 'backgrounds';
const BACKGROUND_CHANGED_EVENT = 'lumostime:background-changed';

// 闂傚洠鍋撻悷鏇氱缁ㄦ煡鎮介妸銊ュ壒闁哄拋鍨冲▓鎴炪亜閻㈠憡妗ㄩ柛蹇撳暟缁€瀛朌
const TARGET_ELEMENTS = [
    'scopes-content',      // Scopes濡炪倗鏁诲?
    'tags-content'         // Tags濡炪倗鏁诲?
];

class BackgroundService {
    private lastFoundElements?: string;
    private isApplying = false; // 闂傚啫寮堕娑㈡煂瀹ュ拋妲婚幖瀛樻⒒閺?    private isMigratingLegacyBackgrounds = false;
    private reapplyTimeoutId: number | null = null;
    private preloadPromises = new Map<string, Promise<void>>();
    private preloadedUrls = new Set<string>();

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
                this.emitBackgroundChange();
                this.applyBackgroundToElements();
                void this.updateStatusBar();
            }
        } finally {
            this.isMigratingLegacyBackgrounds = false;
        }
    }

    /**
     * 闁兼儳鍢茶ぐ鍥箥閳ь剟寮垫径搴″壒闁哄拋鍨堕埀顒€顦甸妴宥夋晬閸儺鏆曢悹?+ 闁煎浜滈悾鐐▕婢舵稓绀?     */
    getAllBackgrounds(): BackgroundOption[] {
        const customBackgrounds = this.getCustomBackgrounds();
        return [...this.getPresetBackgrounds(), ...customBackgrounds];
    }

    /**
     * 闁兼儳鍢茶ぐ鍥紣閸曨噮鍟庨柤鍐叉湰濞?
     */
    getPresetBackgrounds(): BackgroundOption[] {
        return PRESET_BACKGROUNDS.map(background => ({
            ...background,
            url: background.url.startsWith('linear-gradient') ? background.url : resolveAssetPath(background.url),
            thumbnail: background.thumbnail ? resolveAssetPath(background.thumbnail) : background.thumbnail
        }));
    }

    /**
     * 闁兼儳鍢茶ぐ鍥嚊椤忓嫮鏆板☉鏂款槼閸庢寮?     */
    getCustomBackgrounds(): BackgroundOption[] {
        return this.loadStoredCustomBackgrounds();
    }

    /**
     * 婵烇綀顕ф慨鐐烘嚊椤忓嫮鏆板☉鏂款槼閸庢寮?     */
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
     * 闁告帞濞€濞呭酣鎳涢鍕毎濞戞柨顦抽崕妤呭疾?     */
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

                // 濠碘€冲€归悘澶愬礆閻樼粯鐝熼柣銊ュ濡叉瓕銇愰幘鍐差枀闁煎啿鏈▍娆撴晬瀹€鍕缂傚喚鍠曠拹鐔割渶濡鍚?                const currentBackground = this.getCurrentBackground();
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
     * 閻犱礁澧介悿鍡氥亹閹惧啿顤呴柤鍐叉湰濞?
     */
    setCurrentBackground(backgroundId: string): void {
        const currentId = this.getCurrentBackground();
        if (currentId === backgroundId) {
            return; // 濠碘€冲€归悘澶愬及椤栨粍绁查柛姘灱濞堟垿鎳楃仦鐐彲闁挎稑濂旂粭澶屾喆閿曗偓瑜板倿寮寸€涙ɑ鐓€
        }

        localStorage.setItem(CURRENT_BACKGROUND_KEY, backgroundId);
        const nextBackground = this.getCurrentBackgroundOption();
        if (nextBackground?.url) {
            void this.preloadBackground(nextBackground.url).catch(() => undefined);
        }
        this.emitBackgroundChange();

        // 缂佹柨顑呭畵鍡樻償閺冨倹鏆忛柤鍐叉湰濞呮瑩宕氶悧鍫濐暡闁哄牆顦卞ú浼村冀閸パ冨笚缂?
        this.applyBackgroundToElements();
        
        // 闁哄洤鐡ㄩ弻濠囨偐閼哥鍋撴担鍦焿闁哄秴鍢茬槐?
        void this.updateStatusBar();
    }

    /**
     * 闁兼儳鍢茶ぐ鍥亹閹惧啿顤呴柤鍐叉湰濞呮┃D
     */
    getCurrentBackground(): string {
        return localStorage.getItem(CURRENT_BACKGROUND_KEY) || 'default';
    }

    /**
     * 閻犱礁澧介悿鍡涙嚄鐏炵偓鐝梺顐㈢箲濡叉垶鎯?
     */
    setBackgroundOpacity(opacity: number): void {
        // 缁绢収鍠曠换姘舵焻韫囨梹顫栭幖杈剧畱濠€?-0.4濞戞柨顑夊Λ?
        const clampedOpacity = Math.max(0, Math.min(0.4, opacity));
        const currentOpacity = this.getBackgroundOpacity();

        if (Math.abs(currentOpacity - clampedOpacity) < 0.001) {
            return; // 濠碘€冲€归悘澶愭焻韫囨梹顫栭幖杈剧畱瑜板宕犻弽褏鍙戦悘蹇撻獜缁辨繃绋夊鍩挎洟宕ｉ幋鐐寸函闁?
        }

        localStorage.setItem(BACKGROUND_OPACITY_KEY, clampedOpacity.toString());
        this.emitBackgroundChange();

        // 缂佹柨顑呭畵鍡樻償閺冨倹鏆忛梺顐㈢箲濡叉垶鎯旈敃鈧崺宀勫箥閳ь剟寮垫径灞剧獥闁哄秴娲ら崢鎾舵?
        this.applyBackgroundToElements();
    }

    /**
     * 闁兼儳鍢茶ぐ鍥嚄鐏炵偓鐝梺顐㈢箲濡叉垶鎯?
     */
    getBackgroundOpacity(): number {
        const stored = localStorage.getItem(BACKGROUND_OPACITY_KEY);
        return stored ? parseFloat(stored) : 0.1; // 濮掓稒顭堥濠氭焻韫囨梹顫栭幖杈剧細鐠?0%
    }

    getCurrentBackgroundOption(): BackgroundOption | null {
        const currentId = this.getCurrentBackground();
        const allBackgrounds = this.getAllBackgrounds();
        return allBackgrounds.find(bg => bg.id === currentId) || null;
    }

    getBackgroundSnapshot(): BackgroundSnapshot {
        return {
            background: this.getCurrentBackgroundOption(),
            opacity: this.getBackgroundOpacity()
        };
    }

    subscribe(listener: (snapshot: BackgroundSnapshot) => void): () => void {
        if (typeof window === 'undefined') {
            return () => undefined;
        }

        const handleBackgroundChange = (event: Event) => {
            const customEvent = event as CustomEvent<BackgroundSnapshot | undefined>;
            listener(customEvent.detail || this.getBackgroundSnapshot());
        };

        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === CURRENT_BACKGROUND_KEY || event.key === BACKGROUND_OPACITY_KEY) {
                listener(this.getBackgroundSnapshot());
            }
        };

        listener(this.getBackgroundSnapshot());
        window.addEventListener(BACKGROUND_CHANGED_EVENT, handleBackgroundChange as EventListener);
        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener(BACKGROUND_CHANGED_EVENT, handleBackgroundChange as EventListener);
            window.removeEventListener('storage', handleStorageChange);
        };
    }

    isImageBackground(url: string): boolean {
        return Boolean(url) && !url.startsWith('linear-gradient');
    }

    async preloadBackground(url: string): Promise<void> {
        if (!this.isImageBackground(url) || this.preloadedUrls.has(url)) {
            return;
        }

        const existingPromise = this.preloadPromises.get(url);
        if (existingPromise) {
            return existingPromise;
        }

        const preloadPromise = new Promise<void>((resolve, reject) => {
            const img = new Image();
            let settled = false;

            const finish = () => {
                if (settled) {
                    return;
                }
                settled = true;
                this.preloadedUrls.add(url);
                resolve();
            };

            const fail = () => {
                if (settled) {
                    return;
                }
                settled = true;
                this.preloadPromises.delete(url);
                reject(new Error(`Failed to preload background: ${url}`));
            };

            img.decoding = 'async';
            img.onload = () => {
                if (typeof img.decode === 'function') {
                    img.decode().catch(() => undefined).finally(finish);
                    return;
                }
                finish();
            };
            img.onerror = fail;
            img.src = url;

            if (img.complete) {
                finish();
            }
        }).finally(() => {
            this.preloadPromises.delete(url);
        });

        this.preloadPromises.set(url, preloadPromise);
        return preloadPromise;
    }

    private emitBackgroundChange(): void {
        if (typeof window === 'undefined') {
            return;
        }

        window.dispatchEvent(new CustomEvent<BackgroundSnapshot>(BACKGROUND_CHANGED_EVENT, {
            detail: this.getBackgroundSnapshot()
        }));
    }

    private scheduleApplyBackground(delay = 0): void {
        if (typeof window === 'undefined') {
            return;
        }

        if (this.reapplyTimeoutId !== null) {
            window.clearTimeout(this.reapplyTimeoutId);
        }

        this.reapplyTimeoutId = window.setTimeout(() => {
            this.reapplyTimeoutId = null;
            this.applyBackgroundToElements();
        }, delay);
    }

    /**
     * 闁哄洤鐡ㄩ弻濠囨偐閼哥鍋撴担鍦焿闁哄秴鍢茬槐鈩冪閵夈儱鐖遍梺鏉跨Т缂嶅宕滃鍫濆壒闁?
     */
    private async updateStatusBar(): Promise<void> {
        const background = this.getCurrentBackgroundOption();
        
        if (!background || background.id === 'default') {
            // 濮掓稒顭堥濠氭嚄鐏炵偓鐝柨娑樺婵炲洭鎮介妸锔俱偓闁肩灏欐慨鎼佸箑娴ｅ湱鍩?
            await statusBarService.updateForBackground(null);
        } else {
            // 濞达綀娉曢弫銈夋嚄鐏炵偓鐝柛銉ュ⒔婢ф湧RL闁哄洤鐡ㄩ弻濠囨偐閼哥鍋撴担鍦焿
            await statusBarService.updateForBackground(background.url);
        }
    }

    /**
     * 闁烩晛鐡ㄧ敮瀛樻償閺冨倹鏆忛柤鍐叉湰濞呮瑩宕氶幍顔界獥闁哄秴妲廜M闁稿繐鍟扮粈?
     */
    applyBackgroundToElements(): void {
        // 闂傚啫寮堕娑㈡煂瀹ュ拋妲婚幖瀛樻⒒閺?
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

                // 缂佸顭峰▍搴㈢▕鐎ｎ亜顤呴柣銊ュ閸庢寮查姘辨勾
                const existingBgLayer = element.querySelector('.bg-layer');
                if (existingBgLayer) {
                    existingBgLayer.remove();
                }

                if (!background || background.id === 'default') {
                    return;
                }

                // 缁绢収鍠曠换姘跺礂閸愵亞顦遍柡鍫濐槺濞村鈧數鎳撻悾鐐媴?
                const computedStyle = getComputedStyle(element);
                if (computedStyle.position === 'static') {
                    element.style.position = 'relative';
                }

                // 闁告帗绋戠紓鎾绘嚄鐏炵偓鐝悘?div
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
                    // 婵炴挻鍔曡ぐ澶愭嚄鐏炵偓鐝?
                    bgLayer.style.background = background.url;
                } else {
                    // 闁搞儱澧芥晶鏍嚄鐏炵偓鐝?- 闁搞儱鎼悾鐐媴瀹ュ洨鏋傞柨娑樿嫰閿濈偛顭ㄩ垾宕囨綄妤?
                    // 濞村吋锚閸樻稓浜稿┑濠勬Ц PNG闁挎稑鑻々褔寮稿鍐︿杭閻犳劑鍎遍崹顖炴⒔瀹ュ洭鐛撻柛?webp
                    const imageUrl = background.url;
                    void this.preloadBackground(imageUrl).catch(() => undefined);
                    bgLayer.style.backgroundImage = `url(${imageUrl})`;
                    bgLayer.style.backgroundSize = 'cover'; // 濠靛鍋呭褏浠﹁箛鎾额啂闁挎稑濂旂换姘跺箰娴ｅ湱妲峰〒?
                    bgLayer.style.backgroundPosition = 'center center'; // 閻忕偛鎳嶉懙鎴﹀及閸撗佷粵
                    bgLayer.style.backgroundRepeat = 'no-repeat';
                    
                    // 婵烇綀顕ф慨鐐哄炊閸撗冾暬闁告梻濮惧ù鍥煥濞嗘帩鍤栧璺哄閹?
                    const testImg = new Image();
                    testImg.onload = () => {
                        // 闁搞儱澧芥晶鏍礉閻樼儤绁伴柟瀛樺姇婵盯鏁嶇仦鑲╃憹闂傚洠鍋撻悷鏇氱娴犳稒绂掔拋宕囩Э濞?
                    };
                    testImg.onerror = () => {
                        // PNG 闁告梻濮惧ù鍥ㄥ緞鏉堫偉袝闁挎稑鑻惃鍓ф嫚?webp
                        if (imageUrl.endsWith('.png')) {
                            const webpUrl = imageUrl.replace('.png', '.webp');
                            bgLayer.style.backgroundImage = `url(${webpUrl})`;
                        }
                    };
                    testImg.src = imageUrl;
                }

                // 閻忓繐妫滈崕妤呭疾椤栨氨婀撮柟缁樺笒閸欏棝宕氶弶鍨笚缂佽京濮峰▓鎴犵箔椤戣法顏卞☉鎿冧簻閻℃瑩宕楅崘顏嗩槺濞戞柨顑呮晶?
                element.insertBefore(bgLayer, element.firstChild);

                // 缁绢収鍠曠换姘跺礂閸愵亞顦遍柣銊ュ濞插潡骞掗妷銉ф憤闁稿繐鍟扮粈宀勫嫉婢跺鍔€缁绢収鍠氬▓?z-index
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
     * 闁归潧顑呮慨鈺冩喆閿曗偓瑜板倿鎳楃仦鐐彲閹煎瓨姊婚弫銈夋晬閸垺鏆忓ù婊冩唉閻ㄧ喓鎷犻弴顏嗙
     */
    forceApplyBackground(): void {
        console.log('妫ｅ啯鐓犻柨?Force applying background...');
        this.applyBackgroundToElements();
    }

    /**
     * 闁告帗绻傞～鎰板礌閺嶎剙鍓归柡鍜佸灡濠€鍥礉?
     */
    init(): void {
        const currentBackground = this.getCurrentBackgroundOption();
        void this.migrateLegacyCustomBackgrounds();
        if (currentBackground?.url) {
            void this.preloadBackground(currentBackground.url).catch(() => undefined);
        }

        // 闁告帗绻傞～鎰板礌閺嶎偄笑闁诡兛鐒﹂悥顕€寮靛鍛潳
        statusBarService.init().then(() => {
            // 闁绘鍩栭埀顑跨劍閻栴噣宕氬┑鍡╂綏闁告牗鐗曢悾顒勫箣閹邦剚鍊甸柨娑樻湰閻楁挳骞戦鑲╃Ъ闁告挸绉烽崕妤呭疾椤栨稒绾柡鍌涘婵悂骞€娴ｅ湱鍩?            void this.updateStatusBar();
        });

        // 鐎点倖鍎肩换婊堝箥瑜戦、鎴犳兜椤旇崵绠紻OM鐎规瓕灏欑划锟犲礄閸℃妲靛┑?
        this.scheduleApplyBackground(500);

        // 闁烩晜鍨甸幆澶嬨亜閻㈠憡妗ㄩ柛娆惷€垫煡鏁嶅畝鍕闁哄倹婢樼花鏌ユ偨閵娿劌鍓归柡?
        const observer = new MutationObserver((mutations) => {
            let shouldReapply = false;
            mutations.forEach(mutation => {
                // 闊洨鏅弳?head 濞戞搩鍘惧▓鎴﹀矗濡搫顕ч柛婊冩湰閸ㄦ粍绂掗鍐ㄦ鐎规瓕椴搁崸濠囧礉閻樺灚鐣遍柤鍐叉湰濞呮瑧浠?
                if (mutation.target === document.head ||
                    (mutation.target as Element).closest?.('head') ||
                    (mutation.target as Element).classList?.contains('bg-layer') ||
                    (mutation.target as Element).querySelector?.('.bg-layer') === mutation.addedNodes[0]) {
                    return;
                }

                // 婵☆偀鍋撻柡灞诲劜濡叉悂宕ラ敂鑺ョ畳闁烩晩鍠楅悥锝夊礂閸愵亞顦遍悶姘煎亝閸у﹪宕?
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const element = node as Element;
                            // 闊洨鏅弳鎰版嚄鐏炵偓鐝悘?
                            if (element.classList?.contains('bg-layer')) {
                                return;
                            }
                            // 婵☆偀鍋撻柡灞诲劜濡叉悂宕ラ敂鑺バ﹂柣鈺婂枟閻栵綁宕楅崘顏嗩槺闁瑰瓨鐗曠€垫﹢宕ラ銈嗙獥闁哄秴娲ら崢鎾舵?
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
                this.scheduleApplyBackground(100);
            }
        });

        // 闁告瑯浜ｉ～鍥┾偓鐢靛壄ody闁汇劌瀚ぐ澶愬礌閺嶇數绀夊☉鎾崇Х椤洨鈧數鍓筫ad
        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        // 闁烩晜鍨甸幆澶屾崉椤栨粍鏆犻柛娆惷€垫煡鏁嶉崷顪玜ct Router闁瑰瓨鐗曢崣鐐閺嶎剛鐔呴柣銏ｄ含闁绱掗悤鍌滅
        window.addEventListener('popstate', () => {
            this.scheduleApplyBackground(200);
        });

        // 闁烩晜鍨甸幆濉癮sh闁告瑦锚鐎?
        window.addEventListener('hashchange', () => {
            this.scheduleApplyBackground(200);
        });

        // 閻庤纰嶅﹢鈥澄涢埀顒勫蓟閵夈儴瀚欓梺鎻掔У閺屽﹥鎯旈弮鍌涙殢闁煎啿鏈▍娆撴晬閸粎绋婂☉鎾虫惈椤︻剟鎮介妸锔界皻闁告帟顔愮槐?
        document.addEventListener('visibilitychange', () => {
            // 闁告瑯浜滃﹢顏堝嫉婢跺鐓€闁稿繐鍟扮粈宀勫礄閾忕懓绠涢柡鍐煐婢х娀鏌屽鍡樼厐閹煎瓨姊婚弫?
            if (!document.hidden) {
                this.scheduleApplyBackground(120);
            }
        });
    }
}

export const backgroundService = new BackgroundService();

// 闁革负鍔岀槐鎴﹀矗閹寸姴绠氬褍鍟╅懙鎴﹀汲閹绢喗鑻熼柛鎺撴緲閸欏繒浠﹂埀顒勬晬鐏炶偐鈹掑ù婊冩唉閻ㄧ喓鎷?
if (typeof window !== 'undefined') {
    (window as any).backgroundService = backgroundService;
}
