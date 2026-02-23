/**
 * @file syncUtils.ts
 * @description 统一的云同步工具函数 - 支持 WebDAV 和 S3
 * 
 * 提供统一的上传、下载、备份接口，消除 WebDAV 和 S3 之间的重复代码
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import { webdavService } from '../services/webdavService';
import { s3Service } from '../services/s3Service';
import { imageService } from '../services/imageService';
import { syncService } from '../services/syncService';

/**
 * 云服务类型
 */
export type CloudService = typeof webdavService | typeof s3Service;

/**
 * 云服务名称
 */
export type CloudServiceName = 'webdav' | 's3';

/**
 * 同步进度回调
 */
export type ProgressCallback = (message: string) => void;

/**
 * 同步结果
 */
export interface SyncResult {
  success: boolean;
  message: string;
  data?: any;
  imageStats?: {
    uploaded?: number;
    downloaded?: number;
    errors: string[];
  };
}

/**
 * 获取云服务名称
 */
export function getServiceName(service: CloudService): CloudServiceName {
  return service === s3Service ? 's3' : 'webdav';
}

/**
 * 获取云服务显示名称
 */
export function getServiceDisplayName(service: CloudService): string {
  return service === s3Service ? 'COS' : '云端';
}

/**
 * 上传数据到云端（完整流程：主数据 + 图片列表 JSON + 图片文件）
 * 
 * 正确的上传顺序：
 * 1. 上传主数据 JSON (backup.json)
 * 2. 下载云端旧的图片列表 JSON - 获取云端已有的图片记录
 * 3. 上传新的图片列表 JSON (lumostime_images.json) - 更新云端记录
 * 4. 同步图片文件：
 *    - 桌面端 WebDAV & S3: syncImages 扫描云端实际文件，对比后上传缺失的
 *    - 移动端 WebDAV: syncImages 使用旧的 JSON，对比后上传缺失的
 * 
 * @param service - 云服务实例 (webdavService 或 s3Service)
 * @param localData - 本地数据
 * @param onProgress - 进度回调
 * @param updateDataLastModified - 更新数据修改时间的回调
 * @returns 同步结果
 */
