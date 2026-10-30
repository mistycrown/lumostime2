/**
 * @file compatibleS3Service.ts
 * @updated 2026-10-30: Persists optional User-Agent and uses native desktop transport when configured.
 * @input Compatible S3 credentials, endpoint config, local data
 * @output Remote storage operations for S3-compatible storage
 * @pos Service (Data Synchronization)
 * @description Manages generic S3-compatible storage using the AWS S3 client while preserving the existing sync object layout.
 * @updated 2026-09-25: Stores versioned content/theme image groups in the cloud manifest.
 * @updated 2026-10-22: Uses conditional main-backup reads while retaining full verification reads.
 * @updated 2026-10-25: Preserves stored JSON content types so OSS accepts backup and image-manifest reads.
 * @updated 2026-10-25: Normalizes native text and binary responses to SDK-readable Blobs, including error bodies.
 *
 * 修改历史:
 * - 2026-04-19: Added isolated compatible S3 service so Tencent Cloud COS can remain unchanged while supporting generic S3-compatible storage.
 * - 2026-04-20: Added an Android native transport path by reusing AWS SDK signing and moving only the actual request I/O to Cordova HTTP.
 * - 2026-10-25: Removed JSON response content-type overrides rejected by OSS without changing cache controls or verification.
 * - 2026-10-25: Wrapped native text responses in Blobs and preserved existing Blob payloads to avoid deserialization failures.
 */
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import { HTTP, HTTPResponse } from '@awesome-cordova-plugins/http';
import { Capacitor } from '@capacitor/core';
import { HttpRequest, HttpResponse } from '@smithy/protocol-http';
import type { HttpHandlerOptions } from '@smithy/types';
import { buildCloudImageManifest, CloudImageManifest, ImageManifestUpload } from './imageManifest';
import { CloudJsonCache, CloudJsonReadOptions } from '../utils/cloudJsonCache';
import { normalizeS3UserAgent } from '../utils/compatibleS3Transport';
import { DesktopCompatibleS3RequestHandler } from './compatibleS3DesktopTransport';

export interface CompatibleS3Config {
  bucketName: string;
  region: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  userAgent?: string;
}

const STORAGE_KEY_BUCKET = 'lumos_compatible_s3_bucket';
const STORAGE_KEY_REGION = 'lumos_compatible_s3_region';
const STORAGE_KEY_ENDPOINT = 'lumos_compatible_s3_endpoint';
const STORAGE_KEY_ACCESS_KEY_ID = 'lumos_compatible_s3_access_key_id';
const STORAGE_KEY_SECRET_ACCESS_KEY = 'lumos_compatible_s3_secret_access_key';
const STORAGE_KEY_FORCE_PATH_STYLE = 'lumos_compatible_s3_force_path_style';
const STORAGE_KEY_USER_AGENT = 'lumos_compatible_s3_user_agent';

class NativeCompatibleS3RequestHandler {
  constructor(private userAgent?: string) {}

  destroy() {}

  updateHttpClientConfig() {}

  httpHandlerConfigs() {
    return {};
  }

  async handle(request: HttpRequest, options: HttpHandlerOptions = {}): Promise<{ response: HttpResponse }> {
    const method = request.method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'head' | 'delete' | 'options';
    const url = this.buildUrl(request);
    const headers = this.normalizeHeaders(request.headers);
    if (this.userAgent) headers['User-Agent'] = this.userAgent;
    const normalizedBody = await this.normalizeRequestBody(request.body);
    const timeout = typeof options.requestTimeout === 'number'
      ? Math.max(1, Math.ceil(options.requestTimeout / 1000))
      : undefined;

    try {
      const response = await HTTP.sendRequest(url, {
        method,
        headers,
        data: normalizedBody.data as any,
        serializer: normalizedBody.serializer,
        timeout,
        responseType: method === 'head' ? 'text' : 'arraybuffer'
      });

      return {
        response: this.toSmithyResponse(response)
      };
    } catch (error: any) {
      if (typeof error?.status === 'number' && error.status > 0) {
        return {
          response: this.toSmithyResponse(error)
        };
      }

      throw error;
    }
  }

  private buildUrl(request: HttpRequest): string {
    const protocol = request.protocol.endsWith(':') ? request.protocol : `${request.protocol}:`;
    const port = request.port ? `:${request.port}` : '';
    const queryString = this.buildQueryString(request.query);

    return `${protocol}//${request.hostname}${port}${request.path}${queryString ? `?${queryString}` : ''}`;
  }

