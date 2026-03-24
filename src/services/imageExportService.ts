/**
 * @file imageExportService.ts
 * @description 图片导出导入服务 - 将图片打包成ZIP文件或从ZIP文件导入
 * @updated 2026-03-24: 增加分块导出能力，避免移动端一次性导出全部图片时内存峰值过高。
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

export interface ImageExportResult {
    filenames: string[];
    mode: 'native' | 'web';
    savedPaths?: string[];
    totalChunks: number;
    totalImages: number;
    totalFiles: number;
    chunkSize: number;
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

    private emitChunkProgress(
        onProgress: ((progress: ImageExportProgress) => void) | undefined,
        params: {
            stage: ImageExportStage;
            message: string;
            current: number;
            total: number;
            chunkIndex: number;
            totalChunks: number;
            localProgress: number;
        }
    ): void {
        const totalChunks = Math.max(1, params.totalChunks);
        const normalizedLocalProgress = Math.max(0, Math.min(1, params.localProgress));
        const overallPercent = ((params.chunkIndex + normalizedLocalProgress) / totalChunks) * 100;

        this.emitProgress(onProgress, {
            stage: params.stage,
            message: params.message,
            current: params.current,
            total: params.total,
            percent: overallPercent
        });
    }

    private async yieldToUI(): Promise<void> {
        await new Promise<void>(resolve => setTimeout(resolve, 0));
    }

    private clampChunkSize(value: number | undefined, totalImages: number): number {
        if (totalImages <= 0) {
            return 0;
        }

        if (!value || !Number.isFinite(value)) {
            return totalImages;
        }

        return Math.min(totalImages, Math.max(1, Math.floor(value)));
    }

    private buildImageGroups(filenames: string[]): string[][] {
        const groups = new Map<string, { original?: string; thumbnails: string[] }>();

        filenames.forEach((filename) => {
            if (filename.startsWith('thumb_')) {
                const originalName = filename.slice(6);
                const group = groups.get(originalName) || { thumbnails: [] };
                group.thumbnails.push(filename);
                groups.set(originalName, group);
                return;
            }

            const group = groups.get(filename) || { thumbnails: [] };
            group.original = filename;
            groups.set(filename, group);
        });

        return Array.from(groups.entries())
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([, group]) => {
                const files: string[] = [];

                if (group.original) {
                    files.push(group.original);
                }

                files.push(...group.thumbnails.sort((left, right) => left.localeCompare(right)));
                return files;
            })
            .filter(group => group.length > 0);
    }

    private splitIntoChunks(groups: string[][], chunkSize: number): string[][][] {
        if (groups.length === 0 || chunkSize <= 0) {
            return [];
        }

        const chunks: string[][][] = [];
        for (let i = 0; i < groups.length; i += chunkSize) {
            chunks.push(groups.slice(i, i + chunkSize));
        }
        return chunks;
    }

    private getExportFilename(timestamp: string, chunkIndex: number, totalChunks: number): string {
        if (totalChunks <= 1) {
            return `lumostime-images-${timestamp}.zip`;
        }

        const width = String(totalChunks).length;
        const currentPart = String(chunkIndex + 1).padStart(width, '0');
        const totalPart = String(totalChunks).padStart(width, '0');
        return `lumostime-images-${timestamp}-part-${currentPart}-of-${totalPart}.zip`;
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
        onChunkProgress?: (current: number, total: number) => void
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

            onChunkProgress?.(i + 1, totalChunks);

            if ((i + 1) % 3 === 0) {
                await this.yieldToUI();
            }
        }
    }

    async getExportImageSummary(): Promise<{ totalImages: number; totalFiles: number }> {
        const imageList = await imageService.listImages();
        const imageGroups = this.buildImageGroups(imageList);

        return {
            totalImages: imageGroups.length,
            totalFiles: imageList.length
        };
    }

    /**
     * 导出所有图片为ZIP文件
     */
    async exportImagesToZip(options: {
        onProgress?: (progress: ImageExportProgress) => void;
        chunkSize?: number;
    } = {}): Promise<ImageExportResult> {
        console.log('[ImageExportService] 开始导出图片...');
        const { onProgress, chunkSize } = options;

        try {
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

            const imageGroups = this.buildImageGroups(imageList);
            const totalImages = imageGroups.length;
            const totalFiles = imageList.length;
            const effectiveChunkSize = this.clampChunkSize(chunkSize, totalImages);
            const groupedChunks = this.splitIntoChunks(imageGroups, effectiveChunkSize);

            this.emitProgress(onProgress, {
                stage: 'preparing',
                message: `共 ${totalImages} 张图片，将导出为 ${groupedChunks.length} 个压缩包`,
                current: 0,
                total: totalImages,
                percent: 2
            });

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const platform = Capacitor.getPlatform();
            const isNative = Capacitor.isNativePlatform();
            const isAndroid = platform === 'android';
            const filenames: string[] = [];
            const savedPaths: string[] = [];
            let successCount = 0;
            let failCount = 0;
            let processedFiles = 0;

            for (let chunkIndex = 0; chunkIndex < groupedChunks.length; chunkIndex++) {
                const imageChunk = groupedChunks[chunkIndex];
                const fileChunk = imageChunk.flat();
                const chunkFilename = this.getExportFilename(timestamp, chunkIndex, groupedChunks.length);
                const zip = new JSZip();

                filenames.push(chunkFilename);

                this.emitChunkProgress(onProgress, {
                    stage: 'reading',
                    message: `正在准备第 ${chunkIndex + 1}/${groupedChunks.length} 个压缩包...`,
                    current: chunkIndex + 1,
                    total: groupedChunks.length,
                    chunkIndex,
                    totalChunks: groupedChunks.length,
                    localProgress: 0.02
                });

                for (let fileIndex = 0; fileIndex < fileChunk.length; fileIndex++) {
                    const currentFile = fileChunk[fileIndex];

                    try {
                        console.log(`[ImageExportService] 正在处理: ${currentFile}`);
                        const imageData = await imageService.readImage(currentFile);

                        if (typeof imageData === 'string') {
                            const base64Data = imageData.includes(',')
                                ? imageData.split(',')[1]
                                : imageData;
                            zip.file(currentFile, base64Data, { base64: true });
                        } else if (imageData instanceof ArrayBuffer) {
                            zip.file(currentFile, imageData);
                        } else if (imageData instanceof Blob) {
                            zip.file(currentFile, imageData);
                        }

                        successCount++;
                    } catch (error) {
                        console.error(`[ImageExportService] 处理图片失败: ${currentFile}`, error);
                        failCount++;
                    }

                    processedFiles++;
                    this.emitChunkProgress(onProgress, {
                        stage: 'reading',
                        message: `正在读取图片 (${processedFiles}/${totalFiles})...`,
                        current: processedFiles,
                        total: totalFiles,
                        chunkIndex,
                        totalChunks: groupedChunks.length,
                        localProgress: 0.05 + ((fileIndex + 1) / Math.max(1, fileChunk.length)) * 0.5
                    });

                    if ((fileIndex + 1) % 5 === 0) {
                        await this.yieldToUI();
                    }
                }

                const onZipGenerateProgress = (metadata: { percent?: number; currentFile?: string }) => {
                    const zipPercent = typeof metadata?.percent === 'number' ? metadata.percent : 0;
                    const currentFile = typeof metadata?.currentFile === 'string' ? metadata.currentFile : '';

                    this.emitChunkProgress(onProgress, {
                        stage: 'zipping',
                        message: currentFile
                            ? `正在压缩第 ${chunkIndex + 1}/${groupedChunks.length} 包: ${currentFile}`
                            : `正在生成第 ${chunkIndex + 1}/${groupedChunks.length} 个压缩包...`,
                        current: chunkIndex + 1,
                        total: groupedChunks.length,
                        chunkIndex,
                        totalChunks: groupedChunks.length,
                        localProgress: 0.6 + (zipPercent / 100) * 0.25
                    });
                };

                if (isNative) {
                    console.log(`[ImageExportService] 正在生成ZIP文件(Base64): ${chunkFilename}`);
                    const zipBase64 = await zip.generateAsync({
                        type: 'base64',
                        compression: 'DEFLATE',
                        compressionOptions: { level: 6 }
                    }, onZipGenerateProgress);

                    const relativePath = isAndroid
                        ? `Download/LumosTime/${chunkFilename}`
                        : `LumosTime/${chunkFilename}`;

                    const emitWriteProgress = (current: number, total: number) => {
                        this.emitChunkProgress(onProgress, {
                            stage: 'writing',
                            message: `正在写入第 ${chunkIndex + 1}/${groupedChunks.length} 个压缩包 (${current}/${total})...`,
                            current,
                            total,
                            chunkIndex,
                            totalChunks: groupedChunks.length,
                            localProgress: 0.87 + (current / Math.max(1, total)) * 0.11
                        });
                    };

                    if (isAndroid) {
                        try {
                            await this.writeBase64FileInChunks(
                                zipBase64,
                                relativePath,
                                Directory.ExternalStorage,
                                emitWriteProgress
                            );
                            savedPaths.push(relativePath);
                        } catch (externalWriteError) {
                            console.warn('[ImageExportService] 外部存储写入失败，回退到Documents目录', externalWriteError);
                            const fallbackRelativePath = `LumosTime/${chunkFilename}`;

                            this.emitChunkProgress(onProgress, {
                                stage: 'writing',
                                message: `第 ${chunkIndex + 1}/${groupedChunks.length} 个压缩包写入外部存储失败，正在回退重试...`,
                                current: chunkIndex + 1,
                                total: groupedChunks.length,
                                chunkIndex,
                                totalChunks: groupedChunks.length,
                                localProgress: 0.9
                            });

                            await this.writeBase64FileInChunks(
                                zipBase64,
                                fallbackRelativePath,
                                Directory.Documents,
                                emitWriteProgress
                            );
                            savedPaths.push(fallbackRelativePath);
                        }
                    } else {
                        await this.writeBase64FileInChunks(
                            zipBase64,
                            relativePath,
                            Directory.Documents,
                            emitWriteProgress
                        );
                        savedPaths.push(relativePath);
                    }

                    console.log(`[ImageExportService] 导出完成(Native): ${savedPaths[savedPaths.length - 1]}`);
                } else {
                    console.log(`[ImageExportService] 正在生成ZIP文件(Blob): ${chunkFilename}`);
                    const zipBlob = await zip.generateAsync({
                        type: 'blob',
                        compression: 'DEFLATE',
                        compressionOptions: { level: 6 }
                    }, onZipGenerateProgress);

                    this.emitChunkProgress(onProgress, {
                        stage: 'writing',
                        message: `正在触发第 ${chunkIndex + 1}/${groupedChunks.length} 个压缩包下载...`,
                        current: chunkIndex + 1,
                        total: groupedChunks.length,
                        chunkIndex,
                        totalChunks: groupedChunks.length,
                        localProgress: 0.95
                    });

                    const url = URL.createObjectURL(zipBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = chunkFilename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);

                    await this.yieldToUI();
                    console.log(`[ImageExportService] 导出完成(Web): ${chunkFilename}`);
                }

                this.emitChunkProgress(onProgress, {
                    stage: 'done',
                    message: `已完成 ${chunkIndex + 1}/${groupedChunks.length} 个压缩包`,
                    current: chunkIndex + 1,
                    total: groupedChunks.length,
                    chunkIndex,
                    totalChunks: groupedChunks.length,
                    localProgress: 1
                });
            }

            console.log(`[ImageExportService] 图片处理完成: 成功 ${successCount}, 失败 ${failCount}`);

            if (successCount === 0) {
                throw new Error('没有成功处理任何图片');
            }

            this.emitProgress(onProgress, {
                stage: 'done',
                message: '导出完成',
                current: groupedChunks.length,
                total: groupedChunks.length,
                percent: 100
            });

            return {
                filenames,
                mode: isNative ? 'native' : 'web',
                savedPaths: isNative ? savedPaths : undefined,
                totalChunks: groupedChunks.length,
                totalImages,
                totalFiles,
                chunkSize: effectiveChunkSize
            };
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
