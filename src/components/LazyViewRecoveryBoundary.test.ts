import { describe, expect, test } from 'vitest';
import { isStaleViteDynamicImportError } from './LazyViewRecoveryBoundary';

describe('isStaleViteDynamicImportError', () => {
  test('recognizes Vite optimized dependency invalidation', () => {
    expect(isStaleViteDynamicImportError(new Error('504 (Outdated Optimize Dep)'))).toBe(true);
    expect(isStaleViteDynamicImportError(new TypeError('Failed to fetch dynamically imported module'))).toBe(true);
  });

  test('does not reload for unrelated rendering errors', () => {
    expect(isStaleViteDynamicImportError(new Error('Cannot read properties of undefined'))).toBe(false);
  });
});