  private buildQueryString(query: Record<string, unknown> = {}): string {
    const params = new URLSearchParams();

    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (item !== undefined && item !== null) {
            params.append(key, String(item));
          }
        });
        return;
      }

      params.append(key, String(value));
    });

    return params.toString();
  }

  private normalizeHeaders(headers: Record<string, string> = {}): Record<string, string> {
    return Object.entries(headers).reduce<Record<string, string>>((result, [key, value]) => {
      if (value !== undefined) {
        result[key] = String(value);
      }
      return result;
    }, {});
  }

  private async normalizeRequestBody(body: unknown): Promise<{
    data?: unknown;
    serializer?: 'json' | 'urlencoded' | 'utf8' | 'multipart' | 'raw';
  }> {
    if (body === undefined || body === null) {
      return {};
    }

    if (typeof body === 'string') {
      return {
        data: body,
        serializer: 'utf8'
      };
    }

    if (body instanceof ArrayBuffer) {
      return {
        data: body,
        serializer: 'raw'
      };
    }

    if (body instanceof Uint8Array) {
      return {
        data: body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
        serializer: 'raw'
      };
    }

    if (ArrayBuffer.isView(body)) {
      return {
        data: body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
        serializer: 'raw'
      };
    }

    if (body instanceof Blob) {
      return {
        data: await body.arrayBuffer(),
        serializer: 'raw'
      };
    }

    if (typeof (body as { arrayBuffer?: unknown }).arrayBuffer === 'function') {
      return {
        data: await (body as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer(),
        serializer: 'raw'
      };
    }

    if (typeof (body as { transformToByteArray?: unknown }).transformToByteArray === 'function') {
      const bytes = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
      return {
        data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
        serializer: 'raw'
      };
    }

    return {
      data: body,
      serializer: 'json'
    };
  }

  private toSmithyResponse(response: Pick<HTTPResponse, 'status' | 'headers' | 'data' | 'error'>): HttpResponse {
    return new HttpResponse({
      statusCode: response.status,
      headers: this.normalizeHeaders(response.headers || {}),
      body: this.normalizeResponseBody(response.data ?? response.error ?? '')
    });
  }

  private normalizeResponseBody(body: unknown): Blob {
    if (body === undefined || body === null || body === '') {
      return new Blob([]);
    }

    if (body instanceof Blob) {
      return body;
    }

    if (body instanceof Uint8Array) {
      return new Blob([body]);
    }

    if (body instanceof ArrayBuffer) {
      return new Blob([body]);
    }

    if (ArrayBuffer.isView(body)) {
      return new Blob([body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength)]);
    }

    if (typeof body === 'string') {
      // Native HTTP failures return XML as text; the SDK's browser collector
      // requires a Blob or ReadableStream even when parsing an error response.
      return new Blob([body]);
    }

    return new Blob([JSON.stringify(body)]);
  }
}

export class CompatibleS3Service {
  private jsonCache = new CloudJsonCache();
  private config: CompatibleS3Config | null = null;
  private client: S3Client | null = null;

  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    const bucketName = localStorage.getItem(STORAGE_KEY_BUCKET);
    const region = localStorage.getItem(STORAGE_KEY_REGION);
    const endpoint = localStorage.getItem(STORAGE_KEY_ENDPOINT);
    const accessKeyId = localStorage.getItem(STORAGE_KEY_ACCESS_KEY_ID);
    const secretAccessKey = localStorage.getItem(STORAGE_KEY_SECRET_ACCESS_KEY);

