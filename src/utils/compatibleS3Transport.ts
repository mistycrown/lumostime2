/**
 * @file compatibleS3Transport.ts
 * @input Optional client identity and signed S3 HTTP messages
 * @output Validated User-Agent and shared desktop IPC contracts
 * @updated 2026-10-30: Adds per-connection client identity without changing SDK defaults.
 */
export const MAX_S3_USER_AGENT_LENGTH = 256;

export function normalizeS3UserAgent(value?: string): string | undefined {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string' || /[^\x20-\x7e]/.test(value) || value.length > MAX_S3_USER_AGENT_LENGTH) {
    throw new Error('User-Agent 必须为不超过 256 个字符的单行英文、数字或符号');
  }
  return value.trim() || undefined;
}

export function isDataCapsuleEndpoint(endpoint: string): boolean {
  try {
    const host = new URL(/^https?:\/\//i.test(endpoint.trim()) ? endpoint.trim() : `https://${endpoint.trim()}`).hostname.toLowerCase();
    return host === 's3.cstcloud.cn' || host === 's3.data.cstcloud.cn';
  } catch {
    return false;
  }
}

export interface DesktopS3Request {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: Uint8Array;
  userAgent?: string;
  timeout?: number;
}

export interface DesktopS3Response {
  status: number;
  headers: Record<string, string>;
  data: Uint8Array;
}

export interface DesktopS3Bridge {
  request: (request: DesktopS3Request) => Promise<DesktopS3Response>;
}
