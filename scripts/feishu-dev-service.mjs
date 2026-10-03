/**
 * @file feishu-dev-service.mjs
 * @input Vite command arguments, maintainer environment and local service availability.
 * @output A ready local Feishu API and cleanup for the child started by this dev process.
 * @pos Development launcher helper; never runs for production builds or remote services.
 */
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { resolve } from 'node:path';

export function shouldStartFeishuDevService(args, environment) {
  return !args.some((argument) => ['build', 'preview', '--help', '-h', '--version', '-v'].includes(argument))
    && !environment.VITE_FEISHU_SERVICE_URL?.trim();
}

export async function startFeishuDevService({ cwd, environment = process.env, spawnProcess = spawn, fetchStatus = fetch }) {
  const port = Number(environment.FEISHU_PORT || 3003);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid Feishu development port');
  const endpoint = `http://127.0.0.1:${port}/api/feishu/status`;
  const ready = async () => {
    try {
      const response = await fetchStatus(endpoint, { signal: AbortSignal.timeout(800), redirect: 'error' });
      const data = await response.json();
      return response.ok && typeof data?.configured === 'boolean' && typeof data?.status === 'string';
    } catch { return false; }
  };
  if (await ready()) return () => {}; // A separately started service belongs to its owner.
  const child = spawnProcess(process.execPath,
    ['--experimental-sqlite', '--experimental-strip-types', resolve(cwd, 'scripts/run-feishu-server.mjs')],
    { cwd, env: environment, stdio: ['inherit', 'inherit', 'inherit', 'ipc'], windowsHide: true });
  let failed = false;
  child.once('error', () => { failed = true; });
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    process.removeListener('exit', stop);
    if (child.exitCode === null && child.signalCode === null) child.kill();
  };
  process.once('exit', stop);
  try {
    const deadline = Date.now() + 5000;
    while (!failed && child.exitCode === null && child.signalCode === null && Date.now() < deadline) {
      if (await ready()) return stop;
      await delay(150);
    }
    throw new Error('Feishu development service did not become ready');
  } catch (error) { stop(); throw error; }
}
