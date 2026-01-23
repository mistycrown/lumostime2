/**
 * @file s3Service.ts
 * @input S3 Credentials, Local Data
 * @output Remote Storage Operations (Upload/Download)
 * @pos Service (Data Synchronization)
 * @description Manages Tencent Cloud COS connections and file operations using official COS SDK, providing the same interface as WebDAV service.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
// @ts-ignore
import COS from 'cos-js-sdk-v5';
import { Capacitor } from '@capacitor/core';

// S3 Configuration Interface (now for Tencent Cloud COS)
export interface S3Config {
    bucketName: string;
    region: string;
    secretId: string;      // Changed from accessKeyId
    secretKey: string;     // Changed from secretAccessKey
    endpoint?: string;     // Optional custom endpoint (usually not needed for COS)
}

// Storage keys for COS configuration
const STORAGE_KEY_BUCKET = 'lumos_cos_bucket';
const STORAGE_KEY_REGION = 'lumos_cos_region';
const STORAGE_KEY_SECRET_ID = 'lumos_cos_secret_id';
const STORAGE_KEY_SECRET_KEY = 'lumos_cos_secret_key';
const STORAGE_KEY_ENDPOINT = 'lumos_cos_endpoint';

export class S3Service {
    private config: S3Config | null = null;
    private client: any = null; // COS client instance

    constructor() {
        this.loadConfig();
    }

    private loadConfig() {
        const bucketName = localStorage.getItem(STORAGE_KEY_BUCKET);
        const region = localStorage.getItem(STORAGE_KEY_REGION);
        const secretId = localStorage.getItem(STORAGE_KEY_SECRET_ID);
        const secretKey = localStorage.getItem(STORAGE_KEY_SECRET_KEY);
        const endpoint = localStorage.getItem(STORAGE_KEY_ENDPOINT);

        if (bucketName && region && secretId && secretKey) {
            this.config = {
                bucketName,
                region,
                secretId,
                secretKey,
                endpoint: endpoint || undefined
            };
            this.initializeClient();
        }
    }

    private initializeClient() {
        if (!this.config) return;

        try {
            this.client = new COS({
                SecretId: this.config.secretId,
                SecretKey: this.config.secretKey,
            });

            console.log('[COS] Client initialized successfully');
        } catch (error) {
            console.error('[COS] Failed to initialize client:', error);
            this.client = null;
        }
    }

    /**
     * 调试日志输出方法（支持移动端）
     */
    private debugLog(message: string, data?: any) {
        const timestamp = new Date().toISOString();

        let logData = '';
        if (data !== undefined && data !== null) {
            try {
                if (data instanceof Error) {
                    logData = JSON.stringify({
                        name: data.name,
                        message: data.message,
                        code: (data as any).code,
                        statusCode: (data as any).statusCode,
                        stack: data.stack?.split('\n').slice(0, 3).join('\n')
                    }, null, 2);
                } else if (typeof data === 'object') {
                    const seen = new WeakSet();
                    logData = JSON.stringify(data, (key, value) => {
                        if (typeof value === 'object' && value !== null) {
                            if (seen.has(value)) {
                                return '[Circular]';
                            }
                            seen.add(value);
                        }
                        return value;
                    }, 2);
                } else {
                    logData = String(data);
                }
            } catch (e) {
                logData = '[序列化失败: ' + String(e) + ']';
            }
        }

        const fullMessage = `[COS-DEBUG] ${timestamp} ${message}${logData ? '\n' + logData : ''}`;
        console.log(fullMessage);

        if (Capacitor.isNativePlatform()) {
            try {
                const nativeMessage = `[COS-NATIVE] ${message}${logData ? '\n' + logData : ''}`;
                if (message.includes('ERROR') || message.includes('失败')) {
                    console.error(nativeMessage);
                } else if (message.includes('WARN') || message.includes('警告')) {
                    console.warn(nativeMessage);
                } else {
                    console.info(nativeMessage);
                }
            } catch (e) {
                // 忽略原生日志错误
            }
        }
    }

    saveConfig(config: S3Config) {
        this.config = config;
        localStorage.setItem(STORAGE_KEY_BUCKET, config.bucketName);
        localStorage.setItem(STORAGE_KEY_REGION, config.region);
        localStorage.setItem(STORAGE_KEY_SECRET_ID, config.secretId);
        localStorage.setItem(STORAGE_KEY_SECRET_KEY, config.secretKey);
        if (config.endpoint) {
            localStorage.setItem(STORAGE_KEY_ENDPOINT, config.endpoint);
        } else {
            localStorage.removeItem(STORAGE_KEY_ENDPOINT);
        }
        this.initializeClient();
    }

    getConfig(): S3Config | null {
        return this.config;
    }

    clearConfig() {
        localStorage.removeItem(STORAGE_KEY_BUCKET);
        localStorage.removeItem(STORAGE_KEY_REGION);
        localStorage.removeItem(STORAGE_KEY_SECRET_ID);
        localStorage.removeItem(STORAGE_KEY_SECRET_KEY);
        localStorage.removeItem(STORAGE_KEY_ENDPOINT);
        this.config = null;
        this.client = null;
    }

    /**
     * Test COS connection by attempting to access the bucket
     */
    async checkConnection(): Promise<boolean> {
        if (!this.config || !this.client) return false;

        return new Promise((resolve) => {
            console.log('[COS] Testing connection to bucket:', this.config!.bucketName);
            console.log('[COS] Region:', this.config!.region);
            console.log('[COS] SecretId:', this.config!.secretId.substring(0, 10) + '...');

            this.client.headBucket({
                Bucket: this.config.bucketName,
                Region: this.config.region
            }, (err: any, data: any) => {
                if (err) {
                    console.error('[COS] Connection test failed:', err);

                    // Provide more specific error messages
                    if (err.code === 'NoSuchBucket') {
                        console.error('[COS] Bucket does not exist:', this.config!.bucketName);
                        console.error('[COS] 解决方案: 请检查存储桶名称是否正确，确保包含APPID后缀');
                    } else if (err.code === 'InvalidAccessKeyId') {
                        console.error('[COS] Invalid SecretId');
                        console.error('[COS] 解决方案: 请检查SecretId是否正确');
                    } else if (err.code === 'SignatureDoesNotMatch') {
                        console.error('[COS] Invalid SecretKey');
                        console.error('[COS] 解决方案: 请检查SecretKey是否正确，确保没有多余空格');
                    } else if (err.code === 'AccessDenied') {
                        console.error('[COS] Access denied');
                        console.error('[COS] 腾讯云COS常见问题:');
                        console.error('[COS] 1. 检查SecretId和SecretKey是否正确');
                        console.error('[COS] 2. 确保API密钥有访问权限');
                        console.error('[COS] 3. 检查存储桶权限设置');
                    } else {
                        console.error(`[COS] 错误代码: ${err.code}`);
                        console.error(`[COS] 错误消息: ${err.message}`);
                    }

                    resolve(false);
                } else {
                    console.log('[COS] ✓ Connection test passed');
                    console.log(`[COS] Status: ${data.statusCode}`);
                    resolve(true);
                }
            });
        });
    }

    /**
     * Get file metadata (last modified date)
     */
    async statFile(filename: string = 'lumostime_backup.json'): Promise<Date | null> {
        if (!this.config || !this.client) return null;

        return new Promise((resolve) => {
            console.log(`[COS] Getting file stats: ${filename}`);

            this.client.headObject({
                Bucket: this.config!.bucketName,
                Region: this.config!.region,
                Key: filename
            }, (err: any, data: any) => {
                if (err) {
                    if (err.code !== 'NoSuchKey') {
                        console.error(`[COS] Failed to get file stats: ${filename}`, err);
                    }
                    resolve(null);
                } else {
                    const lastModified = data.headers && data.headers['last-modified']
                        ? new Date(data.headers['last-modified'])
                        : null;
                    resolve(lastModified);
                }
            });
        });
    }

    /**
     * Upload data to COS
     */
    async uploadData(data: any, filename: string = 'lumostime_backup.json'): Promise<boolean> {
        if (!this.config || !this.client) throw new Error('COS not configured');

        const content = JSON.stringify(data, null, 2);
        // 在Capacitor环境下，将字符串转换为Blob对象
        const contentBlob = new Blob([content], { type: 'application/json' });

        return new Promise((resolve, reject) => {
            this.debugLog(`上传数据: ${filename}`, {
                size: content.length,
                blobSize: contentBlob.size,
                isNative: Capacitor.isNativePlatform()
            });

            this.client.putObject({
                Bucket: this.config!.bucketName,
                Region: this.config!.region,
                Key: filename,
                Body: contentBlob,
                Headers: {
                    'Content-Length': String(contentBlob.size),
                    'Content-Type': 'application/json'
                }
            }, (err: any, data: any) => {
                if (err) {
                    this.debugLog(`ERROR: 数据上传失败 ${filename}`, err);
                    reject(err);
                } else {
                    this.debugLog(`✓ 数据上传成功: ${filename}`);
                    resolve(true);
                }
            });
        });
    }

    /**
     * Download data from COS
     */
    async downloadData(filename: string = 'lumostime_backup.json'): Promise<any> {
        if (!this.config || !this.client) throw new Error('COS not configured');

        return new Promise((resolve, reject) => {
            console.log(`[COS] Downloading data: ${filename}`);

            this.client.getObject({
                Bucket: this.config!.bucketName,
                Region: this.config!.region,
                Key: filename
            }, (err: any, data: any) => {
                if (err) {
                    console.error(`[COS] Download failed: ${filename}`, err);
                    reject(err);
                } else {
                    try {
                        const content = data.Body;
                        console.log(`[COS] ✓ Download completed: ${filename}, size: ${content.length} bytes`);
                        const parsedData = JSON.parse(content);
                        resolve(parsedData);
                    } catch (parseError) {
                        console.error(`[COS] Failed to parse JSON: ${filename}`, parseError);
                        reject(new Error('Failed to parse downloaded data as JSON'));
                    }
                }
            });
        });
    }

    /**
     * Upload image to COS
     */
    async uploadImage(filename: string, buffer: ArrayBuffer | string | Blob): Promise<boolean> {
        if (!this.config || !this.client) throw new Error('COS not configured');

        return new Promise(async (resolve, reject) => {
            try {
                console.log(`[COS] Uploading image: ${filename}`);

                let body: Blob | string;
                let contentType = 'image/jpeg';

                if (buffer instanceof ArrayBuffer) {
                    // Convert ArrayBuffer to Blob
                    body = new Blob([buffer], { type: contentType });
                } else if (buffer instanceof Blob) {
                    body = buffer;
                    contentType = buffer.type || 'image/jpeg';
                } else if (typeof buffer === 'string') {
                    // Handle base64 string
                    if (buffer.startsWith('data:')) {
                        const [header, base64Data] = buffer.split(',');
                        contentType = header.split(':')[1].split(';')[0];
                        const binaryString = atob(base64Data);
                        const uint8Array = new Uint8Array(binaryString.length);
                        for (let i = 0; i < binaryString.length; i++) {
                            uint8Array[i] = binaryString.charCodeAt(i);
                        }
                        body = new Blob([uint8Array], { type: contentType });
                    } else {
                        // Plain base64 string
                        const binaryString = atob(buffer);
                        const uint8Array = new Uint8Array(binaryString.length);
                        for (let i = 0; i < binaryString.length; i++) {
                            uint8Array[i] = binaryString.charCodeAt(i);
                        }
                        body = new Blob([uint8Array], { type: contentType });
                    }
                } else {
                    throw new Error('Unsupported buffer type');
                }

                this.client.putObject({
                    Bucket: this.config!.bucketName,
                    Region: this.config!.region,
                    Key: `images/${filename}`,
                    Body: body,
                    ContentType: contentType,
                    Metadata: {
                        'uploaded-by': 'lumostime'
                    }
                }, (err: any, data: any) => {
                    if (err) {
                        console.error(`[COS] Image upload failed: ${filename}`, err);
                        reject(err);
                    } else {
                        console.log(`[COS] ✓ Image upload completed: ${filename}`);
                        resolve(true);
                    }
                });
            } catch (error) {
                console.error(`[COS] Image upload error: ${filename}`, error);
                reject(error);
            }
        });
    }

    /**
     * Download image from COS
     */
    async downloadImage(filename: string): Promise<ArrayBuffer> {
        if (!this.config || !this.client) throw new Error('COS not configured');

        return new Promise((resolve, reject) => {
            console.log(`[COS] Downloading image: ${filename}`);

            this.client.getObject({
                Bucket: this.config!.bucketName,
                Region: this.config!.region,
                Key: `images/${filename}`,
                DataType: 'blob'
            }, (err: any, data: any) => {
                if (err) {
                    console.error(`[COS] Image download failed: ${filename}`, err);

                    if (err.code === 'NoSuchKey') {
                        reject(new Error(`Image not found: ${filename}`));
                    } else {
                        reject(err);
                    }
                } else {
                    try {
                        // Convert the response body to ArrayBuffer
                        const body = data.Body;
                        let arrayBuffer: ArrayBuffer;

                        if (body instanceof ArrayBuffer) {
                            arrayBuffer = body;
                        } else if (body instanceof Blob) {
                            // Convert Blob to ArrayBuffer
                            const reader = new FileReader();
                            reader.onload = () => resolve(reader.result as ArrayBuffer);
                            reader.onerror = () => reject(new Error('Failed to read blob'));
                            reader.readAsArrayBuffer(body);
                            return;
                        } else if (body instanceof Uint8Array) {
                            arrayBuffer = body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer;
                        } else if (typeof body === 'string') {
                            // If it's a base64 string, decode it
                            const binaryString = atob(body);
                            const bytes = new Uint8Array(binaryString.length);
                            for (let i = 0; i < binaryString.length; i++) {
                                bytes[i] = binaryString.charCodeAt(i);
                            }
                            arrayBuffer = bytes.buffer;
                        } else {
                            // Try to convert to Uint8Array first
                            const uint8Array = new Uint8Array(body);
                            arrayBuffer = uint8Array.buffer;
                        }

                        console.log(`[COS] ✓ Image download completed: ${filename}, size: ${arrayBuffer.byteLength} bytes`);
                        resolve(arrayBuffer);
                    } catch (conversionError) {
                        console.error(`[COS] Failed to convert image data: ${filename}`, conversionError);
                        reject(new Error('Failed to convert image data'));
                    }
                }
            });
        });
    }

    /**
     * Delete image from COS
     */
    async deleteImage(filename: string): Promise<boolean> {
        if (!this.config || !this.client) return false;

        return new Promise((resolve) => {
            console.log(`[COS] Deleting image: ${filename}`);

            this.client.deleteObject({
                Bucket: this.config!.bucketName,
                Region: this.config!.region,
                Key: `images/${filename}`
            }, (err: any, data: any) => {
                if (err) {
                    console.error(`[COS] Image deletion failed: ${filename}`, err);
                    resolve(false);
                } else {
                    console.log(`[COS] ✓ Image deleted: ${filename}`);
                    resolve(true);
                }
            });
        });
    }

    /**
     * Upload image reference list
     */
    async uploadImageList(imageList: string[]): Promise<boolean> {
        if (!this.config || !this.client) throw new Error('COS not configured');

        return new Promise((resolve, reject) => {
            const data = {
                images: imageList,
                timestamp: Date.now(),
                version: '1.0.0'
            };

            const filename = 'lumostime_images.json';
            const bodyContent = JSON.stringify(data, null, 2);
            // 在Capacitor环境下，将字符串转换为Blob对象
            const bodyBlob = new Blob([bodyContent], { type: 'application/json' });

            this.debugLog(`上传图片列表: ${imageList.length}张图片`, {
                filename,
                bodyLength: bodyContent.length,
                bodyBlobSize: bodyBlob.size,
                bucket: this.config!.bucketName,
                region: this.config!.region,
                isNative: Capacitor.isNativePlatform()
            });

            this.client.putObject({
                Bucket: this.config!.bucketName,
                Region: this.config!.region,
                Key: filename,
                Body: bodyBlob,
                Headers: {
                    'Content-Length': String(bodyBlob.size),
                    'Content-Type': 'application/json'
                }
            }, (err: any, data: any) => {
                if (err) {
                    this.debugLog('ERROR: 图片列表上传失败', err);
                    reject(err);
                } else {
                    this.debugLog(`✓ 图片列表上传成功: ${filename}`);
                    resolve(true);
                }
            });
        });
    }

    /**
     * Download image reference list
     */
    async downloadImageList(): Promise<{ images: string[], timestamp: number } | null> {
        if (!this.config || !this.client) throw new Error('COS not configured');

        const filename = 'lumostime_images.json';

        return new Promise((resolve, reject) => {
            console.log(`[COS] Downloading image list: ${filename}`);

            this.client.getObject({
                Bucket: this.config!.bucketName,
                Region: this.config!.region,
                Key: filename
            }, (err: any, data: any) => {
                if (err) {
                    if (err.code === 'NoSuchKey') {
                        console.log('[COS] Image list file not found');
                        resolve(null);
                    } else {
                        console.error('[COS] Image list download failed', err);
                        resolve(null);
                    }
                } else {
                    try {
                        const content = data.Body;
                        const parsedData = JSON.parse(content);

                        console.log(`[COS] ✓ Image list downloaded: ${parsedData.images?.length || 0} images`);
                        resolve(parsedData);
                    } catch (parseError) {
                        console.error('[COS] Failed to parse image list JSON', parseError);
                        resolve(null);
                    }
                }
            });
        });
    }

    /**
     * Get image list timestamp
     */
    async getImageListTimestamp(): Promise<number> {
        try {
            const data = await this.downloadImageList();
            return data?.timestamp || 0;
        } catch (e) {
            return 0;
        }
    }

    /**
     * Create directory (not needed for COS, but kept for interface compatibility)
     */
    async createDirectory(path: string): Promise<boolean> {
        // COS doesn't have directories, objects are stored with keys that can contain "/"
        console.log(`[COS] Directory creation not needed for COS: ${path}`);
        return true;
    }

    /**
     * Get directory contents (list objects with prefix)
     */
    async getDirectoryContents(path: string): Promise<any[]> {
        if (!this.config || !this.client) return [];

        return new Promise((resolve) => {
            console.log(`[COS] Listing objects with prefix: ${path}`);

            this.client.getBucket({
                Bucket: this.config!.bucketName,
                Region: this.config!.region,
                Prefix: path.endsWith('/') ? path : `${path}/`
            }, (err: any, data: any) => {
                if (err) {
                    console.error('[COS] List objects error:', err);
                    resolve([]);
                } else {
                    resolve(data.Contents || []);
                }
            });
        });
    }
}

export const s3Service = new S3Service();