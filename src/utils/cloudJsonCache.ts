/**
 * @file cloudJsonCache.ts
 * @input Fresh JSON responses with ETags and explicit conditional-read requests
 * @output One bounded, connection-local snapshot reused only after server confirmation
 * @pos Utility (Cloud Sync)
 * @updated 2026-10-22: Adds conditional GET without weakening unconditional upload verification.
 */

export interface CloudJsonReadOptions {
  conditional?: boolean;
}

export interface CloudJsonResponse {
  text: string;
  etag?: unknown;
  status?: number;
}

export function getCloudResponseHeader(headers: any, name: string): string | undefined {
  if (typeof headers?.get === 'function') return headers.get(name) ?? undefined;
  const key = Object.keys(headers || {}).find(key => key.toLowerCase() === name.toLowerCase());
  const value = key ? headers[key] : undefined;
  return typeof value === 'string' ? value : undefined;
}

function getStatus(error: any): number {
  return Number(error?.status ?? error?.statusCode ?? error?.response?.status ?? error?.$metadata?.httpStatusCode);
}

export class CloudJsonCache {
  private entry?: { key: string; etag: string; text: string };
  private unsupportedKey?: string;
  private generation = 0;

  clear(): void {
    this.entry = undefined;
    this.unsupportedKey = undefined;
    this.generation++;
  }

  async read(
    key: string,
    options: CloudJsonReadOptions,
    fetchJson: (etag?: string) => Promise<CloudJsonResponse>
  ): Promise<any> {
    const generation = this.generation;
    const cached = this.entry?.key === key ? this.entry : undefined;
    let etag = options.conditional && this.unsupportedKey !== key ? cached?.etag : undefined;
    let response: CloudJsonResponse;
    try {
      response = await fetchJson(etag);
    } catch (error) {
      const status = getStatus(error);
      if (etag && status === 304) return JSON.parse(cached!.text);
      // Some providers/CORS policies reject conditional headers. Retry a plain read,
      // never a stale cache read; authentication, availability and missing-file errors propagate.
      if (!etag || !([400, 405, 412, 501].includes(status) || error instanceof TypeError)) throw error;
      if (generation === this.generation) this.unsupportedKey = key;
      etag = undefined;
      response = await fetchJson(undefined);
    }
    if (response.status === 304) {
      if (etag && cached) return JSON.parse(cached.text);
      throw new Error('Cloud returned 304 without a matching cached snapshot');
    }
    const data = JSON.parse(response.text);
    const validator = typeof response.etag === 'string' ? response.etag.trim() : '';
    if (generation === this.generation) {
      // Weak validators and timestamps alone cannot safely identify a backup.
      this.entry = validator && !/^W\//i.test(validator)
        ? { key, etag: validator, text: response.text }
        : undefined;
    }
    // Always parse anew, so restore normalization cannot mutate the cached snapshot.
    return data;
  }
}
