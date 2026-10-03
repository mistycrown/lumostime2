/**
 * @file crypto.ts
 * @input UTF-8 identifiers and platform cryptographic randomness.
 * @output Node-compatible SHA-256 identifiers, PKCE challenges and opaque session tokens.
 * @pos Portable Feishu primitives; no Node APIs or weak-random fallbacks.
 */
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { Buffer } from 'buffer';

export const tokenHash = (value: string): string => bytesToHex(sha256(value));
const base64Url = (bytes: Uint8Array): string => Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const sha256Base64Url = (value: string): string => base64Url(sha256(value));
export const basicCredentials = (value: string): string => Buffer.from(value, 'utf8').toString('base64');
export const opaqueToken = (): string => base64Url(crypto.getRandomValues(new Uint8Array(32)));
export const randomUUID = (): string => crypto.randomUUID();
