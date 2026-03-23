/**
 * @file syncService.ts
 * @input WebDAV/S3 storage services, local image service, image reference lists
 * @output Image sync operations and storage service selection
 * @pos Service
 * @description Handles one-way image sync for WebDAV and S3/COS storage.
 * @updated 2026-03-23: Track per-file upload/download success so the cloud image manifest only records real files.
 */
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { webdavService } from './webdavService';
import { s3Service } from './s3Service';
import { imageService } from './imageService';
import { SYNC_CONFIG } from '../config/syncConfig';

export interface SyncResult {
    uploaded: number;
    downloaded: number;
    deletedRemote: number;
    errors: string[];
    uploadedFiles: string[];
    downloadedFiles: string[];
    failedFiles: string[];
}

interface StorageService {
    getConfig(): any;
    uploadImage(filename: string, buffer: ArrayBuffer | string | Blob): Promise<boolean>;
    downloadImage(filename: string): Promise<ArrayBuffer>;
    deleteImage(filename: string): Promise<boolean>;
    uploadImageList(imageList: string[]): Promise<boolean>;
    downloadImageList(): Promise<{ images: string[]; timestamp: number } | null>;
    getImageListTimestamp(): Promise<number>;
    createDirectory?(path: string): Promise<boolean>;
    getDirectoryContents?(path: string): Promise<any[]>;
    deleteFile(path: string): Promise<boolean>;
    checkConnection?(): Promise<boolean | { success: boolean; message?: string }>;
}

const createEmptyResult = (): SyncResult => ({
    uploaded: 0,
    downloaded: 0,
    deletedRemote: 0,
    errors: [],
    uploadedFiles: [],
    downloadedFiles: [],
    failedFiles: []
});

