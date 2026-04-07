/**
 * @file syncUtils.ts
 * @description Unified cloud sync helpers for WebDAV and S3/COS.
 * @updated 2026-03-23: Keep daily sync simple, restore JSON independently from image warnings, and move cloud image repair into an explicit maintenance flow.
 */

import { webdavService } from '../services/webdavService';
import { s3Service } from '../services/s3Service';
import { imageService } from '../services/imageService';
import { syncService } from '../services/syncService';
import { validateAndFixData, validateLocalData } from './dataValidation';

export type CloudService = typeof webdavService | typeof s3Service;
export type CloudServiceName = 'webdav' | 's3';
export type ProgressCallback = (message: string) => void;

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

function isValidSyncPayload(data: any): boolean {
  return validateLocalData(data).isValid;
}

function getServiceDisplayName(service: CloudService): string {
  return service === s3Service ? 'COS' : '云端';
}

function buildReferencedImageList(data: any): string[] {
  return imageService.buildReferencedImagesList(data?.logs || [], data?.todos || []);
}

function buildUploadMessage(
  displayName: string,
  localImageList: string[],
  imageStats?: { uploaded?: number; errors: string[] }
): string {
  if (localImageList.length === 0) {
    return `数据已成功上传至${displayName}`;
  }

  if (imageStats?.errors.length) {
    return `数据已上传至${displayName}，图片上传成功 ${imageStats.uploaded || 0} 张，失败 ${imageStats.errors.length} 张`;
  }

  if ((imageStats?.uploaded || 0) > 0) {
    return `数据和 ${imageStats?.uploaded || 0} 张图片已成功上传至${displayName}`;
  }

  return `数据已成功上传至${displayName}，图片无需更新`;
}

function buildDownloadMessage(
  displayName: string,
  requestedImageList: string[],
  imageStats?: { downloaded?: number; errors: string[] }
): string {
  if (!imageStats || requestedImageList.length === 0) {
    return `已从${displayName}恢复数据`;
  }

  if (imageStats.errors.length > 0) {
    return `已从${displayName}恢复文字数据，图片下载成功 ${imageStats.downloaded || 0} 张，失败 ${imageStats.errors.length} 张`;
  }

  if ((imageStats.downloaded || 0) > 0) {
    return `已从${displayName}恢复数据，并下载 ${imageStats.downloaded} 张图片`;
  }

  return `已从${displayName}恢复数据，图片无需下载`;
}

export function getServiceName(service: CloudService): CloudServiceName {
  return service === s3Service ? 's3' : 'webdav';
}

export async function uploadDataToCloud(
  service: CloudService,
  localData: any,
  onProgress?: ProgressCallback
): Promise<SyncResult> {
  const displayName = getServiceDisplayName(service);

  try {
    if (!isValidSyncPayload(localData)) {
      console.error('[syncUtils] Invalid upload payload:', localData);
      return {
        success: false,
        message: '本地数据不完整，已取消上传'
      };
    }

    const uploadTimestamp = Date.now();
    const dataToSync = {
      ...localData,
      timestamp: uploadTimestamp,
      version: '1.0.0'
    };

    onProgress?.(`正在上传数据到${displayName}...`);
    await service.uploadData(dataToSync);

    const localImageList = buildReferencedImageList(localData);
    imageService.updateReferencedImagesList(localImageList);

    let oldCloudImageList: string[] = [];
    try {
      const cloudImageData = await service.downloadImageList();
      if (Array.isArray(cloudImageData?.images)) {
        oldCloudImageList = cloudImageData.images;
      }
    } catch (error) {
      console.warn('[syncUtils] Failed to read cloud image manifest before upload, treat as empty.', error);
    }

    await service.uploadImageList(localImageList);

    let imageResult: Awaited<ReturnType<typeof syncService.uploadImages>> | undefined;
    if (localImageList.length > 0) {
      onProgress?.('正在上传图片...');
      imageResult = await syncService.uploadImages(onProgress, localImageList, oldCloudImageList);
    }

    return {
      success: true,
      message: buildUploadMessage(displayName, localImageList, imageResult),
      data: { timestamp: uploadTimestamp },
      imageStats: imageResult
    };
  } catch (error: any) {
    console.error(`[syncUtils] ${displayName} upload error:`, error);
    return {
      success: false,
      message: `上传到${displayName}失败: ${error?.message || '未知错误'}`
    };
  }
}

