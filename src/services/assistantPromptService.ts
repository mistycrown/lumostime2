/**
 * @file assistantPromptService.ts
 * @input Assistant prompt asset URLs under `public/assistant/`
 * @output Loaded assistant prompt strings for unified foreground/background turns
 * @pos Service (Assistant Prompt Builder)
 * @description Loads the shipped assistant prompt markdown assets directly from `public/assistant/` and fails fast when any required asset is unavailable, so prompt source stays single-authored in markdown.
 *
 * @updated 2026-05-14: Removed all in-code fallback prompt copies; prompt loading now requires the public markdown assets and throws immediately if any asset is missing, empty, or cannot be fetched.
 */

const ASSISTANT_BASE_PROMPT_URL = '/assistant/assistant-base.md';
const FOREGROUND_MODE_PROMPT_URL = '/assistant/foreground-mode.md';
const BACKGROUND_MODE_PROMPT_URL = '/assistant/background-mode.md';
const FOREGROUND_TOOLS_PROMPT_URL = '/assistant/foreground-tools.md';
const MEMORY_RULES_PROMPT_URL = '/assistant/memory-rules.md';

const promptCache = new Map<string, string>();

const buildPromptLoadError = (url: string, reason: string): Error => (
  new Error(`[assistantPromptService] Failed to load prompt asset ${url}: ${reason}`)
);

const loadPromptAsset = async (url: string): Promise<string> => {
  if (promptCache.has(url)) {
    return promptCache.get(url)!;
  }

  if (typeof fetch !== 'function') {
    throw buildPromptLoadError(url, 'fetch is unavailable in the current runtime');
  }

  let response: Response;
  try {
    response = await fetch(url, { cache: 'no-cache' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw buildPromptLoadError(url, message);
  }

  if (!response.ok) {
    throw buildPromptLoadError(url, `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`);
  }

  const text = (await response.text()).trim();
  if (!text) {
    throw buildPromptLoadError(url, 'asset is empty');
  }

  promptCache.set(url, text);
  return text;
};

export const assistantPromptService = {
  async getAssistantBasePrompt(): Promise<string> {
    return loadPromptAsset(ASSISTANT_BASE_PROMPT_URL);
  },

  async getForegroundModePrompt(): Promise<string> {
    return loadPromptAsset(FOREGROUND_MODE_PROMPT_URL);
  },

  async getBackgroundModePrompt(): Promise<string> {
    return loadPromptAsset(BACKGROUND_MODE_PROMPT_URL);
  },

  async getForegroundToolsPrompt(): Promise<string> {
    return loadPromptAsset(FOREGROUND_TOOLS_PROMPT_URL);
  },

  async getMemoryRulesPrompt(): Promise<string> {
    return loadPromptAsset(MEMORY_RULES_PROMPT_URL);
  }
};
