/**
 * @file run-vite.js
 * @input Process environment variables and forwarded Vite CLI arguments.
 * @output Starts Vite and automatically prepares the local Feishu API for development.
 * @pos Build Script
 * @description Clears `ELECTRON_RUN_AS_NODE` before handing off execution to Vite so Electron dev startup is not forced into Node mode.
 * @updated 2026-10-02: Starts/reuses the local connection service for dev only; production builds never spawn it.
 *
 * Update this header comment when the script behavior changes.
 */

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadEnv } from 'vite';
import { shouldStartFeishuDevService, startFeishuDevService } from './feishu-dev-service.mjs';

delete process.env.ELECTRON_RUN_AS_NODE;

const viteCliPath = path.resolve(process.cwd(), 'node_modules', 'vite', 'bin', 'vite.js');
const args = process.argv.slice(2);
const modeIndex = args.indexOf('--mode');
const mode = (modeIndex >= 0 ? args[modeIndex + 1] : args.find((argument) => argument.startsWith('--mode='))?.slice(7)) || 'development';
const environment = { ...loadEnv(mode, process.cwd(), ['FEISHU_', 'VITE_FEISHU_SERVICE_URL']), ...process.env };
let stopFeishu = () => {};
if (shouldStartFeishuDevService(args, environment)) {
  try { stopFeishu = await startFeishuDevService({ cwd: process.cwd(), environment }); }
  catch { console.warn('[Feishu] Local connection service unavailable; check maintainer configuration.'); }
}
try { await import(pathToFileURL(viteCliPath).href); }
catch (error) { stopFeishu(); throw error; }
