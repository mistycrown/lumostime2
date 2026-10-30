/**
 * @file compatibleS3Transport.test.ts
 * @input Client identities and endpoint examples
 * @output Validation and exact-host hint regression checks
 * @updated 2026-10-30: Covers empty defaults, header injection and endpoint hint boundaries.
 */
import { describe, expect, it } from 'vitest';
import { isDataCapsuleEndpoint, normalizeS3UserAgent } from './compatibleS3Transport';

describe('S3 client identity', () => {
  it('keeps legacy and blank values unset and trims a custom identity', () => {
    for (const value of [undefined, '', '   ']) expect(normalizeS3UserAgent(value)).toBeUndefined();
    expect(normalizeS3UserAgent('  S3Drive  ')).toBe('S3Drive');
    expect(normalizeS3UserAgent('rclone/v1.73.2 (test)')).toBe('rclone/v1.73.2 (test)');
  });

  it.each(['S3Drive\r\nCookie: value', 'S3Drive\n', '\tS3Drive', 'a\0b', 'x'.repeat(257), '\u4e2d\u6587'])('rejects invalid header text %j', (value) => {
    expect(() => normalizeS3UserAgent(value)).toThrow('User-Agent');
  });

  it('suggests Data Capsule only for its exact endpoint hosts', () => {
    expect(isDataCapsuleEndpoint(' s3.cstcloud.cn ')).toBe(true);
    expect(isDataCapsuleEndpoint('https://s3.data.cstcloud.cn')).toBe(true);
    expect(isDataCapsuleEndpoint('https://s3.cstcloud.cn.example.com')).toBe(false);
    expect(isDataCapsuleEndpoint('https://example.com/?s3.cstcloud.cn')).toBe(false);
    expect(isDataCapsuleEndpoint('')).toBe(false);
  });
});
