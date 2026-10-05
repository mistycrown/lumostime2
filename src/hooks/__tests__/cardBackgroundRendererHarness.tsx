/**
 * @file cardBackgroundRendererHarness.tsx
 * @input Real card hook, selector, service, and deferred image reads in Electron
 * @output Rendering assertions for opacity, async races, decode failure, and editor lifecycle
 * @pos Test (Card Background Renderer)
 * @updated 2026-10-05: Exercises browser image decoding and React effects with isolated test data.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { useCardBackground } from '../useCardBackground';
import { CardBackgroundSelector } from '../../components/CardBackgroundSelector';
import {
  CARD_BACKGROUND_CHANGED_EVENT, CARD_BACKGROUND_GROUPS_KEY,
  cardBackgroundService, type CardBackgroundGroup
} from '../../services/cardBackgroundService';
import { CUSTOM_APPEARANCE_ENABLED_ATTRIBUTE } from '../../utils/displayMode';
import { imageRequests } from './cardBackgroundRendererMocks';

declare global {
  interface Window { __cardBackgroundTestResult?: { passed: string[]; error?: string }; }
}

const passed: string[] = [];
const unhandled: string[] = [];
window.addEventListener('unhandledrejection', (event) => unhandled.push(String(event.reason)));
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const check = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const until = async (condition: () => boolean, label: string) => {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > 5000) throw new Error('Timeout: ' + label);
    await delay(10);
  }
};
const takeImage = async (filename: string) => {
  await until(() => imageRequests.some((request) => request.filename === filename), filename);
  const index = imageRequests.findIndex((request) => request.filename === filename);
  return imageRequests.splice(index, 1)[0];
};
const imageUrl = (color: string) => URL.createObjectURL(new Blob([
  `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="120"><rect width="240" height="120" fill="${color}"/></svg>`
], { type: 'image/svg+xml' }));
const revoked: string[] = [];
const originalRevoke = URL.revokeObjectURL.bind(URL);
URL.revokeObjectURL = (url) => { revoked.push(url); originalRevoke(url); };

const root = createRoot(document.getElementById('root')!);
let background: ReturnType<typeof useCardBackground>;
const Probe = ({ enabled = true }: { enabled?: boolean }) => {
  background = useCardBackground(0, enabled);
  return <div id="card" style={{ width: 400, height: 160, padding: 20, ...background.style }}>Card background test</div>;
};
const groups: CardBackgroundGroup[] = [
  { id: 'a', name: 'Alpha', imageFilenames: ['a.png'], alignment: 'right' },
  { id: 'b', name: 'Beta', imageFilenames: ['b.png'], alignment: 'right-top' },
  { id: 'c', name: 'Gamma', imageFilenames: ['c.png'], alignment: 'right-bottom' }
];

async function run() {
  localStorage.clear();
  localStorage.setItem(CARD_BACKGROUND_GROUPS_KEY, JSON.stringify(groups));
  cardBackgroundService.setCurrentGroup('a');
  root.render(<Probe />);
  const initial = imageUrl('coral');
  (await takeImage('a.png')).resolve(initial);
  await until(() => background?.active, 'initial image');
  check(cardBackgroundService.getOpacity() === 0.4, 'unset opacity should default to 40%');
  check(background.style.backgroundImage?.includes('0.6'), 'default image must not be hidden by an opaque white layer');
  passed.push('unset opacity shows a decoded background at 40%');

  cardBackgroundService.setCurrentGroup('b');
  const slow = await takeImage('b.png');
  cardBackgroundService.setCurrentGroup('c');
  const newest = imageUrl('seagreen');
  (await takeImage('c.png')).resolve(newest);
  await until(() => background.imageUrl === newest, 'latest selection');
  const stale = imageUrl('blue');
  slow.resolve(stale);
  await until(() => revoked.includes(stale), 'stale image released');
  check(background.imageUrl === newest, 'an old load replaced the latest background');
  passed.push('rapid group switches retain the newest image and release stale URLs');

  cardBackgroundService.setCurrentGroup('a');
  const disabledLoad = await takeImage('a.png');
  cardBackgroundService.setCurrentGroup(null);
  await until(() => !background.active, 'disabled background');
  const disabledUrl = imageUrl('purple');
  disabledLoad.resolve(disabledUrl);
  await until(() => revoked.includes(disabledUrl), 'disabled pending image released');
  check(!background.active, 'a pending load re-enabled a disabled background');
  passed.push('disabling backgrounds cancels earlier loads');

  cardBackgroundService.setCurrentGroup('a');
  const opacityLoad = await takeImage('a.png');
  cardBackgroundService.setOpacity(0.75);
  const opacityUrl = imageUrl('coral');
  opacityLoad.resolve(opacityUrl);
  await until(() => background.imageUrl === opacityUrl, 'opacity load');
  check(background.style.backgroundImage?.includes('0.25'), 'the load used opacity from before the slider change');
  passed.push('opacity changes during I/O apply to the newly loaded image');

  const partial: CardBackgroundGroup = { id: 'partial', name: 'Partial', imageFilenames: ['missing.png', 'broken.png', 'valid.png'], alignment: 'right' };
  localStorage.setItem(CARD_BACKGROUND_GROUPS_KEY, JSON.stringify([...groups, partial]));
  cardBackgroundService.setCurrentGroup('partial');
  (await takeImage('missing.png')).reject(new Error('Simulated missing file'));
  (await takeImage('broken.png')).resolve('data:image/png;base64,broken');
  const valid = imageUrl('gold');
  (await takeImage('valid.png')).resolve(valid);
  await until(() => background.imageUrl === valid, 'available image fallback');
  check(cardBackgroundService.getCurrentGroupId() === 'partial', 'missing images should not erase group selection');
  passed.push('missing and undecodable images fall back to another image in the group');

  document.documentElement.setAttribute(CUSTOM_APPEARANCE_ENABLED_ATTRIBUTE, 'false');
  await until(() => !background.active, 'dark-mode fallback');
  document.documentElement.setAttribute(CUSTOM_APPEARANCE_ENABLED_ATTRIBUTE, 'true');
  (await takeImage('missing.png')).resolve('');
  (await takeImage('broken.png')).resolve('');
  const restored = imageUrl('gold');
  (await takeImage('valid.png')).resolve(restored);
  await until(() => background.imageUrl === restored, 'light-mode restoration');
  check(cardBackgroundService.getOpacity() === 0.75, 'display mode must preserve configured opacity');
  passed.push('light/dark transitions preserve settings and restore the background');

  cardBackgroundService.setCurrentGroup('a');
  const unmountedLoad = await takeImage('a.png');
  root.render(null);
  await delay(30);
  const orphan = imageUrl('teal');
  unmountedLoad.resolve(orphan);
  await until(() => revoked.includes(orphan), 'unmounted image released');
  passed.push('unmount releases late image results');

  localStorage.setItem(CARD_BACKGROUND_GROUPS_KEY, JSON.stringify(groups.slice(0, 2)));
  root.render(<CardBackgroundSelector onToast={() => undefined} />);
  const oldA = await takeImage('a.png');
  const oldB = await takeImage('b.png');
  const newerGroups = [{ ...groups[0], imageFilenames: ['new-a.png'] }, groups[1]];
  localStorage.setItem(CARD_BACKGROUND_GROUPS_KEY, JSON.stringify(newerGroups));
  window.dispatchEvent(new Event(CARD_BACKGROUND_CHANGED_EVENT));
  const preview = imageUrl('coral');
  (await takeImage('new-a.png')).resolve(preview);
  (await takeImage('b.png')).resolve(imageUrl('seagreen'));
  const previewSrc = () => document.querySelector<HTMLImageElement>('section img')?.getAttribute('src');
  await until(() => previewSrc() === preview, 'new selector previews');
  const oldPreview = imageUrl('blue');
  oldA.resolve(oldPreview);
  oldB.resolve(imageUrl('purple'));
  await until(() => revoked.includes(oldPreview), 'old preview released');
  check(previewSrc() === preview, 'an old preview reload replaced the latest one');
  passed.push('selector previews ignore out-of-order reloads');

  document.querySelector<HTMLButtonElement>('button[aria-label="编辑卡片背景组：Alpha"]')!.click();
  const editorA = await takeImage('new-a.png');
  document.querySelector<HTMLButtonElement>('button[aria-label="关闭"]')!.click();
  await until(() => !document.querySelector('[role="dialog"]'), 'close Alpha editor');
  document.querySelector<HTMLButtonElement>('button[aria-label="编辑卡片背景组：Beta"]')!.click();
  const editorUrl = imageUrl('seagreen');
  (await takeImage('b.png')).resolve(editorUrl);
  await until(() => document.querySelector<HTMLImageElement>('[role="dialog"] img')?.getAttribute('src') === editorUrl, 'Beta editor preview');
  const oldEditorUrl = imageUrl('blue');
  editorA.resolve(oldEditorUrl);
  await until(() => revoked.includes(oldEditorUrl), 'old editor image released');
  check(document.querySelector<HTMLImageElement>('[role="dialog"] img')?.getAttribute('src') === editorUrl, 'closed editor loaded into the new editor');
  passed.push('closing and reopening editors ignores old image reads');
  document.querySelector<HTMLButtonElement>('button[aria-label="关闭"]')!.click();
  await until(() => !document.querySelector('[role="dialog"]'), 'close editor');
  check(unhandled.length === 0, 'Unhandled image failures: ' + unhandled.join('; '));
  passed.push('image failures produce no unhandled rejection');

  root.render(<div style={{ maxWidth: 440 }}><Probe /><CardBackgroundSelector onToast={() => undefined} /></div>);
  await until(() => imageRequests.length >= 3, 'final rendered card and selector');
  imageRequests.splice(0).forEach((request) => request.resolve(imageUrl(request.filename === 'b.png' ? 'seagreen' : 'coral')));
  await until(() => background.active && Boolean(document.querySelector('section img')), 'visible card background and previews');
  passed.push('selected background and previews render together');
  window.__cardBackgroundTestResult = { passed };
}

void run().catch((error) => {
  window.__cardBackgroundTestResult = { passed, error: error instanceof Error ? error.stack : String(error) };
});
