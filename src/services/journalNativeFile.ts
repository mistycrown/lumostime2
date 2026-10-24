/**
 * @file journalNativeFile.ts
 * @input PDF bytes, native destination, progress callback and cancellation signal
 * @output Bounded bridge writes followed by publication of the complete native file
 * @pos Service (Journal native export)
 * @updated 2026-10-24: Avoids whole-PDF Base64 bridge messages and cleans incomplete temporary files after failure/timeout.
 */
import { Filesystem, type Directory } from '@capacitor/filesystem';

export const JOURNAL_NATIVE_CHUNK_BYTES = 96 * 1024;
const BRIDGE_TIMEOUT_MS = 30000;

const within = async <T>(operation: Promise<T>, milliseconds: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operation, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('保存 PDF 超时，请重试')), milliseconds);
    })]);
  } finally { clearTimeout(timer); }
};

const encode = (bytes: Uint8Array): string => {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 8192) binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  return btoa(binary);
};

export const writeJournalNativeFile = async (
  bytes: Uint8Array,
  path: string,
  directory: Directory,
  onProgress?: (writtenBytes: number, totalBytes: number) => void,
  signal?: AbortSignal
): Promise<void> => {
  signal?.throwIfAborted();
  const temporaryPath = `${path}.${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.part`;
  let pending: Promise<unknown> | undefined;
  const removeTemporary = async () => {
    try { await within(Promise.resolve().then(() => Filesystem.deleteFile({ path: temporaryPath, directory })), 3000); }
    catch { /* A failed initial bridge call may not have created the temporary file. */ }
  };
  const invoke = async (operation: () => Promise<unknown>) => {
    pending = Promise.resolve().then(operation);
    await within(pending, BRIDGE_TIMEOUT_MS);
  };
  try {
    onProgress?.(0, bytes.length);
    for (let offset = 0; offset < bytes.length; offset += JOURNAL_NATIVE_CHUNK_BYTES) {
      signal?.throwIfAborted();
      const end = Math.min(bytes.length, offset + JOURNAL_NATIVE_CHUNK_BYTES);
      const data = encode(bytes.subarray(offset, end));
      await invoke(() => offset === 0
        ? Filesystem.writeFile({ path: temporaryPath, directory, data, recursive: true })
        : Filesystem.appendFile({ path: temporaryPath, directory, data }));
      signal?.throwIfAborted();
      onProgress?.(end, bytes.length);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    signal?.throwIfAborted();
    await invoke(() => Filesystem.rename({ from: temporaryPath, to: path, directory }));
  } catch (error) {
    await removeTemporary();
    // A timed-out native call can complete later. Only its unique partial file is removed.
    void pending?.then(removeTemporary, removeTemporary);
    throw error;
  }
};
