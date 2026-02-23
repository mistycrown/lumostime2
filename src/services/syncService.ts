/**
 * @file syncService.ts
 * @input WebDAV/S3 Storage Services, Local Image Service, Image Reference Lists
 * @output Image Sync Operations (uploadImages, downloadImages), Storage Service Selection (getActiveStorageService), File Operations (forceDeleteLocalFile)
 * @pos Service
 * @description 同步服务 - 处理本地和云端图片的单向同步，支持 WebDAV 和 S3/COS 存储
 * 
 * 核心功能：
 * - 图片上传同步（uploadImages）
 * - 图片下载同步（downloadImages）
 * - 删除操作同步
 * - 引用列表管理
 * - 存储服务抽象层
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import { webdavService } from './webdavService';
import { s3Service } from './s3Service';
import { imageService } from './imageService';

export interface SyncResult {
    uploaded: number;
    downloaded: number;
    deletedRemote: number;
    errors: string[];
}

// 通用存储接口
interface StorageService {
    getConfig(): any;
    uploadImage(filename: string, buffer: ArrayBuffer | string | Blob): Promise<boolean>;
    downloadImage(filename: string): Promise<ArrayBuffer>;
    deleteImage(filename: string): Promise<boolean>;
    uploadImageList(imageList: string[]): Promise<boolean>;
    downloadImageList(): Promise<{ images: string[], timestamp: number } | null>;
    getImageListTimestamp(): Promise<number>;
    createDirectory?(path: string): Promise<boolean>;
    getDirectoryContents?(path: string): Promise<any[]>;
    deleteFile(path: string): Promise<boolean>;
    checkConnection?(): Promise<boolean | { success: boolean; message?: string }>;
}

export const syncService = {
    // 获取当前活跃的存储服务
    getActiveStorageService(): StorageService | null {
        const webdavConfig = webdavService.getConfig();
        const s3Config = s3Service.getConfig();
        
        // 检查手动断开标志
        const webdavManualDisconnect = localStorage.getItem('lumos_webdav_manual_disconnect') === 'true';
        const s3ManualDisconnect = localStorage.getItem('lumos_s3_manual_disconnect') === 'true';

        // 过滤掉已手动断开的服务
        const hasWebdav = webdavConfig && !webdavManualDisconnect;
        const hasS3 = s3Config && !s3ManualDisconnect;

        if (hasS3) {
            console.log('[Sync] 使用 S3/COS 存储服务');
            return s3Service as StorageService;
        } else if (hasWebdav) {
            console.log('[Sync] 使用 WebDAV 存储服务');
            return webdavService as StorageService;
        }

        console.log('[Sync] 没有配置任何存储服务');
        return null;
    },

    // 强制删除本地文件（不记录删除操作）
    forceDeleteLocalFile: async (filename: string): Promise<void> => {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const { Capacitor } = await import('@capacitor/core');

        if (Capacitor.isNativePlatform()) {
            await Filesystem.deleteFile({
                path: `images/${filename}`,
                directory: Directory.Data,
            }).catch(() => { }); // 忽略错误
        } else {
            // Web 环境 - 需要访问 IndexedDB
            console.warn(`[Sync] Web环境下强制删除文件暂未实现: ${filename}`);
        }
    },

    /**
     * 上传图片到云端（单向操作）
     * @param onProgress 进度回调
     * @param localReferencedImages 本地引用的图片列表
     * @param cloudReferencedImages 云端引用的图片列表（用于判断哪些需要上传）
     */
    uploadImages: async (
        onProgress?: (message: string) => void,
        localReferencedImages?: string[],
        cloudReferencedImages?: string[]
    ): Promise<SyncResult> => {
        const result: SyncResult = { uploaded: 0, downloaded: 0, deletedRemote: 0, errors: [] };

        const storageService = syncService.getActiveStorageService();
        if (!storageService) {
            console.log('[Sync] ⚠️ 没有配置存储服务，跳过图片上传');
            return result;
        }

        try {
            if (onProgress) onProgress('正在初始化图片上传...');

            // 1. 对于WebDAV，检查云端 /images 目录是否存在
            if (storageService === webdavService) {
                try {
                    await webdavService.getDirectoryContents('/images');
                    console.log('[Sync] ✓ WebDAV /images 目录存在');
                } catch (error) {
                    const errorMsg = '图片上传失败：云端缺少 /images 文件夹。请在WebDAV根目录下手动创建 "images" 文件夹后重试。';
                    console.error('[Sync] ✗ WebDAV /images 目录不存在');
                    result.errors.push(errorMsg);
                    throw new Error(errorMsg);
                }
            }

            // 2. 获取云端已有的图片列表
            const cloudSet = new Set(cloudReferencedImages || []);
            console.log(`[Sync] 云端已有图片: ${cloudSet.size} 个`);

            // 3. 获取本地实际存在的文件
            const localFiles = await imageService.listImages();
            const localFileSet = new Set(localFiles);
            console.log(`[Sync] 本地实际文件: ${localFiles.length} 个`);

            // 4. 处理删除操作（上传时同步删除）
            const deletedImages = imageService.getDeletedImages();
            if (deletedImages.length > 0) {
                if (onProgress) onProgress(`正在同步删除 ${deletedImages.length} 张图片...`);
                console.log(`[Sync] 处理本地删除记录: ${deletedImages.length} 个`);

                for (const filename of deletedImages) {
                    try {
                        const success = await storageService.deleteImage(filename);
                        if (success) {
                            console.log(`[Sync] ✓ 远程删除成功: ${filename}`);
                            result.deletedRemote++;
                        }
                    } catch (e: any) {
                        console.warn(`[Sync] 远程删除失败 (可能已不存在): ${filename}`, e);
                    }
                }

                imageService.clearDeletedImages(deletedImages);
                console.log(`[Sync] 已清除 ${deletedImages.length} 个删除记录`);
            }

            // 5. 分析上传需求：本地有 && 被引用 && 云端没有
            const localSet = new Set(localReferencedImages || []);
            const toUpload: string[] = [];
            
            for (const filename of localSet) {
                // 本地有这个文件，且云端没有，才需要上传
                if (localFileSet.has(filename) && !cloudSet.has(filename)) {
                    toUpload.push(filename);
                }
            }

            if (toUpload.length > 0) {
                console.log(`[Sync] 需要上传: ${toUpload.length} 个图片`);
            }

            // 6. 执行上传
            for (const filename of toUpload) {
                if (onProgress) onProgress(`正在上传: ${filename}...`);
                console.log(`[Sync] 上传: ${filename}`);
                try {
                    const data = await imageService.readImage(filename);
                    await storageService.uploadImage(filename, data as any);
                    result.uploaded++;
                    console.log(`[Sync] ✓ 上传完成: ${filename}`);
                } catch (err: any) {
                    console.error(`[Sync] ✗ 上传失败: ${filename}`, err);
                    result.errors.push(`Upload failed: ${filename} - ${err.message}`);
                }
            }

            if (onProgress) onProgress('图片上传完成');
            console.log('[Sync] 图片上传结果:', result);

        } catch (error: any) {
            console.error('[Sync] 图片上传错误', error);
            result.errors.push(`Upload error: ${error.message}`);
        }

        return result;
    },

    /**
     * 从云端下载图片（单向操作）
     * @param onProgress 进度回调
     * @param cloudReferencedImages 云端引用的图片列表
     */
    downloadImages: async (
        onProgress?: (message: string) => void,
        cloudReferencedImages?: string[]
    ): Promise<SyncResult> => {
        const result: SyncResult = { uploaded: 0, downloaded: 0, deletedRemote: 0, errors: [] };

        const storageService = syncService.getActiveStorageService();
        if (!storageService) {
            console.log('[Sync] ⚠️ 没有配置存储服务，跳过图片下载');
            return result;
        }

        try {
            if (onProgress) onProgress('正在初始化图片下载...');

            // 1. 获取本地实际存在的文件
            const localFiles = await imageService.listImages();
            const localFileSet = new Set(localFiles);
            console.log(`[Sync] 本地实际文件: ${localFiles.length} 个`);

            // 2. 分析下载需求：云端有 && 本地没有
            const cloudSet = new Set(cloudReferencedImages || []);
            const toDownload: string[] = [];
            
            for (const filename of cloudSet) {
                // 本地没有这个文件，需要下载
                if (!localFileSet.has(filename)) {
                    toDownload.push(filename);
                }
            }

            if (toDownload.length > 0) {
                console.log(`[Sync] 需要下载: ${toDownload.length} 个图片`);
            }

            // 3. 执行下载
            for (const filename of toDownload) {
                if (onProgress) onProgress(`正在下载: ${filename}...`);
                console.log(`[Sync] 下载: ${filename}`);
                try {
                    const buffer = await storageService.downloadImage(filename);
                    await imageService.writeImage(filename, buffer);
                    result.downloaded++;
                    console.log(`[Sync] ✓ 下载完成: ${filename}`);
                } catch (err: any) {
                    console.error(`[Sync] ✗ 下载失败: ${filename}`, err);
                    result.errors.push(`Download failed: ${filename} - ${err.message}`);
                }
            }

            if (onProgress) onProgress('图片下载完成');
            console.log('[Sync] 图片下载结果:', result);

        } catch (error: any) {
            console.error('[Sync] 图片下载错误', error);
            result.errors.push(`Download error: ${error.message}`);
        }

        return result;
    },

};
