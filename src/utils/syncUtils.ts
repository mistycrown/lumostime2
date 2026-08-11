/**
 * @file syncUtils.ts
 * @description Unified cloud sync helpers for WebDAV, COS, and compatible S3.
 * @updated 2026-06-21: Added write-after-read verification for main backup uploads so stale cloud reads or failed overwrites cannot be reported as a successful sync.
 * @updated 2026-04-20: Cleaned user-facing messages and kept compatible S3 fully aligned with the shared upload/restore flow.
 * @updated 2026-08-10: Includes appearance and TimePal theme image assets in cloud image manifests.
 * @updated 2026-08-11: Stops restore when the local safety backup fails, explains missing WebDAV backup directories, and adds report IDs to critical sync failures.
 */

import { webdavService } from '../services/webdavService';
import { s3Service } from '../services/s3Service';
import { compatibleS3Service } from '../services/compatibleS3Service';
import { imageService } from '../services/imageService';
import { appearanceBackupService } from '../services/appearanceBackupService';
import { syncService } from '../services/syncService';
import { validateAndFixData, validateLocalData } from './dataValidation';
import { buildSyncPayloadMetadata, isSameSyncPayload } from './syncPayloadMetadata';
import { reportDiagnostic, reportException, withErrorReference } from '../services/errorReporting';

export type CloudService = typeof webdavService | typeof s3Service | typeof compatibleS3Service;
export type CloudServiceName = 'webdav' | 's3' | 'compatible-s3';
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

export const MAIN_BACKUP_FILENAME = 'lumostime_backup.json';

function isValidSyncPayload(data: any): boolean {
  return validateLocalData(data).isValid;
}

function getServiceDisplayName(service: CloudService): string {
  if (service === s3Service) {
    return 'COS';
  }

  if (service === compatibleS3Service) {
    return '兼容 S3';
  }

  return '云端';
}

function getErrorStatus(error: any): number | undefined {
  return error?.status ?? error?.response?.status;
}

function buildBackupFailureMessage(service: CloudService, error: any): string {
  const status = getErrorStatus(error);
  if (service === webdavService && (status === 404 || status === 409)) {
    return '云端备份失败：WebDAV 根目录下未找到 backups 文件夹，请先手动创建 backups 文件夹后重试。';
  }

  const detail = error?.message || error?.error || `HTTP ${status || '未知'}`;
  return `云端备份失败：${detail}`;
}

function buildReferencedImageList(data: any): string[] {
  return [...new Set([
    ...imageService.buildReferencedImagesList(
    data?.logs || [],
    data?.todos || [],
    data?.dailyReviews || [],
    data?.customStickerSets || [],
    data?.customStickers || []
    ),
    ...appearanceBackupService.getReferencedImageFilenames(data?.appearanceData)
  ])];
}

async function listCloudImageFiles(service: CloudService): Promise<string[] | null> {
  try {
    const directoryPath = service === webdavService ? '/images' : 'images';
    const contents = await service.getDirectoryContents?.(directoryPath);

    if (!Array.isArray(contents)) {
      return null;
    }

    if (service === webdavService) {
      return contents
        .filter((item: any) => item?.type === 'file')
        .map((item: any) => item.basename || String(item.filename || '').split('/').pop() || '')
        .filter(Boolean);
    }

    return contents
      .filter((item: any) => item?.Key && !String(item.Key).endsWith('/'))
      .map((item: any) => String(item.Key).split('/').pop() || '')
      .filter(Boolean);
  } catch (error) {
    console.warn('[syncUtils] Failed to list actual cloud image files, fallback to manifest.', error);
    return null;
  }
}

function buildUploadMessage(
  displayName: string,
  localImageList: string[],
  imageStats?: { uploaded?: number; errors: string[] }
): string {
  if (localImageList.length === 0) {
    return `数据已成功上传到${displayName}`;
  }

  if (imageStats?.errors.length) {
    return `数据已上传到${displayName}，图片上传成功 ${imageStats.uploaded || 0} 张，失败 ${imageStats.errors.length} 张`;
  }

  if ((imageStats?.uploaded || 0) > 0) {
    return `数据和 ${imageStats.uploaded || 0} 张图片已成功上传到${displayName}`;
  }

  return `数据已上传到${displayName}，图片无需更新`;
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
  if (service === s3Service) {
    return 's3';
  }

  if (service === compatibleS3Service) {
    return 'compatible-s3';
  }

  return 'webdav';
}

