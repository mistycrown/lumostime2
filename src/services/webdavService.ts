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
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
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
            console.log('[WebDAV] Setting up customFetch for native platform');
            options.customFetch = async (url: string, init: any) => {
                try {
                    console.log('[WebDAV] customFetch called:', { url, method: init.method });
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
        // Web Development: Use proxy for CORS bypass (only in dev mode)
        // @ts-ignore
        else if (!isElectron && import.meta.env.DEV) {
            // Only use proxy in development mode
            // In production web, the webdav client will use standard fetch (may have CORS issues)
            console.log('[WebDAV] Using development proxy for CORS bypass');
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
                // Test by uploading and deleting a small test file
                const testFileName = '.webdav_test_' + Date.now() + '.txt';
                const testUrl = this.config.url.endsWith('/') 
                    ? `${this.config.url}${testFileName}` 
                    : `${this.config.url}/${testFileName}`;
                const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
                
                // Create a small test file content
                const testContent = 'WebDAV connection test';
                const encoder = new TextEncoder();
                const testData = encoder.encode(testContent);
                
                console.log('[WebDAV] Testing connection by uploading test file:', testFileName);
                
                // Set serializer for raw data
                HTTP.setDataSerializer('raw');
                
                // Try to upload the test file
                const uploadResponse = await HTTP.sendRequest(testUrl, {
                    method: 'put',
                    data: testData.buffer,
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'text/plain'
                    },
                    timeout: 10000
                });
                
                console.log('[WebDAV] Test file upload status:', uploadResponse.status);
                
                // If upload succeeded, try to delete the test file
                if (uploadResponse.status === 200 || uploadResponse.status === 201 || uploadResponse.status === 204) {
                    try {
                        await HTTP.sendRequest(testUrl, {
                            method: 'delete',
                            headers: {
                                'Authorization': `Basic ${auth}`
                            },
                            timeout: 5000
                        });
                        console.log('[WebDAV] Test file deleted successfully');
                    } catch (deleteErr) {
                        console.warn('[WebDAV] Failed to delete test file (not critical):', deleteErr);
                    }
                    return true;
                }
                
                return false;
            } catch (nativeErr: any) {
                console.error('[WebDAV] Connection test failed:', nativeErr);
                // 401 means authentication failed
                if (nativeErr?.status === 401) {
                    console.error('[WebDAV] Authentication failed - wrong username or password');
                }
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
            // Add cache-busting to force fresh stat
            const cacheBuster = `?_=${Date.now()}`;
            // @ts-ignore - stat method may not have proper types for headers
            const stat = await this.client.stat(`/${filename}${cacheBuster}`, {
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            }) as any;
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
                console.log(`[WebDAV] 尝试创建目录: ${dirUrl}`);

                // 方法1: 尝试上传一个临时文件到目录中来创建目录结构
                const tempFileName = '.temp_dir_check';
                const tempUrl = `${dirUrl}${tempFileName}`;
                const emptyData = new Uint8Array(1);
                emptyData[0] = 32; // 空格字符

                try {
                    HTTP.setDataSerializer('raw');
                    const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
                    
                    const uploadResponse = await HTTP.sendRequest(tempUrl, {
                        method: 'put',
                        data: emptyData,
                        headers: {
                            'Authorization': `Basic ${auth}`,
                            'Content-Type': 'text/plain'
                        },
                        timeout: 30000
                    });

                    console.log(`[WebDAV] 临时文件上传状态: ${uploadResponse.status}`);

                    // 立即删除临时文件
                    try {
                        const deleteResponse = await HTTP.delete(tempUrl, {}, {});
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
        return this.deleteFile(`/images/${filename}`);
    }

    async deleteFile(path: string): Promise<boolean> {
        if (!this.client) return false;
        try {
            console.log(`[WebDAV] Deleting file: ${path}`);
            await this.client.deleteFile(path);
            return true;
        } catch (error) {
            console.error('WebDAV Delete Error:', error);
            return false;
        }
    }

    async uploadData(data: any, filename: string = 'lumostime_backup.json'): Promise<boolean> {
        if (!this.config && !this.client) throw new Error('WebDAV not configured');

        const content = JSON.stringify(data, null, 2);

        // NATIVE: Use native HTTP plugin directly (webdav client has CORS issues on mobile)
        if (Capacitor.isNativePlatform() && this.config) {
            console.log(`[WebDAV] Mobile Upload Data: ${filename}, size: ${content.length}`);
            try {
                const url = this.config.url.endsWith('/') ? `${this.config.url}${filename}` : `${this.config.url}/${filename}`;
                const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');

                console.log('[WebDAV] Upload URL:', url);

                // Convert string to Uint8Array for raw serializer
                const encoder = new TextEncoder();
                const uint8Data = encoder.encode(content);

                console.log(`[WebDAV] Data size: ${uint8Data.length} bytes, type: ${uint8Data.constructor.name}`);

                // Set global serializer before sending request
                HTTP.setDataSerializer('raw');
                
                const response = await HTTP.sendRequest(url, {
                    method: 'put',
                    data: uint8Data.buffer,
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/json; charset=utf-8'
                    },
                    timeout: 30000
                });

                console.log(`[WebDAV] Upload Success: status ${response.status}`);
                return response.status === 200 || response.status === 201 || response.status === 204;
            } catch (error: any) {
                console.error('[WebDAV] Native Upload Error:', error);
                console.error('[WebDAV] Error status:', error?.status);
                console.error('[WebDAV] Error message:', error?.message);
                console.error('[WebDAV] Error error:', error?.error);
                console.error('[WebDAV] Error url:', error?.url);
                console.error('[WebDAV] Full error JSON:', JSON.stringify(error, null, 2));
                throw error;
            }
        }

        // Browser/Electron: Use webdav client
        try {
            await this.client!.putFileContents(`/${filename}`, content, { overwrite: true });
            console.log(`[WebDAV] Upload Success: ${filename}`);
            return true;
        } catch (error) {
            console.error('WebDAV Upload Error:', error);
            throw error;
        }
    }

    async downloadData(filename: string = 'lumostime_backup.json'): Promise<any> {
        if (!this.config && !this.client) throw new Error('WebDAV not configured');

        // NATIVE: Use Filesystem.downloadFile for better performance
        // This avoids passing large JSON through WebView bridge
        if (Capacitor.isNativePlatform() && this.config) {
            try {
                const url = this.config.url.endsWith('/') ? `${this.config.url}${filename}` : `${this.config.url}/${filename}`;
                const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
                
                console.log(`[WebDAV] 移动端下载数据（原生方式）: ${filename}`);
                
                // Download directly to filesystem
                await Filesystem.downloadFile({
                    path: `temp/${filename}`,
                    url: url,
                    directory: Directory.Data,
                    headers: {
                        'Authorization': `Basic ${auth}`
                    }
                });
                
                console.log(`[WebDAV] ✓ 数据文件下载完成，正在读取...`);
                
                // Read the downloaded file
                const result = await Filesystem.readFile({
                    path: `temp/${filename}`,
                    directory: Directory.Data,
                    encoding: Encoding.UTF8
                });
                
                // Clean up temp file
                try {
                    await Filesystem.deleteFile({
                        path: `temp/${filename}`,
                        directory: Directory.Data
                    });
                } catch (e) {
                    // Ignore cleanup errors
                }
                
                console.log(`[WebDAV] ✓ 数据解析完成`);
                return JSON.parse(result.data as string);
                
            } catch (error: any) {
                console.error('WebDAV Download Error (Native):', error);
                throw error;
            }
        }

        // Browser/Electron: Use webdav client with cache control
        try {
            // Add cache-busting query parameter and headers to force fresh download
            const cacheBuster = `?_=${Date.now()}`;
            const content = await this.client!.getFileContents(`/${filename}${cacheBuster}`, { 
                format: 'text',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            return JSON.parse(content as string);
        } catch (error) {
            console.error('WebDAV Download Error:', error);
            throw error;
        }
    }

    private async normalizeToUint8Array(buffer: ArrayBuffer | string | Blob): Promise<Uint8Array> {
        if (buffer instanceof ArrayBuffer) {
            return new Uint8Array(buffer);
        } else if (buffer instanceof Blob) {
            const arrayBuffer = await buffer.arrayBuffer();
            return new Uint8Array(arrayBuffer);
        } else if (typeof buffer === 'string') {
            const base64Data = buffer.startsWith('data:') ? buffer.split(',')[1] : buffer;
            try {
                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                return bytes;
            } catch (e) {
                throw new Error('Invalid Base64 string');
            }
        }
        throw new Error(`Unsupported buffer type: ${typeof buffer}`);
    }

    async uploadImage(filename: string, buffer: ArrayBuffer | string | Blob): Promise<boolean> {
        console.log(`[WebDAV] 开始上传图片: ${filename}`);
        if (!this.config && !this.client) {
            console.error('[WebDAV] ✗ WebDAV未配置');
            throw new Error('WebDAV not configured');
        }

        try {
            // 统一转换为 Uint8Array
            const uint8Data = await this.normalizeToUint8Array(buffer);
            console.log(`[WebDAV] 数据准备完成，大小: ${uint8Data.length} bytes`);

            // NATIVE: Use native HTTP plugin
            if (Capacitor.isNativePlatform() && this.config) {
                const url = this.config.url.endsWith('/') ? `${this.config.url}images/${filename}` : `${this.config.url}/images/${filename}`;
                const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');

                try {
                    HTTP.setDataSerializer('raw');
                    
                    const response = await HTTP.sendRequest(url, {
                        method: 'put',
                        data: uint8Data.buffer,
                        headers: {
                            'Authorization': `Basic ${auth}`,
                            'Content-Type': 'image/jpeg'
                        },
                        timeout: 30000
                    });

                    console.log(`[WebDAV] ✓ 原生上传成功: ${filename}, Status: ${response.status}`);
                    return response.status === 200 || response.status === 201 || response.status === 204;
                } catch (error: any) {
                    if (error?.status === 409) {
                        throw new Error(`图片上传失败：请确保WebDAV根目录下存在 "images" 文件夹 (HTTP 409)`);
                    }
                    throw new Error(`原生上传失败: ${error.message || JSON.stringify(error)}`);
                }
            }

            // WEB/ELECTRON: Use webdav client
            // webdav client accepts ArrayBuffer directly
            const targetPath = `/images/${filename}`;
            await this.client!.putFileContents(targetPath, uint8Data.buffer, { overwrite: true });
            console.log(`[WebDAV] ✓ 图片上传成功: ${filename}`);
            return true;

        } catch (error: any) {
            console.error(`[WebDAV] ✗ 图片上传失败: ${filename}`, error);
            throw error;
        }
    }

    async downloadImage(filename: string): Promise<ArrayBuffer> {
        if (!this.config && !this.client) throw new Error('WebDAV not configured');

        const path = `/images/${filename}`;

        // NATIVE: Use Capacitor Filesystem.downloadFile for better performance
        // This downloads directly to the filesystem without going through WebView
        if (Capacitor.isNativePlatform() && this.config) {
            try {
                const url = this.config.url.endsWith('/') 
                    ? `${this.config.url}images/${filename}` 
                    : `${this.config.url}/images/${filename}`;
                
                console.log(`[WebDAV] 移动端下载图片（原生方式）: ${url}`);
                
                const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
                
                // Use Capacitor Filesystem.downloadFile - downloads directly to filesystem
                // This is much faster than HTTP.sendRequest with arraybuffer
                await Filesystem.downloadFile({
                    path: `images/${filename}`,
                    url: url,
                    directory: Directory.Data,
                    headers: {
                        'Authorization': `Basic ${auth}`
                    }
                });

                console.log(`[WebDAV] ✓ 移动端图片下载成功（原生）: ${filename}`);
                
                // Return empty ArrayBuffer as a placeholder
                // The file is already saved to the filesystem by downloadFile
                return new ArrayBuffer(0);
                
            } catch (error: any) {
                console.error(`[WebDAV] 移动端下载失败: ${filename}`, error);
                
                if (error?.message?.includes('404') || error?.message?.includes('Not Found')) {
                    throw new Error(`图片不存在: ${filename}。请确保图片已上传到 /images/ 目录。`);
                }
                
                throw new Error(`图片下载失败: ${filename} - ${error?.message || error?.error || 'Unknown error'}`);
            }
        }

        // WEB/ELECTRON: Use webdav client with cache control
        if (!this.client) throw new Error('WebDAV not configured');
        
        try {
            console.log(`[WebDAV] 尝试从路径下载: ${path}`);
            // Add cache-busting to force fresh download
            const cacheBuster = `?_=${Date.now()}`;
            const buffer = await this.client.getFileContents(`${path}${cacheBuster}`, { 
                format: 'binary',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
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

                const encoder = new TextEncoder();
                const uint8Data = encoder.encode(content);

                HTTP.setDataSerializer('raw');
                
                const response = await HTTP.sendRequest(url, {
                    method: 'put',
                    data: uint8Data.buffer,
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/json; charset=utf-8'
                    },
                    timeout: 30000
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
            // NATIVE: Use Filesystem.downloadFile for better performance
            if (Capacitor.isNativePlatform() && this.config) {
                const url = this.config.url.endsWith('/') ? `${this.config.url}${filename}` : `${this.config.url}/${filename}`;
                const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
                
                // Download directly to filesystem
                await Filesystem.downloadFile({
                    path: `temp/${filename}`,
                    url: url,
                    directory: Directory.Data,
                    headers: {
                        'Authorization': `Basic ${auth}`
                    }
                });
                
                // Read the downloaded file
                const result = await Filesystem.readFile({
                    path: `temp/${filename}`,
                    directory: Directory.Data,
                    encoding: Encoding.UTF8
                });
                
                // Clean up temp file
                try {
                    await Filesystem.deleteFile({
                        path: `temp/${filename}`,
                        directory: Directory.Data
                    });
                } catch (e) {
                    // Ignore cleanup errors
                }
                
                const data = JSON.parse(result.data as string);
                console.log(`[WebDAV] ✓ 图片列表下载成功: ${data.images?.length || 0} 个图片, 时间戳: ${new Date(data.timestamp).toLocaleString()}`);
                return data;
            }

            // Browser/Electron fallback with cache control
            const cacheBuster = `?_=${Date.now()}`;
            const content = await this.client!.getFileContents(`/${filename}${cacheBuster}`, { 
                format: 'text',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
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