export async function downloadDataFromCloud(
  service: CloudService,
  onProgress?: ProgressCallback
): Promise<SyncResult> {
  const displayName = getServiceDisplayName(service);

  try {
    onProgress?.(`正在从${displayName}下载数据...`);
    const rawData = await service.downloadData();
    console.log('[syncUtils] Raw cloud payload summary:', {
      service: displayName,
      timestamp: rawData?.timestamp,
      logsCount: Array.isArray(rawData?.logs) ? rawData.logs.length : 'not-array',
      todosCount: Array.isArray(rawData?.todos) ? rawData.todos.length : 'not-array',
      categoriesCount: Array.isArray(rawData?.categories) ? rawData.categories.length : 'not-array'
    });

    if (!rawData) {
      return {
        success: false,
        message: `从${displayName}下载数据失败：未获取到数据`
      };
    }

    const { data, result } = validateAndFixData(rawData);
    console.log('[syncUtils] Validated restore payload summary:', {
      service: displayName,
      timestamp: data?.timestamp,
      logsCount: Array.isArray(data?.logs) ? data.logs.length : 'not-array',
      todosCount: Array.isArray(data?.todos) ? data.todos.length : 'not-array',
      categoriesCount: Array.isArray(data?.categories) ? data.categories.length : 'not-array',
      validationErrors: result.errors,
      validationWarnings: result.warnings
    });
    if (!result.isValid) {
      console.error('[syncUtils] Invalid restore payload:', result.errors, rawData);
      return {
        success: false,
        message: `从${displayName}下载的数据格式无效: ${result.errors.join('；')}`
      };
    }

    const restoredImageList = buildReferencedImageList(data);
    imageService.updateReferencedImagesList(restoredImageList);

    let cloudImageList: string[] = [];
    try {
      const cloudImageData = await service.downloadImageList();
      if (Array.isArray(cloudImageData?.images)) {
        cloudImageList = cloudImageData.images;
      }
    } catch (error) {
      console.warn('[syncUtils] Failed to read cloud image manifest during restore, fallback to restored JSON references.', error);
    }

    const restoredImageSet = new Set(restoredImageList);
    const requestedImageList = cloudImageList.length > 0
      ? cloudImageList.filter((filename) => restoredImageSet.has(filename))
      : restoredImageList;

    let imageResult: Awaited<ReturnType<typeof syncService.downloadImages>> | undefined;
    if (requestedImageList.length > 0) {
      onProgress?.('正在下载图片...');
      imageResult = await syncService.downloadImages(onProgress, requestedImageList);

      if (imageResult.failedFiles.length > 0) {
        console.warn('[syncUtils] Image download failures during restore:', imageResult.failedFiles);
      }
    }

    return {
      success: true,
      message: buildDownloadMessage(displayName, requestedImageList, imageResult),
      data,
      imageStats: imageResult
    };
  } catch (error: any) {
    console.error(`[syncUtils] ${displayName} download error:`, error);
    return {
      success: false,
      message: `从${displayName}下载数据失败: ${error?.message || '未知错误'}`
    };
  }
}

export async function backupLocalDataToCloud(
  service: CloudService,
  localData: any,
  onProgress?: ProgressCallback
): Promise<SyncResult> {
  const displayName = getServiceDisplayName(service);

  try {
    if (!isValidSyncPayload(localData)) {
      console.error('[syncUtils] Invalid backup payload:', localData);
      return {
        success: false,
        message: '本地数据不完整，已取消备份'
      };
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `backups/local_backup_${timestamp}.json`;
    onProgress?.(`正在备份本地数据到 ${backupFilename}...`);

    await service.uploadData(localData, backupFilename);

    return {
      success: true,
      message: '本地数据备份成功'
    };
  } catch (error: any) {
    console.error(`[syncUtils] ${displayName} backup error:`, error);
    return {
      success: false,
      message: `云端备份失败: ${error?.message || '未知错误'}`
    };
  }
}

export async function downloadWithBackup(
  service: CloudService,
  localData: any,
  onProgress?: ProgressCallback,
  onConfirm?: (message: string) => Promise<boolean>
): Promise<SyncResult> {
  const backupResult = await backupLocalDataToCloud(service, localData, onProgress);

  if (!backupResult.success) {
    const shouldContinue = await onConfirm?.(
      `${backupResult.message}。是否继续恢复？继续后会用云端数据覆盖当前本地数据。`
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

  return downloadDataFromCloud(service, onProgress);
}
