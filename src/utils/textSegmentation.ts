/**
 * @file textSegmentation.ts
 * @updated 2026-10-09: Protects personal dictionary words alongside per-cloud phrases.
 * @updated 2026-10-09: Protects card-specific phrases before segmentation and applies custom stop words afterward.
 * @input User-entered text values and optional per-cloud phrase/stop-word rules.
 * @output Cross-platform Chinese word terms for text statistics.
 * @pos Shared text analysis utility
 * @description Uses a bundled Segmentit dictionary so desktop and Android do not depend on WebView ICU dictionaries.
 * @updated 2026-09-21: Expands common Chinese function-word stopwords while keeping meaningful short terms available for word clouds.
 */
import { Segment, useDefault } from 'segmentit';
import type { WordCloudSettings } from '../types';

export const normalizeWordList = (value: unknown): string[] => Array.isArray(value)
  ? [...new Set(value.filter((word): word is string => typeof word === 'string')
    .map((word) => word.trim().replace(/\s+/g, ' ').toLowerCase()).filter(Boolean))]
  : [];

export const normalizeWordCloudSettings = (value: unknown): WordCloudSettings => {
  const settings = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return { mergeWords: normalizeWordList(settings.mergeWords), stopWords: normalizeWordList(settings.stopWords) };
};

interface SegmentitResult {
  w: string;
}

type Segmenter = ReturnType<typeof useDefault>;
let segmenter: Segmenter | null = null;

const getSegmenter = () => {
  if (!segmenter) segmenter = useDefault(new Segment());
  return segmenter;
};
const TEXT_STOPWORDS = new Set([
  '的', '了', '着', '过', '和', '是', '在', '有', '我', '你', '他', '她', '它', '我们', '你们', '他们', '也', '就', '都', '很', '还', '又', '再',
  '与', '及', '或', '而', '但', '却', '并', '并且', '以及', '如果', '因为', '所以', '因此', '但是', '不过', '然后', '只是', '虽然', '于是',
  '这', '那', '这次', '那次', '这个', '那个', '这些', '那些', '其', '其中', '自己', '某', '各', '每', '一个', '一些', '一种', '一点',
  '把', '被', '给', '对', '向', '从', '到', '为', '于', '以', '按', '按照', '关于', '对于', '根据', '通过', '随着', '除了', '由于',
  '可以', '能够', '需要', '应该', '可能', '已经', '正在', '开始', '进行', '成为', '没有', '不是', '不会', '不要', '不用', '不能'
]);

const isTextTerm = (part: string) => {
  if (!part || TEXT_STOPWORDS.has(part)) return false;
  return /^[\u4e00-\u9fffA-Za-z0-9]+$/.test(part);
};

const getFallbackTextTerms = (text: string): string[] => text
  .split(/[，。！？，、；：,.!?;:\s]+/)
  .flatMap((part) => part.length <= 8 ? [part] : part.match(/[\u4e00-\u9fffA-Za-z0-9]{1,4}/g) || [])
  .map((part) => part.toLowerCase())
  .filter(isTextTerm);

const segmentText = (value: string): string[] => {
  const text = value.trim().replace(/[\r\n]+/g, ' ');
  if (!text) return [];

  const terms = getSegmenter().doSegment(text)
    .map((part) => part.w.trim().toLowerCase())
    .filter(isTextTerm);
  return terms.length > 0 ? terms : getFallbackTextTerms(text);
};

/** Match literal phrases in the original text, preferring the longest at each position. */
export const getTextTerms = (value: string, settings?: WordCloudSettings, personalWords: readonly string[] = []): string[] => {
  const mergeWords = normalizeWordList([...personalWords, ...normalizeWordList(settings?.mergeWords)]).sort((left, right) => right.length - left.length);
  const stopWords = new Set(normalizeWordList(settings?.stopWords));
  if (!mergeWords.length) return segmentText(value).filter((term) => !stopWords.has(term));
  const text = value.trim().replace(/\s+/g, ' ').toLowerCase();
  const terms: string[] = [];
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    const word = mergeWords.find((candidate) => text.startsWith(candidate, index)
      && (!/^[a-z0-9]/.test(candidate) || !/[a-z0-9]/.test(text[index - 1] || ''))
      && (!/[a-z0-9]$/.test(candidate) || !/[a-z0-9]/.test(text[index + candidate.length] || '')));
    if (!word) continue;
    terms.push(...segmentText(text.slice(start, index)), word);
    index += word.length - 1;
    start = index + 1;
  }
  terms.push(...segmentText(text.slice(start)));
  return terms.filter((term) => !stopWords.has(term));
};

export const getRankedTextTerms = (values: Iterable<string>, settings?: WordCloudSettings, personalWords: readonly string[] = []): Array<[string, number]> => {
  const counts = new Map<string, number>();
  for (const value of values) {
    getTextTerms(value, settings, personalWords).forEach((term) => counts.set(term, (counts.get(term) || 0) + 1));
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1]);
};
