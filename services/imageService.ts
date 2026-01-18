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
        let targetFilename = filename;
        if (type === 'thumbnail') {
            const thumbName = `thumb_${filename}`;
            const exists = await this.checkFileExists(thumbName);
            if (exists) {
                targetFilename = thumbName;
            }
        }

        if (Capacitor.isNativePlatform()) {
            const uri = await Filesystem.getUri({
                path: `images/${targetFilename}`,
                directory: Directory.Data,
            });
            return Capacitor.convertFileSrc(uri.uri);
        } else {
            // Web: Retrieve Blob from IDB and create ObjectURL
            const db = await this.dbPromise;
            if (!db) throw new Error('IndexedDB not initialized');

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.get(targetFilename);
                request.onsuccess = () => {
                    const blob = request.result;
                    if (blob) {
                        resolve(URL.createObjectURL(blob));
                    } else {
                        // Fallback to original if thumbnail was requested but not found (and check failed/raciness)
                        // But we already did checkFileExists? 
                        // For Web, checkFileExists checks DB.
                        // But if we are here, it means we tried to get `targetFilename`.
                        console.warn(`Image not found: ${targetFilename}`);
                        resolve('');
                    }
                };
                request.onerror = () => reject(request.error);
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
        if (Capacitor.isNativePlatform()) {
            // If data is ArrayBuffer, convert to Base64?
            // Filesystem.writeFile expects string for data. 
            // If it's ArrayBuffer, we need to convert.
            let writeData = data;
            if (data instanceof ArrayBuffer) {
                writeData = Buffer.from(data).toString('base64');
            } else if (data instanceof Blob) {
                writeData = await this.blobToBase64(data as Blob);
            }

            await Filesystem.writeFile({
                path: `images/${filename}`,
                data: writeData as string,
                directory: Directory.Data,
                // recursive: true // directory should exist
            });
        } else {
            const db = await this.dbPromise;
            if (!db) throw new Error('IndexedDB not initialized');

            // Convert to Blob if it is ArrayBuffer
            let blob: Blob;
            if (data instanceof Blob) {
                blob = data;
            } else if (data instanceof ArrayBuffer) {
                blob = new Blob([data]);
            } else {
                // base64 string
                const response = await fetch(data as string);
                blob = await response.blob();
            }

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.put(blob, filename);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
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
}

export const imageService = new ImageService();
