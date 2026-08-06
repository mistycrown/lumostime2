import { describe, expect, it } from 'vitest';
import type { CheckTemplate } from '../types';
import { migrateStoredCheckTemplatesForInitialLoad } from './ReviewContext';

const defaultTemplates: CheckTemplate[] = [
  {
    id: 'default-group',
    title: 'Default group',
    icon: 'D',
    items: [
      {
        id: 'default-item',
        content: 'Legacy content',
        icon: 'L',
        type: 'manual',
        manualMode: 'binary'
      }
    ],
    enabled: true,
    order: 0,
    isDaily: true
  }
];

describe('migrateStoredCheckTemplatesForInitialLoad', () => {
  it('preserves disabled item-level daily check switches during startup migration', () => {
    const migrated = migrateStoredCheckTemplatesForInitialLoad([
      {
        id: 'stored-group',
        title: 'Stored group',
        items: [
          {
            id: 'disabled-item',
            content: 'Legacy content',
            icon: 'custom',
            enabled: false,
            type: 'manual',
            manualMode: 'binary'
          }
        ],
        enabled: true,
        order: 0,
        isDaily: true
      }
    ], defaultTemplates);

    expect(migrated[0].items[0].enabled).toBe(false);
    expect(migrated[0].items[0].icon).toBe('L');
  });

  it('defaults legacy string items to enabled', () => {
    const migrated = migrateStoredCheckTemplatesForInitialLoad([
      {
        id: 'stored-group',
        title: 'Stored group',
        items: ['Legacy content'],
        enabled: true,
        order: 0,
        isDaily: true
      }
    ], defaultTemplates);

    expect(migrated[0].items[0].enabled).toBe(true);
  });
});
