/**
 * @file imageService.ts
 * @input Image Files (Blob/File)
 * @output Persistence & URL Generation
 * @pos Service (Local Storage)
 * @description Handles saving, retrieving, and deleting images. 
 * Uses Capacitor Filesystem for Native/Electron, and IndexedDB for Web fallback.
 */
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

// DB Configuration for Web Fallback
const DB_NAME = 'LumosTimeImagesDB';
const STORE_NAME = 'images';
const DB_VERSION = 1;

// Key for deleted images sync tracking
const DELETED_IMAGES_KEY = 'lumos_deleted_images';

class ImageService {
    private dbPromise: Promise<IDBDatabase> | null = null;

    constructor() {
        this.init();
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
                await Filesystem.mkdir({
                    path: 'images',
                    directory: Directory.Data,
                    recursive: true
                });
            } catch (e) {
                // Ignore if already exists
            }
        }
    }

    /**
     * Save an image file and return the unique filename
     */
    async saveImage(file: Blob | File): Promise<string> {
        const filename = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;

        // 1. Save Original
        await this.writeImage(filename, file);

        // 2. Generate & Save Thumbnail (Best effort)
        try {
            const thumbBlob = await this.generateThumbnail(file);
            await this.writeImage(`thumb_${filename}`, thumbBlob);
        } catch (e) {
            console.warn('Thumbnail generation failed', e);
        }

        return filename;
    }

    /**
     * Get a usable URL for the image
     */
    async getImageUrl(filename: string, type: 'original' | 'thumbnail' = 'original'): Promise<string> {
        console.log(`[ImageService] getImageUrl 请求: ${filename}, type: ${type}`);
        
        let targetFilename = filename;
        if (type === 'thumbnail') {
            const thumbName = `thumb_${filename}`;
            const exists = await this.checkFileExists(thumbName);
            console.log(`[ImageService] 缩略图检查: ${thumbName} exists: ${exists}`);
            if (exists) {
                targetFilename = thumbName;
            }
        }

        console.log(`[ImageService] 目标文件名: ${targetFilename}`);

        if (Capacitor.isNativePlatform()) {
            console.log(`[ImageService] Native平台，获取文件URI: images/${targetFilename}`);
            const uri = await Filesystem.getUri({
                path: `images/${targetFilename}`,
                directory: Directory.Data,
            });
            const convertedSrc = Capacitor.convertFileSrc(uri.uri);
            console.log(`[ImageService] Native URI: ${uri.uri} -> ${convertedSrc}`);
            return convertedSrc;
        } else {
            console.log(`[ImageService] Web平台，从IndexedDB获取: ${targetFilename}`);
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
                    console.log(`[ImageService] IndexedDB查询结果: ${targetFilename} -> ${blob ? '找到' : '未找到'}`);
                    
                    if (blob) {
                        const objectUrl = URL.createObjectURL(blob);
                        console.log(`[ImageService] 创建ObjectURL成功: ${targetFilename} -> ${objectUrl}`);
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
        // Track deletion for sync (Original)
        this.trackDeletion(filename);
        // Track deletion for sync (Thumbnail)
        this.trackDeletion(`thumb_${filename}`);

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

        // 触发全局事件通知图片已删除，需要同步
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('imageDeleted', { 
                detail: { filename } 
            }));
        }
    }

    private blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = reject;
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result);
                } else {
                    reject(new Error('Failed to convert blob to base64'));
                }
            };
            reader.readAsDataURL(blob);
        });
    }

    // --- Helper Methods ---

    private async generateThumbnail(file: Blob | File): Promise<Blob> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 300; // Efficient size for mobile lists
                const scale = MAX_WIDTH / img.width;

                if (scale >= 1) {
                    resolve(file); // Don't upscale or duplicate small images
                    return;
                }

                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas context failed'));
                    return;
                }
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(blob => {
                    if (blob) resolve(blob);
                    else reject(new Error('Thumbnail generation failed'));
                }, 'image/jpeg', 0.7);
            };
            img.onerror = () => reject(new Error('Image failed to load for thumbnail'));
            img.src = URL.createObjectURL(file);
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
        if (Capacitor.isNativePlatform()) {
            const result = await Filesystem.readFile({
                path: `images/${filename}`,
                directory: Directory.Data
            });
            // result.data is string (Base64 if binary?)
            return result.data;
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
        console.log(`[ImageService] writeImage 开始: ${filename}, 数据类型: ${data instanceof ArrayBuffer ? 'ArrayBuffer' : data instanceof Blob ? 'Blob' : 'string'}`);
        
        if (Capacitor.isNativePlatform()) {
            console.log(`[ImageService] Native平台写入: ${filename}`);
            // If data is ArrayBuffer, convert to Base64?
            // Filesystem.writeFile expects string for data. 
            // If it's ArrayBuffer, we need to convert.
            let writeData = data;
            if (data instanceof ArrayBuffer) {
                console.log(`[ImageService] 转换ArrayBuffer为Base64: ${filename}`);
                writeData = Buffer.from(data).toString('base64');
            } else if (data instanceof Blob) {
                console.log(`[ImageService] 转换Blob为Base64: ${filename}`);
                writeData = await this.blobToBase64(data as Blob);
            }

            await Filesystem.writeFile({
                path: `images/${filename}`,
                data: writeData as string,
                directory: Directory.Data,
                // recursive: true // directory should exist
            });
            console.log(`[ImageService] Native写入完成: ${filename}`);
        } else {
            console.log(`[ImageService] Web平台写入到IndexedDB: ${filename}`);
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
                    console.log(`[ImageService] IndexedDB写入成功: ${filename}`);
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
