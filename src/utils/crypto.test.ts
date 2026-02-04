import { describe, it, expect } from 'vitest';
import { sha256 } from './crypto';

describe('sha256', () => {
  it('should compute SHA-256 hash for empty string', async () => {
    const hash = await sha256('');
    // Known SHA-256 hash of empty string
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('should compute SHA-256 hash for test string', async () => {
    const hash = await sha256('hello');
    // Known SHA-256 hash of "hello"
    expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('should compute SHA-256 hash for redemption code format', async () => {
    const hash = await sha256('LUMOS-BCE01E55');
    // This should produce a 64-character hex string
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
