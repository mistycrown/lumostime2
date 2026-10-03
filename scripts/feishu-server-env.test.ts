/**
 * @file feishu-server-env.test.ts
 * @input Temporary UTF-8 server configuration files and deployment overrides.
 * @output Verification of secret loading priority and dependency-free configuration.
 * @pos Production service configuration tests.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { loadFeishuServerEnv } from './feishu-server-env.mjs';

it('keeps deployment overrides and loads only server keys in mode priority order', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'lumos-feishu-env-'));
  try {
    writeFileSync(join(cwd, '.env'), 'FEISHU_APP_ID=base\nVITE_PRIVATE_VALUE=never-load\n', 'utf8');
    writeFileSync(join(cwd, '.env.local'), 'FEISHU_APP_ID=local\nFEISHU_APP_SECRET="密钥测试"\n', 'utf8');
    writeFileSync(join(cwd, '.env.production'), 'FEISHU_APP_ID=production\n', 'utf8');
    writeFileSync(join(cwd, '.env.production.local'), 'FEISHU_APP_ID=production-local\n', 'utf8');
    const environment = { FEISHU_APP_SECRET: 'deployment-secret' };
    expect(loadFeishuServerEnv(cwd, 'production', environment)).toEqual({
      FEISHU_APP_ID: 'production-local', FEISHU_APP_SECRET: 'deployment-secret'
    });
    expect(loadFeishuServerEnv(cwd, 'development', {})).toEqual({
      FEISHU_APP_ID: 'local', FEISHU_APP_SECRET: '密钥测试'
    });
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});

it('does not require dotenv files when a hosting provider supplies variables', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'lumos-feishu-env-'));
  try {
    const environment = { FEISHU_APP_ID: 'provider-app' };
    expect(loadFeishuServerEnv(cwd, 'production', environment)).toBe(environment);
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});
