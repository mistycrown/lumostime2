/**
 * @file imageService.ts
 * @input Image Files (Blob/File)
 * @output Persistence & URL Generation
 * @pos Service (Local Storage)
 * @description Handles saving, retrieving, and deleting images. 
 * Uses Capacitor Filesystem for Native/Electron, and IndexedDB for Web fallback.
 */
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

// DB Configuration for Web Fallback
const DB_NAME = 'LumosTimeImagesDB';
const STORE_NAME = 'images';
const DB_VERSION = 1;

// Key for deleted images sync tracking
const DELETED_IMAGES_KEY = 'lumos_deleted_images';
// Key for referenced images list
const REFERENCED_IMAGES_KEY = 'lumos_referenced_images';

class ImageService {
    private dbPromise: Promise<IDBDatabase> | null = null;
    private initPromise: Promise<void> | null = null;

    constructor() {
        this.initPromise = this.init();
    }

    private async init() {
        if (!Capacitor.isNativePlatform()) {
            this.dbPromise = new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, DB_VERSION);
                request.onupgradeneeded = (event) => {
                    const db = (event.target as IDBOpenDBRequest).result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME); // Key is filename
                    }
                };
                request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
                request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error);
            });
        } else {
            // Ensure directory exists on native
            try {
                // console.log('[ImageService] 创建images目录...');
                await Filesystem.mkdir({
                    path: 'images',
                    directory: Directory.Data,
                    recursive: true
                });
                // console.log('[ImageService] ✓ images目录已创建或已存在');
            } catch (e: any) {
                console.log('[ImageService] images目录创建结果:', e.message);
                // Ignore if already exists
            }
        }
    }

    /**
     * 确保初始化完成
     */
    private async ensureInit(): Promise<void> {
        if (this.initPromise) {
            await this.initPromise;
        }
    }

    /**
     * Save an image file and return the unique filename
     */
    async saveImage(file: Blob | File): Promise<string> {
        // console.log(`[ImageService] ========== saveImage 开始 ==========`);
        // console.log(`[ImageService] 文件类型: ${file.type}, 大小: ${file.size} bytes`);

        // 确保初始化完成
        await this.ensureInit();

        const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}.jpg`;
        // console.log(`[ImageService] 生成文件名: ${filename}`);

        // 1. Save Original
        try {
            // console.log(`[ImageService] 开始保存原图: ${filename}`);
            await this.writeImage(filename, file);
            // console.log(`[ImageService] ✓ 原图保存成功: ${filename}`);

            // 验证文件是否真的存在
            const exists = await this.checkFileExists(filename);
            // console.log(`[ImageService] 原图存在性验证: ${filename} -> ${exists}`);
            if (!exists) {
                throw new Error(`原图保存后验证失败: ${filename}`);
            }
        } catch (e: any) {
            console.error(`[ImageService] ✗ 原图保存失败: ${filename}`, e);
            throw new Error(`Failed to save original image: ${e.message}`);
        }

        // 2. Generate & Save Thumbnail (Best effort)
        try {
            // console.log(`[ImageService] 开始生成缩略图: thumb_${filename}`);
            const thumbBlob = await this.generateThumbnail(file);
            // console.log(`[ImageService] 缩略图生成成功，大小: ${thumbBlob.size} bytes`);

            await this.writeImage(`thumb_${filename}`, thumbBlob);
            // console.log(`[ImageService] ✓ 缩略图保存成功: thumb_${filename}`);

            // 验证缩略图是否存在
            const thumbExists = await this.checkFileExists(`thumb_${filename}`);
            // console.log(`[ImageService] 缩略图存在性验证: thumb_${filename} -> ${thumbExists}`);
        } catch (e) {
            console.error(`[ImageService] ✗ 缩略图生成/保存失败: thumb_${filename}`, e);
            // 缩略图失败不影响主流程
        }

        // 3. 添加到引用列表
        // console.log(`[ImageService] 添加到引用列表: ${filename}`);
        this.addToReferencedList(filename);

        // 4. 触发全局事件通知图片已上传，需要同步
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('imageUploaded', {
                detail: { filename }
            }));
            // console.log(`[ImageService] ✓ 触发imageUploaded事件: ${filename}`);
        }

        console.log(`[ImageService] saveImage 完成: ${filename}`);
        return filename;
    }

    /**
     * Get a usable URL for the image
     */
    async getImageUrl(filename: string, type: 'original' | 'thumbnail' = 'original'): Promise<string> {
        // 确保初始化完成
        await this.ensureInit();

        // console.log(`[ImageService] getImageUrl 请求: ${filename}, type: ${type}`);

        let targetFilename = filename;
        if (type === 'thumbnail') {
            const thumbName = `thumb_${filename}`;
            const exists = await this.checkFileExists(thumbName);
            // console.log(`[ImageService] 缩略图检查: ${thumbName} exists: ${exists}`);
            if (exists) {
                targetFilename = thumbName;
            }
        }

        // console.log(`[ImageService] 目标文件名: ${targetFilename}`);

        if (Capacitor.isNativePlatform()) {
            // console.log(`[ImageService] Native平台，获取文件URI: images/${targetFilename}`);
            try {
                // 首先检查文件是否存在
                const fileExists = await this.checkFileExists(targetFilename);
                if (!fileExists) {
                    // console.warn(`[ImageService] 文件不存在: ${targetFilename}`);
                    return '';
                }

                // 读取文件内容（Base64格式）
                const fileResult = await Filesystem.readFile({
                    path: `images/${targetFilename}`,
                    directory: Directory.Data
                    // 不指定encoding，Capacitor会返回Base64字符串
                });

                // 当不指定encoding时，Capacitor返回Base64字符串
                const base64String = typeof fileResult.data === 'string' ? fileResult.data : '';
                // console.log(`[ImageService] 读取文件成功: ${targetFilename}, 数据长度: ${base64String.length}`);

                // 确保数据是Base64格式，如果不是则添加data URL前缀
                let base64Data = base64String;
                if (!base64Data.startsWith('data:')) {
                    // 根据文件扩展名推断MIME类型
                    const mimeType = this.getMimeTypeFromFilename(targetFilename);
                    base64Data = `data:${mimeType};base64,${base64Data}`;
                    // console.log(`[ImageService] 添加data URL前缀: ${mimeType}`);
                }

                // console.log(`[ImageService] Native返回Base64 Data URL: ${targetFilename}`);
                return base64Data;
            } catch (error) {
                console.error(`[ImageService] Native读取文件失败: ${targetFilename}`, error);
                return '';
            }
        } else {
            // console.log(`[ImageService] Web平台，从IndexedDB获取: ${targetFilename}`);
            // Web: Retrieve Blob from IDB and create ObjectURL
            const db = await this.dbPromise;
            if (!db) {
                console.error(`[ImageService] IndexedDB未初始化`);
                throw new Error('IndexedDB not initialized');
            }

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.get(targetFilename);

                request.onsuccess = () => {
                    const blob = request.result;
                    // console.log(`[ImageService] IndexedDB查询结果: ${targetFilename} -> ${blob ? '找到' : '未找到'}`);

                    if (blob) {
                        const objectUrl = URL.createObjectURL(blob);
                        // console.log(`[ImageService] 创建ObjectURL成功: ${targetFilename} -> ${objectUrl}`);
                        resolve(objectUrl);
                    } else {
                        console.warn(`[ImageService] 图片未找到: ${targetFilename}`);
                        resolve('');
                    }
                };

                request.onerror = () => {
                    console.error(`[ImageService] IndexedDB查询错误: ${targetFilename}`, request.error);
                    reject(request.error);
                };
            });
        }
    }

    /**
     * Delete an image
     */
    async deleteImage(filename: string): Promise<void> {
        // 确保初始化完成
        await this.ensureInit();

        // 1. Track deletion for sync (Original)
        this.trackDeletion(filename);
        // Track deletion for sync (Thumbnail)
        this.trackDeletion(`thumb_${filename}`);

        // 2. 从引用列表中移除
        this.removeFromReferencedList(filename);

        // 3. 删除本地文件
        if (Capacitor.isNativePlatform()) {
            // Delete Original
            await Filesystem.deleteFile({
                path: `images/${filename}`,
                directory: Directory.Data,
            }).catch(() => { }); // Ignore not found

            // Delete Thumbnail
            await Filesystem.deleteFile({
                path: `images/thumb_${filename}`,
                directory: Directory.Data,
            }).catch(() => { });
        } else {
            const db = await this.dbPromise;
            if (!db) return;

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                store.delete(filename);
                store.delete(`thumb_${filename}`);

                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });
        }

        // 4. 触发全局事件通知图片已删除，需要同步
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('imageDeleted', {
                detail: { filename }
            }));
        }
    }

    private blobToBase64(blob: Blob): Promise<string> {
        // console.log(`[ImageService] blobToBase64 开始，Blob大小: ${blob.size} bytes`);
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = (error) => {
                console.error(`[ImageService] FileReader错误:`, error);
                reject(error);
            };
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    // console.log(`[ImageService] blobToBase64 成功，结果长度: ${reader.result.length}`);
                    resolve(reader.result);
                } else {
                    console.error(`[ImageService] FileReader结果不是字符串:`, typeof reader.result);
                    reject(new Error('Failed to convert blob to base64'));
                }
            };
            try {
                reader.readAsDataURL(blob);
            } catch (e) {
                console.error(`[ImageService] readAsDataURL异常:`, e);
                reject(e);
            }
        });
    }

    // --- Helper Methods ---

    private async generateThumbnail(file: Blob | File): Promise<Blob> {
        // console.log(`[ImageService] generateThumbnail 开始，文件大小: ${file.size} bytes`);
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                // console.log(`[ImageService] 图片加载成功，尺寸: ${img.width}x${img.height}`);
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 300; // Efficient size for mobile lists
                const scale = MAX_WIDTH / img.width;

                if (scale >= 1) {
                    // console.log(`[ImageService] 图片已经很小，不需要缩放`);
                    resolve(file); // Don't upscale or duplicate small images
                    return;
                }

                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scale;
                // console.log(`[ImageService] 缩略图尺寸: ${canvas.width}x${canvas.height}`);

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    console.error(`[ImageService] Canvas context获取失败`);
                    reject(new Error('Canvas context failed'));
                    return;
                }

                try {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    canvas.toBlob(blob => {
                        if (blob) {
                            // console.log(`[ImageService] 缩略图生成成功，大小: ${blob.size} bytes`);
                            resolve(blob);
                        } else {
                            console.error(`[ImageService] toBlob返回null`);
                            reject(new Error('Thumbnail generation failed'));
                        }
                    }, 'image/jpeg', 0.7);
                } catch (e) {
                    console.error(`[ImageService] Canvas操作异常:`, e);
                    reject(e);
                }
            };
            img.onerror = (error) => {
                console.error(`[ImageService] 图片加载失败:`, error);
                reject(new Error('Image failed to load for thumbnail'));
            };
            try {
                img.src = URL.createObjectURL(file);
                // console.log(`[ImageService] 创建ObjectURL成功: ${img.src.substring(0, 50)}...`);
            } catch (e) {
                console.error(`[ImageService] createObjectURL异常:`, e);
                reject(e);
            }
        });
    }

    private async checkFileExists(filename: string): Promise<boolean> {
        if (Capacitor.isNativePlatform()) {
            try {
                await Filesystem.stat({
                    path: `images/${filename}`,
                    directory: Directory.Data
                });
                return true;
            } catch {
                return false;
            }
        } else {
            const db = await this.dbPromise;
            if (!db) return false;
            return new Promise((resolve) => {
                const transaction = db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.count(filename);
                request.onsuccess = () => resolve(request.result > 0);
                request.onerror = () => resolve(false);
            });
        }
    }

    // --- Sync Methods ---

    /**
     * List all local image filenames
     */
    async listImages(): Promise<string[]> {
        // 确保初始化完成
        await this.ensureInit();

        if (Capacitor.isNativePlatform()) {
            try {
                const result = await Filesystem.readdir({
                    path: 'images',
                    directory: Directory.Data
                });
                return result.files.map(f => f.name);
            } catch (e) {
                return [];
            }
        } else {
            const db = await this.dbPromise;
            if (!db) return [];
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.getAllKeys();
                request.onsuccess = () => resolve(request.result as string[]);
                request.onerror = () => reject(request.error);
            });
        }
    }

    /**
     * Read image data for sync (Returns ArrayBuffer or Base64 string)
     */
    async readImage(filename: string): Promise<ArrayBuffer | string | Blob> {
        // 确保初始化完成
        await this.ensureInit();

        if (Capacitor.isNativePlatform()) {
            // console.log(`[ImageService] Native读取图片用于同步: ${filename}`);
            const result = await Filesystem.readFile({
                path: `images/${filename}`,
                directory: Directory.Data
                // 不指定encoding，Capacitor会返回Base64字符串
            });
            const base64String = typeof result.data === 'string' ? result.data : '';
            // console.log(`[ImageService] Native读取完成: ${filename}, 数据长度: ${base64String.length}`);
            // result.data is Base64 string
            return base64String;
        } else {
            const db = await this.dbPromise;
            if (!db) throw new Error('IndexedDB not initialized');
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.get(filename);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }
    }

    /**
     * Save synced image content
     */
    async writeImage(filename: string, data: ArrayBuffer | string | Blob): Promise<void> {
        // 确保初始化完成
        await this.ensureInit();

        // console.log(`[ImageService] writeImage 开始: ${filename}, 数据类型: ${data instanceof ArrayBuffer ? 'ArrayBuffer' : data instanceof Blob ? 'Blob' : 'string'}`);

        if (Capacitor.isNativePlatform()) {
            // console.log(`[ImageService] Native平台写入: ${filename}`);

            try {
                // Filesystem.writeFile expects string for data. 
                // For Base64 data, we should NOT specify encoding
                let writeData = data;
                if (data instanceof ArrayBuffer) {
                    // console.log(`[ImageService] 转换ArrayBuffer为Base64: ${filename}, size: ${data.byteLength}`);
                    // 转换为纯Base64字符串（不包含data:前缀）
                    writeData = Buffer.from(data).toString('base64');
                    // console.log(`[ImageService] Base64长度: ${(writeData as string).length}`);
                } else if (data instanceof Blob) {
                    // console.log(`[ImageService] 转换Blob为Base64: ${filename}`);
                    const dataUrl = await this.blobToBase64(data as Blob);
                    // 移除data:image/jpeg;base64,前缀，只保留纯Base64
                    writeData = dataUrl.split(',')[1] || dataUrl;
                    // console.log(`[ImageService] Blob转Base64完成，长度: ${(writeData as string).length}`);
                }

                // 对于Base64数据，不指定encoding，让Capacitor自动处理
                console.log(`[ImageService] 准备写入文件: images/${filename}`);
                await Filesystem.writeFile({
                    path: `images/${filename}`,
                    data: writeData as string,
                    directory: Directory.Data
                    // 不指定encoding，Capacitor会将其视为Base64数据
                });
                console.log(`[ImageService] ✓ Native写入成功: ${filename}`);

                // 验证文件是否真的写入成功
                try {
                    const stat = await Filesystem.stat({
                        path: `images/${filename}`,
                        directory: Directory.Data
                    });
                    console.log(`[ImageService] ✓ 文件验证成功: ${filename}, size: ${stat.size} bytes`);
                } catch (verifyError) {
                    console.error(`[ImageService] ✗ 文件验证失败: ${filename}`, verifyError);
                }
            } catch (error: any) {
                console.error(`[ImageService] ✗ Native写入失败: ${filename}`, error);
                console.error(`[ImageService] 错误详情:`, {
                    message: error.message,
                    code: error.code,
                    stack: error.stack
                });
                throw error;
            }
        } else {
            // console.log(`[ImageService] Web平台写入到IndexedDB: ${filename}`);
            const db = await this.dbPromise;
            if (!db) {
                console.error(`[ImageService] IndexedDB未初始化`);
                throw new Error('IndexedDB not initialized');
            }

            // Convert to Blob if it is ArrayBuffer
            let blob: Blob;
            if (data instanceof Blob) {
                console.log(`[ImageService] 数据已是Blob: ${filename}`);
                blob = data;
            } else if (data instanceof ArrayBuffer) {
                console.log(`[ImageService] 转换ArrayBuffer为Blob: ${filename}, size: ${data.byteLength}`);
                // 根据文件扩展名推断MIME类型
                const mimeType = this.getMimeTypeFromFilename(filename);
                console.log(`[ImageService] 推断MIME类型: ${filename} -> ${mimeType}`);
                blob = new Blob([data], { type: mimeType });
            } else {
                console.log(`[ImageService] 从Base64字符串创建Blob: ${filename}`);
                // base64 string
                const response = await fetch(data as string);
                blob = await response.blob();
            }

            console.log(`[ImageService] 准备存储Blob到IndexedDB: ${filename}, size: ${blob.size}, type: ${blob.type}`);

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.put(blob, filename);

                request.onsuccess = () => {
                    // console.log(`[ImageService] IndexedDB写入成功: ${filename}`);
                    resolve();
                };

                request.onerror = () => {
                    console.error(`[ImageService] IndexedDB写入失败: ${filename}`, request.error);
                    reject(request.error);
                };
            });
        }
    }

    /**
     * 根据文件名推断MIME类型
     */
    private getMimeTypeFromFilename(filename: string): string {
        const ext = filename.toLowerCase().split('.').pop();
        switch (ext) {
            case 'jpg':
            case 'jpeg':
                return 'image/jpeg';
            case 'png':
                return 'image/png';
            case 'gif':
                return 'image/gif';
            case 'webp':
                return 'image/webp';
            case 'bmp':
                return 'image/bmp';
            case 'svg':
                return 'image/svg+xml';
            default:
                console.warn(`[ImageService] 未知图片格式: ${ext}, 使用默认MIME类型`);
                return 'image/jpeg'; // 默认为JPEG
        }
    }

    // --- Tombstone Methods for Sync ---

    private trackDeletion(filename: string) {
        try {
            const raw = localStorage.getItem(DELETED_IMAGES_KEY);
            let list: string[] = raw ? JSON.parse(raw) : [];
            if (!list.includes(filename)) {
                list.push(filename);
                localStorage.setItem(DELETED_IMAGES_KEY, JSON.stringify(list));
            }
        } catch (e) {
            console.error('Failed to track image deletion', e);
        }
    }

    getDeletedImages(): string[] {
        try {
            const raw = localStorage.getItem(DELETED_IMAGES_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    clearDeletedImages(filenames: string[]) {
        try {
            const current = this.getDeletedImages();
            const remainder = current.filter(f => !filenames.includes(f));
            localStorage.setItem(DELETED_IMAGES_KEY, JSON.stringify(remainder));
        } catch (e) {
            console.error('Failed to clear deleted images', e);
        }
    }

    clearDeletedImage(filename: string) {
        this.clearDeletedImages([filename]);
    }

    // --- Referenced Images List Management ---

    /**
     * 获取当前的引用图片列表
     */
    getReferencedImagesList(): string[] {
        try {
            const raw = localStorage.getItem(REFERENCED_IMAGES_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('[ImageService] 获取引用列表失败', e);
            return [];
        }
    }

    /**
     * 更新引用图片列表（完全替换）
     */
    updateReferencedImagesList(images: string[]): void {
        try {
            localStorage.setItem(REFERENCED_IMAGES_KEY, JSON.stringify(images));
            // console.log(`[ImageService] 更新引用列表: ${images.length} 个图片`);
        } catch (e) {
            console.error('[ImageService] 更新引用列表失败', e);
        }
    }

    /**
     * 添加图片到引用列表
     */
    addToReferencedList(filename: string): void {
        try {
            const list = this.getReferencedImagesList();
            let updated = false;

            if (!list.includes(filename)) {
                list.push(filename);
                updated = true;
            }

            // 同时添加缩略图
            const thumbName = `thumb_${filename}`;
            if (!list.includes(thumbName)) {
                list.push(thumbName);
                updated = true;
            }

            if (updated) {
                this.updateReferencedImagesList(list);
                // console.log(`[ImageService] 添加到引用列表: ${filename}, 当前总数: ${list.length}`);

                // 触发图片列表变化事件
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('imageListChanged', {
                        detail: { images: list }
                    }));
                }
            }
        } catch (e) {
            console.error('[ImageService] 添加到引用列表失败', e);
        }
    }

    /**
     * 从引用列表中移除图片
     */
    removeFromReferencedList(filename: string): void {
        try {
            let list = this.getReferencedImagesList();
            const originalLength = list.length;
            list = list.filter(f => f !== filename && f !== `thumb_${filename}`);

            if (list.length !== originalLength) {
                this.updateReferencedImagesList(list);
                // console.log(`[ImageService] 从引用列表移除: ${filename}, 剩余: ${list.length}`);

                // 触发图片列表变化事件
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('imageListChanged', {
                        detail: { images: list }
                    }));
                }
            }
        } catch (e) {
            console.error('[ImageService] 从引用列表移除失败', e);
        }
    }

    /**
     * 根据logs重建引用列表（用于修复/同步）
     */
    rebuildReferencedListFromLogs(logs: any[]): string[] {
        const referencedSet = new Set<string>();
        logs.forEach(log => {
            if (log.images && Array.isArray(log.images)) {
                log.images.forEach((img: string) => {
                    if (img && typeof img === 'string') {
                        referencedSet.add(img);
                        referencedSet.add(`thumb_${img}`);
                    }
                });
            }
        });
        const list = Array.from(referencedSet);
        this.updateReferencedImagesList(list);
        // console.log(`[ImageService] 重建引用列表: ${list.length} 个图片`);

        // 触发图片列表变化事件
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('imageListChanged', {
                detail: { images: list }
            }));
        }

        return list;
    }

    /**
     * 清理未引用的图片（从列表和文件系统中删除）
     */
    async cleanupUnreferencedImages(logs: any[]): Promise<{ cleaned: number, kept: number }> {
        console.log('[ImageService] ========== 开始清理未引用的图片 ==========');

        // 1. 从logs重建正确的引用列表
        const referencedImages = new Set<string>();
        logs.forEach(log => {
            if (log.images && Array.isArray(log.images)) {
                log.images.forEach((img: string) => {
                    if (img && typeof img === 'string') {
                        referencedImages.add(img);
                        referencedImages.add(`thumb_${img}`);
                    }
                });
            }
        });

        // console.log(`[ImageService] Logs中引用的图片: ${referencedImages.size} 个`);

        // 2. 获取当前列表中的所有图片
        const currentList = this.getReferencedImagesList();
        // console.log(`[ImageService] 当前列表中的图片: ${currentList.length} 个`);

        // 3. 找出未被引用的图片
        const unreferencedImages = currentList.filter(img => !referencedImages.has(img));
        // console.log(`[ImageService] 未引用的图片: ${unreferencedImages.length} 个`, unreferencedImages);

        // 4. 从列表中移除未引用的图片
        if (unreferencedImages.length > 0) {
            this.updateReferencedImagesList(Array.from(referencedImages));
            // console.log(`[ImageService] ✓ 已从列表中移除 ${unreferencedImages.length} 个未引用的图片`);
        }

        // 5. 获取本地实际存在的文件
        const localFiles = await this.listImages();
        // console.log(`[ImageService] 本地文件: ${localFiles.length} 个`);

        // 6. 找出本地存在但未被引用的文件
        const filesToDelete = localFiles.filter(file => !referencedImages.has(file));
        // console.log(`[ImageService] 需要删除的文件: ${filesToDelete.length} 个`, filesToDelete);

        // 7. 删除这些文件
        let deletedCount = 0;
        for (const filename of filesToDelete) {
            try {
                if (Capacitor.isNativePlatform()) {
                    await Filesystem.deleteFile({
                        path: `images/${filename}`,
                        directory: Directory.Data,
                    });
                } else {
                    const db = await this.dbPromise;
                    if (db) {
                        await new Promise<void>((resolve, reject) => {
                            const transaction = db.transaction([STORE_NAME], 'readwrite');
                            const store = transaction.objectStore(STORE_NAME);
                            store.delete(filename);
                            transaction.oncomplete = () => resolve();
                            transaction.onerror = () => reject(transaction.error);
                        });
                    }
                }
                deletedCount++;
                // console.log(`[ImageService] ✓ 已删除: ${filename}`);
            } catch (error) {
                console.warn(`[ImageService] 删除失败: ${filename}`, error);
            }
        }

        console.log('[ImageService] ========== 清理完成 ==========');
        console.log(`[ImageService] 保留: ${referencedImages.size} 个, 清理: ${deletedCount} 个`);

        // 触发图片列表变化事件（如果有清理操作）
        if (unreferencedImages.length > 0 && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('imageListChanged', {
                detail: { images: Array.from(referencedImages) }
            }));
        }

        return {
            cleaned: deletedCount,
            kept: referencedImages.size
        };
    }

    /**
     * 调试方法：测试图片读写功能（仅移动端）
     */
    async debugTestImageReadWrite(filename: string): Promise<void> {
        if (!Capacitor.isNativePlatform()) {
            console.log('[ImageService] 此方法仅适用于移动端');
            return;
        }

        try {
            console.log(`[ImageService] ========== 开始测试图片读写: ${filename} ==========`);

            // 1. 检查文件是否存在
            const exists = await this.checkFileExists(filename);
            console.log(`[ImageService] 1. 文件存在检查: ${filename} -> ${exists}`);

            if (!exists) {
                console.log(`[ImageService] 文件不存在，跳过测试: ${filename}`);
                return;
            }

            // 2. 读取文件内容
            const fileResult = await Filesystem.readFile({
                path: `images/${filename}`,
                directory: Directory.Data
                // 不指定encoding，Capacitor会返回Base64字符串
            });

            const base64String = typeof fileResult.data === 'string' ? fileResult.data : '';
            console.log(`[ImageService] 2. 读取文件内容: ${filename}`);
            console.log(`[ImageService]    - 数据类型: ${typeof fileResult.data}`);
            console.log(`[ImageService]    - 数据长度: ${base64String.length}`);
            console.log(`[ImageService]    - 数据开头: ${base64String.substring(0, 50)}...`);
            console.log(`[ImageService]    - 是否包含data前缀: ${base64String.startsWith('data:')}`);

            // 3. 尝试创建图片URL
            const imageUrl = await this.getImageUrl(filename);
            console.log(`[ImageService] 3. 生成图片URL: ${filename} -> ${imageUrl ? '成功' : '失败'}`);
            if (imageUrl) {
                console.log(`[ImageService]    - URL长度: ${imageUrl.length}`);
                console.log(`[ImageService]    - URL开头: ${imageUrl.substring(0, 100)}...`);
                console.log(`[ImageService]    - 是否是Data URL: ${imageUrl.startsWith('data:')}`);
            }

            console.log(`[ImageService] ========== 测试完成: ${filename} ==========`);

        } catch (error) {
            console.error(`[ImageService] ========== 测试失败: ${filename} ==========`);
            console.error(`[ImageService] 错误:`, error);
        }
    }

    /**
     * 调试方法：完整测试图片同步流程
     */
    async debugTestImageSync(): Promise<void> {
        console.log('[ImageService] ========== 开始完整图片同步测试 ==========');

        try {
            // 1. 检查初始化状态
            await this.ensureInit();
            console.log('[ImageService] ✓ 初始化完成');

            // 2. 列出所有本地图片
            const localImages = await this.listImages();
            console.log(`[ImageService] 本地图片数量: ${localImages.length}`);
            console.log(`[ImageService] 本地图片列表:`, localImages);

            // 3. 测试前3张图片的读写
            const testImages = localImages.slice(0, 3);
            for (const img of testImages) {
                await this.debugTestImageReadWrite(img);
            }

            console.log('[ImageService] ========== 完整图片同步测试完成 ==========');
        } catch (error) {
            console.error('[ImageService] ========== 完整图片同步测试失败 ==========');
            console.error('[ImageService] 错误:', error);
        }
    }

    /**
     * 调试方法：列出IndexedDB中的所有图片（仅Web环境）
     */
    async debugListIndexedDBImages(): Promise<string[]> {
        if (Capacitor.isNativePlatform()) {
            console.log('[ImageService] Native平台，使用 listImages() 代替');
            return this.listImages();
        }

        const db = await this.dbPromise;
        if (!db) {
            console.error('[ImageService] IndexedDB未初始化');
            return [];
        }

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAllKeys();

            request.onsuccess = () => {
                const keys = request.result as string[];
                console.log(`[ImageService] IndexedDB中的图片:`, keys);
                resolve(keys);
            };

            request.onerror = () => {
                console.error('[ImageService] 获取IndexedDB键列表失败:', request.error);
                reject(request.error);
            };
        });
    }
}

export const imageService = new ImageService();
