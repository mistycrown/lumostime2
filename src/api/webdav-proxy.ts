/**
 * @file webdav-proxy.ts
 * @input HTTP Request (Vercel Node.js Request)
 * @output Proxied WebDAV Response (HTTP Response)
 * @pos API Endpoint (Serverless Helper)
 * @description Vercel Serverless Function that proxies WebDAV requests to bypass CORS restrictions in web environments.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless 函数 - WebDAV 代理
 * 用于在生产环境中绕过 CORS 限制
 */
export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PROPFIND, MKCOL');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Depth');
    res.setHeader('Access-Control-Max-Age', '86400');

    // 处理 OPTIONS 预检请求
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // 从查询参数中获取目标 WebDAV URL
        const targetUrl = req.query.url as string;

        if (!targetUrl) {
            return res.status(400).json({ error: '缺少目标 URL 参数' });
        }

        // 准备转发请求的选项
        const fetchOptions: RequestInit = {
            method: req.method,
            headers: {
                'Content-Type': req.headers['content-type'] || 'application/xml; charset=utf-8',
                'Authorization': req.headers['authorization'] || '',
                'Depth': (Array.isArray(req.headers['depth']) ? req.headers['depth'][0] : (req.headers['depth'] as string)) || '0',
            },
        };

        // 如果有请求体,添加到 fetch 选项中
        if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
            if (typeof req.body === 'string') {
                fetchOptions.body = req.body;
            } else {
                fetchOptions.body = JSON.stringify(req.body);
            }
        }

        // 发起请求到实际的 WebDAV 服务器
        const response = await fetch(targetUrl, fetchOptions);

        // 复制响应头
        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
        });

        // 读取响应内容
        const content = await response.text();

        // 返回响应
        return res
            .status(response.status)
            .setHeader('Content-Type', response.headers.get('content-type') || 'text/plain')
            .send(content);

    } catch (error: any) {
        console.error('WebDAV Proxy Error:', error);
        return res.status(500).json({
            error: 'WebDAV 代理错误',
            message: error.message
        });
    }
}