export const syncService = {
    getActiveStorageService(): StorageService | null {
        const webdavConfig = webdavService.getConfig();
        const s3Config = s3Service.getConfig();

        const webdavManualDisconnect = localStorage.getItem('lumos_webdav_manual_disconnect') === 'true';
        const s3ManualDisconnect = localStorage.getItem('lumos_s3_manual_disconnect') === 'true';

        const hasWebdav = webdavConfig && !webdavManualDisconnect;
        const hasS3 = s3Config && !s3ManualDisconnect;

        if (hasS3) {
            console.log('[Sync] 使用 S3/COS 存储服务');
            return s3Service as StorageService;
        }

        if (hasWebdav) {
            console.log('[Sync] 使用 WebDAV 存储服务');
            return webdavService as StorageService;
        }

        console.log('[Sync] 没有配置任何存储服务');
        return null;
    },

    forceDeleteLocalFile: async (filename: string): Promise<void> => {
        if (Capacitor.isNativePlatform()) {
            await Filesystem.deleteFile({
                path: `images/${filename}`,
                directory: Directory.Data
            }).catch(() => {});
            return;
        }

        console.warn(`[Sync] Web 环境暂未实现强制删除本地文件: ${filename}`);
    },

    uploadImages: async (
        onProgress?: (message: string) => void,
        localReferencedImages?: string[],
        cloudReferencedImages?: string[]
    ): Promise<SyncResult> => {
        const result = createEmptyResult();
        const storageService = syncService.getActiveStorageService();

        if (!storageService) {
            console.log('[Sync] 没有配置存储服务，跳过图片上传');
            return result;
        }

        try {
            onProgress?.('正在初始化图片上传...');

            if (storageService === webdavService) {
                try {
                    await webdavService.getDirectoryContents('/images');
                } catch (error) {
                    const errorMessage = '图片上传失败：云端缺少 /images 目录，请先在 WebDAV 根目录创建该目录。';
                    result.errors.push(errorMessage);
                    throw new Error(errorMessage);
                }
            }

            const cloudSet = new Set(cloudReferencedImages || []);
            const localFiles = await imageService.listImages();
            const localFileSet = new Set(localFiles);
            const localSet = new Set(localReferencedImages || []);

            const deletedImages = imageService.getDeletedImages();
            if (deletedImages.length > 0) {
                onProgress?.(`正在同步删除 ${deletedImages.length} 张图片...`);
                for (const filename of deletedImages) {
                    try {
                        const deleted = await storageService.deleteImage(filename);
                        if (deleted) {
                            result.deletedRemote++;
                        }
                    } catch (error) {
                        console.warn(`[Sync] 远程删除失败，忽略: ${filename}`, error);
                    }
                }
                imageService.clearDeletedImages(deletedImages);
            }

            const toUpload = Array.from(localSet).filter((filename) => localFileSet.has(filename) && !cloudSet.has(filename));
            const concurrentUploads = SYNC_CONFIG.CONCURRENT_OPERATIONS;
            const batch: Promise<void>[] = [];

            for (let index = 0; index < toUpload.length; index++) {
                const filename = toUpload[index];
                const task = (async () => {
                    onProgress?.(`正在上传 (${index + 1}/${toUpload.length}): ${filename}...`);
                    try {
                        const data = await imageService.readImage(filename);
                        await storageService.uploadImage(filename, data as any);
                        result.uploaded++;
                        result.uploadedFiles.push(filename);
                    } catch (error: any) {
                        console.error(`[Sync] 上传图片失败: ${filename}`, error);
                        result.errors.push(`Upload failed: ${filename} - ${error?.message || 'unknown error'}`);
                        result.failedFiles.push(filename);
                    }
                })();

                batch.push(task);

                if (batch.length >= concurrentUploads) {
                    await Promise.all(batch);
                    batch.length = 0;
                }
            }

            if (batch.length > 0) {
                await Promise.all(batch);
            }

            if (result.failedFiles.length > 0) {
                console.warn('[Sync] 上传失败的图片:', result.failedFiles);
            }

            onProgress?.('图片上传完成');
            return result;
        } catch (error: any) {
            console.error('[Sync] 图片上传错误', error);
            result.errors.push(`Upload error: ${error?.message || 'unknown error'}`);
            return result;
        }
    },

    downloadImages: async (
        onProgress?: (message: string) => void,
        cloudReferencedImages?: string[]
    ): Promise<SyncResult> => {
        const result = createEmptyResult();
        const storageService = syncService.getActiveStorageService();

        if (!storageService) {
            console.log('[Sync] 没有配置存储服务，跳过图片下载');
            return result;
        }

        try {
            onProgress?.('正在初始化图片下载...');

            const localFiles = await imageService.listImages();
            const localFileSet = new Set(localFiles);
            const cloudSet = new Set(cloudReferencedImages || []);
            const toDownload = Array.from(cloudSet).filter((filename) => !localFileSet.has(filename));

            const concurrentDownloads = SYNC_CONFIG.CONCURRENT_OPERATIONS;
            const batch: Promise<void>[] = [];

            for (let index = 0; index < toDownload.length; index++) {
                const filename = toDownload[index];
                const task = (async () => {
                    onProgress?.(`正在下载 (${index + 1}/${toDownload.length}): ${filename}...`);
                    try {
                        const buffer = await storageService.downloadImage(filename);
                        if (buffer.byteLength > 0) {
                            await imageService.writeImage(filename, buffer);
                        }
                        result.downloaded++;
                        result.downloadedFiles.push(filename);
                    } catch (error: any) {
                        console.error(`[Sync] 下载图片失败: ${filename}`, error);
                        result.errors.push(`Download failed: ${filename} - ${error?.message || 'unknown error'}`);
                        result.failedFiles.push(filename);
                    }
                })();

                batch.push(task);

                if (batch.length >= concurrentDownloads) {
                    await Promise.all(batch);
                    batch.length = 0;
                }
            }

            if (batch.length > 0) {
                await Promise.all(batch);
            }

            if (result.failedFiles.length > 0) {
                console.warn('[Sync] 下载失败的图片:', result.failedFiles);
            }

            onProgress?.('图片下载完成');
            return result;
        } catch (error: any) {
            console.error('[Sync] 图片下载错误', error);
            result.errors.push(`Download error: ${error?.message || 'unknown error'}`);
            return result;
        }
    }
};
