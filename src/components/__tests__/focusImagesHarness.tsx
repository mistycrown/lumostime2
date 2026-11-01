/**
 * @file focusImagesHarness.tsx
 * @input Real timer view, session context, image service, IndexedDB, and isolated platform adapters
 * @output Attachment lifecycle assertions and desktop/mobile screenshot checkpoints
 * @pos Test (Renderer)
 * @updated 2026-11-01: Covers selection, native camera, restoration, cleanup, delayed saves, cancellation, and completion.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { SessionProvider, useSession } from '../../contexts/SessionContext';
import { FocusDetailView } from '../../views/FocusDetailView';
import { imageService } from '../../services/imageService';
import { loadPersistedActiveSessions } from '../../utils/sessionPersistence';
import { splitLogByDays } from '../../utils/logUtils';
import { platform } from './focusImagesMocks';

declare global { interface Window {
  __focusImagesResult?: { passed: string[]; error?: string };
  __focusImagesCapture?: string | null;
} }
const passed: string[] = [];
const host = document.getElementById('root')!;
const root = createRoot(host);
const delay = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms));
const check = (value: unknown, message: string) => { if (!value) throw new Error(message); };
const until = async (test: () => boolean) => {
  for (let i = 0; i < 100; i++) { if (test()) return; await delay(); }
  throw new Error('Timed out waiting for timer photos');
};
const photo = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 120;
  const drawing = canvas.getContext('2d')!;
  drawing.fillStyle = '#e5ddd0';
  drawing.fillRect(0, 0, 160, 120);
  drawing.fillStyle = '#8d9b85';
  drawing.fillRect(18, 35, 124, 70);
  drawing.fillStyle = '#f6efdb';
  drawing.beginPath();
  drawing.arc(80, 50, 28, 0, Math.PI * 2);
  drawing.fill();
  const bytes = atob(canvas.toDataURL('image/png').split(',')[1]);
  return new File([Uint8Array.from(bytes, (char) => char.charCodeAt(0))], 'photo.png', { type: 'image/png' });
};
const activity = { id: 'work', name: '专注阅读', icon: '📖', color: '#555' };
const categories = [{ id: 'category', name: '学习', icon: '📖', activities: [activity] }] as any;
const empty = [];
let context: ReturnType<typeof useSession>;
let visible = true;
const saved: any[] = [];
const Host = () => {
  context = useSession();
  const session = context.activeSessions[0];
  if (!visible || !session) return null;
  return <FocusDetailView key={session.id} session={session} todos={empty} categories={categories} todoCategories={empty} scopes={empty} autoLinkRules={empty}
    autoFocusNote={false} onClose={() => { visible = false; render(); }}
    onCancel={context.cancelSession} onComplete={(final) => context.stopActivity(final.id, final, (logs) => saved.push(...logs))}
    onUpdate={(updated) => context.setActiveSessions((current) => current.map((item) => item.id === updated.id ? updated : item))}
    onImagesChange={(update) => context.setActiveSessions((current) => current.map((item) => item.id === session.id
      ? { ...item, images: typeof update === 'function' ? update(item.images || []) : update } : item))} />;
};
const render = () => root.render(<SessionProvider splitLogByDays={splitLogByDays}><Host /></SessionProvider>);
const pick = async (files: File[]) => {
  const input = host.querySelector('input[type=file]') as HTMLInputElement;
  check(input, 'Missing gallery input');
  const transfer = new DataTransfer();
  files.forEach((file) => transfer.items.add(file));
  input.files = transfer.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  await delay();
};
const clickText = (text: string) => {
  const button = [...host.querySelectorAll('button')].find((item) => item.textContent === text);
  check(button, 'Missing button ' + text);
  button!.click();
};
const capture = async (name: string) => {
  window.__focusImagesCapture = name;
  await until(() => window.__focusImagesCapture === null);
};

const run = async () => {
  localStorage.clear();
  render();
  await delay();
  const id = context.startActivity(activity, 'category', []);
  await delay();
  await pick([photo(), photo()]);
  await until(() => context.activeSessions[0].images?.length === 2);
  const initial = [...context.activeSessions[0].images!];
  check(loadPersistedActiveSessions()[0].images?.length === 2, 'Photos were not persisted immediately');
  check(imageService.getReferencedImagesList().length === 0, 'Drafts entered the sync manifest');
  check((await imageService.cleanupUnreferencedImages([])).cleaned === 0, 'Cleanup deleted running photos');
  await until(() => host.querySelectorAll('img[alt="计时图片"]').length === 2);
  await until(() => !(host.querySelector('[aria-label="提交计时"]') as HTMLButtonElement).disabled);
  host.querySelector('section[aria-label="计时图片"]')?.scrollIntoView();
  await capture('focus-images-desktop');
  await capture('focus-images-mobile');
  passed.push('Batch gallery saves persist locally and survive cleanup');

  root.render(null);
  await delay();
  render();
  await delay();
  check(context.activeSessions[0].images?.join() === initial.join(), 'Provider restart lost photos');
  await until(() => host.querySelectorAll('img[alt="计时图片"]').length === 2);
  passed.push('Restart restores session filenames and real IndexedDB image data');

  context.setActiveSessions((current) => current.map((item) => ({ ...item, images: [...item.images!, 'temporarily-unavailable.png'] })));
  await delay(150);
  check(context.activeSessions[0].images?.length === 3, 'Temporary read failure removed the attachment');
  const thumbnails = host.querySelectorAll('[aria-label="预览图片"]');
  (thumbnails[2] as HTMLButtonElement).click();
  await until(() => Boolean(document.querySelector('[title="Delete"]')));
  (document.querySelector('[title="Delete"]') as HTMLButtonElement).click();
  await delay();
  const confirm = [...document.querySelectorAll('button')].find((button) => button.textContent === '删除');
  check(confirm, 'Missing attachment deletion confirmation');
  confirm!.click();
  await until(() => context.activeSessions[0].images?.length === 2);
  check(loadPersistedActiveSessions()[0].images?.join() === initial.join(), 'Attachment deletion was not persisted');
  passed.push('Unreadable attachments remain until explicitly deleted through preview');

  platform.native = true;
  clickText('拍照');
  await until(() => context.activeSessions[0].images?.length === 3);
  check(imageService.getReferencedImagesList().length === 0, 'Camera draft was published');
  platform.cancel = true;
  platform.native = true;
  clickText('拍照');
  await delay();
  check(context.activeSessions[0].images?.length === 3, 'Cancelled camera changed photos');
  passed.push('Native camera webPath fallback saves locally; camera cancellation preserves existing photos');

  const originalSave = imageService.saveImage.bind(imageService);
  let release!: () => void;
  imageService.saveImage = async (...args) => {
    await new Promise<void>((resolve) => { release = resolve; });
    return originalSave(...args);
  };
  await pick([photo()]);
  check((host.querySelector('[aria-label="提交计时"]') as HTMLButtonElement).disabled, 'Submission allowed during photo save');
  visible = false;
  render();
  await delay();
  // External stop, such as a floating timer, must also wait after the view closes.
  context.stopActivity(id, undefined, (logs) => saved.push(...logs));
  check(context.activeSessions.length === 1 && saved.length === 0, 'External stop dropped the in-flight photo');
  release();
  await until(() => context.activeSessions.length === 0);
  imageService.saveImage = originalSave;
  check(saved.length > 0 && saved.every((log) => log.images.length === 4), 'Completed logs lost attachments');
  check(loadPersistedActiveSessions().length === 0, 'Submitted timer draft remained');
  check(imageService.getReferencedImagesList().length === 8, 'Submitted photos did not enter normal sync');
  passed.push('Close during saving and external stop wait for all photos before publishing logs');

  visible = true;
  const other = context.startActivity({ ...activity, id: 'other' }, 'category', []);
  await delay();
  check(!context.activeSessions[0].images?.length, 'New timer inherited old photos');
  await pick([photo()]);
  await until(() => context.activeSessions[0].images?.length === 1);
  const cancelled = context.activeSessions[0].images![0];
  context.cancelSession(other);
  await delay();
  check(!imageService.getReferencedImagesList().includes(cancelled), 'Cancelled photo was published');
  passed.push('New timers are isolated and cancellation never publishes draft photos');
  window.__focusImagesResult = { passed };
};
void run().catch((error) => { window.__focusImagesResult = { passed, error: error.stack || String(error) }; });
