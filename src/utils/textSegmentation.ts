/**
 * @file textSegmentation.ts
 * @input User-entered text values.
 * @output Cross-platform Chinese word terms for text statistics.
 * @pos Shared text analysis utility
 * @description Uses a bundled Segmentit dictionary so desktop and Android do not depend on WebView ICU dictionaries.
 */
import { Segment, useDefault } from 'segmentit';

interface SegmentitResult {
  w: string;
}

type Segmenter = ReturnType<typeof useDefault>;
let segmenter: Segmenter | null = null;

const getSegmenter = () => {
  if (!segmenter) segmenter = useDefault(new Segment());
  return segmenter;
};
const TEXT_STOPWORDS = new Set(['的', '了', '和', '是', '在', '有', '我', '也', '就', '都', '很', '还', '与', '及', '或', '一个', '一些']);

const isTextTerm = (part: string) => {
  if (!part || TEXT_STOPWORDS.has(part)) return false;
  return /^[\u4e00-\u9fffA-Za-z0-9]+$/.test(part);
};

const getFallbackTextTerms = (text: string): string[] => text
  .split(/[，。！？，、；：,.!?;:\s]+/)
  .flatMap((part) => part.length <= 8 ? [part] : part.match(/[\u4e00-\u9fffA-Za-z0-9]{1,4}/g) || [])
  .map((part) => part.toLowerCase())
  .filter(isTextTerm);

export const getTextTerms = (value: string): string[] => {
  const text = value.trim().replace(/[\r\n]+/g, ' ');
  if (!text) return [];

  const terms = getSegmenter().doSegment(text)
    .map((part) => part.w.trim().toLowerCase())
    .filter(isTextTerm);
  return terms.length > 0 ? terms : getFallbackTextTerms(text);
};