export async function uploadDataToCloud(
  service: CloudService,
  localData: any,
  onProgress?: ProgressCallback,
  updateDataLastModified?: () => void
): Promise<SyncResult> {
  const serviceName = getServiceName(service);
  const displayName = getServiceDisplayName(service);

  try {
    // 1. 验证本地数据
    if (!localData.logs || !localData.todos) {
      console.error('[syncUtils] Critical: Logs or Todos are undefined in upload payload!', localData);
      return {
        success: false,
        message: '错误：本地数据似乎为空 (undefined)。已中止上传。'
      };
    }

    // 2. 准备上传数据
    const uploadTimestamp = Date.now();
    const dataToSync = {
      ...localData,
      timestamp: uploadTimestamp,
      version: '1.0.0'
    };

    onProgress?.(`正在上传数据到 ${displayName}...`);

    // 3. 上传主数据（backup.json）
    console.log(`[syncUtils] 步骤 1: 上传主数据 JSON`);
    await service.uploadData(dataToSync);
    updateDataLastModified?.();

    // 4. 获取本地引用的图片列表
    const localImageList = imageService.getReferencedImagesList();
    console.log(`[syncUtils] 步骤 2: 本地引用图片列表: ${localImageList.length} 张`);
    
    if (localImageList.length === 0) {
      // 没有图片，上传空列表
      try {
        await service.uploadImageList([]);
        console.log(`[syncUtils] 空图片列表已上传`);
      } catch (listErr) {
        console.warn(`[syncUtils] 空图片列表上传失败:`, listErr);
      }
      
      return {
        success: true,
        message: `数据已成功上传至 ${displayName}！`
      };
    }

    // 5. 获取云端旧的图片列表 JSON（在上传新的之前）
    // 这个旧的 JSON 将用于判断哪些图片已经在云端
    let oldCloudImageList: string[] = [];
    try {
      const cloudImageData = await service.downloadImageList();
      if (cloudImageData && cloudImageData.images) {
        oldCloudImageList = cloudImageData.images;
        console.log(`[syncUtils] 步骤 3: 云端旧图片列表 JSON: ${oldCloudImageList.length} 张`);
      } else {
        console.log(`[syncUtils] 步骤 3: 云端无图片列表 JSON（首次上传）`);
      }
    } catch (err) {
      console.log(`[syncUtils] 步骤 3: 云端无图片列表 JSON（首次上传）`);
    }

    // 6. 上传新的图片列表 JSON - 更新云端记录
    console.log(`[syncUtils] 步骤 4: 上传新图片列表 JSON (${localImageList.length} 张)`);
    try {
      await service.uploadImageList(localImageList);
      console.log(`[syncUtils] ✓ 新图片列表 JSON 已上传`);
    } catch (listErr: any) {
      console.error(`[syncUtils] ✗ 图片列表 JSON 上传失败:`, listErr);
      return {
        success: false,
        message: `数据已上传，但图片列表上传失败: ${listErr.message}`
      };
    }

    // 7. 同步图片文件
    // 使用旧的云端 JSON 作为参照，判断哪些图片需要上传
    console.log(`[syncUtils] 步骤 5: 开始同步图片文件`);
    onProgress?.(`正在同步 ${localImageList.length} 张图片...`);

    const imageResult = await syncService.syncImages(
      onProgress,
      localImageList,      // 本地引用列表
      oldCloudImageList    // 云端旧的引用列表（上传前获取的）
    );

    console.log(`[syncUtils] 图片同步结果:`, imageResult);

    // 7. 构建返回消息
    if (imageResult.uploaded > 0 || imageResult.errors.length > 0) {
      const message = imageResult.errors.length > 0
        ? `数据已上传。图片: ${imageResult.uploaded} 张上传成功, ${imageResult.errors.length} 张失败`
        : `数据、图片列表及 ${imageResult.uploaded} 张图片已成功上传至 ${displayName}！`;
      
      return {
        success: imageResult.errors.length === 0,
        message,
        imageStats: imageResult
      };
    }

    return {
      success: true,
      message: `数据已成功上传至 ${displayName}！`
    };

  } catch (error: any) {
    console.error(`[syncUtils] ${displayName} Upload Error:`, error);
    return {
      success: false,
      message: `上传数据至 ${displayName} 失败: ${error.message || '未知错误'}`
    };
  }
}

/**
 * 从云端下载数据（完整流程：主数据 + 图片列表 JSON + 图片文件）
 * 
 * 下载顺序：
 * 1. 下载主数据 JSON (backup.json)
 * 2. 下载图片列表 JSON (lumostime_images.json)
 * 3. 同步图片文件：
 *    - 桌面端 WebDAV & S3: syncImages 扫描云端实际文件，下载缺失的
 *    - 移动端 WebDAV: syncImages 使用 JSON，下载缺失的
 * 
 * @param service - 云服务实例 (webdavService 或 s3Service)
 * @param onProgress - 进度回调
 * @returns 同步结果
 */
