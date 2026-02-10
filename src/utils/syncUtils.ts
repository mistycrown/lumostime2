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
 * 上传数据到云端
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

    // 3. 上传主数据
    await service.uploadData(dataToSync);
    updateDataLastModified?.();

    // 4. 同步图片（仅 S3）
    if (serviceName === 's3') {
      const localImageList = imageService.getReferencedImagesList();
      
      if (localImageList.length > 0) {
        console.log(`[syncUtils] 开始同步 ${localImageList.length} 张图片到 ${displayName}...`);
        onProgress?.(`正在同步 ${localImageList.length} 张图片...`);

        const imageResult = await syncService.syncImages(
          undefined,
          localImageList,
          localImageList
        );

        if (imageResult.uploaded > 0 || imageResult.errors.length > 0) {
          const message = imageResult.errors.length > 0
            ? `数据已上传。图片: ${imageResult.uploaded} 张上传成功, ${imageResult.errors.length} 张失败`
            : `数据及 ${imageResult.uploaded} 张图片已成功上传至 ${displayName}！`;
          
          return {
            success: imageResult.errors.length === 0,
            message,
            imageStats: imageResult
          };
        }
      }
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
 * 从云端下载数据
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

    // 1. 下载主数据
    const data = await service.downloadData();
    
    if (!data) {
      return {
        success: false,
        message: `从 ${displayName} 下载数据失败：数据为空`
      };
    }

    // 2. 同步图片（仅 S3）
    if (serviceName === 's3') {
      try {
        // 获取云端图片列表
        const cloudImageData = await s3Service.downloadImageList();
        const cloudImageList = cloudImageData?.images || [];
        const localImageList = imageService.getReferencedImagesList();

        // 合并并更新本地图片列表
        const mergedImageList = Array.from(new Set([...localImageList, ...cloudImageList]));
        
        if (mergedImageList.length > 0) {
          imageService.updateReferencedImagesList(mergedImageList);

          console.log(`[syncUtils] 开始从 ${displayName} 同步 ${mergedImageList.length} 张图片...`);
          onProgress?.(`正在同步 ${mergedImageList.length} 张图片...`);

          const imageResult = await syncService.syncImages(
            undefined,
            localImageList,
            [] // 强制检查/上传
          );

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
      } catch (imageError) {
        console.warn(`[syncUtils] ${displayName} 图片同步失败:`, imageError);
        return {
          success: true,
          message: `数据已恢复，但图片同步失败`,
          data
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
