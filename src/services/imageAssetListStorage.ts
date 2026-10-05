/**
 * @file imageAssetListStorage.ts
 * @input Custom image metadata in localStorage and imageService URLs
 * @output Persisted file references with runtime image URLs and safe hydration
 * @pos Service (Image Storage)
 * @updated 2026-10-05: Shares quota-safe persistence and concurrent hydration for navigation assets.
 */
import { sanitizeImageAssetForStorage } from '../utils/imageAssetStorage';
import { imageService } from './imageService';

interface ImageAsset {
  id: string;
  url: string;
  thumbnail?: string;
  imageFilename?: string;
}

export class ImageAssetListStorage<T extends ImageAsset> {
  private readonly runtimeImages = new Map<string, { imageFilename: string; url: string; thumbnail?: string; resolved: boolean }>();
  private hydrationPromise: Promise<void> | null = null;

  constructor(private readonly key: string) {}

  private read(): T[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(this.key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }

  load(): T[] {
    const assets = this.read();
    this.prune(assets);
    return assets.map((asset) => {
      const runtime = this.runtimeImages.get(asset.id);
      if (!asset.imageFilename || runtime?.imageFilename !== asset.imageFilename) return asset;
      return {
        ...asset,
        url: runtime.url,
        ...(Object.prototype.hasOwnProperty.call(asset, 'thumbnail') ? { thumbnail: runtime.thumbnail || runtime.url } : {})
      };
    });
  }

  save(assets: T[]): void {
    if (typeof localStorage === 'undefined') return;
    this.persist(assets);
    assets.forEach((asset) => {
      if (asset.imageFilename && asset.url) {
        const previous = this.runtimeImages.get(asset.id);
        const resolved = previous?.imageFilename === asset.imageFilename && previous.url === asset.url ? previous.resolved : true;
        this.runtimeImages.set(asset.id, { imageFilename: asset.imageFilename, url: asset.url, thumbnail: asset.thumbnail, resolved });
      }
    });
    this.prune(assets);
  }

  private persist(assets: T[]): boolean {
    const serialized = JSON.stringify(assets.map((asset) => {
      const runtime = this.runtimeImages.get(asset.id);
      // Keep the original bytes until an unavailable legacy file can be loaded again.
      if (runtime && runtime.imageFilename === asset.imageFilename && !runtime.resolved
        && (asset.url?.startsWith('data:') || asset.thumbnail?.startsWith('data:'))) return asset;
      return sanitizeImageAssetForStorage(asset);
    }));
    if (localStorage.getItem(this.key) === serialized) return false;
    // Do not create empty storage entries during startup.
    if (assets.length === 0 && localStorage.getItem(this.key) === null) return false;
    localStorage.setItem(this.key, serialized);
    return true;
  }

  private prune(assets: T[]): void {
    const latest = new Map(assets.map((asset) => [asset.id, asset.imageFilename]));
    this.runtimeImages.forEach((runtime, id) => {
      if (latest.get(id) !== runtime.imageFilename) this.runtimeImages.delete(id);
    });
  }

  hydrate(onChange: () => void): Promise<void> {
    if (this.hydrationPromise) return this.hydrationPromise;
    const hydration = this.performHydration(onChange).finally(() => {
      if (this.hydrationPromise === hydration) this.hydrationPromise = null;
    });
    this.hydrationPromise = hydration;
    return hydration;
  }

  private async performHydration(onChange: () => void): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    const attempted = new Set<string>();
    let changed = false;
    while (true) {
      const assets = this.read();
      this.prune(assets);
      const pending = assets.filter((asset) => (
        asset.imageFilename && !this.runtimeImages.get(asset.id)?.resolved
        && !attempted.has(`${asset.id}\u0000${asset.imageFilename}`)
      ));
      if (pending.length === 0) break;
      const results = await Promise.all(pending.map(async (asset) => {
        attempted.add(`${asset.id}\u0000${asset.imageFilename}`);
        try {
          const url = await imageService.getImageUrl(asset.imageFilename!);
          return url ? { id: asset.id, imageFilename: asset.imageFilename!, url } : null;
        } catch (error) {
          console.warn(`[ImageAssetListStorage] Failed to load ${this.key} image`, asset.id, error);
          return null;
        }
      }));
      // Reload metadata so deletion, replacement, and theme imports during I/O are retained.
      const latest = new Map(this.read().map((asset) => [asset.id, asset]));
      results.forEach((result) => {
        if (!result || latest.get(result.id)?.imageFilename !== result.imageFilename) return;
        this.runtimeImages.set(result.id, { ...result, resolved: true });
        changed = true;
      });
    }

    const latest = this.read();
    this.prune(latest);
    // Keep a legacy data URL usable if its referenced file is currently unavailable.
    latest.forEach((asset) => {
      const url = asset.url?.startsWith('data:') ? asset.url
        : asset.thumbnail?.startsWith('data:') ? asset.thumbnail : '';
      if (asset.imageFilename && url && !this.runtimeImages.has(asset.id)) {
        this.runtimeImages.set(asset.id, { imageFilename: asset.imageFilename, url, resolved: false });
      }
    });
    try {
      changed = this.persist(latest) || changed;
    } catch (error) {
      // Another key may have filled the quota; loaded images can still be displayed.
      console.warn(`[ImageAssetListStorage] Failed to compact ${this.key}`, error);
    }
    if (changed) onChange();
  }
}
