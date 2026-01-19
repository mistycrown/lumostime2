import { webdavService } from './webdavService';
import { imageService } from './imageService';

export interface SyncResult {
    uploaded: number;
    downloaded: number;
    deletedRemote: number;
    errors: string[];
}

export const syncService = {
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
        console.log('========================================');
        console.log('[Sync] ⚡⚡⚡ syncImages 函数被调用 ⚡⚡⚡');
        console.log(`[Sync] 本地引用列表: ${localReferencedImages ? localReferencedImages.length : 0} 个`);
        console.log(`[Sync] 云端引用列表: ${cloudReferencedImages ? cloudReferencedImages.length : 0} 个`);
        console.log('========================================');
        
        const result: SyncResult = { uploaded: 0, downloaded: 0, deletedRemote: 0, errors: [] };

        // 首先检查WebDAV配置
        const config = webdavService.getConfig();
        console.log('[Sync] WebDAV配置检查:', config ? '✓ 已配置' : '✗ 未配置');
        if (!config) {
            console.log('[Sync] ⚠️ WebDAV未配置，跳过图片同步');
            return result;
        }

        try {
            if (onProgress) onProgress('正在初始化图片同步...');
            console.log('[Sync] ⚡ 开始同步图片...');

            // 1. 检查云端 /images 目录是否存在
            try {
                await webdavService.getDirectoryContents('/images');
                console.log('[Sync] ✓ /images 目录存在');
            } catch (error) {
                const errorMsg = '图片同步失败：云端缺少 /images 文件夹。请在WebDAV根目录下手动创建 "images" 文件夹后重试。';
                console.error('[Sync] ✗ /images 目录不存在');
                result.errors.push(errorMsg);
                throw new Error(errorMsg);
            }

            // 2. 确定最终的引用列表（合并本地和云端）
            const localSet = new Set(localReferencedImages || []);
            const cloudSet = new Set(cloudReferencedImages || []);
            const mergedSet = new Set([...localSet, ...cloudSet]);
            
            console.log('[Sync] ========== 引用列表分析 ==========');
            console.log(`[Sync] 本地引用: ${localSet.size} 个`);
            console.log(`[Sync] 云端引用: ${cloudSet.size} 个`);
            console.log(`[Sync] 合并后: ${mergedSet.size} 个`);
            
            // 3. 获取本地实际存在的文件
            const localFiles = await imageService.listImages();
            const localFileSet = new Set(localFiles);
            console.log(`[Sync] 本地实际文件: ${localFiles.length} 个`);

            // 4. 处理删除操作
            const deletedImages = imageService.getDeletedImages();
            const justDeletedFiles = new Set<string>();
            
            if (deletedImages.length > 0) {
                if (onProgress) onProgress(`正在同步删除 ${deletedImages.length} 张图片...`);
                console.log(`[Sync] 处理本地删除记录: ${deletedImages.length} 个`);

                deletedImages.forEach(filename => justDeletedFiles.add(filename));
                
                for (const filename of deletedImages) {
                    try {
                        const success = await webdavService.deleteImage(filename);
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

            console.log('[Sync] ========== 开始分析上传/下载需求 ==========');

            // 6. 分析上传需求：本地有 && 被引用 && (云端可能没有)
            const toUpload: string[] = [];
            for (const filename of mergedSet) {
                // 跳过刚删除的
                if (justDeletedFiles.has(filename)) continue;
                
                // 本地有这个文件，需要上传
                if (localFileSet.has(filename)) {
                    toUpload.push(filename);
                }
            }
            
            console.log(`[Sync] 需要上传: ${toUpload.length} 个`);
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
            
            console.log(`[Sync] 需要下载: ${toDownload.length} 个`);
            if (toDownload.length > 0) {
                console.log(`[Sync] 下载列表:`, toDownload.slice(0, 10), toDownload.length > 10 ? '...' : '');
            }

            console.log('[Sync] ========== 分析完成，开始执行 ==========');

            // 8. 执行上传
            for (const filename of toUpload) {
                if (onProgress) onProgress(`正在上传: ${filename}...`);
                console.log(`[Sync] 上传: ${filename}`);
                try {
                    const data = await imageService.readImage(filename);
                    await webdavService.uploadImage(filename, data as any);
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
                    const buffer = await webdavService.downloadImage(filename);
                    console.log(`[Sync] WebDAV下载完成: ${filename}, 大小: ${buffer.byteLength} bytes`);
                    
                    await imageService.writeImage(filename, buffer);
                    console.log(`[Sync] 本地写入完成: ${filename}`);
                    
                    result.downloaded++;
                    console.log(`[Sync] ✓ 下载完成: ${filename}`);
                } catch (err: any) {
                    console.error(`[Sync] ✗ 下载失败: ${filename}`, err);
                    result.errors.push(`Download failed: ${filename} - ${err.message}`);
                }
            }

            if (onProgress) onProgress('图片同步完成');
            console.log('[Sync] ========== 图片同步结束 ==========');
            console.log('[Sync] 结果:', result);

        } catch (error: any) {
            console.error('[Sync] 图片同步总流程错误', error);
            result.errors.push(`General error: ${error.message}`);
        }

        return result;
    }
};
