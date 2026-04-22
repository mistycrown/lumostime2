/**
 * @file lumosTimeUrlParser.test.ts
 * @input LumosTime custom-scheme URI samples
 * @output Regression coverage for NFC/deep-link compatibility parsing
 * @pos Test (deep-link utilities)
 * @description Verifies that LumosTime record and widget URIs stay recognizable across WebView parsing variants and legacy parameter aliases.
 * @updated 2026-04-22: Added compatibility coverage for legacy NFC URI variants and parameter aliases.
 */

import { describe, expect, it } from 'vitest';
import { parseLumosTimeUrl } from './lumosTimeUrlParser';

describe('parseLumosTimeUrl', () => {
  it('parses the current NFC record format', () => {
    expect(parseLumosTimeUrl('lumostime://record?action=start&cat_id=life&act_id=commute')).toEqual({
      type: 'record',
      rawValue: 'lumostime://record?action=start&cat_id=life&act_id=commute',
      action: 'start',
      rawAction: 'start',
      catId: 'life',
      actId: 'commute',
      checkItemId: null
    });
  });

  it('trims outer whitespace before parsing', () => {
    expect(parseLumosTimeUrl('  lumostime://record?action=quick_log  ')).toEqual({
      type: 'record',
      rawValue: 'lumostime://record?action=quick_log',
      action: 'quick_punch',
      rawAction: 'quick_log',
      catId: null,
      actId: null,
      checkItemId: null
    });
  });

  it('supports no-slash and extra-slash record variants', () => {
    expect(parseLumosTimeUrl('lumostime:record?action=start&cat_id=life&act_id=commute')).toMatchObject({
      type: 'record',
      action: 'start',
      catId: 'life',
      actId: 'commute'
    });

    expect(parseLumosTimeUrl('lumostime:///record?action=daily_check&check_item_id=manual_1')).toMatchObject({
      type: 'record',
      action: 'daily_check',
      checkItemId: 'manual_1'
    });
  });

  it('supports path-style legacy record actions', () => {
    expect(parseLumosTimeUrl('lumostime://start?categoryId=life&activityId=commute')).toEqual({
      type: 'record',
      rawValue: 'lumostime://start?categoryId=life&activityId=commute',
      action: 'start',
      rawAction: 'start',
      catId: 'life',
      actId: 'commute',
      checkItemId: null
    });
  });

  it('normalizes record parameter aliases', () => {
    expect(parseLumosTimeUrl('lumostime://record?action=daily_check&checkItemId=manual_2')).toEqual({
      type: 'record',
      rawValue: 'lumostime://record?action=daily_check&checkItemId=manual_2',
      action: 'daily_check',
      rawAction: 'daily_check',
      catId: null,
      actId: null,
      checkItemId: 'manual_2'
    });
  });

  it('parses widget URIs', () => {
    expect(parseLumosTimeUrl('lumostime://widget?action=quick_punch')).toEqual({
      type: 'widget',
      rawValue: 'lumostime://widget?action=quick_punch',
      action: 'quick_punch'
    });
  });

  it('returns null for non-LumosTime URIs', () => {
    expect(parseLumosTimeUrl('https://example.com')).toBeNull();
    expect(parseLumosTimeUrl('mailto:test@example.com')).toBeNull();
  });
});
