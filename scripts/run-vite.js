/**
 * @file run-vite.js
 * @input Process environment variables and forwarded Vite CLI arguments.
 * @output Starts the Vite CLI with a sanitized Electron-related environment.
 * @pos Build Script
 * @description Clears `ELECTRON_RUN_AS_NODE` before handing off execution to Vite so Electron dev startup is not forced into Node mode.
 *
 * Update this header comment when the script behavior changes.
 */

import path from 'node:path';
import { pathToFileURL } from 'node:url';

delete process.env.ELECTRON_RUN_AS_NODE;

const viteCliPath = path.resolve(process.cwd(), 'node_modules', 'vite', 'bin', 'vite.js');

await import(pathToFileURL(viteCliPath).href);
