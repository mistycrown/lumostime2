/**
 * @file imageExportService.ts
 * @description 图片导出导入服务 - 将图片打包成ZIP文件或从ZIP文件导入
 */
import JSZip from 'jszip';
import { imageService } from './imageService';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

export type ImageExportStage = 'preparing' | 'reading' | 'zipping' | 'writing' | 'done';

export interface ImageExportProgress {
    stage: ImageExportStage;
    message: string;
    current: number;
    total: number;
    percent: number;
}

class ImageExportService {
    private static readonly BASE64_WRITE_CHUNK_SIZE = 131072; // 128KB，且为4的倍数，避免Base64分块解码异常

    private emitProgress(
        onProgress: ((progress: ImageExportProgress) => void) | undefined,
        progress: ImageExportProgress
    ): void {
        if (!onProgress) {
            return;
        }

        onProgress({
            ...progress,
            percent: Math.max(0, Math.min(100, progress.percent))
        });
    }

    private async yieldToUI(): Promise<void> {
        await new Promise<void>(resolve => setTimeout(resolve, 0));
    }

    private async withTimeout<T>(
        promise: Promise<T>,
        timeoutMs: number,
        timeoutMessage: string
    ): Promise<T> {
        let timer: ReturnType<typeof setTimeout> | null = null;
        try {
            return await Promise.race([
                promise,
                new Promise<T>((_, reject) => {
                    timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
                })
            ]);
        } finally {
            if (timer) {
                clearTimeout(timer);
            }
        }
    }

    private async writeBase64FileInChunks(
        fileDataBase64: string,
        path: string,
        directory: Directory,
        onProgress?: (progress: ImageExportProgress) => void
    ): Promise<void> {
        const pureBase64 = fileDataBase64.includes(',')
            ? fileDataBase64.split(',')[1]
            : fileDataBase64;
        const chunkSize = ImageExportService.BASE64_WRITE_CHUNK_SIZE;
        const totalChunks = Math.max(1, Math.ceil(pureBase64.length / chunkSize));

        for (let i = 0; i < totalChunks; i++) {
            const start = i * chunkSize;
            const end = start + chunkSize;
            const chunk = pureBase64.slice(start, end);
            const isFirstChunk = i === 0;

            if (isFirstChunk) {
                await this.withTimeout(
                    Filesystem.writeFile({
                        path,
                        data: chunk,
                        directory,
                        recursive: true
                    }),
                    20000,
                    '写入文件超时（初始化写入）'
                );
            } else {
                await this.withTimeout(
                    Filesystem.appendFile({
                        path,
                        data: chunk,
                        directory
                    }),
                    20000,
                    '写入文件超时（分块追加）'
                );
            }

            this.emitProgress(onProgress, {
                stage: 'writing',
                message: `正在写入本地文件 (${i + 1}/${totalChunks})...`,
                current: i + 1,
                total: totalChunks,
                percent: 90 + ((i + 1) / totalChunks) * 10
            });

            if ((i + 1) % 3 === 0) {
                await this.yieldToUI();
            }
        }
    }