    if (bucketName && region && endpoint && accessKeyId && secretAccessKey) {
      const forcePathStyle = localStorage.getItem(STORAGE_KEY_FORCE_PATH_STYLE) !== 'false';
      let userAgent: string | undefined;
      try {
        userAgent = normalizeS3UserAgent(localStorage.getItem(STORAGE_KEY_USER_AGENT) || undefined);
      } catch {
        console.warn('[CompatibleS3] Ignored invalid stored User-Agent');
      }

      this.config = {
        bucketName,
        region,
        endpoint,
        accessKeyId,
        secretAccessKey,
        forcePathStyle,
        ...(userAgent ? { userAgent } : {})
      };

      this.initializeClient();
    }
  }

  private initializeClient() {
    if (!this.config) {
      return;
    }

    try {
      const clientConfig: ConstructorParameters<typeof S3Client>[0] = {
        region: this.config.region,
        endpoint: this.config.endpoint,
        forcePathStyle: this.config.forcePathStyle,
        credentials: {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey
        }
      };

      if (Capacitor.isNativePlatform()) {
        clientConfig.requestHandler = new NativeCompatibleS3RequestHandler(this.config.userAgent);
      } else if (this.config.userAgent && typeof window !== 'undefined' && window.compatibleS3Connection) {
        clientConfig.requestHandler = new DesktopCompatibleS3RequestHandler(window.compatibleS3Connection, this.config.userAgent);
      }

      this.client = new S3Client(clientConfig);
    } catch (error) {
      console.error('[CompatibleS3] Failed to initialize client:', error);
      this.client = null;
    }
  }

  private getClient(): S3Client {
    if (!this.client || !this.config) {
      throw new Error('Compatible S3 not configured');
    }

    return this.client;
  }

  private async send(command: Parameters<S3Client['send']>[0]): Promise<any> {
    if (this.config?.userAgent && !Capacitor.isNativePlatform()
      && (typeof window === 'undefined' || !window.compatibleS3Connection)) {
      throw new Error('自定义 User-Agent 需要使用支持此功能的桌面端或手机端');
    }
    try {
      return await this.getClient().send(command);
    } catch (error: any) {
      if (error?.$metadata?.httpStatusCode === 401) {
        error.message = '对象存储鉴权失败（HTTP 401）：请检查密钥、区域及 User-Agent 是否与服务商的客户端类型一致';
      }
      throw error;
    }
  }

  private getBucket(): string {
    if (!this.config) {
      throw new Error('Compatible S3 not configured');
    }

    return this.config.bucketName;
  }

  private normalizeEndpoint(endpoint: string): string {
    const trimmed = endpoint.trim();

    if (!trimmed) {
      return trimmed;
    }

    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }

    return `https://${trimmed}`;
  }

  private normalizeConfig(config: CompatibleS3Config): CompatibleS3Config {
    const userAgent = normalizeS3UserAgent(config.userAgent);
    return {
      bucketName: config.bucketName.trim(),
      region: config.region.trim(),
      endpoint: this.normalizeEndpoint(config.endpoint),
      accessKeyId: config.accessKeyId.trim(),
      secretAccessKey: config.secretAccessKey.trim(),
      forcePathStyle: config.forcePathStyle,
      ...(userAgent ? { userAgent } : {})
    };
  }

  private getErrorCode(error: unknown): string | undefined {
    if (error && typeof error === 'object' && 'Code' in error && typeof (error as { Code?: unknown }).Code === 'string') {
      return (error as { Code: string }).Code;
    }

    if (error && typeof error === 'object' && 'code' in error && typeof (error as { code?: unknown }).code === 'string') {
      return (error as { code: string }).code;
    }

    return undefined;
  }

  private getErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
      return (error as { message: string }).message;
    }

    return '未知错误';
  }

  private async normalizeStringBody(body: unknown): Promise<string> {
    if (!body) {
      return '';
    }

    if (typeof body === 'string') {
      return body;
    }

    if (body instanceof Blob) {
      return body.text();
    }

    if (body instanceof Uint8Array) {
      return new TextDecoder('utf-8').decode(body);
    }

    if (body instanceof ArrayBuffer) {
      return new TextDecoder('utf-8').decode(new Uint8Array(body));
    }

    if (typeof (body as { transformToString?: unknown }).transformToString === 'function') {
      return (body as { transformToString: () => Promise<string> }).transformToString();
    }

    if (typeof (body as { transformToByteArray?: unknown }).transformToByteArray === 'function') {
      const bytes = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
      return new TextDecoder('utf-8').decode(bytes);
    }

    if (typeof (body as { text?: unknown }).text === 'function') {
      return (body as { text: () => Promise<string> }).text();
    }

    return String(body);
  }

  private async normalizeBinaryBody(body: unknown): Promise<ArrayBuffer> {
    if (!body) {
      return new ArrayBuffer(0);
    }

    if (body instanceof ArrayBuffer) {
      return body;
    }

    if (body instanceof Blob) {
      return body.arrayBuffer();
    }

    if (body instanceof Uint8Array) {
      return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer;
    }

    if (typeof (body as { transformToByteArray?: unknown }).transformToByteArray === 'function') {
      const bytes = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    }

    if (typeof (body as { arrayBuffer?: unknown }).arrayBuffer === 'function') {
      return (body as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer();
    }

    throw new Error('Failed to convert compatible S3 response body');
  }

  private async normalizeUploadBody(
    buffer: ArrayBuffer | string | Blob,
    defaultContentType: string
  ): Promise<{ body: Uint8Array | string; contentType: string }> {
    if (buffer instanceof ArrayBuffer) {
      return {
        body: new Uint8Array(buffer),
        contentType: defaultContentType
      };
    }

    if (buffer instanceof Blob) {
      const bytes = new Uint8Array(await buffer.arrayBuffer());
      return {
        body: bytes,
        contentType: buffer.type || defaultContentType
      };
    }

    if (buffer.startsWith('data:')) {
      const [header, base64Data] = buffer.split(',');
      const contentType = header.split(':')[1].split(';')[0] || defaultContentType;
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);

      for (let index = 0; index < binaryString.length; index += 1) {
        bytes[index] = binaryString.charCodeAt(index);
      }

      return {
        body: bytes,
        contentType
      };
    }

    const binaryString = atob(buffer);
    const bytes = new Uint8Array(binaryString.length);

    for (let index = 0; index < binaryString.length; index += 1) {
      bytes[index] = binaryString.charCodeAt(index);
    }

    return {
      body: bytes,
      contentType: defaultContentType
    };
  }

  saveConfig(config: CompatibleS3Config) {
    this.jsonCache.clear();
    this.config = this.normalizeConfig(config);

    localStorage.removeItem('lumos_compatible_s3_provider');
    localStorage.setItem(STORAGE_KEY_BUCKET, this.config.bucketName);
    localStorage.setItem(STORAGE_KEY_REGION, this.config.region);
    localStorage.setItem(STORAGE_KEY_ENDPOINT, this.config.endpoint);
    localStorage.setItem(STORAGE_KEY_ACCESS_KEY_ID, this.config.accessKeyId);
    localStorage.setItem(STORAGE_KEY_SECRET_ACCESS_KEY, this.config.secretAccessKey);
    localStorage.setItem(STORAGE_KEY_FORCE_PATH_STYLE, String(this.config.forcePathStyle));
    if (this.config.userAgent) localStorage.setItem(STORAGE_KEY_USER_AGENT, this.config.userAgent);
    else localStorage.removeItem(STORAGE_KEY_USER_AGENT);

    this.initializeClient();
  }

  getConfig(): CompatibleS3Config | null {
    return this.config;
  }

  disconnect() {
    this.jsonCache.clear();
    this.client = null;
    this.config = null;
  }

  clearStorage() {
    localStorage.removeItem('lumos_compatible_s3_provider');
    localStorage.removeItem(STORAGE_KEY_BUCKET);
    localStorage.removeItem(STORAGE_KEY_REGION);
    localStorage.removeItem(STORAGE_KEY_ENDPOINT);
    localStorage.removeItem(STORAGE_KEY_ACCESS_KEY_ID);
    localStorage.removeItem(STORAGE_KEY_SECRET_ACCESS_KEY);
    localStorage.removeItem(STORAGE_KEY_FORCE_PATH_STYLE);
    localStorage.removeItem(STORAGE_KEY_USER_AGENT);
    this.disconnect();
  }

  async checkConnection(): Promise<{ success: boolean; message?: string }> {
    if (!this.config || !this.client) {
      return { success: false, message: '请先保存兼容 S3 配置' };
    }

    try {
      await this.send(new HeadBucketCommand({
        Bucket: this.getBucket()
      }));

      return { success: true };
    } catch (error) {
      const code = this.getErrorCode(error);
      let message = `连接失败: ${this.getErrorMessage(error)}`;

      if (code === 'AccessDenied') {
        message = '权限拒绝(403): 请检查 Access Key 是否正确，并确认 Bucket 具备读写权限';
      } else if (code === 'NoSuchBucket') {
        message = 'Bucket 不存在: 请检查 Bucket 名称、区域和 Endpoint 是否匹配';
      } else if (code === 'InvalidAccessKeyId') {
        message = 'Access Key ID 无效: 请检查 Access Key ID 是否正确';
      } else if (code === 'SignatureDoesNotMatch') {
        message = '签名不匹配: 请检查 Secret Access Key 是否正确';
      } else if (this.getErrorMessage(error).toLowerCase().includes('cors')) {
        message = '连接失败: 可能是跨域(CORS)配置问题，请检查对象存储的 CORS 规则';
      } else if (this.getErrorMessage(error).toLowerCase().includes('failed to fetch') && Capacitor.isNativePlatform()) {
        message = '连接失败: 移动端原生请求没有成功返回，请检查 Endpoint、网络连通性，以及对象存储是否允许当前签名请求。';
      } else if (!this.config.endpoint) {
        message = '请填写兼容 S3 的 Endpoint';
      }

      return { success: false, message };
    }
  }

  async statFile(filename: string = 'lumostime_backup.json'): Promise<Date | null> {
    if (!this.config || !this.client) {
      return null;
    }

    try {
      const response = await this.send(new HeadObjectCommand({
        Bucket: this.getBucket(),
        Key: filename
      }));

      return response.LastModified ?? null;
    } catch (error) {
      if (this.getErrorCode(error) !== 'NotFound' && this.getErrorCode(error) !== 'NoSuchKey') {
        console.error(`[CompatibleS3] Failed to get file stats: ${filename}`, error);
      }

      return null;
    }
  }

  async uploadData(data: any, filename: string = 'lumostime_backup.json'): Promise<boolean> {
    if (filename === 'lumostime_backup.json') this.jsonCache.clear();
    await this.send(new PutObjectCommand({
      Bucket: this.getBucket(),
      Key: filename,
      Body: JSON.stringify(data, null, 2),
      ContentType: 'application/json',
      CacheControl: 'no-cache, no-store, must-revalidate'
    }));

    return true;
  }

  async downloadData(filename: string = 'lumostime_backup.json', options: CloudJsonReadOptions = {}): Promise<any> {
    const fetchJson = async (etag?: string) => {
      const response = await this.send(new GetObjectCommand({
        Bucket: this.getBucket(),
        Key: filename,
        ...(etag ? { IfNoneMatch: etag } : {}),
        ResponseCacheControl: 'no-cache, no-store, must-revalidate',
        ResponseContentDisposition: `inline; filename="${filename}"; fresh=${Date.now()}`,
        ResponseExpires: new Date(0)
      }));
      return {
        text: await this.normalizeStringBody(response.Body),
        etag: response.ETag,
        status: response.$metadata?.httpStatusCode
      };
    };
    if (filename === 'lumostime_backup.json') return this.jsonCache.read(filename, options, fetchJson);
    return JSON.parse((await fetchJson()).text);
  }

  async uploadImage(filename: string, buffer: ArrayBuffer | string | Blob): Promise<boolean> {
    const { body, contentType } = await this.normalizeUploadBody(buffer, 'image/jpeg');

    await this.send(new PutObjectCommand({
      Bucket: this.getBucket(),
      Key: `images/${filename}`,
      Body: body,
      ContentType: contentType,
      Metadata: {
        'uploaded-by': 'lumostime'
      }
    }));

    return true;
  }

  async downloadImage(filename: string): Promise<ArrayBuffer> {
    const response = await this.send(new GetObjectCommand({
      Bucket: this.getBucket(),
      Key: `images/${filename}`
    }));

    return this.normalizeBinaryBody(response.Body);
  }

  async deleteImage(filename: string): Promise<boolean> {
    return this.deleteFile(`images/${filename}`);
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      await this.send(new DeleteObjectCommand({
        Bucket: this.getBucket(),
        Key: key
      }));

      return true;
    } catch (error) {
      console.error(`[CompatibleS3] File deletion failed: ${key}`, error);
      return false;
    }
  }

  async uploadImageList(imageList: ImageManifestUpload): Promise<boolean> {
    const data = buildCloudImageManifest(imageList);

    await this.send(new PutObjectCommand({
      Bucket: this.getBucket(),
      Key: 'lumostime_images.json',
      Body: JSON.stringify(data, null, 2),
      ContentType: 'application/json',
      CacheControl: 'no-cache, no-store, must-revalidate'
    }));

    return true;
  }

  async downloadImageList(): Promise<CloudImageManifest | { images: string[]; timestamp: number } | null> {
    try {
      const response = await this.send(new GetObjectCommand({
        Bucket: this.getBucket(),
        Key: 'lumostime_images.json',
        ResponseCacheControl: 'no-cache, no-store, must-revalidate',
        ResponseContentDisposition: `inline; filename="lumostime_images.json"; fresh=${Date.now()}`,
        ResponseExpires: new Date(0)
      }));

      const content = await this.normalizeStringBody(response.Body);
      return JSON.parse(content);
    } catch (error) {
      if (this.getErrorCode(error) !== 'NoSuchKey' && this.getErrorCode(error) !== 'NotFound') {
        console.error('[CompatibleS3] Image list download failed', error);
      }

      return null;
    }
  }

  async getImageListTimestamp(): Promise<number> {
    try {
      const data = await this.downloadImageList();
      return data?.timestamp || 0;
    } catch {
      return 0;
    }
  }

  async createDirectory(_path: string): Promise<boolean> {
    return true;
  }

  async getDirectoryContents(path: string): Promise<any[]> {
    try {
      const response = await this.send(new ListObjectsV2Command({
        Bucket: this.getBucket(),
        Prefix: path.endsWith('/') ? path : `${path}/`
      }));

      return response.Contents || [];
    } catch (error) {
      console.error(`[CompatibleS3] Failed to list directory: ${path}`, error);
      return [];
    }
  }

}

export const compatibleS3Service = new CompatibleS3Service();
