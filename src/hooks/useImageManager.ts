/**
 * @file useImageManager.ts
 * @description Custom hook for managing image attachments with proper cleanup
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { imageService } from '../services/imageService';

export const useImageManager = (initialImages: string[] = []) => {
  const [images, setImages] = useState<string[]>(initialImages);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [previewFilename, setPreviewFilename] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  // 清理函数：组件卸载时清理
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // 清理所有 blob URLs
      Object.values(imageUrls).forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  // 更新初始图片
  useEffect(() => {
    setImages(initialImages);
  }, [initialImages]);

  // 加载图片 URLs
  useEffect(() => {
    const loadUrls = async () => {
      const newUrls: Record<string, string> = {};
      const missingImgs: string[] = [];
      let changed = false;

      for (const img of images) {
        // 跳过已加载的图片
        if (imageUrls[img]) continue;

        const url = await imageService.getImageUrl(img);
        if (!url) {
          missingImgs.push(img);
        } else {
          newUrls[img] = url;
          changed = true;
        }
      }

      // 只在组件仍然挂载时更新状态
      if (!isMountedRef.current) return;

      // 自动移除缺失的图片
      if (missingImgs.length > 0) {
        console.log('Auto-removing missing images:', missingImgs);
        setImages(prev => prev.filter(i => !missingImgs.includes(i)));
      }

      if (changed) {
        setImageUrls(prev => ({ ...prev, ...newUrls }));
      }
    };

    if (images.length > 0) {
      loadUrls();
    }
  }, [images, imageUrls]);

  // 添加图片
  const handleAddImage = useCallback(async (file: File) => {
    try {
      const filename = await imageService.saveImage(file);
      if (isMountedRef.current) {
        setImages(prev => [...prev, filename]);
      }
      return filename;
    } catch (err) {
      console.error('Failed to save image', err);
      throw err;
    }
  }, []);

  // 删除图片
  const handleDeleteImage = useCallback(async (filename: string) => {
    try {
      await imageService.deleteImage(filename);
      
      if (isMountedRef.current) {
        setImages(prev => prev.filter(img => img !== filename));
        
        // 清理对应的 blob URL
        const url = imageUrls[filename];
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
        
        setImageUrls(prev => {
          const newUrls = { ...prev };
          delete newUrls[filename];
          return newUrls;
        });
      }
      
      return true;
    } catch (err) {
      console.error('Failed to delete image', err);
      throw err;
    }
  }, [imageUrls]);

  return {
    images,
    imageUrls,
    previewFilename,
    setPreviewFilename,
    handleAddImage,
    handleDeleteImage
  };
};
