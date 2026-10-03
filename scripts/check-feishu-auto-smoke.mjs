/**
 * @file check-feishu-auto-smoke.mjs
 * @input Repository dependencies and optional screenshot path.
 * @output Hidden Electron UI smoke-test process and its exit code.
 * @pos Verification launcher; never opens a visible window or uses a real Feishu connection.
 */
import { spawn } from 'node:child_process';
import electron from 'electron';
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(electron, ['scripts/feishu-auto-smoke.cjs'], { env, stdio: 'inherit', windowsHide: true });
child.on('error', (error) => { console.error(error); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