async function verifyMainBackupUpload(
  service: CloudService,
  expectedData: any,
  displayName: string
): Promise<{ success: boolean; message?: string; verifiedData?: any }> {
  let verifiedData: any;

  try {
    verifiedData = await service.downloadData(MAIN_BACKUP_FILENAME);
  } catch (error: any) {
    console.error('[syncUtils] Failed to verify uploaded main backup:', error);
    const sentryEventId = reportException(error, {
      feature: 'cloud_sync',
      operation: 'verify_main_backup',
      service: getServiceName(service)
    });
    return {
      success: false,
      message: withErrorReference(
        `Upload to ${displayName} finished, but reading the main backup back failed: ${error?.message || 'unknown error'}`,
        sentryEventId
      )
    };
  }

  if (!isSameSyncPayload(expectedData, verifiedData)) {
    const expectedMeta = buildSyncPayloadMetadata(expectedData);
    const actualMeta = buildSyncPayloadMetadata(verifiedData);
    console.error('[syncUtils] Uploaded main backup verification mismatch:', {
      expectedTimestamp: expectedMeta.timestamp,
      actualTimestamp: actualMeta.timestamp,
      expectedJsonSize: expectedMeta.jsonSize,
      actualJsonSize: actualMeta.jsonSize
    });

    const sentryEventId = reportDiagnostic('cloud_main_backup_verification_mismatch', {
      feature: 'cloud_sync',
      operation: 'verify_main_backup',
      service: getServiceName(service),
      expectedTimestamp: expectedMeta.timestamp,
      actualTimestamp: actualMeta.timestamp,
      expectedJsonSize: expectedMeta.jsonSize,
      actualJsonSize: actualMeta.jsonSize
    });

    return {
      success: false,
      message: withErrorReference(
        `Upload to ${displayName} did not verify: the main backup read back from cloud is not the data that was just written.`,
        sentryEventId
      )
    };
  }

  return {
    success: true,
    verifiedData
  };
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
      const sentryEventId = reportDiagnostic('cloud_upload_invalid_local_payload', {
        feature: 'cloud_sync',
        operation: 'validate_upload_payload',
        service: getServiceName(service)
      });
      return {
        success: false,
        message: withErrorReference('本地数据不完整，已取消上传', sentryEventId)
      };
    }

    const uploadTimestamp = Date.now();
    const dataToSync = {
      ...localData,
      timestamp: uploadTimestamp,
      version: '1.0.0'
    };

    onProgress?.(`正在上传数据到${displayName}...`);
    await service.uploadData(dataToSync, MAIN_BACKUP_FILENAME);

    onProgress?.('Verifying cloud main backup...');
    const verifyResult = await verifyMainBackupUpload(service, dataToSync, displayName);
    if (!verifyResult.success) {
      return {
        success: false,
        message: verifyResult.message || 'Cloud main backup verification failed'
      };
    }

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

    const actualCloudImageList = await listCloudImageFiles(service);
    const knownCloudImageList = actualCloudImageList ?? oldCloudImageList;

    let imageResult: Awaited<ReturnType<typeof syncService.uploadImages>> | undefined;
    if (localImageList.length > 0) {
      onProgress?.('正在上传图片...');
      imageResult = await syncService.uploadImages(service, onProgress, localImageList, knownCloudImageList);
    }

    const existingCloudSet = new Set(knownCloudImageList);
    const uploadedSet = new Set(imageResult?.uploadedFiles || []);
    const finalManifest = localImageList.filter((filename) => existingCloudSet.has(filename) || uploadedSet.has(filename));

    await service.uploadImageList(finalManifest);

    return {
      success: true,
      message: buildUploadMessage(displayName, localImageList, imageResult),
      data: { timestamp: uploadTimestamp },
      imageStats: imageResult
    };
  } catch (error: any) {
    console.error(`[syncUtils] ${displayName} upload error:`, error);
    const sentryEventId = reportException(error, {
      feature: 'cloud_sync',
      operation: 'upload_main_backup',
      service: getServiceName(service)
    });
    return {
      success: false,
      message: withErrorReference(
        `上传到${displayName}失败: ${error?.message || '未知错误'}`,
        sentryEventId
      )
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
      const sentryEventId = reportDiagnostic('cloud_download_returned_empty_data', {
        feature: 'cloud_sync',
        operation: 'download_main_backup',
        service: getServiceName(service)
      });
      return {
        success: false,
        message: withErrorReference(`从${displayName}下载数据失败：未获取到数据`, sentryEventId)
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
      const sentryEventId = reportDiagnostic('cloud_download_invalid_payload', {
        feature: 'cloud_sync',
        operation: 'validate_downloaded_backup',
        service: getServiceName(service),
        validationErrorCount: result.errors.length
      });
      return {
        success: false,
        message: withErrorReference(
          `从${displayName}下载的数据格式无效：${result.errors.join('；')}`,
          sentryEventId
        )
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
      imageResult = await syncService.downloadImages(service, onProgress, requestedImageList);

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
    const sentryEventId = reportException(error, {
      feature: 'cloud_sync',
      operation: 'download_main_backup',
      service: getServiceName(service)
    });
    return {
      success: false,
      message: withErrorReference(
        `从${displayName}下载数据失败: ${error?.message || '未知错误'}`,
        sentryEventId
      )
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
      message: `本地数据已备份到${displayName}`
    };
  } catch (error: any) {
    console.error(`[syncUtils] ${displayName} backup error:`, error);
    const sentryEventId = reportException(error, {
      feature: 'cloud_sync',
      operation: 'backup_local_data',
      service: getServiceName(service)
    });
    return {
      success: false,
      message: withErrorReference(buildBackupFailureMessage(service, error), sentryEventId)
    };
  }
}

export async function downloadWithBackup(
  service: CloudService,
  localData: any,
  onProgress?: ProgressCallback
): Promise<SyncResult> {
  const backupResult = await backupLocalDataToCloud(service, localData, onProgress);

  if (!backupResult.success) {
    return {
      success: false,
      message: `${backupResult.message}。为保护本地数据，已停止恢复。`
    };
  }

  onProgress?.(backupResult.message);
  return downloadDataFromCloud(service, onProgress);
}