export async function downloadDataFromCloud(
  service: CloudService,
  onProgress?: ProgressCallback
): Promise<SyncResult> {
  const serviceName = getServiceName(service);
  const displayName = getServiceDisplayName(service);

  try {
    onProgress?.(`正在从 ${displayName} 下载数据...`);

    // 1. 下载主数据 JSON
    console.log(`[syncUtils] 步骤 1: 下载主数据 JSON`);
    const data = await service.downloadData();
    
    if (!data) {
      return {
        success: false,
        message: `从 ${displayName} 下载数据失败：数据为空`
      };
    }

    // 2. 下载图片列表 JSON
    console.log(`[syncUtils] 步骤 2: 下载图片列表 JSON`);
    let cloudImageList: string[] = [];
    try {
      const cloudImageData = await service.downloadImageList();
      if (cloudImageData && cloudImageData.images) {
        cloudImageList = cloudImageData.images;
        console.log(`[syncUtils] 云端图片列表: ${cloudImageList.length} 张`);
      } else {
        console.log(`[syncUtils] 云端无图片列表 JSON`);
      }
    } catch (err) {
      console.log(`[syncUtils] 云端无图片列表 JSON`);
    }

    // 3. 同步图片文件
    if (cloudImageList.length > 0) {
      console.log(`[syncUtils] 步骤 3: 开始同步图片文件`);
      onProgress?.(`正在同步 ${cloudImageList.length} 张图片...`);

      const localImageList = imageService.getReferencedImagesList();
      
      // 合并本地和云端图片列表
      const mergedImageList = Array.from(new Set([...localImageList, ...cloudImageList]));
      
      // 更新本地图片列表
      imageService.updateReferencedImagesList(mergedImageList);

      const imageResult = await syncService.syncImages(
        onProgress,
        mergedImageList,  // 本地引用列表（已合并）
        cloudImageList    // 云端引用列表（从 JSON 获取）
      );

      console.log(`[syncUtils] 图片同步结果:`, imageResult);

      if (imageResult.downloaded > 0 || imageResult.errors.length > 0) {
        const message = imageResult.errors.length > 0
          ? `数据已还原。图片: ${imageResult.downloaded} 张下载成功，${imageResult.errors.length} 张失败`
          : `数据及 ${imageResult.downloaded} 张图片已成功从 ${displayName} 还原！`;
        
        return {
          success: imageResult.errors.length === 0,
          message,
          data,
          imageStats: imageResult
        };
      }
    }

    return {
      success: true,
      message: `从 ${displayName} 恢复数据成功！`,
      data
    };

  } catch (error: any) {
    console.error(`[syncUtils] ${displayName} Download Error:`, error);
    return {
      success: false,
      message: `从 ${displayName} 下载数据失败: ${error.message || '未知错误'}`
    };
  }
}

/**
 * 备份本地数据到云端
 * 
 * @param service - 云服务实例 (webdavService 或 s3Service)
 * @param localData - 本地数据
 * @param onProgress - 进度回调
 * @returns 同步结果
 */
export async function backupLocalDataToCloud(
  service: CloudService,
  localData: any,
  onProgress?: ProgressCallback
): Promise<SyncResult> {
  const displayName = getServiceDisplayName(service);

  try {
    // 验证本地数据
    if (!localData.logs || !localData.todos) {
      console.error('[syncUtils] Critical: Logs or Todos are undefined in backup payload!', localData);
      return {
        success: false,
        message: '错误：本地数据似乎为空 (undefined)。已中止备份以防止用空数据覆盖云端。'
      };
    }

    // 生成备份文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `backups/local_backup_${timestamp}.json`;

    onProgress?.(`正在备份本地数据到 ${backupFilename}...`);

    // 上传备份
    await service.uploadData(localData, backupFilename);

    return {
      success: true,
      message: '本地数据备份成功'
    };

  } catch (error: any) {
    console.error(`[syncUtils] ${displayName} Backup Error:`, error);
    return {
      success: false,
      message: `云端备份失败: ${error.message || '未知错误'}`
    };
  }
}

/**
 * 完整的下载流程（包含备份）
 * 
 * @param service - 云服务实例
 * @param localData - 本地数据（用于备份）
 * @param onProgress - 进度回调
 * @param onConfirm - 确认回调（返回 false 则中止）
 * @returns 同步结果
 */
export async function downloadWithBackup(
  service: CloudService,
  localData: any,
  onProgress?: ProgressCallback,
  onConfirm?: (message: string) => Promise<boolean>
): Promise<SyncResult> {
  const displayName = getServiceDisplayName(service);

  // 1. 备份本地数据
  const backupResult = await backupLocalDataToCloud(service, localData, onProgress);
  
  if (!backupResult.success) {
    // 备份失败，询问是否继续
    const shouldContinue = await onConfirm?.(
      `云端备份失败：${backupResult.message}. 是否继续还原？(警告：当前本地数据将丢失)`
    );
    
    if (!shouldContinue) {
      return {
        success: false,
        message: '用户取消操作'
      };
    }
  } else {
    onProgress?.(backupResult.message);
  }

  // 2. 下载云端数据
  return await downloadDataFromCloud(service, onProgress);
}
