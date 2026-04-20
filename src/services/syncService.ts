/**
 * @file syncService.ts
 * @input WebDAV/COS/compatible-S3 storage services, local image service, image reference lists
 * @output Image sync operations and storage service selection
 * @pos Service
 * @description Handles one-way image sync for WebDAV, Tencent COS, and compatible S3 storage.
 * @updated 2026-04-19: Added compatible S3 support and allow callers to explicitly choose the target storage service so multiple configured providers do not cross-write images.
 */
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { webdavService } from './webdavService';
import { s3Service } from './s3Service';
import { compatibleS3Service } from './compatibleS3Service';
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

export interface StorageService {
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
    const compatibleS3Config = compatibleS3Service.getConfig();

    const webdavManualDisconnect = localStorage.getItem('lumos_webdav_manual_disconnect') === 'true';
    const s3ManualDisconnect = localStorage.getItem('lumos_s3_manual_disconnect') === 'true';
    const compatibleS3ManualDisconnect = localStorage.getItem('lumos_compatible_s3_manual_disconnect') === 'true';

    const hasWebdav = webdavConfig && !webdavManualDisconnect;
    const hasS3 = s3Config && !s3ManualDisconnect;
    const hasCompatibleS3 = compatibleS3Config && !compatibleS3ManualDisconnect;

    if (hasCompatibleS3) {
      console.log('[Sync] Using compatible S3 storage service');
      return compatibleS3Service as StorageService;
    }

    if (hasS3) {
      console.log('[Sync] Using S3/COS storage service');
      return s3Service as StorageService;
    }

    if (hasWebdav) {
      console.log('[Sync] Using WebDAV storage service');
      return webdavService as StorageService;
    }

    console.log('[Sync] No storage service configured');
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

    console.warn(`[Sync] Web does not support force deleting local file yet: ${filename}`);
  },

  uploadImages: async (
    storageService?: StorageService | null,
    onProgress?: (message: string) => void,
    localReferencedImages?: string[],
    cloudReferencedImages?: string[]
  ): Promise<SyncResult> => {
    const result = createEmptyResult();
    const targetService = storageService || syncService.getActiveStorageService();

    if (!targetService) {
      console.log('[Sync] No storage service configured, skip image upload');
      return result;
    }

    try {
      onProgress?.('正在初始化图片上传...');

      if (targetService === webdavService) {
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
            const deleted = await targetService.deleteImage(filename);
            if (deleted) {
              result.deletedRemote += 1;
            }
          } catch (error) {
            console.warn(`[Sync] Failed to delete remote image, ignore: ${filename}`, error);
          }
        }
        imageService.clearDeletedImages(deletedImages);
      }

      const toUpload = Array.from(localSet).filter((filename) => localFileSet.has(filename) && !cloudSet.has(filename));
      const concurrentUploads = SYNC_CONFIG.CONCURRENT_OPERATIONS;
      const batch: Promise<void>[] = [];

      for (let index = 0; index < toUpload.length; index += 1) {
        const filename = toUpload[index];
        const task = (async () => {
          onProgress?.(`正在上传 (${index + 1}/${toUpload.length}): ${filename}...`);
          try {
            const data = await imageService.readImage(filename);
            await targetService.uploadImage(filename, data as any);
            result.uploaded += 1;
            result.uploadedFiles.push(filename);
          } catch (error: any) {
            console.error(`[Sync] Failed to upload image: ${filename}`, error);
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
        console.warn('[Sync] Image uploads failed:', result.failedFiles);
      }

      onProgress?.('图片上传完成');
      return result;
    } catch (error: any) {
      console.error('[Sync] Image upload error', error);
      result.errors.push(`Upload error: ${error?.message || 'unknown error'}`);
      return result;
    }
  },

  downloadImages: async (
    storageService?: StorageService | null,
    onProgress?: (message: string) => void,
    cloudReferencedImages?: string[]
  ): Promise<SyncResult> => {
    const result = createEmptyResult();
    const targetService = storageService || syncService.getActiveStorageService();

    if (!targetService) {
      console.log('[Sync] No storage service configured, skip image download');
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

      for (let index = 0; index < toDownload.length; index += 1) {
        const filename = toDownload[index];
        const task = (async () => {
          onProgress?.(`正在下载 (${index + 1}/${toDownload.length}): ${filename}...`);
          try {
            const buffer = await targetService.downloadImage(filename);
            if (buffer.byteLength > 0) {
              await imageService.writeImage(filename, buffer);
            }
            result.downloaded += 1;
            result.downloadedFiles.push(filename);
          } catch (error: any) {
            console.error(`[Sync] Failed to download image: ${filename}`, error);
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
        console.warn('[Sync] Image downloads failed:', result.failedFiles);
      }

      onProgress?.('图片下载完成');
      return result;
    } catch (error: any) {
      console.error('[Sync] Image download error', error);
      result.errors.push(`Download error: ${error?.message || 'unknown error'}`);
      return result;
    }
  }
};
