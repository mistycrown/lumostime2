/**
 * @file feishu-server-env.mjs
 * @input Server dotenv files and existing deployment environment.
 * @output Server-only FEISHU_ values with deployment variables taking precedence.
 * @pos Dependency-free production configuration loader.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';

export function loadFeishuServerEnv(cwd, mode, environment = process.env) {
  for (const name of [`.env.${mode}.local`, `.env.${mode}`, '.env.local', '.env']) {
    let content;
    try { content = readFileSync(resolve(cwd, name), 'utf8'); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    for (const [key, value] of Object.entries(parseEnv(content))) {
      if (key.startsWith('FEISHU_') && environment[key] === undefined) environment[key] = value;
    }
  }
  return environment;
}
