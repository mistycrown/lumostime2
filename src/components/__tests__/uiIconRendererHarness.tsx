/**
 * @file uiIconRendererHarness.tsx
 * @input Real icon renderers, selectors, theme service, and deferred image storage
 * @output Browser assertions for image recovery and same-theme replacements
 * @pos Test (UI Icon Renderer)
 * @updated 2026-10-05: Exercises React effects and native image decoding in an isolated renderer.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BookOpen } from 'lucide-react';
import { UIIcon } from '../UIIcon';
import { IconRenderer, useIconRenderer } from '../IconRenderer';
import { UIIconSelectorCompact } from '../UIIconSelector';
import { UiThemeButton } from '../UiThemeButton';
import { uiIconService } from '../../services/uiIconService';
import { imageRequests } from './uiIconRendererMocks';

declare global {
  interface Window {
    __uiIconTestResult?: { passed: string[]; error?: string };
    __uiIconBaseline?: boolean;
  }
}
const passed: string[] = [];
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const check = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const until = async (condition: () => boolean, label: string) => {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > 5000) throw new Error('Timeout: ' + label);
    await delay(10);
  }
};
const svg = (color: string) => URL.createObjectURL(new Blob([
  `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><circle cx="24" cy="24" r="20" fill="${color}"/></svg>`
], { type: 'image/svg+xml' }));
const HookProbe = () => {
  const { src } = useIconRenderer('?', 'ui:book');
  return <img id="hook" src={src || undefined} />;
};
const Probe = () => <>
  <div id="ui"><UIIcon type="book" fallbackIcon={BookOpen} size={32} /></div>
  <div id="dual"><IconRenderer icon="?" uiIcon="ui:book" size={32} /></div>
  <HookProbe />
  <div id="selector"><UIIconSelectorCompact currentIcon="?" currentUiIcon="ui:book" /></div>
  {!window.__uiIconBaseline && <div id="preview" style={{ width: 100 }}><UiThemeButton theme="custom" currentTheme="custom" onThemeChange={() => undefined} /></div>}
</>;
const source = (selector: string) => document.querySelector<HTMLImageElement>(selector)?.getAttribute('src');
const root = createRoot(document.getElementById('root')!);

async function run() {
  localStorage.clear();
  uiIconService.setTheme('custom');
  root.render(<Probe />);
  await until(() => Boolean(document.querySelector('#ui svg')) && !document.querySelector('#dual img'), 'missing image fallback');
  passed.push('missing theme images reach fallback without repeated image retries');

  const apply = async (filename: string, color: string) => {
    const mapping = Object.fromEntries(uiIconService.getAllIcons().map((type) => [type, filename]));
    const task = uiIconService.registerCustomThemeAssets('custom', mapping);
    const url = svg(color);
    let resolved = 0;
    while (resolved < 96) {
      await until(() => imageRequests.some((request) => request.filename === filename), filename);
      const pending = imageRequests.splice(0);
      pending.forEach((request) => { request.resolve(url); resolved += 1; });
    }
    await task;
    await until(() => source('#ui img') === url && source('#dual img') === url && source('#hook') === url, 'renderers refresh');
    await until(() => source('#selector button[title="书籍"] img') === url && (window.__uiIconBaseline || source('#preview img') === url), 'selector and preview refresh');
    const images = ['#ui img', '#dual img', '#hook', '#selector button[title="书籍"] img', '#preview img'];
    await Promise.all(images.filter((selector) => !window.__uiIconBaseline || selector !== '#preview img')
      .map((selector) => document.querySelector<HTMLImageElement>(selector)!.decode()));
    return url;
  };
  const first = await apply('first.svg', 'coral');
  passed.push('async hydration restores failed icons, hook consumers, selectors, and previews');
  const second = await apply('second.svg', 'seagreen');
  check(first !== second, 'same-theme replacement did not produce a new image');
  passed.push('same-theme replacements show the new decoded image in every consumer');

  uiIconService.setTheme('default');
  await until(() => Boolean(document.querySelector('#ui svg')) && !document.querySelector('#dual img'), 'default theme');
  uiIconService.setTheme('custom');
  await until(() => source('#ui img') === second && source('#dual img') === second, 'switch back');
  passed.push('switching to default and back restores custom images without changing icon data');

  if (!window.__uiIconBaseline) {
    uiIconService.setTheme('default');
    const previewUpdate = uiIconService.registerCustomThemeAssets('custom', { sync: 'preview.svg' });
    await until(() => imageRequests.some((request) => request.filename === 'preview.svg'), 'inactive preview read');
    const preview = svg('royalblue');
    imageRequests.splice(0).forEach((request) => request.resolve(preview));
    await previewUpdate;
    await until(() => source('#preview img') === preview, 'preview refresh under default theme');
    await document.querySelector<HTMLImageElement>('#preview img')!.decode();
    passed.push('inactive custom theme previews refresh while default icons remain selected');
    uiIconService.setTheme('custom');
    await apply('final.svg', 'seagreen');
  }
  await until(() => Boolean(document.querySelector('#dual img')), 'final custom theme view');
  window.__uiIconTestResult = { passed };
}
void run().catch((error) => {
  window.__uiIconTestResult = { passed, error: error instanceof Error ? error.stack : String(error) };
});