    /**
     * 导出所有图片为ZIP文件
     */
    async exportImagesToZip(options: {
        onProgress?: (progress: ImageExportProgress) => void;
    } = {}): Promise<{ filename: string; mode: 'native' | 'web'; savedPath?: string }> {
        console.log('[ImageExportService] 开始导出图片...');
        const { onProgress } = options;

        try {
            // 1. 获取所有图片列表
            this.emitProgress(onProgress, {
                stage: 'preparing',
                message: '正在扫描图片文件...',
                current: 0,
                total: 0,
                percent: 0
            });
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
            const totalCount = imageList.length;

            this.emitProgress(onProgress, {
                stage: 'reading',
                message: `正在读取图片 (0/${totalCount})...`,
                current: 0,
                total: totalCount,
                percent: 0
            });

            for (let i = 0; i < imageList.length; i++) {
                const filename = imageList[i];
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

                const processed = i + 1;
                this.emitProgress(onProgress, {
                    stage: 'reading',
                    message: `正在读取图片 (${processed}/${totalCount})...`,
                    current: processed,
                    total: totalCount,
                    percent: (processed / totalCount) * 60
                });

                // 每 5 个文件让出一次主线程，避免移动端长时间无响应
                if (processed % 5 === 0) {
                    await this.yieldToUI();
                }
            }

            console.log(`[ImageExportService] 图片处理完成: 成功 ${successCount}, 失败 ${failCount}`);

            if (successCount === 0) {
                throw new Error('没有成功处理任何图片');
            }

            // 4. 导出ZIP文件
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const filename = `lumostime-images-${timestamp}.zip`;
            const platform = Capacitor.getPlatform();
            const isNative = Capacitor.isNativePlatform();
            const isAndroid = platform === 'android';

            const onZipGenerateProgress = (metadata: any) => {
                const percentInZip = typeof metadata?.percent === 'number' ? metadata.percent : 0;
                const currentFile = typeof metadata?.currentFile === 'string' ? metadata.currentFile : '';
                this.emitProgress(onProgress, {
                    stage: 'zipping',
                    message: currentFile
                        ? `正在压缩: ${currentFile}`
                        : '正在生成压缩包...',
                    current: Math.round(percentInZip),
                    total: 100,
                    percent: 60 + percentInZip * 0.3
                });
            };

            if (isNative) {
                console.log('[ImageExportService] 正在生成ZIP文件(Base64)...');
                const zipBase64 = await zip.generateAsync({
                    type: 'base64',
                    compression: 'DEFLATE',
                    compressionOptions: { level: 6 }
                }, onZipGenerateProgress);

                this.emitProgress(onProgress, {
                    stage: 'writing',
                    message: '正在写入本地文件...',
                    current: 0,
                    total: 1,
                    percent: 95
                });

                const relativePath = isAndroid
                    ? `Download/LumosTime/${filename}`
                    : `LumosTime/${filename}`;

                if (isAndroid) {
                    try {
                        await this.writeBase64FileInChunks(
                            zipBase64,
                            relativePath,
                            Directory.ExternalStorage,
                            onProgress
                        );
                    } catch (externalWriteError) {
                        console.warn('[ImageExportService] 外部存储写入失败，回退到Documents目录', externalWriteError);
                        const fallbackRelativePath = `LumosTime/${filename}`;
                        this.emitProgress(onProgress, {
                            stage: 'writing',
                            message: '外部存储写入失败，正在回退目录重试...',
                            current: 0,
                            total: 1,
                            percent: 92
                        });

                        await this.writeBase64FileInChunks(
                            zipBase64,
                            fallbackRelativePath,
                            Directory.Documents,
                            onProgress
                        );

                        console.log(`[ImageExportService] 导出完成(Native Fallback): ${fallbackRelativePath}`);
                        this.emitProgress(onProgress, {
                            stage: 'done',
                            message: '导出完成',
                            current: 1,
                            total: 1,
                            percent: 100
                        });
                        return { filename, mode: 'native', savedPath: fallbackRelativePath };
                    }
                } else {
                    await this.writeBase64FileInChunks(
                        zipBase64,
                        relativePath,
                        Directory.Documents,
                        onProgress
                    );
                }

                console.log(`[ImageExportService] 导出完成(Native): ${relativePath}`);
                this.emitProgress(onProgress, {
                    stage: 'done',
                    message: '导出完成',
                    current: 1,
                    total: 1,
                    percent: 100
                });
                return { filename, mode: 'native', savedPath: relativePath };
            }

            console.log('[ImageExportService] 正在生成ZIP文件(Blob)...');
            const zipBlob = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            }, onZipGenerateProgress);

            console.log(`[ImageExportService] ZIP文件生成完成，大小: ${zipBlob.size} bytes`);
            this.emitProgress(onProgress, {
                stage: 'writing',
                message: '正在触发下载...',
                current: 0,
                total: 1,
                percent: 95
            });

            const url = URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            console.log(`[ImageExportService] 导出完成(Web): ${filename}`);
            this.emitProgress(onProgress, {
                stage: 'done',
                message: '导出完成',
                current: 1,
                total: 1,
                percent: 100
            });
            return { filename, mode: 'web' };

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
