/**
 * @file webdavService.ts
 * @input WebDAV Server Credentials, Local Data
 * @output Remote Storage Operations (Upload/Download)
 * @pos Service (Data Synchronization)
 * @description Manages WebDAV connections and file operations, handling platform-specific networking (Cordova HTTP for native, Proxy for web).
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import { createClient, WebDAVClient } from 'webdav';
import { HTTP } from '@awesome-cordova-plugins/http';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Buffer } from 'buffer';

// Ensure Buffer is available globally for webdav lib
// Note: In Electron, we polyfilled this in preload.js and index.tsx as well.
if (typeof window !== 'undefined') {
    window.Buffer = window.Buffer || Buffer;
}

const STORAGE_KEY_URL = 'lumos_webdav_url';
const STORAGE_KEY_USER = 'lumos_webdav_user';
const STORAGE_KEY_PASS = 'lumos_webdav_pass';

export interface WebDAVConfig {
    url: string;
    username: string;
    password: string;
}

export class WebDAVService {
    private client: WebDAVClient | null = null;
    private config: WebDAVConfig | null = null;

    constructor() {
        this.loadConfig();
    }

    private getEffectiveUrl(url: string): string {
        // Check for Electron
        // @ts-ignore
        const isElectron = typeof window !== 'undefined' && window.ipcRenderer;

        // If Native or Electron, use URL directly (CORS disabled in Electron main process)
        if (Capacitor.isNativePlatform() || isElectron) {
            return url;
        }

        // Web Development: proxy requests to Jianguoyun through Vite to avoid CORS
        // @ts-ignore
        if (import.meta.env.DEV && url.includes('dav.jianguoyun.com')) {
            const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
            return cleanUrl.replace('https://dav.jianguoyun.com/dav', '/uv/jianguoyun');
        }

        // Web Production: return URL. 
        return url;
    }

    private loadConfig() {
        const url = localStorage.getItem(STORAGE_KEY_URL);
        const username = localStorage.getItem(STORAGE_KEY_USER);
        const password = localStorage.getItem(STORAGE_KEY_PASS);

        if (url && username && password) {
            this.saveConfig({ url, username, password });
        }
    }

    saveConfig(config: WebDAVConfig) {
        this.config = config;
        localStorage.setItem(STORAGE_KEY_URL, config.url);
        localStorage.setItem(STORAGE_KEY_USER, config.username);
        localStorage.setItem(STORAGE_KEY_PASS, config.password);

        let options: any = {
            username: config.username,
            password: config.password
        };

        // Check for Electron
        // @ts-ignore
        const isElectron = typeof window !== 'undefined' && window.ipcRenderer;

        // Use Cordova HTTP on native platform (Android/iOS)
        if (Capacitor.isNativePlatform()) {
            options.customFetch = async (url: string, init: any) => {
                try {
                    const method = (init.method || 'GET').toLowerCase();
                    const headers = { ...(init.headers || {}) };

                    if (!headers['Authorization']) {
                        const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
                        headers['Authorization'] = `Basic ${auth}`;
                    }

                    if (init.body && !headers['Content-Type']) {
                        headers['Content-Type'] = 'application/xml; charset=utf-8';
                    }

                    let data = init.body;
                    if (typeof data === 'undefined' || data === null) data = "";

                    const response = await HTTP.sendRequest(url, {
                        method: method,
                        data: data,
                        headers: headers,
                        serializer: 'utf8',
                        timeout: 30000,
                    });

                    return new Response(response.data, {
                        status: response.status,
                        statusText: 'OK',
                        headers: new Headers(response.headers)
                    });

                } catch (error: any) {
                    console.error("Cordova HTTP Error", error);
                    let errMsg = error.error || error.message || JSON.stringify(error);
                    if (typeof errMsg === 'string' && errMsg.startsWith('{')) {
                        try { errMsg = JSON.parse(errMsg).error || errMsg; } catch (e) { }
                    }
                    if (error.status) {
                        return new Response(error.error || '', {
                            status: error.status,
                            statusText: "Error",
                            headers: new Headers(error.headers)
                        });
                    }
                    throw error;
                }
            };
        }
        // Web Platform Proxy
        // @ts-ignore
        else if (!isElectron && !import.meta.env.DEV) {
            options.customFetch = async (url: string, init: any) => {
                try {
                    const proxyUrl = `/api/webdav-proxy?url=${encodeURIComponent(url)}`;
                    const response = await fetch(proxyUrl, {
                        ...init,
                        headers: {
                            ...init.headers,
                            'Authorization': init.headers?.Authorization ||
                                `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`
                        }
                    });
                    return response;
                } catch (error: any) {
                    console.error("Vercel Proxy Error", error);
                    throw error;
                }
            };
        }

        this.client = createClient(this.getEffectiveUrl(config.url), options);
    }

    getConfig(): WebDAVConfig | null {
        const url = localStorage.getItem(STORAGE_KEY_URL);
        const username = localStorage.getItem(STORAGE_KEY_USER);
        const password = localStorage.getItem(STORAGE_KEY_PASS);

        if (url && username && password) {
            return { url, username, password };
        }
        return null;
    }

    clearConfig() {
        // 只清理内存中的配置和客户端，保留localStorage中的配置缓存
        this.client = null;
        this.config = null;
        console.log('[WebDAV] 连接已断开，但配置缓存已保留');
    }

    // 新增：完全清理配置的方法（包括localStorage）
    clearAllConfig() {
        localStorage.removeItem(STORAGE_KEY_URL);
        localStorage.removeItem(STORAGE_KEY_USER);
        localStorage.removeItem(STORAGE_KEY_PASS);
        this.client = null;
        this.config = null;
        console.log('[WebDAV] 所有配置已完全清理');
    }

    async checkConnection(): Promise<boolean> {
        if (Capacitor.isNativePlatform() && this.config) {
            try {
                const url = this.config.url.endsWith('/') ? this.config.url : this.config.url + '/';
                const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');

                const response = await HTTP.sendRequest(url, {
                    method: 'options',
                    headers: { 'Authorization': `Basic ${auth}` },
                    timeout: 10000
                });
                return response.status === 200 || response.status === 204;
            } catch (nativeErr: any) {
                console.error('Native Direct Check Failed', nativeErr);
                return false;
            }
        }

        if (!this.client) return false;
        try {
            const results = await this.client.getDirectoryContents('/');
            return Array.isArray(results);
        } catch (error: any) {
            console.error('WebDAV Connection Error:', error);
            return false;
        }
    }

    async statFile(filename: string = 'lumostime_backup.json'): Promise<Date | null> {
        if (!this.client) return null;
        try {
            // @ts-ignore
            const stat = await this.client.stat(`/${filename}`) as any;
            if (stat && stat.lastmod) {
                return new Date(stat.lastmod);
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    async createDirectory(path: string): Promise<boolean> {
        console.log(`[WebDAV] 创建目录: ${path}`);
        
        if (!this.client && !this.config) {
            console.error('[WebDAV] ✗ 客户端未初始化');
            return false;
        }

        // 移动端：使用多种方法尝试创建目录
        if (Capacitor.isNativePlatform() && this.config) {
            try {
                const baseUrl = this.config.url.endsWith('/') ? this.config.url : `${this.config.url}/`;
                const dirUrl = `${baseUrl}${path.startsWith('/') ? path.slice(1) : path}/`;
                const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');

                console.log(`[WebDAV] 尝试创建目录: ${dirUrl}`);

                // 方法1: 尝试上传一个临时文件到目录中来创建目录结构
                const tempFileName = '.temp_dir_check';
                const tempUrl = `${dirUrl}${tempFileName}`;
                const emptyData = new Uint8Array(1);
                emptyData[0] = 32; // 空格字符
                
                HTTP.setDataSerializer('raw');
                
                try {
                    // 上传临时文件（这会自动创建目录）
                    const uploadResponse = await new Promise((resolve, reject) => {
                        HTTP.put(tempUrl, emptyData, {
                            'Authorization': `Basic ${auth}`,
                            'Content-Type': 'text/plain'
                        }, resolve, reject);
                    });

                    console.log(`[WebDAV] 临时文件上传状态: ${uploadResponse.status}`);

                    // 立即删除临时文件
                    try {
                        const deleteResponse = await new Promise((resolve, reject) => {
                            HTTP.delete(tempUrl, {}, {
                                'Authorization': `Basic ${auth}`
                            }, resolve, reject);
                        });
                        console.log(`[WebDAV] ✓ 临时文件已删除，状态: ${deleteResponse.status}`);
                    } catch (deleteError: any) {
                        console.warn(`[WebDAV] 删除临时文件失败（不影响功能）:`, deleteError?.message);
                    }

                    if (uploadResponse.status === 200 || uploadResponse.status === 201 || uploadResponse.status === 204) {
                        console.log(`[WebDAV] ✓ 目录创建成功: ${path}`);
                        return true;
                    }
                } catch (error: any) {
                    console.warn(`[WebDAV] 临时文件方法失败:`, JSON.stringify(error, null, 2));
                    
                    // 如果是 409 错误，可能目录已存在
                    if (error?.status === 409) {
                        console.log(`[WebDAV] ℹ 目录可能已存在: ${path}`);
                        return true;
                    }
                }

                // 方法2: 如果临时文件方法失败，仍然返回 true 让上传继续尝试
                console.log(`[WebDAV] ℹ 假设目录存在或将通过上传自动创建: ${path}`);
                return true;

            } catch (error: any) {
                console.warn(`[WebDAV] 创建目录失败:`, JSON.stringify(error, null, 2));
                // 即使失败也返回 true，让后续上传尝试
                return true;
            }
        }

        // Web/Electron：使用 webdav 客户端
        if (!this.client) {
            console.error('[WebDAV] ✗ 客户端未初始化');
            return false;
        }
        try {
            await this.client.createDirectory(path);
            console.log(`[WebDAV] ✓ 目录创建成功: ${path}`);
            return true;
        } catch (error: any) {
            // Ignore if exists (409 Conflict)
            if (error?.status === 409 || error?.response?.status === 409) {
                console.log(`[WebDAV] ℹ 目录已存在: ${path}`);
                return true;
            }
            console.warn(`[WebDAV] 创建目录失败 (可能已存在): ${path}`, error?.message || error);
            return false;
        }
    }

    async getDirectoryContents(path: string): Promise<any[]> {
        console.log(`[WebDAV] 获取目录内容: ${path}`);
        
        // 移动端：由于 PROPFIND 不被支持，返回空数组并依赖上传时的错误处理
        if (Capacitor.isNativePlatform() && this.config) {
            console.log('[WebDAV] 移动端跳过目录列表获取 (PROPFIND 不支持)');
            // 对于移动端，我们无法获取目录列表，返回空数组
            // 这意味着所有本地文件都会被视为"新文件"并尝试上传
            // 如果文件已存在，服务器会返回适当的状态码
            return [];
        }

        // Web/Electron：使用 webdav 客户端
        if (!this.client) return [];
        try {
            const results = await this.client.getDirectoryContents(path);
            console.log(`[WebDAV] ✓ 获取到 ${Array.isArray(results) ? results.length : 1} 个项目`);
            return Array.isArray(results) ? results : [results];
        } catch (error) {
            console.error('WebDAV List Error:', error);
            return [];
        }
    }

    async deleteImage(filename: string): Promise<boolean> {
        if (!this.client) return false;
        try {
            await this.client.deleteFile(`/images/${filename}`);
            return true;
        } catch (error) {
            console.error('WebDAV Delete Error:', error);
            return false;
        }
    }

    async uploadData(data: any, filename: string = 'lumostime_backup.json'): Promise<boolean> {
        if (!this.config && !this.client) throw new Error('WebDAV not configured');

        const content = JSON.stringify(data, null, 2);

        // NATIVE: Use put method with Uint8Array for WebDAV
        if (Capacitor.isNativePlatform() && this.config) {
            console.log(`[WebDAV] Mobile Upload Data: ${filename}, size: ${content.length}`);
            try {
                const url = this.config.url.endsWith('/') ? `${this.config.url}${filename}` : `${this.config.url}/${filename}`;
                const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');

                console.log('[WebDAV] Converting string to Uint8Array for WebDAV upload...');

                // Convert string to Uint8Array (required by advanced-http plugin)
                const encoder = new TextEncoder();
                const uint8Data = encoder.encode(content);

                console.log(`[WebDAV] Converted to Uint8Array, size: ${uint8Data.length} bytes`);

                // Set data serializer to raw for binary data
                HTTP.setDataSerializer('raw');

                // Use put method for WebDAV PUT request
                const response = await new Promise((resolve, reject) => {
                    HTTP.put(url, uint8Data, {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/json; charset=utf-8'
                    }, resolve, reject);
                });

                console.log(`[WebDAV] Upload Success: status ${response.status}`);
                return response.status === 200 || response.status === 201 || response.status === 204;
            } catch (error: any) {
                console.error('[WebDAV] Native Upload Error Details:', JSON.stringify(error, null, 2));
                throw error;
            }
        }

        // Browser/Electron fallback
        try {
            await this.client!.putFileContents(`/${filename}`, content, { overwrite: true });
            return true;
        } catch (error) {
            console.error('WebDAV Upload Error:', error);
            throw error;
        }
    }

    async downloadData(filename: string = 'lumostime_backup.json'): Promise<any> {
        if (!this.config && !this.client) throw new Error('WebDAV not configured');

        // Use native HTTP on mobile to bypass CORS if possible (GET is less strict usually)
        if (Capacitor.isNativePlatform() && this.config) {
            try {
                const url = this.config.url.endsWith('/') ? `${this.config.url}${filename}` : `${this.config.url}/${filename}`;
                const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
                const response = await HTTP.sendRequest(url, {
                    method: 'get',
                    headers: { 'Authorization': `Basic ${auth}` },
                    timeout: 30000
                });
                const content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
                return JSON.parse(content);
            } catch (error: any) {
                console.error('WebDAV Download Error (Native):', error);
                throw error;
            }
        }

        // Browser/Electron fallback
        try {
            const content = await this.client!.getFileContents(`/${filename}`, { format: 'text' });
            return JSON.parse(content as string);
        } catch (error) {
            console.error('WebDAV Download Error:', error);
            throw error;
        }
    }

    async uploadImage(filename: string, buffer: ArrayBuffer | string | Blob): Promise<boolean> {
        console.log(`[WebDAV] 开始上传图片: ${filename}`);
        if (!this.config && !this.client) {
            console.error('[WebDAV] ✗ WebDAV未配置');
            throw new Error('WebDAV not configured');
        }

        // NATIVE: Use put method with Uint8Array for WebDAV image upload
        if (Capacitor.isNativePlatform() && this.config) {
            const url = this.config.url.endsWith('/') ? `${this.config.url}images/${filename}` : `${this.config.url}/images/${filename}`;
            const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');

            // Convert data to Uint8Array for advanced-http plugin
            let uint8Data: Uint8Array;
            
            if (buffer instanceof ArrayBuffer) {
                uint8Data = new Uint8Array(buffer);
            } else if (buffer instanceof Blob) {
                // Convert Blob to ArrayBuffer first
                console.log('[WebDAV] 检测到 Blob，转换为 ArrayBuffer...');
                const arrayBuffer = await buffer.arrayBuffer();
                uint8Data = new Uint8Array(arrayBuffer);
            } else if (typeof buffer === 'string' && buffer.startsWith('data:')) {
                // Convert base64 data URL to Uint8Array
                const base64Data = buffer.split(',')[1] || buffer;
                const binaryString = atob(base64Data);
                uint8Data = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    uint8Data[i] = binaryString.charCodeAt(i);
                }
            } else if (typeof buffer === 'string') {
                // Convert base64 string to Uint8Array
                const binaryString = atob(buffer);
                uint8Data = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    uint8Data[i] = binaryString.charCodeAt(i);
                }
            } else {
                console.error('[WebDAV] ✗ 移动端不支持的数据类型:', typeof buffer, buffer?.constructor?.name);
                throw new Error(`Unsupported buffer type: ${typeof buffer} (${buffer?.constructor?.name})`);
            }

            console.log(`[WebDAV] 转换为 Uint8Array，大小: ${uint8Data.length} bytes`);

            // Set data serializer to raw for binary data
            HTTP.setDataSerializer('raw');

            try {
                console.log('[WebDAV] 使用原生HTTP插件上传图片...');
                
                // Use put method for WebDAV PUT request
                const response = await new Promise((resolve, reject) => {
                    HTTP.put(url, uint8Data, {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'image/jpeg'
                    }, resolve, reject);
                });

                console.log(`[WebDAV] ✓ 原生上传成功: ${filename}, Status: ${response.status}`);
                return response.status === 200 || response.status === 201 || response.status === 204;

            } catch (error: any) {
                console.error(`[WebDAV] ✗ 原生上传失败: ${filename}`);
                console.error('[WebDAV] Native Error Details:', JSON.stringify(error, null, 2));
                
                // 如果是 409 错误或其他错误，不再自动创建目录，直接报错
                if (error?.status === 409) {
                    console.log(`[WebDAV] HTTP 409 冲突 - 可能是 /images 目录不存在`);
                    throw new Error(`图片上传失败：请确保WebDAV根目录下存在 "images" 文件夹。错误详情: ${error.message || 'HTTP 409'}`);
                }
                
                throw new Error(`图片上传失败: ${error.message || 'Unknown error'}`);
            }
        }

        // Web/Electron Logic
        const targetPath = `/images/${filename}`;
        console.log(`[WebDAV] 目标路径: ${targetPath}`);

        // Convert data to proper format for webdav library
        let uploadData: ArrayBuffer;

        if (buffer instanceof ArrayBuffer) {
            uploadData = buffer;
            console.log(`[WebDAV] (Web) 使用 ArrayBuffer，大小: ${uploadData.byteLength} bytes`);
        } else if (buffer instanceof Blob) {
            console.log('[WebDAV] (Web) 检测到 Blob，开始转换...');
            try {
                uploadData = await buffer.arrayBuffer();
                console.log(`[WebDAV] (Web) ✓ Blob转换完成, ArrayBuffer大小: ${uploadData.byteLength} bytes`);
            } catch (e) {
                console.error('[WebDAV] ✗ Blob转换失败:', e);
                throw new Error('Failed to convert Blob to ArrayBuffer');
            }
        } else if (typeof buffer === 'string' && buffer.startsWith('data:')) {
            console.log('[WebDAV] (Web) 检测到Base64 data URL, 开始转换...');
            try {
                const base64Data = buffer.split(',')[1] || buffer;
                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                uploadData = bytes.buffer;
                console.log(`[WebDAV] (Web) ✓ 转换完成, ArrayBuffer大小: ${uploadData.byteLength} bytes`);
            } catch (e) {
                console.error('[WebDAV] ✗ Base64转换失败:', e);
                throw new Error('Invalid Base64 image data');
            }
        } else if (typeof buffer === 'string') {
            // Handle plain base64 string (without data: prefix)
            console.log('[WebDAV] (Web) 检测到Base64字符串, 开始转换...');
            try {
                const binaryString = atob(buffer);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                uploadData = bytes.buffer;
                console.log(`[WebDAV] (Web) ✓ Base64转换完成, ArrayBuffer大小: ${uploadData.byteLength} bytes`);
            } catch (e) {
                console.error('[WebDAV] ✗ Base64转换失败:', e);
                throw new Error('Invalid Base64 image data');
            }
        } else {
            console.error('[WebDAV] ✗ 不支持的数据类型:', typeof buffer, buffer?.constructor?.name);
            console.error('[WebDAV] 数据详情:', buffer);
            throw new Error(`Unsupported buffer type: ${typeof buffer} (${buffer?.constructor?.name})`);
        }

        try {
            console.log('[WebDAV] (Web) 调用putFileContents...');
            await this.client!.putFileContents(targetPath, uploadData, { overwrite: true });
            console.log(`[WebDAV] ✓ 图片上传成功: ${filename}`);
            return true;
        } catch (error: any) {
            console.error(`[WebDAV] ✗ 图片上传失败: ${filename}`);
            console.error('[WebDAV] Error:', error);
            throw error;
        }
    }

    async downloadImage(filename: string): Promise<ArrayBuffer> {
        if (!this.client) throw new Error('WebDAV not configured');
        
        // 只从 /images/ 目录下载，不再fallback到根目录
        const path = `/images/${filename}`;
        
        try {
            console.log(`[WebDAV] 尝试从路径下载: ${path}`);
            const buffer = await this.client.getFileContents(path, { format: 'binary' });
            console.log(`[WebDAV] ✓ 图片下载成功: ${filename} from ${path}`);
            return buffer as ArrayBuffer;
        } catch (error: any) {
            console.error(`[WebDAV] 从 ${path} 下载失败:`, error?.message);
            
            if (error?.status === 404) {
                throw new Error(`图片不存在: ${filename}。请确保图片已上传到 /images/ 目录。`);
            }
            
            throw new Error(`图片下载失败: ${filename} - ${error?.message || 'Unknown error'}`);
        }
    }

    /**
     * 上传图片引用列表（独立文件）
     */
    async uploadImageList(imageList: string[]): Promise<boolean> {
        if (!this.config && !this.client) throw new Error('WebDAV not configured');

        try {
            const data = {
                images: imageList,
                timestamp: Date.now(),
                version: '1.0.0'
            };
            const content = JSON.stringify(data, null, 2);
            const filename = 'lumostime_images.json';

            // NATIVE: Use put method with Uint8Array for WebDAV
            if (Capacitor.isNativePlatform() && this.config) {
                console.log(`[WebDAV] Mobile Upload Image List: ${filename}, size: ${content.length}`);
                const url = this.config.url.endsWith('/') ? `${this.config.url}${filename}` : `${this.config.url}/${filename}`;
                const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');

                // Convert string to Uint8Array
                const encoder = new TextEncoder();
                const uint8Data = encoder.encode(content);

                // Set data serializer to raw for binary data
                HTTP.setDataSerializer('raw');

                // Use put method for WebDAV PUT request
                const response = await new Promise((resolve, reject) => {
                    HTTP.put(url, uint8Data, {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/json; charset=utf-8'
                    }, resolve, reject);
                });

                console.log(`[WebDAV] ✓ 图片列表上传成功: ${imageList.length} 个图片, status: ${response.status}`);
                return response.status === 200 || response.status === 201 || response.status === 204;
            }

            // Browser/Electron fallback
            await this.client!.putFileContents(`/${filename}`, content, { overwrite: true });
            console.log(`[WebDAV] ✓ 图片列表上传成功: ${imageList.length} 个图片`);
            return true;
        } catch (e) {
            console.error('[WebDAV] 图片列表上传失败', e);
            throw e;
        }
    }

    /**
     * 下载图片引用列表（独立文件）
     */
    async downloadImageList(): Promise<{ images: string[], timestamp: number } | null> {
        if (!this.config && !this.client) throw new Error('WebDAV not configured');

        const filename = 'lumostime_images.json';

        try {
            // NATIVE: Use native HTTP on mobile
            if (Capacitor.isNativePlatform() && this.config) {
                const url = this.config.url.endsWith('/') ? `${this.config.url}${filename}` : `${this.config.url}/${filename}`;
                const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
                const response = await HTTP.sendRequest(url, {
                    method: 'get',
                    headers: { 'Authorization': `Basic ${auth}` },
                    timeout: 30000
                });
                const content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
                const data = JSON.parse(content);
                console.log(`[WebDAV] ✓ 图片列表下载成功: ${data.images?.length || 0} 个图片, 时间戳: ${new Date(data.timestamp).toLocaleString()}`);
                return data;
            }

            // Browser/Electron fallback
            const content = await this.client!.getFileContents(`/${filename}`, { format: 'text' });
            const data = JSON.parse(content as string);
            console.log(`[WebDAV] ✓ 图片列表下载成功: ${data.images?.length || 0} 个图片, 时间戳: ${new Date(data.timestamp).toLocaleString()}`);
            return data;
        } catch (e) {
            console.log('[WebDAV] 图片列表文件不存在或下载失败');
            return null;
        }
    }

    /**
     * 获取图片列表文件的时间戳
     */
    async getImageListTimestamp(): Promise<number> {
        try {
            const data = await this.downloadImageList();
            return data?.timestamp || 0;
        } catch (e) {
            return 0;
        }
    }
}

export const webdavService = new WebDAVService();
