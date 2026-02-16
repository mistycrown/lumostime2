/**
 * @file imageExportService.ts
 * @description 图片导出导入服务 - 将图片打包成ZIP文件或从ZIP文件导入
 */
import JSZip from 'jszip';
import { imageService } from './imageService';
import { Capacitor } from '@capacitor/core';

class ImageExportService {
    /**
     * 导出所有图片为ZIP文件
     */
    async exportImagesToZip(): Promise<void> {
        console.log('[ImageExportService] 开始导出图片...');
        
        try {
            // 1. 获取所有图片列表
            const imageList = await imageService.listImages();
            console.log(`[ImageExportService] 找到 ${imageList.length} 个图片文件`);
            
            if (imageList.length === 0) {
                throw new Error('没有图片可以导出');
            }

            // 2. 创建ZIP对象
            const zip = new JSZip();
            
            // 3. 读取每个图片并添加到ZIP
            let successCount = 0;
            let failCount = 0;
            
            for (const filename of imageList) {
                try {
                    console.log(`[ImageExportService] 正在处理: ${filename}`);
                    const imageData = await imageService.readImage(filename);
                    
                    // 将图片数据添加到ZIP
                    if (typeof imageData === 'string') {
                        // Base64字符串
                        const base64Data = imageData.includes(',') 
                            ? imageData.split(',')[1] 
                            : imageData;
                        zip.file(filename, base64Data, { base64: true });
                    } else if (imageData instanceof ArrayBuffer) {
                        // ArrayBuffer
                        zip.file(filename, imageData);
                    } else if (imageData instanceof Blob) {
                        // Blob
                        zip.file(filename, imageData);
                    }
                    
                    successCount++;
                } catch (error) {
                    console.error(`[ImageExportService] 处理图片失败: ${filename}`, error);
                    failCount++;
                }
            }
            
            console.log(`[ImageExportService] 图片处理完成: 成功 ${successCount}, 失败 ${failCount}`);
            
            if (successCount === 0) {
                throw new Error('没有成功处理任何图片');
            }

            // 4. 生成ZIP文件
            console.log('[ImageExportService] 正在生成ZIP文件...');
            const zipBlob = await zip.generateAsync({ 
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            });
            
            console.log(`[ImageExportService] ZIP文件生成完成，大小: ${zipBlob.size} bytes`);

            // 5. 下载ZIP文件
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const filename = `lumostime-images-${timestamp}.zip`;
            
            const url = URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            console.log(`[ImageExportService] 导出完成: ${filename}`);
            
        } catch (error) {
            console.error('[ImageExportService] 导出失败:', error);
            throw error;
        }
    }

    /**
     * 从ZIP文件导入图片
     */
    async importImagesFromZip(file: File): Promise<{ success: number; failed: number; skipped: number }> {
        console.log('[ImageExportService] 开始导入图片...');
        
        try {
            // 1. 读取ZIP文件
            console.log(`[ImageExportService] 正在读取ZIP文件: ${file.name}, 大小: ${file.size} bytes`);
            const zip = await JSZip.loadAsync(file);
            
            // 2. 获取ZIP中的所有文件
            const files = Object.keys(zip.files).filter(name => {
                // 过滤掉目录和隐藏文件
                return !zip.files[name].dir && !name.startsWith('__MACOSX') && !name.startsWith('.');
            });
            
            console.log(`[ImageExportService] ZIP中包含 ${files.length} 个文件`);
            
            if (files.length === 0) {
                throw new Error('ZIP文件中没有找到图片');
            }

            // 3. 获取现有图片列表，避免重复导入
            const existingImages = await imageService.listImages();
            const existingSet = new Set(existingImages);
            
            let successCount = 0;
            let failCount = 0;
            let skippedCount = 0;
            
            // 4. 处理每个文件
            for (const filename of files) {
                try {
                    // 检查是否已存在
                    if (existingSet.has(filename)) {
                        console.log(`[ImageExportService] 跳过已存在的图片: ${filename}`);
                        skippedCount++;
                        continue;
                    }
                    
                    console.log(`[ImageExportService] 正在导入: ${filename}`);
                    
                    // 读取文件内容
                    const fileData = zip.files[filename];
                    const blob = await fileData.async('blob');
                    
                    // 写入到图片服务
                    await imageService.writeImage(filename, blob);
                    
                    successCount++;
                    console.log(`[ImageExportService] ✓ 导入成功: ${filename}`);
                    
                } catch (error) {
                    console.error(`[ImageExportService] 导入失败: ${filename}`, error);
                    failCount++;
                }
            }
            
            console.log(`[ImageExportService] 导入完成: 成功 ${successCount}, 失败 ${failCount}, 跳过 ${skippedCount}`);
            
            return {
                success: successCount,
                failed: failCount,
                skipped: skippedCount
            };
            
        } catch (error) {
            console.error('[ImageExportService] 导入失败:', error);
            throw error;
        }
    }

    /**
     * 获取ZIP文件的预览信息（不实际导入）
     */
    async previewZipContents(file: File): Promise<{ fileCount: number; totalSize: number; files: string[] }> {
        try {
            const zip = await JSZip.loadAsync(file);
            const files = Object.keys(zip.files).filter(name => {
                return !zip.files[name].dir && !name.startsWith('__MACOSX') && !name.startsWith('.');
            });
            
            let totalSize = 0;
            for (const filename of files) {
                const fileData = zip.files[filename];
                // @ts-ignore - _data存在但类型定义中没有
                totalSize += fileData._data?.uncompressedSize || 0;
            }
            
            return {
                fileCount: files.length,
                totalSize,
                files: files.slice(0, 10) // 只返回前10个文件名作为预览
            };
        } catch (error) {
            console.error('[ImageExportService] 预览ZIP失败:', error);
            throw error;
        }
    }
}

export const imageExportService = new ImageExportService();
