/**
 * @file assistantPromptService.ts
 * @input Bundled assistant prompt markdown sources under `src/prompts/assistant/`
 * @output Loaded assistant prompt strings for unified foreground/background turns
 * @pos Service (Assistant Prompt Builder)
 * @description Loads bundled assistant prompt markdown directly from source imports so Web and packaged Electron builds share one prompt source without runtime file fetches.
 *
 * @updated 2026-05-18: Switched assistant prompt loading from runtime `fetch('/assistant/*.md')` calls to Vite `?raw` imports so packaged Electron builds no longer break on missing `file:///assistant/*.md` paths.
 */

import assistantBasePromptSource from '../prompts/assistant/assistant-base.md?raw';
import backgroundModePromptSource from '../prompts/assistant/background-mode.md?raw';
import assistantLetterModePromptSource from '../prompts/assistant/assistant-letter-mode.md?raw';
import foregroundModePromptSource from '../prompts/assistant/foreground-mode.md?raw';
import foregroundToolsPromptSource from '../prompts/assistant/foreground-tools.md?raw';
import memoryRulesPromptSource from '../prompts/assistant/memory-rules.md?raw';

type PromptAssetKey =
  | 'assistantBase'
  | 'foregroundMode'
  | 'backgroundMode'
  | 'assistantLetterMode'
  | 'foregroundTools'
  | 'memoryRules';

const PROMPT_SOURCES: Record<PromptAssetKey, { assetPath: string; source: string }> = {
  assistantBase: {
    assetPath: 'src/prompts/assistant/assistant-base.md',
    source: assistantBasePromptSource
  },
  foregroundMode: {
    assetPath: 'src/prompts/assistant/foreground-mode.md',
    source: foregroundModePromptSource
  },
  backgroundMode: {
    assetPath: 'src/prompts/assistant/background-mode.md',
    source: backgroundModePromptSource
  },
  assistantLetterMode: {
    assetPath: 'src/prompts/assistant/assistant-letter-mode.md',
    source: assistantLetterModePromptSource
  },
  foregroundTools: {
    assetPath: 'src/prompts/assistant/foreground-tools.md',
    source: foregroundToolsPromptSource
  },
  memoryRules: {
    assetPath: 'src/prompts/assistant/memory-rules.md',
    source: memoryRulesPromptSource
  }
};

const buildPromptLoadError = (assetPath: string, reason: string): Error => (
  new Error(`[assistantPromptService] Failed to load bundled prompt ${assetPath}: ${reason}`)
);

const loadPromptAsset = async (key: PromptAssetKey): Promise<string> => {
  const { assetPath, source } = PROMPT_SOURCES[key];
  const text = source.trim();

  if (!text) {
    throw buildPromptLoadError(assetPath, 'asset is empty');
  }

  return text;
};

export const assistantPromptService = {
  async getAssistantBasePrompt(): Promise<string> {
    return loadPromptAsset('assistantBase');
  },

  async getForegroundModePrompt(): Promise<string> {
    return loadPromptAsset('foregroundMode');
  },

  async getBackgroundModePrompt(): Promise<string> {
    return loadPromptAsset('backgroundMode');
  },

  async getAssistantLetterModePrompt(): Promise<string> {
    return loadPromptAsset('assistantLetterMode');
  },

  async getForegroundToolsPrompt(): Promise<string> {
    return loadPromptAsset('foregroundTools');
  },

  async getMemoryRulesPrompt(): Promise<string> {
    return loadPromptAsset('memoryRules');
  }
};
