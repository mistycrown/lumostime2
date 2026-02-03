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

        if (s3Config) {
            // console.log('[Sync] 使用 S3/COS 存储服务');
            return s3Service as StorageService;
        } else if (webdavConfig) {
            // console.log('[Sync] 使用 WebDAV 存储服务');
            return webdavService as StorageService;
        }

        // console.log('[Sync] 没有配置任何存储服务');
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
     * 完整的图片同步流程
     * @param onProgress 进度回调
     * @param localReferencedImages 本地引用的图片列表（从logs中提取）
     * @param cloudReferencedImages 云端引用的图片列表（从云端数据中获取）
     */
    syncImages: async (
        onProgress?: (message: string) => void,
        localReferencedImages?: string[],
        cloudReferencedImages?: string[]
    ): Promise<SyncResult> => {
        // console.log(`[Sync] syncImages: 本地引用 ${localReferencedImages?.length || 0}, 云端引用 ${cloudReferencedImages?.length || 0}`);

        const result: SyncResult = { uploaded: 0, downloaded: 0, deletedRemote: 0, errors: [] };

        // 获取活跃的存储服务
        const storageService = syncService.getActiveStorageService();
        if (!storageService) {
            console.log('[Sync] ⚠️ 没有配置存储服务，跳过图片同步');
            return result;
        }

        try {
            if (onProgress) onProgress('正在初始化图片同步...');

            // 1. 对于WebDAV，检查云端 /images 目录是否存在
            if (storageService === webdavService) {
                try {
                    await webdavService.getDirectoryContents('/images');
                    console.log('[Sync] ✓ WebDAV /images 目录存在');
                } catch (error) {
                    const errorMsg = '图片同步失败：云端缺少 /images 文件夹。请在WebDAV根目录下手动创建 "images" 文件夹后重试。';
                    console.error('[Sync] ✗ WebDAV /images 目录不存在');
                    result.errors.push(errorMsg);
                    throw new Error(errorMsg);
                }
            } else {
                // S3/COS 不需要预先创建目录
                // console.log('[Sync] ✓ S3/COS 存储，无需检查目录');
            }

            // 2. 确定最终的引用列表（合并本地和云端）
            const localSet = new Set(localReferencedImages || []);

            // [Unified] 尝试扫描云端实际文件列表
            // 这是为了防止 list json 说"有图片"但实际 bucket/folder 里没有的情况 (Zombie List)
            // 同时也作为 WebDAV 和 S3 的统一逻辑：优先信任实际文件系统
            let actualCloudFiles: Set<string> | null = null;

            try {
                // console.log('[Sync] 正在扫描云端实际文件列表...');
                // getDirectoryContents 返回文件列表对象数组
                const contents = await storageService.getDirectoryContents!('images');
                if (Array.isArray(contents) && contents.length > 0) {
                    actualCloudFiles = new Set(contents.map((item: any) => {
                        // 统一处理 Key/Path，确保去掉前缀
                        // S3 format: "images/filename.jpg"
                        // WebDAV format: "/images/filename.jpg" or "filename.jpg" (depends on client)
                        const rawName = item.filename || item.basename || item.Key || item; // 兼容不同库的返回结构

                        // 简单的文件名提取逻辑
                        const parts = String(rawName).split('/');
                        return parts[parts.length - 1];
                    }));
                    // console.log(`[Sync] ✓ 云端实际扫描结果: ${actualCloudFiles.size} 个文件`);
                } else if (Array.isArray(contents) && contents.length === 0) {
                    // 可能是空目录，也可能是移动端WebDAV不支持PROPFIND返回了[]
                    // 这种情况下，如果返回空数组，暂时认为是有效的（空目录），
                    // 但为了安全起见，如果是 WebDAV 且在移动端(无法区分是空还是不支持)，可能需要策略。
                    // 现有的 webdavService 在移动端返回 []。
                    // 如果我们信任 []，那么会认为云端没有文件，从而触发上传。这通常是正确的（自我修复）。
                }
            } catch (e) {
                console.warn('[Sync] 云端扫描失败或不支持，回退到使用 list json', e);
            }

            // 如果成功扫描到了实际文件，就使用实际文件作为 cloudSet (Source of Truth)
            // 否则 (WebDAV 或 扫描失败) 继续使用 cloudReferencedImages (来自 JSON)
            const cloudSet = actualCloudFiles || new Set(cloudReferencedImages || []);

            const mergedSet = new Set([...localSet, ...(cloudReferencedImages || [])]);

            // console.log('[Sync] ========== 引用列表分析 ==========');
            // console.log(`[Sync] 本地引用: ${localSet.size} 个`);
            // console.log(`[Sync] 云端引用 (JSON): ${(cloudReferencedImages || []).length} 个`);
            // if (actualCloudFiles) {
            //     console.log(`[Sync] 云端实际: ${actualCloudFiles.size} 个 (作为判定依据)`);
            // }
            // console.log(`[Sync] 合并后计划: ${mergedSet.size} 个`);

            // 3. 获取本地实际存在的文件
            const localFiles = await imageService.listImages();
            const localFileSet = new Set(localFiles);
            // console.log(`[Sync] 本地实际文件: ${localFiles.length} 个`);

            // 4. 处理删除操作
            const deletedImages = imageService.getDeletedImages();
            const justDeletedFiles = new Set<string>();

            if (deletedImages.length > 0) {
                if (onProgress) onProgress(`正在同步删除 ${deletedImages.length} 张图片...`);
                console.log(`[Sync] 处理本地删除记录: ${deletedImages.length} 个`);

                deletedImages.forEach(filename => justDeletedFiles.add(filename));

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

            // 5. 清理本地残留的已删除文件
            if (justDeletedFiles.size > 0) {
                const filesToCleanup = localFiles.filter(file => justDeletedFiles.has(file));
                if (filesToCleanup.length > 0) {
                    console.log(`[Sync] 清理本地残留: ${filesToCleanup.length} 个`);
                    for (const file of filesToCleanup) {
                        try {
                            await syncService.forceDeleteLocalFile(file);
                            localFileSet.delete(file);
                        } catch (e) {
                            console.warn(`[Sync] 清理失败: ${file}`, e);
                        }
                    }
                }
            }

            // 6. 分析上传需求：本地有 && 被引用 && (云端可能没有)
            const toUpload: string[] = [];
            for (const filename of mergedSet) {
                // 跳过刚删除的
                if (justDeletedFiles.has(filename)) continue;

                // 本地有这个文件，且云端没有，才需要上传
                if (localFileSet.has(filename) && !cloudSet.has(filename)) {
                    toUpload.push(filename);
                }
            }

            // console.log(`[Sync] 需要上传: ${toUpload.length} 个`);
            if (toUpload.length > 0) {
                console.log(`[Sync] 上传列表:`, toUpload.slice(0, 10), toUpload.length > 10 ? '...' : '');
            }

            // 7. 分析下载需求：被引用 && 本地没有
            const toDownload: string[] = [];
            for (const filename of mergedSet) {
                // 本地没有这个文件，需要下载
                if (!localFileSet.has(filename)) {
                    toDownload.push(filename);
                }
            }

            // console.log(`[Sync] 需要下载: ${toDownload.length} 个`);
            if (toDownload.length > 0) {
                console.log(`[Sync] 下载列表: ${toDownload.slice(0, 5).join(', ')}${toDownload.length > 5 ? '...' : ''}`);
            }

            // 8. 执行上传
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

            // 9. 执行下载
            for (const filename of toDownload) {
                if (onProgress) onProgress(`正在下载: ${filename}...`);
                console.log(`[Sync] 下载: ${filename}`);
                try {
                    const buffer = await storageService.downloadImage(filename);
                    // console.log(`[Sync] 存储服务下载完成: ${filename}, 大小: ${buffer.byteLength} bytes`);

                    await imageService.writeImage(filename, buffer);
                    // console.log(`[Sync] 本地写入完成: ${filename}`);

                    result.downloaded++;
                    console.log(`[Sync] ✓ 下载完成: ${filename}`);
                } catch (err: any) {
                    console.error(`[Sync] ✗ 下载失败: ${filename}`, err);
                    result.errors.push(`Download failed: ${filename} - ${err.message}`);
                }
            }

            // 10. 上传图片引用列表 (在 useSyncManager 里通常已经上传了，但这里保留作为完整流程的一部分，或者可以 conditional)
            // 用户抱怨重复上传，但这里是 syncService，它被设计为独立流程。
            // 暂时注释掉日志，逻辑保留
            if (mergedSet.size > 0) {
                try {
                    if (onProgress) onProgress('正在同步图片列表...');
                    const imageList = Array.from(mergedSet);
                    await storageService.uploadImageList(imageList);
                    // console.log(`[Sync] ✓ 图片列表上传成功: ${imageList.length} 个图片`);
                } catch (err: any) {
                    console.error(`[Sync] ✗ 图片列表上传失败:`, err);
                    result.errors.push(`Image list upload failed: ${err.message}`);
                }
            }

            if (onProgress) onProgress('图片同步完成');
            // console.log('[Sync] 图片同步结果:', result);

        } catch (error: any) {
            console.error('[Sync] 图片同步总流程错误', error);
            result.errors.push(`General error: ${error.message}`);
        }

        return result;
    }
};
