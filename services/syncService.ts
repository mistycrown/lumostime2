import { webdavService } from './webdavService';
import { imageService } from './imageService';

export interface SyncResult {
    uploaded: number;
    downloaded: number;
    deletedRemote: number;
    errors: string[];
}

export const syncService = {
    syncImages: async (onProgress?: (message: string) => void): Promise<SyncResult> => {
        const result: SyncResult = { uploaded: 0, downloaded: 0, deletedRemote: 0, errors: [] };

        try {
            if (onProgress) onProgress('正在初始化图片同步...');
            console.log('[Sync] 开始同步图片...');

            // 1. Ensure remote directory exists
            await webdavService.createDirectory('/images');

            // 2. Handle Deletions first
            const deletedImages = await imageService.getDeletedImages();
            if (deletedImages.length > 0) {
                if (onProgress) onProgress(`正在同步删除 ${deletedImages.length} 张图片...`);
                console.log(`[Sync] 处理本地删除记录: ${deletedImages.length} 个`);

                for (const filename of deletedImages) {
                    try {
                        const success = await webdavService.deleteImage(filename);
                        if (success) {
                            console.log(`[Sync] 远程删除成功: ${filename}`);
                            result.deletedRemote++;
                        }
                    } catch (e: any) {
                        console.warn(`[Sync] 远程删除失败 (可能已不存在): ${filename}`, e);
                    }
                    // Always clear from local tracking if processed
                    await imageService.clearDeletedImage(filename);
                }
            }

            // 3. Get file lists
            if (onProgress) onProgress('正在获取文件列表...');
            const localImages = await imageService.listImages();

            let remoteImages: any[] = [];
            try {
                remoteImages = await webdavService.getDirectoryContents('/images');
            } catch (e) {
                console.warn('[Sync] 获取远程列表失败, 假设为空', e);
            }

            console.log(`[Sync] 本地图片: ${localImages.length}, 远程图片: ${remoteImages.length}`);

            const remoteMap = new Map(remoteImages.map((img: any) => [img.basename, img]));
            const localSet = new Set(localImages);

            // 4. Upload: Local -> Cloud
            for (const file of localImages) {
                // If not in remote, OR (remote size is 0/different? - simple check: existence)
                if (!remoteMap.has(file)) {
                    // Upload
                    if (onProgress) onProgress(`正在上传: ${file}...`);
                    console.log(`[Sync] 发现新图片, 准备上传: ${file}`);
                    try {
                        const data = await imageService.readImage(file);
                        // Data might be Base64 string (Native) or Blob/ArrayBuffer (Web)
                        // webdavService.uploadImage handles conversion now.
                        await webdavService.uploadImage(file, data as any);
                        result.uploaded++;
                        console.log(`[Sync] 上传完成: ${file}`);
                    } catch (err: any) {
                        console.error(`[Sync] 上传失败: ${file}`, err);
                        result.errors.push(`Upload failed: ${file} - ${err.message}`);
                    }
                }
            }

            // 5. Download: Cloud -> Local
            for (const remoteImg of remoteImages) {
                const filename = remoteImg.basename;
                if (!filename || remoteImg.type === 'directory') continue; // Skip directories

                // If not in local AND not in deleted history (though we cleared history above, 
                // but strictly we should check if we just deleted it? No, if we deleted it locally, 
                // we want it gone from remote too, which we did in step 2. 
                // So if it's still in remote, it must be a NEW image from another device).

                if (!localSet.has(filename)) {
                    if (onProgress) onProgress(`正在下载: ${filename}...`);
                    console.log(`[Sync] 发现远程新图片, 准备下载: ${filename}`);
                    try {
                        const buffer = await webdavService.downloadImage(filename);
                        await imageService.writeImage(filename, buffer);
                        result.downloaded++;
                        console.log(`[Sync] 下载完成: ${filename}`);
                    } catch (err: any) {
                        console.error(`[Sync] 下载失败: ${filename}`, err);
                        result.errors.push(`Download failed: ${filename} - ${err.message}`);
                    }
                }
            }

            if (onProgress) onProgress('图片同步完成');
            console.log('[Sync] 图片同步结束', result);

        } catch (error: any) {
            console.error('[Sync] 图片同步总流程错误', error);
            result.errors.push(`General error: ${error.message}`);
        }

        return result;
    }
};
