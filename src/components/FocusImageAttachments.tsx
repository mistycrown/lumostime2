/**
 * @file FocusImageAttachments.tsx
 * @input Running-session filenames, atomic attachment updater, and busy callback
 * @output Local gallery/camera attachments with thumbnails and shared image preview
 * @pos Component (Focus Detail)
 * @updated 2026-11-01: Saves each photo before appending it, retains unreadable drafts, and defers sync until submission.
 */
import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Camera, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { imageService } from '../services/imageService';
import { useToast } from '../contexts/ToastContext';
import { ImagePreviewModal } from './ImagePreviewModal';
import { beginSessionImageOperation, hasPendingSessionImages, subscribeSessionImageOperations } from '../utils/sessionImageOperations';

interface FocusImageAttachmentsProps {
  sessionId: string;
  images: string[];
  onChange: React.Dispatch<React.SetStateAction<string[]>>;
  onBusyChange: (busy: boolean) => void;
}

const AttachmentThumbnail: React.FC<{ filename: string; onClick: () => void }> = ({ filename, onClick }) => {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let active = true;
    let loadedUrl = '';
    void imageService.getImageUrl(filename, 'thumbnail').then((value) => {
      loadedUrl = value;
      if (active) setUrl(value);
      else if (value.startsWith('blob:')) URL.revokeObjectURL(value);
    }).catch((error) => console.warn('Failed to load timer photo:', error));
    return () => {
      active = false;
      if (loadedUrl.startsWith('blob:')) URL.revokeObjectURL(loadedUrl);
    };
  }, [filename]);

  return (
    <button type="button" onClick={onClick} aria-label="预览图片"
      className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-stone-100 flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-stone-500">
      {url ? <img src={url} alt="计时图片" className="w-full h-full object-cover" /> : <ImageIcon size={22} className="text-stone-400" />}
    </button>
  );
};

export const FocusImageAttachments: React.FC<FocusImageAttachmentsProps> = ({ sessionId, images, onChange, onBusyChange }) => {
  const { addToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  const busy = useSyncExternalStore(subscribeSessionImageOperations, () => hasPendingSessionImages(sessionId), () => false);
  const [preview, setPreview] = useState<string | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  useEffect(() => { onBusyChange(busy); }, [busy, onBusyChange]);

  const startWorking = () => {
    busyRef.current = true;
    onBusyChange(true);
    const finish = beginSessionImageOperation(sessionId);
    return () => {
      busyRef.current = false;
      finish();
      if (mountedRef.current) onBusyChange(false);
    };
  };

  const append = (filename: string) => {
    // This callback updates the session even if the detail view was closed during I/O.
    onChange((current) => [...current, filename]);
  };

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const files = Array.from(input.files || []);
    input.value = '';
    if (!files.length || busyRef.current || hasPendingSessionImages(sessionId)) return;
    const finish = startWorking();
    let added = 0;
    try {
      for (const file of files) {
        try {
          append(await imageService.saveImage(file, 'content', true));
          added++;
        } catch (error) {
          console.error('Failed to save timer photo:', error);
        }
      }
      if (added === files.length) addToast('success', `已添加 ${added} 张图片`);
      else if (added) addToast('warning', `已添加 ${added} 张图片，另有 ${files.length - added} 张失败`);
      else addToast('error', '图片保存失败，请重试');
    } finally {
      finish();
    }
  };

  const handleCamera = async () => {
    if (busyRef.current || hasPendingSessionImages(sessionId)) return;
    if (!Capacitor.isNativePlatform()) {
      addToast('warning', '相机功能目前仅在手机端可用');
      return;
    }
    const finish = startWorking();
    try {
      const photo = await CapCamera.getPhoto({
        quality: 60, width: 1200, allowEditing: false,
        resultType: CameraResultType.Uri, source: CameraSource.Camera
      });
      if (photo.path) {
        append(await imageService.saveNativeCameraImage(photo.path, photo.format || 'jpeg', 'content', true));
      } else if (photo.webPath) {
        const response = await fetch(photo.webPath);
        const blob = await response.blob();
        if (!response.ok || !blob.size) throw new Error('相片数据为空');
        append(await imageService.saveImage(blob, 'content', true));
      } else {
        throw new Error('未获取到相片路径');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/cancel/i.test(message)) addToast('error', `相机调用失败: ${message}`);
    } finally {
      finish();
    }
  };

  const buttonClass = 'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-stone-500 hover:bg-stone-100 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-stone-500';

  return (
    <section aria-label="计时图片">
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Images</span>
        <div className="flex items-center gap-1">
          {busy && <Loader2 size={16} className="animate-spin text-stone-400" aria-label="正在保存图片" />}
          <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className={buttonClass}>
            <ImageIcon size={16} /><span>添加图片</span>
          </button>
          <button type="button" disabled={busy} onClick={handleCamera} className={buttonClass}>
            <Camera size={16} /><span>拍照</span>
          </button>
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" aria-label="选择计时图片" />
      {images.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {images.map((filename) => <AttachmentThumbnail key={filename} filename={filename} onClick={() => setPreview(filename)} />)}
        </div>
      )}
      <ImagePreviewModal imageUrl={preview} images={images} initialIndex={preview ? images.indexOf(preview) : undefined}
        downloadFilename={preview || undefined} onClose={() => setPreview(null)}
        onDelete={busy ? undefined : (item) => {
          // Detach first; the normal unreferenced-image cleanup removes the local file.
          onChange((current) => current.filter((filename) => filename !== item.source));
          setPreview(null);
        }} />
    </section>
  );
};
