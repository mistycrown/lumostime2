import { createClient, WebDAVClient } from 'webdav';
import { HTTP } from '@awesome-cordova-plugins/http';
import { Capacitor } from '@capacitor/core';
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
        // If we have a proxy setup (like the Vercel one we added), we handle it in customFetch or here.
        // For now, let's assume direct URL and rely on customFetch to wrap it if needed.
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
        // NOT for Electron (Electron uses standard webdav client with webSecurity: false)
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
        // Web Platform (Not Native, Not Electron, Not Dev) -> Vercel Proxy
        // @ts-ignore
        else if (!isElectron && !import.meta.env.DEV) {
            options.customFetch = async (url: string, init: any) => {
                try {
                    // Wrap the URL with proxy endpoint
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
        localStorage.removeItem(STORAGE_KEY_URL);
        localStorage.removeItem(STORAGE_KEY_USER);
        localStorage.removeItem(STORAGE_KEY_PASS);
        this.client = null;
        this.config = null;
    }

    async checkConnection(): Promise<boolean> {
        // Native Bypass Check
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
            const stat = await this.client.stat(`/${filename}`);
            if (stat && stat.lastmod) {
                return new Date(stat.lastmod);
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    async uploadData(data: any, filename: string = 'lumostime_backup.json'): Promise<boolean> {
        if (!this.config && !this.client) throw new Error('WebDAV not configured');

        const content = JSON.stringify(data, null, 2);

        // Use native HTTP on mobile
        if (Capacitor.isNativePlatform() && this.config) {
            try {
                const url = this.config.url.endsWith('/') ? `${this.config.url}${filename}` : `${this.config.url}/${filename}`;
                const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
                HTTP.setDataSerializer('json');

                await HTTP.sendRequest(url, {
                    method: 'put',
                    data: JSON.parse(content),
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/json; charset=utf-8'
                    },
                    timeout: 30000
                });
                return true;
            } catch (error: any) {
                console.error('WebDAV Upload Error (Native):', error);
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

        // Use native HTTP on mobile
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
}

export const webdavService = new WebDAVService();
